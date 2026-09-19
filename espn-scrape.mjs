#!/usr/bin/env node

// Load .env.espn (falls back to .env) if present
import { readFileSync } from "node:fs";
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
 * ESPN Fantasy Football scraper — for "Goodell What @ the Good Things?" (or any league).
 *
 * ESPN's fantasy API is undocumented but stable. Private leagues need two cookies
 * (espn_s2 + SWID) grabbed from your logged-in browser (DevTools → Application → Cookies).
 * Put them in .env.espn:
 *   ESPN_S2=...
 *   SWID={...}
 *   LEAGUE_ID=607424913
 *   SEASON=2026
 *
 * Usage:
 *   node espn-scrape.mjs              # writes up the latest COMPLETE week
 *   node espn-scrape.mjs --week 1     # a specific week
 *   node espn-scrape.mjs --json       # dump the computed data as JSON, no prose
 *
 * Output: prints a draft commissioner writeup + writes public/espn-week-<n>.json
 */

const LEAGUE_ID = process.env.LEAGUE_ID || "607424913";
const SEASON = process.env.SEASON || "2026";
const ESPN_S2 = process.env.ESPN_S2 || "";
const SWID = process.env.SWID || "";

const args = process.argv.slice(2);
const weekArg = args.includes("--week") ? parseInt(args[args.indexOf("--week") + 1], 10) : null;
const jsonOnly = args.includes("--json");

