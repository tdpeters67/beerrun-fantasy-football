#!/usr/bin/env node

// Load .env file if present
import { readFileSync } from "node:fs";
try {
  const env = readFileSync(".env", "utf-8");
  for (const line of env.split("\n")) {
    const match = line.match(/^(\w+)\s*=\s*"?(.*?)"?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
} catch {}

/**
 * NFL Fantasy Football scraper
 *
 * The NFL Fantasy API uses Gigya cookie-based auth (not Bearer tokens).
 *
 * Usage:
 *   1. Log into fantasy.nfl.com in your browser
 *   2. Open DevTools → Network tab → filter by "api.fantasy.nfl.com"
 *   3. Click any API request → Headers → Request Headers → copy the full Cookie value
 *   4. Create a .env file with NFL_COOKIE="<your cookie string>"
 *      (or pass it inline: NFL_COOKIE="..." node scrape.mjs)
 *   5. Run: node scrape.mjs
 *
 * Output: public/fantasy-data.json
 */

const LEAGUE_ID = process.env.LEAGUE_ID || "12456354";
const NFL_COOKIE = process.env.NFL_COOKIE || "";
const SEASON = process.env.SEASON || "2024";
const TOTAL_WEEKS = parseInt(process.env.TOTAL_WEEKS || "17", 10);

const BASE_URL = "https://api.fantasy.nfl.com/v2";

async function apiFetch(path) {
  const url = `${BASE_URL}${path}`;
  console.log(`  → ${url}`);
  const res = await fetch(url, {
    headers: {
      Cookie: NFL_COOKIE,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}: ${await res.text()}`);
  }
  return res.json();
}

function safeNum(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

async function fetchLeagueInfo() {
  console.log("\nFetching league info...");
  const data = await apiFetch(`/league/${LEAGUE_ID}?season=${SEASON}`);
  const league = data.league || data;
  return {
    id: league.id || LEAGUE_ID,
    name: league.name || "Unknown League",
    season: SEASON,
    teams: (league.teams || []).map((t) => ({
      id: t.id,
      name: t.name || t.teamName,
      owner: t.ownerName || t.owner?.name || "Unknown",
      logoUrl: t.logoUrl || null,
    })),
  };
}

async function fetchStandings() {
  console.log("Fetching standings...");
  try {
    const data = await apiFetch(`/league/${LEAGUE_ID}/standings?season=${SEASON}`);
    return (data.standings || data.teams || []).map((t) => ({
      teamId: t.id || t.teamId,
      teamName: t.name || t.teamName,
      wins: safeNum(t.wins || t.record?.wins),
      losses: safeNum(t.losses || t.record?.losses),
      ties: safeNum(t.ties || t.record?.ties),
      pointsFor: safeNum(t.pointsFor || t.points?.for),
      pointsAgainst: safeNum(t.pointsAgainst || t.points?.against),
      rank: safeNum(t.rank),
    }));
  } catch (e) {
    console.warn("  Could not fetch standings endpoint, will derive from matchups");
    return null;
  }
}

async function fetchWeekMatchups(week) {
  try {
    const data = await apiFetch(
      `/league/${LEAGUE_ID}/scoreboard?season=${SEASON}&week=${week}`
    );
    const matchups = data.scoreboard?.matchups || data.matchups || data.games || [];
    return matchups.map((m) => normalizeMatchup(m, week));
  } catch (e) {
    // Try alternate endpoint
    try {
      const data = await apiFetch(
        `/league/${LEAGUE_ID}/matchups?season=${SEASON}&week=${week}`
      );
      const matchups = data.matchups || data.games || [];
      return matchups.map((m) => normalizeMatchup(m, week));
    } catch {
      console.warn(`  No data for week ${week}`);
      return [];
    }
  }
}

function normalizeMatchup(m, week) {
  // Handle various API response shapes
  const home = m.home || m.homeTeam || m.team1 || {};
  const away = m.away || m.awayTeam || m.team2 || {};
  const homeScore = safeNum(home.score ?? home.points ?? home.totalPoints ?? m.homeScore);
  const awayScore = safeNum(away.score ?? away.points ?? away.totalPoints ?? m.awayScore);

  return {
    week,
    homeTeamId: home.id || home.teamId,
    homeTeamName: home.name || home.teamName || "Home",
    homeScore,
    awayTeamId: away.id || away.teamId,
    awayTeamName: away.name || away.teamName || "Away",
    awayScore,
    winner:
      homeScore > awayScore
        ? home.id || home.teamId
        : awayScore > homeScore
          ? away.id || away.teamId
          : null, // tie
  };
}

function deriveTeamSummaries(matchups, teams) {
  const summaries = {};

  // Init from team list if available
  for (const t of teams) {
    summaries[t.id] = {
      teamId: t.id,
      teamName: t.name,
      owner: t.owner,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      weeklyScores: [],
      highScore: 0,
    };
  }

  for (const m of matchups) {
    for (const side of ["home", "away"]) {
      const id = side === "home" ? m.homeTeamId : m.awayTeamId;
      const name = side === "home" ? m.homeTeamName : m.awayTeamName;
      const pts = side === "home" ? m.homeScore : m.awayScore;
      const opp = side === "home" ? m.awayScore : m.homeScore;

      if (!id) continue;
      if (!summaries[id]) {
        summaries[id] = {
          teamId: id,
          teamName: name,
          owner: "Unknown",
          wins: 0,
          losses: 0,
          ties: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          weeklyScores: [],
          highScore: 0,
        };
      }

      const s = summaries[id];
      s.pointsFor += pts;
      s.pointsAgainst += opp;
      s.weeklyScores.push({ week: m.week, score: pts });
      if (pts > s.highScore) s.highScore = pts;

      if (m.winner === id) s.wins++;
      else if (m.winner === null) s.ties++;
      else s.losses++;
    }
  }

  // Compute averages
  for (const s of Object.values(summaries)) {
    const gp = s.wins + s.losses + s.ties;
    s.avgScore = gp > 0 ? Math.round((s.pointsFor / gp) * 100) / 100 : 0;
    s.weeklyScores.sort((a, b) => a.week - b.week);
  }

  return Object.values(summaries).sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || b.pointsFor - a.pointsFor
  );
}

async function main() {
  if (!NFL_COOKIE) {
    console.error(
      "ERROR: Set NFL_COOKIE env var with your cookie string from fantasy.nfl.com.\n" +
      "See the comment at the top of this file for instructions."
    );
    process.exit(1);
  }

  const league = await fetchLeagueInfo();
  console.log(`League: ${league.name} (${league.season})`);

  const standings = await fetchStandings();

  console.log(`\nFetching matchups for weeks 1–${TOTAL_WEEKS}...`);
  const allMatchups = [];
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const matchups = await fetchWeekMatchups(week);
    allMatchups.push(...matchups);
    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nTotal matchups scraped: ${allMatchups.length}`);

  const teamSummaries = deriveTeamSummaries(allMatchups, league.teams);

  const output = {
    scrapedAt: new Date().toISOString(),
    league: {
      id: league.id,
      name: league.name,
      season: league.season,
    },
    standings: standings || teamSummaries.map((s) => ({
      teamId: s.teamId,
      teamName: s.teamName,
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      pointsFor: Math.round(s.pointsFor * 100) / 100,
      pointsAgainst: Math.round(s.pointsAgainst * 100) / 100,
      rank: 0,
    })),
    teamSummaries,
    matchups: allMatchups,
  };

  // Assign ranks if derived
  if (!standings) {
    output.standings.forEach((s, i) => (s.rank = i + 1));
  }

  const fs = await import("node:fs");
  const path = await import("node:path");
  const outDir = path.join(process.cwd(), "public");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "fantasy-data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nData written to ${outPath}`);
}

main().catch((e) => {
  console.error("Scrape failed:", e.message);
  process.exit(1);
});
