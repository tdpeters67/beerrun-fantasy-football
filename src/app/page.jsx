"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(null);

  if (loading) {
    if (typeof window !== "undefined") {
      fetch("/fantasy-data.json")
        .then((r) => r.json())
        .then((d) => {
          setData(d);
          setSelectedSeason(d.seasons?.[d.seasons.length - 1]?.season || null);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
    return <p style={{ textAlign: "center", padding: "60px", color: "#8899aa" }}>Loading...</p>;
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2>No data yet</h2>
        <p style={{ color: "#8899aa" }}>
          Run the browser scraper to pull your league data, then place
          the output at <code>public/fantasy-data.json</code>.
        </p>
      </div>
    );
  }

  const seasons = data.seasons || [];
  const season = seasons.find((s) => s.season === selectedSeason) || seasons[0];
  const teamSummaries = season?.teamSummaries || data.teamSummaries || [];
  const matchups = season?.matchups || data.matchups || [];
  const owners = data.owners || {};

  // Group matchups by week
  const weekMap = {};
  for (const m of matchups) {
    if (!weekMap[m.week]) weekMap[m.week] = [];
    weekMap[m.week].push(m);
  }
  const weeks = Object.keys(weekMap).map(Number).sort((a, b) => a - b);

  return (
    <>
      {/* Season selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px", flexWrap: "wrap" }}>
        <h2 style={{ color: "#d4a017", margin: 0 }}>
          {data.league.name} — {selectedSeason}
        </h2>
        {seasons.length > 1 && (
          <div style={{ display: "flex", gap: "8px" }}>
            {seasons.map((s) => (
              <button
                key={s.season}
                onClick={() => setSelectedSeason(s.season)}
                style={{
                  padding: "4px 14px",
                  borderRadius: "4px",
                  border: "1px solid #2a3a4a",
                  background: s.season === selectedSeason ? "#d4a017" : "#131f2e",
                  color: s.season === selectedSeason ? "#0f1923" : "#8899aa",
                  cursor: "pointer",
                  fontWeight: s.season === selectedSeason ? 700 : 400,
                  fontSize: "13px",
                }}
              >
                {s.season}
              </button>
            ))}
          </div>
        )}
      </div>
      <p style={{ color: "#8899aa", marginTop: "4px", fontSize: "13px" }}>
        Scraped {new Date(data.scrapedAt).toLocaleDateString()}
      </p>

      {/* Standings Table */}
      <section style={{ marginBottom: "40px" }}>
        <h3 style={{ borderBottom: "1px solid #2a3a4a", paddingBottom: "8px" }}>
          Standings
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{
                textAlign: "left", borderBottom: "2px solid #2a3a4a",
                color: "#8899aa", fontSize: "13px",
              }}>
                <th style={{ padding: "8px" }}>#</th>
                <th style={{ padding: "8px" }}>Team</th>
                <th style={{ padding: "8px" }}>Owner</th>
                <th style={{ padding: "8px" }}>W</th>
                <th style={{ padding: "8px" }}>L</th>
                <th style={{ padding: "8px" }}>PF</th>
                <th style={{ padding: "8px" }}>PA</th>
                <th style={{ padding: "8px" }}>Avg</th>
                <th style={{ padding: "8px" }}>High</th>
              </tr>
            </thead>
            <tbody>
              {teamSummaries.map((t, i) => (
                <tr key={t.teamId} style={{
                  borderBottom: "1px solid #1a2a3a",
                  background: i % 2 === 0 ? "transparent" : "#131f2e",
                }}>
                  <td style={{ padding: "8px", color: "#8899aa" }}>{i + 1}</td>
                  <td style={{ padding: "8px" }}>
                    <Link href={`/team/${t.teamId}?season=${selectedSeason}`}
                      style={{ color: "#5b9bd5", textDecoration: "none" }}>
                      {t.teamName}
                    </Link>
                  </td>
                  <td style={{ padding: "8px", color: "#8899aa" }}>{t.owner}</td>
                  <td style={{ padding: "8px", color: "#4caf50" }}>{t.wins}</td>
                  <td style={{ padding: "8px", color: "#e57373" }}>{t.losses}</td>
                  <td style={{ padding: "8px" }}>{t.pointsFor}</td>
                  <td style={{ padding: "8px", color: "#8899aa" }}>{t.pointsAgainst}</td>
                  <td style={{ padding: "8px" }}>{t.avgScore}</td>
                  <td style={{ padding: "8px", color: "#d4a017" }}>{t.highScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Weekly Scoreboard */}
      <section>
        <h3 style={{ borderBottom: "1px solid #2a3a4a", paddingBottom: "8px" }}>
          Weekly Scoreboard
        </h3>
        {weeks.map((week) => (
          <div key={week} style={{ marginBottom: "24px" }}>
            <h4 style={{ color: "#8899aa", marginBottom: "8px" }}>Week {week}</h4>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
            }}>
              {weekMap[week].map((m, j) => {
                const homeWon = m.homeScore > m.awayScore;
                const awayWon = m.awayScore > m.homeScore;
                return (
                  <div key={j} style={{
                    background: "#131f2e", borderRadius: "8px",
                    padding: "12px 16px", border: "1px solid #1a2a3a",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{
                        fontWeight: homeWon ? 700 : 400,
                        color: homeWon ? "#4caf50" : "#e8e8e8",
                      }}>{m.homeTeamName}</span>
                      <span style={{ fontWeight: homeWon ? 700 : 400 }}>{m.homeScore}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{
                        fontWeight: awayWon ? 700 : 400,
                        color: awayWon ? "#4caf50" : "#e8e8e8",
                      }}>{m.awayTeamName}</span>
                      <span style={{ fontWeight: awayWon ? 700 : 400 }}>{m.awayScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
