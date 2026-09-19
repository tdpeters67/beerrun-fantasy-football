import Link from "next/link";
import data from "../lib/data";
import { Panel } from "../lib/Panel";
import { C, card, th, td, aquaGloss } from "../lib/theme";

export default function Home() {
  const { league, teams, weeks, recaps } = data;
  const latestWeek = weeks[weeks.length - 1];
  const latestRecap = recaps?.[0];

  return (
    <>
      {/* Hero */}
      <section style={{ ...card, background: aquaGloss, textAlign: "center", padding: "28px" }}>
        <div style={{ fontSize: "13px", color: C.dim, letterSpacing: "1px", textTransform: "uppercase" }}>
          {league.season} Season · Week {league.currentWeek}
        </div>
        <h2 style={{ color: C.gold, margin: "8px 0 4px", fontSize: "28px" }}>{league.name}</h2>
        <p style={{ color: C.dim, margin: 0, fontSize: "14px" }}>
          {teams.length} teams · {league.completedWeeks.length} week{league.completedWeeks.length === 1 ? "" : "s"} in the books
        </p>
      </section>

      {/* Latest recap teaser */}
      {latestRecap && (
        <Link href={`/recaps/${latestRecap.week}`} style={{ textDecoration: "none" }}>
          <section style={{ ...card, borderLeft: `3px solid ${C.gold}`, cursor: "pointer" }}>
            <div style={{ fontSize: "12px", color: C.gold, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              📰 Latest Recap · Week {latestRecap.week}
            </div>
            <p style={{ color: C.text, margin: "8px 0 4px" }}>{firstSentence(latestRecap.intro)}</p>
            <span style={{ color: C.blue, fontSize: "13px" }}>Read the full recap →</span>
          </section>
        </Link>
      )}

      {/* Standings */}
      <Panel title="Standings" icon="🏆">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                <th style={th}>#</th><th style={th}>Team</th><th style={th}>Owner</th>
                <th style={th}>Rec</th><th style={th}>PF</th><th style={th}>PA</th>
                <th style={th}>Avg</th><th style={th}>High</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 ? C.panelAlt : "transparent" }}>
                  <td style={{ ...td, color: C.faint }}>{i + 1}</td>
                  <td style={td}>
                    <Link href={`/team/${t.id}`} style={{ color: C.blue, textDecoration: "none", fontWeight: 600 }}>{t.name}</Link>
                  </td>
                  <td style={{ ...td, color: C.dim }}>{t.owner}</td>
                  <td style={td}>
                    <span style={{ color: C.green }}>{t.wins}</span>
                    <span style={{ color: C.faint }}>–</span>
                    <span style={{ color: C.red }}>{t.losses}</span>
                    {t.ties ? <span style={{ color: C.faint }}>–{t.ties}</span> : null}
                  </td>
                  <td style={td}>{t.pointsFor}</td>
                  <td style={{ ...td, color: C.dim }}>{t.pointsAgainst}</td>
                  <td style={td}>{t.avgScore}</td>
                  <td style={{ ...td, color: C.gold }}>{t.highScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Latest scoreboard */}
      {latestWeek && (
        <Panel title={`Week ${latestWeek.week} Scoreboard`} icon="📅">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {[...latestWeek.games].sort((a, b) => b.combined - a.combined).map((g, j) => (
              <div key={j} style={{ background: C.panelAlt, borderRadius: "8px", padding: "12px 16px", border: `1px solid ${C.border}` }}>
                <Row name={g.homeTeamName} score={g.homeScore} won={g.homeScore > g.awayScore} />
                <Row name={g.awayTeamName} score={g.awayScore} won={g.awayScore > g.homeScore} />
                <div style={{ marginTop: "6px", fontSize: "11px", color: C.faint }}>margin {g.margin}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}

function Row({ name, score, won }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
      <span style={{ fontWeight: won ? 700 : 400, color: won ? C.green : C.text }}>{name}</span>
      <span style={{ fontWeight: won ? 700 : 400 }}>{score}</span>
    </div>
  );
}

function firstSentence(text) {
  const body = (text || "").split("\n").find((l) => l.trim() && !l.startsWith("#")) || "";
  const clean = body.replace(/\*\*/g, "").replace(/\*/g, "");
  const dot = clean.indexOf(". ");
  return dot > 0 ? clean.slice(0, dot + 1) : clean.slice(0, 160);
}