const HOST = "https://lm-api-reads.fantasy.espn.com";
const BASE = `${HOST}/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;

// ESPN lineup slot IDs → labels. Bench/IR are non-starting.
const SLOT = {
  0: "QB", 1: "QB", 2: "RB", 3: "RB/WR", 4: "WR", 5: "WR/TE", 6: "TE",
  7: "FLEX", 16: "D/ST", 17: "K", 18: "P", 19: "HC", 20: "BE", 21: "IR", 23: "FLEX",
};
const BENCH_SLOTS = new Set([20, 21]);
const POS = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST" };

function n2(x) {
  return Math.round((Number(x) || 0) * 100) / 100;
}

async function apiFetch(params) {
  const url = `${BASE}?${params}`;
  const res = await fetch(url, {
    headers: { Cookie: `espn_s2=${ESPN_S2}; SWID=${SWID}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}: ${await res.text()}`);
  return res.json();
}

function appliedPoints(player, week) {
  // statSourceId 0 = actual, statSplitTypeId 1 = single week
  const stat = player?.stats?.find(
    (s) => s.scoringPeriodId === week && s.statSourceId === 0
  );
  return n2(stat?.appliedTotal);
}

function projectedPoints(player, week) {
  const stat = player?.stats?.find(
    (s) => s.scoringPeriodId === week && s.statSourceId === 1
  );
  return n2(stat?.appliedTotal);
}

function parseRoster(side, week) {
  const entries =
    side?.rosterForCurrentScoringPeriod?.entries ||
    side?.rosterForMatchupPeriod?.entries ||
    [];
  const starters = [];
  const bench = [];
  for (const e of entries) {
    const p = e.playerPoolEntry?.player;
    if (!p) continue;
    const rec = {
      name: p.fullName,
      pos: POS[p.defaultPositionId] || "?",
      slot: SLOT[e.lineupSlotId] || String(e.lineupSlotId),
      points: appliedPoints(p, week),
      projected: projectedPoints(p, week),
    };
    if (BENCH_SLOTS.has(e.lineupSlotId)) bench.push(rec);
    else starters.push(rec);
  }
  return { starters, bench };
}

async function main() {
  if (!ESPN_S2 || !SWID) {
    console.error("ERROR: set ESPN_S2 and SWID in .env.espn (see header of this file).");
    process.exit(1);
  }

  // Team names + league status
  const meta = await apiFetch("view=mTeam&view=mStatus&view=mSettings");
  const teamName = {};
  const teamRecord = {};
  for (const t of meta.teams || []) {
    teamName[t.id] = t.name || `${t.location || ""} ${t.nickname || ""}`.trim();
    teamRecord[t.id] = t.record?.overall || { wins: 0, losses: 0, ties: 0 };
  }
  const leagueName = meta.settings?.name || "The League";

  // Determine the target week: latest COMPLETE matchup period, or --week override.
  const scoreData = await apiFetch("view=mMatchupScore");
  const completeWeeks = new Set();
  for (const m of scoreData.schedule || []) {
    if (m.winner && m.winner !== "UNDECIDED") completeWeeks.add(m.matchupPeriodId);
  }
  const latestComplete = completeWeeks.size ? Math.max(...completeWeeks) : 1;
  const week = weekArg || latestComplete;

  // Pull boxscores (player-level) for the target week.
  const box = await apiFetch(`view=mBoxscore&scoringPeriodId=${week}`);
  const games = (box.schedule || []).filter((m) => m.matchupPeriodId === week);

  const matchups = [];
  for (const g of games) {
    const sides = [];
    for (const key of ["home", "away"]) {
      const s = g[key];
      if (!s) continue;
      const { starters, bench } = parseRoster(s, week);
      const startPts = n2(starters.reduce((a, p) => a + p.points, 0));
      const benchPts = n2(bench.reduce((a, p) => a + p.points, 0));
      const total = n2(s.totalPoints ?? startPts);
      const best = [...starters].sort((a, b) => b.points - a.points)[0] || null;
      // "worst" ignores unavoidable zero-slot D/ST edge cases lightly; keep it simple
      const worst = [...starters].sort((a, b) => a.points - b.points)[0] || null;
      const topBench = [...bench].sort((a, b) => b.points - a.points)[0] || null;
      sides.push({
        teamId: s.teamId,
        team: teamName[s.teamId] || `Team ${s.teamId}`,
        record: teamRecord[s.teamId],
        total,
        benchPoints: benchPts,
        starters,
        bench,
        best,
        worst,
        topBench,
      });
    }
    if (sides.length === 2) {
      const [a, b] = sides.sort((x, y) => y.total - x.total);
      matchups.push({
        winner: a,
        loser: b,
        margin: n2(a.total - b.total),
        combined: n2(a.total + b.total),
      });
    }
  }

  // League-wide angles
  const allSides = matchups.flatMap((m) => [m.winner, m.loser]);
  const byScore = [...allSides].sort((a, b) => b.total - a.total);
  const highTeam = byScore[0];
  const lowTeam = byScore[byScore.length - 1];
  const blowout = [...matchups].sort((a, b) => b.margin - a.margin)[0];
  const nailbiter = [...matchups].sort((a, b) => a.margin - b.margin)[0];
  const unluckyLoser = [...matchups].sort((a, b) => b.loser.total - a.loser.total)[0];
  const luckyWinner = [...matchups].sort((a, b) => a.winner.total - b.winner.total)[0];

  const allStarters = allSides.flatMap((s) =>
    s.starters.map((p) => ({ ...p, team: s.team }))
  );
  const topPerformer = [...allStarters].sort((a, b) => b.points - a.points)[0];
  // Biggest bust: a starter that scored far under its projection (min 8 proj to matter)
  const busts = allStarters
    .filter((p) => p.projected >= 8)
    .map((p) => ({ ...p, miss: n2(p.projected - p.points) }))
    .sort((a, b) => b.miss - a.miss);
  const biggestBust = busts[0];
  const benchRegret = [...allSides].sort((a, b) => b.benchPoints - a.benchPoints)[0];

  const result = {
    league: leagueName,
    season: SEASON,
    week,
    scrapedAt: new Date().toISOString(),
    matchups,
    angles: {
      highTeam: { team: highTeam.team, points: highTeam.total },
      lowTeam: { team: lowTeam.team, points: lowTeam.total },
      blowout: {
        winner: blowout.winner.team, loser: blowout.loser.team,
        margin: blowout.margin, score: `${blowout.winner.total}–${blowout.loser.total}`,
      },
      nailbiter: {
        winner: nailbiter.winner.team, loser: nailbiter.loser.team,
        margin: nailbiter.margin, score: `${nailbiter.winner.total}–${nailbiter.loser.total}`,
      },
      unluckyLoser: { team: unluckyLoser.loser.team, points: unluckyLoser.loser.total, lostTo: unluckyLoser.winner.team },
      luckyWinner: { team: luckyWinner.winner.team, points: luckyWinner.winner.total, beat: luckyWinner.loser.team },
      topPerformer: topPerformer && { name: topPerformer.name, pos: topPerformer.pos, points: topPerformer.points, team: topPerformer.team },
      biggestBust: biggestBust && { name: biggestBust.name, pos: biggestBust.pos, points: biggestBust.points, projected: biggestBust.projected, team: biggestBust.team },
      benchRegret: { team: benchRegret.team, benchPoints: benchRegret.benchPoints, topBench: benchRegret.topBench },
    },
  };

  // Persist JSON
  const fs = await import("node:fs");
  const path = await import("node:path");
  fs.mkdirSync(path.join(process.cwd(), "public"), { recursive: true });
  const outPath = path.join(process.cwd(), "public", `espn-week-${week}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  if (jsonOnly) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // ---- Draft writeup ----
  const a = result.angles;
  const L = [];
  L.push(`# ${leagueName} — Week ${week} Recap\n`);
  L.push("## Scoreboard");
  for (const m of [...matchups].sort((x, y) => y.combined - x.combined)) {
    L.push(`- **${m.winner.team}** def. ${m.loser.team}, ${m.winner.total}–${m.loser.total} (margin ${m.margin})`);
  }
  L.push("");
  L.push("## Storylines");
  L.push(`- 🏆 **Top score:** ${a.highTeam.team} dropped **${a.highTeam.points}**.`);
  L.push(`- 💩 **Low score:** ${a.lowTeam.team} managed just **${a.lowTeam.points}**.`);
  L.push(`- 💥 **Blowout of the week:** ${a.blowout.winner} buried ${a.blowout.loser} by **${a.blowout.margin}** (${a.blowout.score}).`);
  L.push(`- 😰 **Nailbiter:** ${a.nailbiter.winner} edged ${a.nailbiter.loser} by **${a.nailbiter.margin}** (${a.nailbiter.score}).`);
  L.push(`- 🎭 **Unluckiest loser:** ${a.unluckyLoser.team} put up **${a.unluckyLoser.points}** and still lost to ${a.unluckyLoser.lostTo}.`);
  L.push(`- 🍀 **Luckiest winner:** ${a.luckyWinner.team} won with just **${a.luckyWinner.points}** over ${a.luckyWinner.beat}.`);
  if (a.topPerformer)
    L.push(`- ⭐ **Player of the week:** ${a.topPerformer.name} (${a.topPerformer.pos}, ${a.topPerformer.team}) — **${a.topPerformer.points}** pts.`);
  if (a.biggestBust)
    L.push(`- 🪦 **Biggest bust:** ${a.biggestBust.name} (${a.biggestBust.pos}, ${a.biggestBust.team}) — **${a.biggestBust.points}** on a **${a.biggestBust.projected}** projection.`);
  if (a.benchRegret.topBench)
    L.push(`- 🪑 **Bench regret:** ${a.benchRegret.team} left **${a.benchRegret.benchPoints}** on the bench, including ${a.benchRegret.topBench.name} (${a.benchRegret.topBench.points}).`);
  L.push("");
  L.push("## Standings after this week");
  const standings = Object.keys(teamName)
    .map((id) => ({ team: teamName[id], ...teamRecord[id] }))
    .sort((x, y) => (y.wins - x.wins) || (x.losses - y.losses));
  standings.forEach((s, i) => L.push(`${i + 1}. ${s.team} (${s.wins}-${s.losses}${s.ties ? "-" + s.ties : ""})`));

  console.log("\n" + L.join("\n") + "\n");
  console.error(`[data written to ${outPath}]`);
}

main().catch((e) => {
  console.error("Scrape failed:", e.message);
  process.exit(1);
});
