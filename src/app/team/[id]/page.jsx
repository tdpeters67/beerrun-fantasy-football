import Link from "next/link";
import data from "../../../lib/data";
import { Panel } from "../../../lib/Panel";
import { C, card, th, td, posColor } from "../../../lib/theme";

export default function TeamPage({ params }) {
  const { id } = params;
  const team = data.teams.find((t) => String(t.id) === String(id));
  if (!team) return (
    <>
      <Link href="/" style={{ color: C.blue, textDecoration: "none", fontSize: "13px" }}>← Standings</Link>
      <p style={{ color: C.dim, padding: "40px 0" }}>Team not found.</p>
    </>
  );

  const rank = data.teams.findIndex((t) => String(t.id) === String(id)) + 1;
  const draftPicks = (data.draft || []).filter((p) => String(p.teamId) === String(id));
  const maxScore = Math.max(...team.weeklyScores.map((w) => w.score), 1);
  const starters = (team.roster || []).filter((p) => !p.benched);
  const bench = (team.roster || []).filter((p) => p.benched);

  return (
    <>
      <Link href="/" style={{ color: C.blue, textDecoration: "none", fontSize: "13px" }}>← Standings</Link>

      <h2 style={{ color: C.gold, margin: "10px 0 2px" }}>{team.name}</h2>
      <p style={{ color: C.dim, margin: "0 0 20px" }}>{team.owner} · #{rank} in the league</p>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "12px", marginBottom: "26px" }}>
        {[
          { label: "Record", value: `${team.wins}-${team.losses}${team.ties ? "-" + team.ties : ""}` },
          { label: "Points For", value: team.pointsFor },
          { label: "Points Against", value: team.pointsAgainst },
          { label: "Avg Score", value: team.avgScore },
          { label: "High", value: team.highScore },
          { label: "Low", value: team.lowScore },
        ].map((c) => (
          <div key={c.label} style={{ background: C.panel, borderRadius: "8px", padding: "14px", textAlign: "center", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "11px", color: C.dim, textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: C.gold }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Weekly scores chart */}
      {team.weeklyScores.length > 0 && (
        <Panel title="Weekly Scores" icon="📊">
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "170px" }}>
            {team.weeklyScores.map((w) => (
              <div key={w.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "11px", color: C.dim, marginBottom: "4px" }}>{w.score}</span>
                <div style={{
                  width: "100%", maxWidth: "48px", height: `${(w.score / maxScore) * 100}%`,
                  background: w.result === "W" ? "linear-gradient(to top, #1a6b2e, #3fb950)" : "linear-gradient(to top, #7a2a20, #f0664e)",
                  borderRadius: "4px 4px 0 0", minHeight: "3px",
                }} />
                <span style={{ fontSize: "11px", color: C.faint, marginTop: "4px" }}>W{w.week}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Schedule / results */}
      {team.weeklyScores.length > 0 && (
        <Panel title="Results" icon="🗓️">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead><tr><th style={th}>Wk</th><th style={th}>Result</th><th style={th}>Score</th><th style={th}>Opponent</th></tr></thead>
            <tbody>
              {team.weeklyScores.map((w, i) => (
                <tr key={w.week} style={{ background: i % 2 ? C.panelAlt : "transparent" }}>
                  <td style={td}>{w.week}</td>
                  <td style={{ ...td, color: w.result === "W" ? C.green : C.red, fontWeight: 700 }}>{w.result}</td>
                  <td style={td}>{w.score} – {w.oppScore}</td>
                  <td style={{ ...td, color: C.dim }}>{w.opp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Latest roster */}
      {starters.length > 0 && (
        <Panel title={`Latest Lineup · Week ${Math.max(...data.league.completedWeeks, 0)}`} icon="👥">
          <RosterTable players={starters} label="Starters" />
          {bench.length > 0 && <div style={{ marginTop: "16px" }}><RosterTable players={bench} label="Bench" dim /></div>}
        </Panel>
      )}

      {/* Draft */}
      {draftPicks.length > 0 && (
        <Panel title="Draft Picks" icon="📋">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead><tr><th style={th}>Rd.Pk</th><th style={th}>Overall</th><th style={th}>Player</th><th style={th}>Pos</th><th style={th}>Wk 1</th></tr></thead>
            <tbody>
              {draftPicks.map((p, i) => (
                <tr key={p.overall} style={{ background: i % 2 ? C.panelAlt : "transparent" }}>
                  <td style={{ ...td, color: C.dim }}>{p.round}.{p.pick}</td>
                  <td style={{ ...td, color: C.faint }}>{p.overall}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{p.player}</td>
                  <td style={td}><span style={{ color: posColor(p.pos), fontWeight: 600 }}>{p.pos}</span></td>
                  <td style={{ ...td, color: C.dim }}>{p.firstWeekPts == null ? "—" : p.firstWeekPts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}

function RosterTable({ players, label, dim }) {
  return (
    <div>
      <div style={{ fontSize: "12px", color: C.dim, textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <tbody>
          {players.map((p, i) => (
            <tr key={i} style={{ background: i % 2 ? C.panelAlt : "transparent" }}>
              <td style={{ ...td, width: "60px", color: C.faint }}>{p.slot}</td>
              <td style={{ ...td, color: dim ? C.dim : C.text }}>{p.name}</td>
              <td style={{ ...td, width: "50px" }}><span style={{ color: posColor(p.pos), fontWeight: 600 }}>{p.pos}</span></td>
              <td style={{ ...td, width: "60px", textAlign: "right", color: p.points >= 20 ? C.green : p.points < 5 ? C.red : C.text }}>{p.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
