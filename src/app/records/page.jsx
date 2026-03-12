"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function RecordsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/fantasy-data.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p style={{ color: "#8899aa", padding: "40px" }}>Loading...</p>;

  const allMatchups = data.matchups || [];
  const seasons = data.seasons || [];

  // Flatten all team-game appearances
  const appearances = [];
  for (const m of allMatchups) {
    const seasonYear = seasons.find((s) =>
      s.matchups.some((sm) => sm === m || (sm.week === m.week && sm.homeTeamName === m.homeTeamName && sm.homeScore === m.homeScore))
    )?.season || "";

    appearances.push(
      { team: m.homeTeamName, id: m.homeTeamId, score: m.homeScore, oppScore: m.awayScore, opp: m.awayTeamName, week: m.week, season: seasonYear },
      { team: m.awayTeamName, id: m.awayTeamId, score: m.awayScore, oppScore: m.homeScore, opp: m.homeTeamName, week: m.week, season: seasonYear },
    );
  }

  // Sort helpers
  const top = (arr, key, n = 10) => [...arr].sort((a, b) => b[key] - a[key]).slice(0, n);
  const bottom = (arr, key, n = 10) => [...arr].sort((a, b) => a[key] - b[key]).slice(0, n);

  // Biggest blowouts
  const blowouts = allMatchups
    .map((m) => ({ ...m, margin: Math.abs(m.homeScore - m.awayScore) }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10);

  // Closest games
  const closest = allMatchups
    .map((m) => ({ ...m, margin: Math.abs(m.homeScore - m.awayScore) }))
    .filter((m) => m.margin > 0)
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 10);

  // Highest scoring games (combined)
  const highestCombined = allMatchups
    .map((m) => ({ ...m, total: m.homeScore + m.awayScore }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Lowest scoring games (combined)
  const lowestCombined = allMatchups
    .map((m) => ({ ...m, total: m.homeScore + m.awayScore }))
    .sort((a, b) => a.total - b.total)
    .slice(0, 10);

  // Per-team aggregates across all seasons
  const ownerStats = {};
  const owners = data.owners || {};
  for (const season of seasons) {
    for (const t of season.teamSummaries || []) {
      const oid = t.ownerId || t.teamId;
      if (!ownerStats[oid]) {
        ownerStats[oid] = {
          owner: t.owner,
          teamNames: new Set(),
          wins: 0, losses: 0, ties: 0,
          pointsFor: 0, pointsAgainst: 0,
          highScore: 0, lowScore: Infinity,
          seasonCount: 0,
          championships: 0,
        };
      }
      const o = ownerStats[oid];
      o.teamNames.add(t.teamName);
      o.wins += t.wins;
      o.losses += t.losses;
      o.ties += t.ties;
      o.pointsFor += t.pointsFor;
      o.pointsAgainst += t.pointsAgainst;
      if (t.highScore > o.highScore) o.highScore = t.highScore;
      o.seasonCount++;

      // Check if this team was #1 in the season
      if (t.rank === 1) o.championships++;

      // Track low score
      for (const w of t.weeklyScores || []) {
        if (w.score > 0 && w.score < o.lowScore) o.lowScore = w.score;
      }
    }
  }

  const ownerList = Object.entries(ownerStats)
    .map(([id, o]) => ({
      id,
      ...o,
      teamNames: [...o.teamNames],
      pointsFor: Math.round(o.pointsFor * 100) / 100,
      pointsAgainst: Math.round(o.pointsAgainst * 100) / 100,
      gamesPlayed: o.wins + o.losses + o.ties,
      winPct: o.wins + o.losses + o.ties > 0
        ? Math.round((o.wins / (o.wins + o.losses + o.ties)) * 1000) / 10
        : 0,
      avgPF: o.wins + o.losses + o.ties > 0
        ? Math.round((o.pointsFor / (o.wins + o.losses + o.ties)) * 100) / 100
        : 0,
      avgPA: o.wins + o.losses + o.ties > 0
        ? Math.round((o.pointsAgainst / (o.wins + o.losses + o.ties)) * 100) / 100
        : 0,
    }))
    .sort((a, b) => b.winPct - a.winPct || b.pointsFor - a.pointsFor);

  const cardStyle = {
    background: "#131f2e", borderRadius: "8px", padding: "16px",
    border: "1px solid #1a2a3a", marginBottom: "24px",
  };

  const thStyle = { padding: "8px", textAlign: "left", color: "#8899aa", fontSize: "13px" };
  const tdStyle = { padding: "6px 8px", borderBottom: "1px solid #1a2a3a" };

  return (
    <>
      <Link href="/" style={{ color: "#5b9bd5", textDecoration: "none", fontSize: "13px" }}>
        &larr; Back to standings
      </Link>

      <h2 style={{ color: "#d4a017", marginBottom: "24px" }}>League Records & Stats</h2>

      {/* All-Time Owner Rankings */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", color: "#e8e8e8" }}>All-Time Owner Rankings</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #2a3a4a" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Owner</th>
                <th style={thStyle}>W</th>
                <th style={thStyle}>L</th>
                <th style={thStyle}>Win%</th>
                <th style={thStyle}>PF</th>
                <th style={thStyle}>PA</th>
                <th style={thStyle}>Avg PF</th>
                <th style={thStyle}>Avg PA</th>
                <th style={thStyle}>High</th>
              </tr>
            </thead>
            <tbody>
              {ownerList.filter(o => o.seasonCount > 0).map((o, i) => (
                <tr key={o.id} style={{ background: i % 2 ? "#131f2e" : "transparent" }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>
                    <span style={{ color: "#e8e8e8" }}>{o.owner}</span>
                    <br />
                    <span style={{ fontSize: "11px", color: "#667788" }}>{o.teamNames.join(", ")}</span>
                  </td>
                  <td style={{ ...tdStyle, color: "#4caf50" }}>{o.wins}</td>
                  <td style={{ ...tdStyle, color: "#e57373" }}>{o.losses}</td>
                  <td style={tdStyle}>{o.winPct}%</td>
                  <td style={tdStyle}>{o.pointsFor}</td>
                  <td style={{ ...tdStyle, color: "#8899aa" }}>{o.pointsAgainst}</td>
                  <td style={tdStyle}>{o.avgPF}</td>
                  <td style={{ ...tdStyle, color: "#8899aa" }}>{o.avgPA}</td>
                  <td style={{ ...tdStyle, color: "#d4a017" }}>{o.highScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Highest Individual Scores */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", color: "#e8e8e8" }}>Highest Single-Week Scores</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #2a3a4a" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Team</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Week</th>
              <th style={thStyle}>vs</th>
            </tr>
          </thead>
          <tbody>
            {top(appearances, "score").map((a, i) => (
              <tr key={i} style={{ background: i % 2 ? "#131f2e" : "transparent" }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{a.team}</td>
                <td style={{ ...tdStyle, color: "#d4a017", fontWeight: 700 }}>{a.score}</td>
                <td style={tdStyle}>{a.season} Wk {a.week}</td>
                <td style={{ ...tdStyle, color: "#8899aa" }}>{a.opp} ({a.oppScore})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Lowest Individual Scores */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", color: "#e8e8e8" }}>Lowest Single-Week Scores</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #2a3a4a" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Team</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Week</th>
              <th style={thStyle}>vs</th>
            </tr>
          </thead>
          <tbody>
            {bottom(appearances.filter(a => a.score > 0), "score").map((a, i) => (
              <tr key={i} style={{ background: i % 2 ? "#131f2e" : "transparent" }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{a.team}</td>
                <td style={{ ...tdStyle, color: "#e57373", fontWeight: 700 }}>{a.score}</td>
                <td style={tdStyle}>{a.season} Wk {a.week}</td>
                <td style={{ ...tdStyle, color: "#8899aa" }}>{a.opp} ({a.oppScore})</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Most Points Scored Against */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", color: "#e8e8e8" }}>Most Points Scored Against (Single Week)</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #2a3a4a" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Team</th>
              <th style={thStyle}>PA</th>
              <th style={thStyle}>Week</th>
              <th style={thStyle}>Opponent</th>
            </tr>
          </thead>
          <tbody>
            {top(appearances, "oppScore").map((a, i) => (
              <tr key={i} style={{ background: i % 2 ? "#131f2e" : "transparent" }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{a.team} ({a.score})</td>
                <td style={{ ...tdStyle, color: "#e57373", fontWeight: 700 }}>{a.oppScore}</td>
                <td style={tdStyle}>{a.season} Wk {a.week}</td>
                <td style={{ ...tdStyle, color: "#8899aa" }}>{a.opp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Biggest Blowouts */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", color: "#e8e8e8" }}>Biggest Blowouts</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #2a3a4a" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Winner</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Loser</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Margin</th>
              <th style={thStyle}>Week</th>
            </tr>
          </thead>
          <tbody>
            {blowouts.map((m, i) => {
              const winnerHome = m.homeScore > m.awayScore;
              return (
                <tr key={i} style={{ background: i % 2 ? "#131f2e" : "transparent" }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{winnerHome ? m.homeTeamName : m.awayTeamName}</td>
                  <td style={{ ...tdStyle, color: "#4caf50", fontWeight: 700 }}>
                    {winnerHome ? m.homeScore : m.awayScore}
                  </td>
                  <td style={tdStyle}>{winnerHome ? m.awayTeamName : m.homeTeamName}</td>
                  <td style={{ ...tdStyle, color: "#e57373" }}>
                    {winnerHome ? m.awayScore : m.homeScore}
                  </td>
                  <td style={{ ...tdStyle, color: "#d4a017", fontWeight: 700 }}>
                    {Math.round(m.margin * 100) / 100}
                  </td>
                  <td style={{ ...tdStyle, color: "#8899aa" }}>Wk {m.week}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Closest Games */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", color: "#e8e8e8" }}>Closest Games</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #2a3a4a" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Winner</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Loser</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Margin</th>
              <th style={thStyle}>Week</th>
            </tr>
          </thead>
          <tbody>
            {closest.map((m, i) => {
              const winnerHome = m.homeScore > m.awayScore;
              return (
                <tr key={i} style={{ background: i % 2 ? "#131f2e" : "transparent" }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{winnerHome ? m.homeTeamName : m.awayTeamName}</td>
                  <td style={{ ...tdStyle, color: "#4caf50" }}>
                    {winnerHome ? m.homeScore : m.awayScore}
                  </td>
                  <td style={tdStyle}>{winnerHome ? m.awayTeamName : m.homeTeamName}</td>
                  <td style={{ ...tdStyle, color: "#e57373" }}>
                    {winnerHome ? m.awayScore : m.homeScore}
                  </td>
                  <td style={{ ...tdStyle, color: "#d4a017", fontWeight: 700 }}>
                    {Math.round(m.margin * 100) / 100}
                  </td>
                  <td style={{ ...tdStyle, color: "#8899aa" }}>Wk {m.week}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Highest Combined Scoring Games */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", color: "#e8e8e8" }}>Highest Combined Score Games</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #2a3a4a" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Matchup</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Combined</th>
              <th style={thStyle}>Week</th>
            </tr>
          </thead>
          <tbody>
            {highestCombined.map((m, i) => (
              <tr key={i} style={{ background: i % 2 ? "#131f2e" : "transparent" }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{m.homeTeamName} vs {m.awayTeamName}</td>
                <td style={tdStyle}>{m.homeScore} - {m.awayScore}</td>
                <td style={{ ...tdStyle, color: "#d4a017", fontWeight: 700 }}>
                  {Math.round(m.total * 100) / 100}
                </td>
                <td style={{ ...tdStyle, color: "#8899aa" }}>Wk {m.week}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Lowest Combined Scoring Games */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", color: "#e8e8e8" }}>Lowest Combined Score Games</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #2a3a4a" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Matchup</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Combined</th>
              <th style={thStyle}>Week</th>
            </tr>
          </thead>
          <tbody>
            {lowestCombined.map((m, i) => (
              <tr key={i} style={{ background: i % 2 ? "#131f2e" : "transparent" }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{m.homeTeamName} vs {m.awayTeamName}</td>
                <td style={tdStyle}>{m.homeScore} - {m.awayScore}</td>
                <td style={{ ...tdStyle, color: "#e57373", fontWeight: 700 }}>
                  {Math.round(m.total * 100) / 100}
                </td>
                <td style={{ ...tdStyle, color: "#8899aa" }}>Wk {m.week}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
