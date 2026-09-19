#!/usr/bin/env node

// Load .env.espn (falls back to .env)
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

for (const file of [".env.espn", ".env"]) {
  try {
    const env = readFileSync(file, "utf-8");
    for (const line of env.split("\n")) {
      const match = line.match(/^(\w+)\s*=\s*"?(.*?)"?\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {}
}

/**
 * Builds the site data file (public/fantasy-data.json) for
 * "Goodell What @ the Good Things?" from ESPN's fantasy API.
 *
 * Pulls: teams, owners, standings, all matchups, the draft, and player-level
 * boxscores for every completed week. Also embeds any authored recaps found in
 * ./recaps/week-<n>.md.
 *
 * Run:  node build-site-data.mjs
 * Needs ESPN_S2 + SWID in .env.espn (private league auth).
 */

const LEAGUE_ID = process.env.LEAGUE_ID || "607424913";
const SEASON = process.env.SEASON || "2026";
const ESPN_S2 = process.env.ESPN_S2 || "";
const SWID = process.env.SWID || "";

const HOST = "https://lm-api-reads.fantasy.espn.com";
const BASE = `${HOST}/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;

const SLOT = {
  0: "QB", 1: "QB", 2: "RB", 3: "RB/WR", 4: "WR", 5: "WR/TE", 6: "TE",
  7: "FLEX", 16: "D/ST", 17: "K", 18: "P", 19: "HC", 20: "BE", 21: "IR", 23: "FLEX",
};
const BENCH_SLOTS = new Set([20, 21]);
const POS = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST" };

const n2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

async function apiFetch(params) {
  const res = await fetch(`${BASE}?${params}`, {
    headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const applied = (p, wk, src) =>
  n2(p?.stats?.find((s) => s.scoringPeriodId === wk && s.statSourceId === src)?.appliedTotal);

function parseSide(side, week) {
  const entries =
    side?.rosterForCurrentScoringPeriod?.entries ||
    side?.rosterForMatchupPeriod?.entries || [];
  const players = entries.map((e) => {
    const p = e.playerPoolEntry?.player || {};
    return {
      name: p.fullName,
      pos: POS[p.defaultPositionId] || "?",
      slot: SLOT[e.lineupSlotId] || String(e.lineupSlotId),
      benched: BENCH_SLOTS.has(e.lineupSlotId),
      points: applied(p, week, 0),
      projected: applied(p, week, 1),
    };
  });
  return players;
}

// Stable key for a matchup, order-independent.
const gameKey = (g) => [g.homeTeamId, g.awayTeamId].slice().sort((a, b) => a - b).join("-");

// Split an authored recap into an intro (text before the first matchup heading)
// and per-matchup blurbs. A matchup heading is a `##`/`###` line whose text
// contains both team names of a game.
function parseRecap(md, games) {
  const intro = [];
  const sections = [];
  let cur = null;
  for (const ln of md.split("\n")) {
    if (/^#{2,3}\s+/.test(ln)) { cur = { heading: ln.replace(/^#{2,3}\s+/, "").trim(), body: [] }; sections.push(cur); }
    else if (/^#\s+/.test(ln)) { /* top-level title: ignore */ }
    else if (cur) cur.body.push(ln);
    else intro.push(ln);
  }
  const blurbByKey = {};
  for (const s of sections) {
    const g = games.find((g) => {
      const [n1, n2] = g.sides.map((x) => x.teamName);
      return s.heading.includes(n1) && s.heading.includes(n2);
    });
    if (g) blurbByKey[gameKey(g)] = s.body.join("\n").trim();
  }
  return { intro: intro.join("\n").trim(), blurbByKey };
}

// Auto-computed weekly awards.
function computeSuperlatives(games) {
  const sides = [];
  for (const g of games) {
    for (const s of g.sides) {
      const opp = g.sides.find((x) => x.teamId !== s.teamId);
      const topBench = [...s.players].filter((p) => p.benched).sort((x, y) => y.points - x.points)[0] || null;
      sides.push({ team: s.teamName, score: s.total, benchPoints: s.benchPoints, won: s.total > opp.total, oppName: opp.teamName, topBench });
    }
  }
  const winners = sides.filter((s) => s.won);
  const losers = sides.filter((s) => !s.won);
  const maxBy = (arr, k) => (arr.length ? arr.reduce((m, s) => (s[k] > m[k] ? s : m)) : null);
  const minBy = (arr, k) => (arr.length ? arr.reduce((m, s) => (s[k] < m[k] ? s : m)) : null);
  const bw = maxBy(winners.length ? winners : sides, "score");
  const bl = minBy(losers.length ? losers : sides, "score");
  const unlucky = maxBy(losers, "score");
  const bench = maxBy(sides, "benchPoints");
  return {
    biggestWinner: bw && { team: bw.team, score: bw.score, opp: bw.oppName },
    biggestLoser: bl && { team: bl.team, score: bl.score, opp: bl.oppName },
    mostUnlucky: unlucky && { team: unlucky.team, score: unlucky.score, opp: unlucky.oppName },
    mostBench: bench && { team: bench.team, benchPoints: bench.benchPoints, topBench: bench.topBench },
  };
}

async function main() {
  if (!ESPN_S2 || !SWID) {
    console.error("ERROR: set ESPN_S2 and SWID in .env.espn");
    process.exit(1);
  }

  const core = await apiFetch("view=mTeam&view=mStatus&view=mSettings&view=mMatchupScore");
  const leagueName = core.settings?.name || "The League";
  const currentWeek = core.status?.currentMatchupPeriod || core.scoringPeriodId || 1;

  // Owners
  const ownerName = {};
  for (const m of core.members || []) {
    ownerName[m.id] = m.displayName || `${m.firstName || ""} ${m.lastName || ""}`.trim() || "Unknown";
  }

  // Teams
  const teams = {};
  for (const t of core.teams || []) {
    const rec = t.record?.overall || {};
    teams[t.id] = {
      id: t.id,
      name: t.name || `${t.location || ""} ${t.nickname || ""}`.trim(),
      owner: ownerName[t.primaryOwner] || "Unknown",
      wins: rec.wins || 0,
      losses: rec.losses || 0,
      ties: rec.ties || 0,
      pointsFor: n2(rec.pointsFor),
      pointsAgainst: n2(rec.pointsAgainst),
      logo: t.logo || null,
      weeklyScores: [],
      roster: [],
    };
  }

  // Which weeks are complete?
  const completed = new Set();
  for (const m of core.schedule || []) {
    if (m.winner && m.winner !== "UNDECIDED") completed.add(m.matchupPeriodId);
  }
  const completedWeeks = [...completed].sort((a, b) => a - b);

  // Pull boxscores per completed week for player-level detail
  const weeks = [];
  const allMatchups = [];
  for (const wk of completedWeeks) {
    const box = await apiFetch(`view=mBoxscore&scoringPeriodId=${wk}`);
    const games = (box.schedule || []).filter((g) => g.matchupPeriodId === wk);
    const weekGames = [];
    for (const g of games) {
      const sides = ["home", "away"].filter((k) => g[k]).map((k) => {
        const s = g[k];
        const players = parseSide(s, wk);
        return {
          teamId: s.teamId,
          teamName: teams[s.teamId]?.name || `Team ${s.teamId}`,
          total: n2(s.totalPoints),
          benchPoints: n2(players.filter((p) => p.benched).reduce((a, p) => a + p.points, 0)),
          players,
        };
      });
      if (sides.length < 2) continue;
      const [a, b] = sides.sort((x, y) => y.total - x.total);
      const game = {
        week: wk,
        homeTeamId: a.teamId, homeTeamName: a.teamName, homeScore: a.total,
        awayTeamId: b.teamId, awayTeamName: b.teamName, awayScore: b.total,
        winner: a.total === b.total ? null : a.teamId,
        margin: n2(a.total - b.total),
        combined: n2(a.total + b.total),
        sides,
      };
      weekGames.push(game);
      allMatchups.push(game);

      // Record weekly scores + latest roster per team
      for (const side of sides) {
        const opp = sides.find((x) => x.teamId !== side.teamId);
        teams[side.teamId]?.weeklyScores.push({
          week: wk, score: side.total, opp: opp.teamName, oppScore: opp.total,
          result: side.total > opp.total ? "W" : side.total < opp.total ? "L" : "T",
        });
        // keep the most recent completed week's roster
        teams[side.teamId].roster = side.players;
      }
    }
    weeks.push({ week: wk, games: weekGames });
  }

  // Derived per-team fields
  for (const t of Object.values(teams)) {
    const scores = t.weeklyScores.map((w) => w.score);
    t.avgScore = scores.length ? n2(scores.reduce((a, s) => a + s, 0) / scores.length) : 0;
    t.highScore = scores.length ? Math.max(...scores) : 0;
    t.lowScore = scores.length ? Math.min(...scores) : 0;
  }

  // Draft
  const draftData = await apiFetch("view=mDraftDetail");
  const playerMeta = {}; // id -> {name,pos, wk pts by week}
  for (const g of allMatchups) {
    for (const side of g.sides) {
      for (const p of side.players) {
        // keyed by name since boxscore lacks id here; we re-pull ids below
      }
    }
  }
  // Re-pull boxscore w/ ids to map draft players to week-1 points
  const idPts = {};
  if (completedWeeks.length) {
    const wk1 = completedWeeks[0];
    const box = await apiFetch(`view=mBoxscore&scoringPeriodId=${wk1}`);
    for (const g of (box.schedule || [])) {
      if (g.matchupPeriodId !== wk1) continue;
      for (const k of ["home", "away"]) {
        const entries = g[k]?.rosterForCurrentScoringPeriod?.entries || g[k]?.rosterForMatchupPeriod?.entries || [];
        for (const e of entries) {
          const p = e.playerPoolEntry?.player;
          if (p) idPts[p.id] = { name: p.fullName, pos: POS[p.defaultPositionId] || "?", pts: applied(p, wk1, 0) };
        }
      }
    }
  }
  const draft = (draftData.draftDetail?.picks || []).map((p) => ({
    overall: p.overallPickNumber,
    round: p.roundId,
    pick: p.roundPickNumber,
    teamId: p.teamId,
    teamName: teams[p.teamId]?.name || `Team ${p.teamId}`,
    player: idPts[p.playerId]?.name || `Player ${p.playerId}`,
    pos: idPts[p.playerId]?.pos || "?",
    firstWeekPts: idPts[p.playerId]?.pts ?? null,
  }));

  // Records (season so far)
  const apps = allMatchups.flatMap((m) => m.sides.map((s) => ({
    team: s.teamName, teamId: s.teamId, score: s.total, week: m.week,
    opp: m.sides.find((x) => x.teamId !== s.teamId).teamName,
    oppScore: m.sides.find((x) => x.teamId !== s.teamId).total,
  })));
  const allStarters = allMatchups.flatMap((m) => m.sides.flatMap((s) =>
    s.players.filter((p) => !p.benched).map((p) => ({ ...p, team: s.teamName, week: m.week }))));
  const top = (arr, key, n = 10) => [...arr].sort((a, b) => b[key] - a[key]).slice(0, n);
  const bottom = (arr, key, n = 10) => [...arr].sort((a, b) => a[key] - b[key]).slice(0, n);

  const records = {
    highestTeamWeeks: top(apps, "score"),
    lowestTeamWeeks: bottom(apps.filter((a) => a.score > 0), "score"),
    blowouts: top(allMatchups, "margin").map((m) => ({
      winner: m.homeTeamName, winnerScore: m.homeScore, loser: m.awayTeamName, loserScore: m.awayScore, margin: m.margin, week: m.week,
    })),
    closest: bottom(allMatchups.filter((m) => m.margin > 0), "margin").map((m) => ({
      winner: m.homeTeamName, winnerScore: m.homeScore, loser: m.awayTeamName, loserScore: m.awayScore, margin: m.margin, week: m.week,
    })),
    topPerformers: top(allStarters, "points").map((p) => ({ name: p.name, pos: p.pos, points: p.points, team: p.team, week: p.week })),
    biggestBusts: allStarters.filter((p) => p.projected >= 8).map((p) => ({ name: p.name, pos: p.pos, points: p.points, projected: p.projected, miss: n2(p.projected - p.points), team: p.team, week: p.week })).sort((a, b) => b.miss - a.miss).slice(0, 10),
  };

  // Superlatives (auto) + authored recaps (intro + per-matchup blurbs) per week.
  const recapMd = {};
  try {
    for (const f of readdirSync("recaps").filter((f) => /^week-\d+\.md$/.test(f))) {
      recapMd[parseInt(f.match(/\d+/)[0], 10)] = readFileSync(path.join("recaps", f), "utf-8");
    }
  } catch {}

  for (const wk of weeks) {
    wk.superlatives = computeSuperlatives(wk.games);
    const md = recapMd[wk.week];
    if (md) {
      const { intro, blurbByKey } = parseRecap(md, wk.games);
      wk.intro = intro;
      for (const g of wk.games) g.blurb = blurbByKey[gameKey(g)] || null;
    } else {
      wk.intro = "";
      for (const g of wk.games) g.blurb = null;
    }
  }

  // --scaffold N: print a ready-to-fill recap template with correct headings.
  const scaffoldArg = process.argv.includes("--scaffold")
    ? parseInt(process.argv[process.argv.indexOf("--scaffold") + 1], 10) : null;
  if (scaffoldArg) {
    const wk = weeks.find((w) => w.week === scaffoldArg);
    if (!wk) { console.error(`Week ${scaffoldArg} isn't complete yet — nothing to scaffold.`); process.exit(1); }
    const out = [`Write your Week ${scaffoldArg} intro here.`, ""];
    for (const g of [...wk.games].sort((a, b) => b.combined - a.combined)) {
      out.push(`### ${g.homeTeamName} vs ${g.awayTeamName}`);
      out.push(`Final ${g.homeScore}–${g.awayScore}. Your take here…`);
      out.push("");
    }
    process.stdout.write(out.join("\n"));
    return;
  }

  const recaps = weeks
    .filter((wk) => recapMd[wk.week])
    .map((wk) => ({ week: wk.week, intro: wk.intro }))
    .sort((a, b) => b.week - a.week);

  const out = {
    league: { id: LEAGUE_ID, name: leagueName, season: SEASON, currentWeek, completedWeeks },
    scrapedAt: new Date().toISOString(),
    teams: Object.values(teams).sort((a, b) =>
      (b.wins - a.wins) || (a.losses - b.losses) || (b.pointsFor - a.pointsFor)),
    weeks,
    draft,
    records,
    recaps,
  };

  mkdirSync("public", { recursive: true });
  writeFileSync(path.join("public", "fantasy-data.json"), JSON.stringify(out, null, 2));
  console.log(`Built public/fantasy-data.json`);
  console.log(`  League: ${leagueName} (${SEASON})`);
  console.log(`  Completed weeks: ${completedWeeks.join(", ") || "none"} | current: ${currentWeek}`);
  console.log(`  Teams: ${Object.keys(teams).length} | Matchups: ${allMatchups.length} | Draft picks: ${draft.length} | Recaps: ${recaps.length}`);
}

main().catch((e) => {
  console.error("Build failed:", e.message);
  process.exit(1);
});
