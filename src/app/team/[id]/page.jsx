"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function TeamPage({ params }) {
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/fantasy-data.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p style={{ color: "#8899aa", padding: "40px" }}>Loading...</p>;

  const seasonYear = searchParams.get("season")
    ? Number(searchParams.get("season"))
    : data.seasons?.[data.seasons.length - 1]?.season;

  const season = data.seasons?.find((s) => s.season === seasonYear) || data.seasons?.[0];
  const team = season?.teamSummaries?.find((t) => String(t.teamId) === String(params.id));

  if (!team) return <p style={{ color: "#8899aa", padding: "40px" }}>Team not found.</p>;

  const maxScore = Math.max(...team.weeklyScores.map((w) => w.score), 1);
  const owners = data.owners || {};

  // All-time stats for this owner across seasons
  const ownerId = team.ownerId || team.teamId;
  const allTimeSeasons = (data.seasons || [])
    .map((s) => s.teamSummaries?.find((t) => t.ownerId === ownerId))
    .filter(Boolean);

  const allTimeWins = allTimeSeasons.reduce((sum, t) => sum + t.wins, 0);
  const allTimeLosses = allTimeSeasons.reduce((sum, t) => sum + t.losses, 0);
  const allTimePF = Math.round(allTimeSeasons.reduce((sum, t) => sum + t.pointsFor, 0) * 100) / 100;
  const allTimeHigh = Math.max(...allTimeSeasons.map((t) => t.highScore));

  // Head-to-head from this season's matchups
  const h2h = {};
  for (const m of season?.matchups || []) {
    if (String(m.homeTeamId) === String(params.id)) {
      const opp = m.awayTeamName;
      if (!h2h[opp]) h2h[opp] = { wins: 0, losses: 0, ties: 0 };
      if (m.winner === m.homeTeamId) h2h[opp].wins++;
      else if (m.winner === null) h2h[opp].ties++;
      else h2h[opp].losses++;
    } else if (String(m.awayTeamId) === String(params.id)) {
      const opp = m.homeTeamName;
      if (!h2h[opp]) h2h[opp] = { wins: 0, losses: 0, ties: 0 };
      if (m.winner === m.awayTeamId) h2h[opp].wins++;
      else if (m.winner === null) h2h[opp].ties++;
      else h2h[opp].losses++;
    }
  }

  return (
    <>
      <Link href="/" style={{ color: "#5b9bd5", textDecoration: "none", fontSize: "13px" }}>
        &larr; Back to standings
      </Link>

      <h2 style={{ color: "#d4a017", marginBottom: "4px" }}>{team.teamName}</h2>
      <p style={{ color: "#8899aa", margin: "0 0 24px" }}>
        Owner: {team.owner} &middot; {seasonYear} Season
        {allTimeSeasons.length > 1 && (
          <span> &middot; Previous names: {allTimeSeasons.filter(t => t.teamName !== team.teamName).map(t => t.teamName).join(", ")}</span>
        )}
      </p>

      {/* Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "12px", marginBottom: "32px",
      }}>
        {[
          { label: `${seasonYear} Record`, value: `${team.wins}-${team.losses}` },
          { label: "Points For", value: team.pointsFor },
          { label: "Avg Score", value: team.avgScore },
          { label: "High Score", value: team.highScore },
          ...(allTimeSeasons.length > 1 ? [
            { label: "All-Time Record", value: `${allTimeWins}-${allTimeLosses}` },
            { label: "All-Time PF", value: allTimePF },
            { label: "All-Time High", value: allTimeHigh },
          ] : []),
        ].map((card) => (
          <div key={card.label} style={{
            background: "#131f2e", borderRadius: "8px", padding: "16px",
            textAlign: "center", border: "1px solid #1a2a3a",
          }}>
            <div style={{ fontSize: "12px", color: "#8899aa" }}>{card.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#d4a017" }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Weekly Score Bar Chart */}
      <section style={{ marginBottom: "40px" }}>
        <h3 style={{ borderBottom: "1px solid #2a3a4a", paddingBottom: "8px" }}>
          Weekly Scores
        </h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "180px" }}>
          {team.weeklyScores.map((w) => {
            const pct = (w.score / maxScore) * 100;
            return (
              <div key={w.week} style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", height: "100%", justifyContent: "flex-end",
              }}>
                <span style={{ fontSize: "10px", color: "#8899aa", marginBottom: "4px" }}>
                  {w.score}
                </span>
                <div style={{
                  width: "100%", maxWidth: "40px",
                  height: `${pct}%`,
                  background: "linear-gradient(to top, #1a5276, #5b9bd5)",
                  borderRadius: "4px 4px 0 0", minHeight: "2px",
                }} />
                <span style={{ fontSize: "10px", color: "#667788", marginTop: "4px" }}>
                  W{w.week}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Head-to-Head */}
      <section>
        <h3 style={{ borderBottom: "1px solid #2a3a4a", paddingBottom: "8px" }}>
          Head-to-Head ({seasonYear})
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{
              textAlign: "left", borderBottom: "2px solid #2a3a4a",
              color: "#8899aa", fontSize: "13px",
            }}>
              <th style={{ padding: "8px" }}>Opponent</th>
              <th style={{ padding: "8px" }}>W</th>
              <th style={{ padding: "8px" }}>L</th>
              <th style={{ padding: "8px" }}>T</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(h2h)
              .sort(([, a], [, b]) => b.wins - a.wins)
              .map(([opp, record], i) => (
                <tr key={opp} style={{
                  borderBottom: "1px solid #1a2a3a",
                  background: i % 2 === 0 ? "transparent" : "#131f2e",
                }}>
                  <td style={{ padding: "8px" }}>{opp}</td>
                  <td style={{ padding: "8px", color: "#4caf50" }}>{record.wins}</td>
                  <td style={{ padding: "8px", color: "#e57373" }}>{record.losses}</td>
                  <td style={{ padding: "8px", color: "#8899aa" }}>{record.ties}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
