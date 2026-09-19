import Link from "next/link";
import data from "../../lib/data";
import { Panel } from "../../lib/Panel";
import { C, card, th, td, posColor } from "../../lib/theme";

export default function RecordsPage() {
  const r = data.records || {};

  return (
    <>
      <h2 style={{ color: C.gold, marginBottom: "6px" }}>League Records</h2>
      <p style={{ color: C.dim, marginTop: 0 }}>Season {data.league.season} · through Week {Math.max(...data.league.completedWeeks, 0)}</p>

      <Table
        title="🔥 Top Team Weeks"
        cols={["#", "Team", "Score", "Week", "Opponent"]}
        rows={(r.highestTeamWeeks || []).map((a, i) => [
          i + 1, a.team, <b style={{ color: C.gold }}>{a.score}</b>, `Wk ${a.week}`, `${a.opp} (${a.oppScore})`,
        ])}
      />

      <Table
        title="🧊 Lowest Team Weeks"
        cols={["#", "Team", "Score", "Week", "Opponent"]}
        rows={(r.lowestTeamWeeks || []).map((a, i) => [
          i + 1, a.team, <b style={{ color: C.red }}>{a.score}</b>, `Wk ${a.week}`, `${a.opp} (${a.oppScore})`,
        ])}
      />

      <Table
        title="⭐ Top Individual Performances"
        cols={["#", "Player", "Pos", "Pts", "Team", "Week"]}
        rows={(r.topPerformers || []).map((p, i) => [
          i + 1, p.name, <span style={{ color: posColor(p.pos), fontWeight: 600 }}>{p.pos}</span>,
          <b style={{ color: C.gold }}>{p.points}</b>, p.team, `Wk ${p.week}`,
        ])}
      />

      <Table
        title="🪦 Biggest Busts (under projection)"
        cols={["#", "Player", "Pos", "Actual", "Proj", "Missed by", "Team"]}
        rows={(r.biggestBusts || []).map((p, i) => [
          i + 1, p.name, <span style={{ color: posColor(p.pos), fontWeight: 600 }}>{p.pos}</span>,
          p.points, p.projected, <b style={{ color: C.red }}>{p.miss}</b>, p.team,
        ])}
      />

      <Table
        title="💥 Biggest Blowouts"
        cols={["#", "Winner", "Score", "Loser", "Score", "Margin", "Week"]}
        rows={(r.blowouts || []).map((m, i) => [
          i + 1, m.winner, <span style={{ color: C.green }}>{m.winnerScore}</span>, m.loser,
          <span style={{ color: C.red }}>{m.loserScore}</span>, <b style={{ color: C.gold }}>{m.margin}</b>, `Wk ${m.week}`,
        ])}
      />

      <Table
        title="😰 Closest Games"
        cols={["#", "Winner", "Score", "Loser", "Score", "Margin", "Week"]}
        rows={(r.closest || []).map((m, i) => [
          i + 1, m.winner, <span style={{ color: C.green }}>{m.winnerScore}</span>, m.loser,
          <span style={{ color: C.red }}>{m.loserScore}</span>, <b style={{ color: C.gold }}>{m.margin}</b>, `Wk ${m.week}`,
        ])}
      />

      <p style={{ color: C.faint, fontSize: "13px" }}>
        <Link href="/" style={{ color: C.blue, textDecoration: "none" }}>← Back to standings</Link>
      </p>
    </>
  );
}

function Table({ title, cols, rows }) {
  const [icon, ...rest] = title.split(" ");
  return (
    <Panel title={rest.join(" ")} icon={icon}>
      {rows.length === 0 ? (
        <p style={{ color: C.dim, fontSize: "14px" }}>Not enough data yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>{cols.map((c) => <th key={c} style={th}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? C.panelAlt : "transparent" }}>
                  {row.map((cell, j) => <td key={j} style={{ ...td, color: j === 0 ? C.faint : C.text }}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
