/**
 * Post-process scraped data: assign team IDs, derive standings from matchups.
 * Run: node fix-data.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("public/fantasy-data.json", "utf-8"));

// Owner mapping: team names across seasons → owner name + stable owner ID
const OWNERS = {
  "Tomas":            { id: "1",  teams: ["Is Mayonnaise a Quarterback", "Samuel L Jaxson Dart"] },
  "Scott":            { id: "2",  teams: ["Scott"] },
  "Jason":            { id: "3",  teams: ["La PortaPotty"] },
  "Gerry":            { id: "12", teams: ["Buck Nasty"] },
  "Fred":             { id: "4",  teams: ["Half Order Nachos"] },
  "Atiba":            { id: "5",  teams: ["Upbeat360Fly"] },
  "Chris (WV)":       { id: "6",  teams: ["The Sour Gang", "The Hazy Gang"] },
  "Seth":             { id: "7",  teams: ["GloboGymPurpleCobras", "A Near Seth Experience"] },
  "Christina":        { id: "8",  teams: ["Tiina Gail"] },
  "Chris Michael":    { id: "9",  teams: ["Hawk Tua Tagovailoa"] },
  "Dave":             { id: "10", teams: ["Cville Heuristicats"] },
  "William":          { id: "11", teams: ["Steamin Willy Beaman"] },
};

// Build name → unique team ID (per team name) and name → owner lookups
const nameToTeamId = {};
const nameToOwnerId = {};
const nameToOwner = {};
let autoId = 1;
for (const [owner, info] of Object.entries(OWNERS)) {
  for (const team of info.teams) {
    nameToTeamId[team] = String(autoId++);
    nameToOwnerId[team] = info.id;
    nameToOwner[team] = owner;
  }
}

// Fix team IDs in matchups and compute winners
for (const m of data.matchups) {
  m.homeTeamId = nameToTeamId[m.homeTeamName] || null;
  m.awayTeamId = nameToTeamId[m.awayTeamName] || null;
  m.winner =
    m.homeScore > m.awayScore ? m.homeTeamId
    : m.awayScore > m.homeScore ? m.awayTeamId
    : null;
}

// Fix season data too
for (const season of data.seasons || []) {
  for (const m of season.matchups) {
    m.homeTeamId = nameToTeamId[m.homeTeamName] || null;
    m.awayTeamId = nameToTeamId[m.awayTeamName] || null;
    m.winner =
      m.homeScore > m.awayScore ? m.homeTeamId
      : m.awayScore > m.homeScore ? m.awayTeamId
      : null;
  }
}

// Derive team summaries per season
for (const season of data.seasons || []) {
  const summaries = {};

  for (const m of season.matchups) {
    for (const side of ["home", "away"]) {
      const id = side === "home" ? m.homeTeamId : m.awayTeamId;
      const name = side === "home" ? m.homeTeamName : m.awayTeamName;
      const pts = side === "home" ? m.homeScore : m.awayScore;
      const oppPts = side === "home" ? m.awayScore : m.homeScore;

      if (!id) continue;
      if (!summaries[id]) {
        summaries[id] = {
          teamId: id, teamName: name, owner: nameToOwner[name] || "Unknown",
          wins: 0, losses: 0, ties: 0,
          pointsFor: 0, pointsAgainst: 0,
          weeklyScores: [], highScore: 0, avgScore: 0, rank: 0,
        };
      }
      const s = summaries[id];
      s.pointsFor += pts;
      s.pointsAgainst += oppPts;
      s.weeklyScores.push({ week: m.week, score: pts });
      if (pts > s.highScore) s.highScore = pts;

      if (m.winner === id) s.wins++;
      else if (m.winner === null) s.ties++;
      else s.losses++;
    }
  }

  // Compute averages and sort
  const sorted = Object.values(summaries)
    .map(s => {
      const gp = s.wins + s.losses + s.ties;
      s.avgScore = gp > 0 ? Math.round((s.pointsFor / gp) * 100) / 100 : 0;
      s.pointsFor = Math.round(s.pointsFor * 100) / 100;
      s.pointsAgainst = Math.round(s.pointsAgainst * 100) / 100;
      s.weeklyScores.sort((a, b) => a.week - b.week);
      return s;
    })
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.pointsFor - a.pointsFor);

  sorted.forEach((s, i) => (s.rank = i + 1));
  season.teamSummaries = sorted;
  season.teams = sorted;
}

// Add ownerId to all summaries
for (const season of data.seasons || []) {
  for (const t of season.teamSummaries) {
    t.ownerId = nameToOwnerId[t.teamName] || t.teamId;
  }
}

// Build owners lookup for the app
data.owners = {};
for (const [owner, info] of Object.entries(OWNERS)) {
  data.owners[info.id] = { name: owner, teams: info.teams };
}

// Use most recent season for top-level standings
const latest = data.seasons?.[data.seasons.length - 1];
data.standings = latest?.teamSummaries || [];
data.teamSummaries = latest?.teamSummaries || [];

writeFileSync("public/fantasy-data.json", JSON.stringify(data, null, 2));

console.log("✅ Data fixed!");
for (const season of data.seasons || []) {
  console.log(`\n${season.season} Season:`);
  for (const t of season.teamSummaries) {
    console.log(`  ${t.rank}. ${t.teamName}: ${t.wins}-${t.losses} (${t.pointsFor} PF, avg ${t.avgScore}, high ${t.highScore})`);
  }
}
