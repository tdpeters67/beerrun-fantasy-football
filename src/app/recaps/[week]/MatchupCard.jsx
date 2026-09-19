"use client";

import { useState } from "react";
import Markdown from "../../../lib/Markdown";
import { C, posColor } from "../../../lib/theme";

// One matchup: final score header (click to accordion rosters) + blurb below.
// The blurb text renders immediately; only the lineups are behind the click.
export default function MatchupCard({ game }) {
  const [open, setOpen] = useState(false);
  const homeWon = game.homeScore > game.awayScore;
  const awayWon = game.awayScore > game.homeScore;
  const sideFor = (id) => game.sides.find((x) => x.teamId === id);

  return (
    <section className="win" style={{ padding: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer",
          background: C.panelAlt, border: "none", color: C.text,
          padding: "14px 18px", display: "flex", flexDirection: "column", gap: "4px",
        }}
      >
        <ScoreLine name={game.homeTeamName} score={game.homeScore} won={homeWon} />
        <ScoreLine name={game.awayTeamName} score={game.awayScore} won={awayWon} />
        <span style={{ fontSize: "11px", color: C.faint, marginTop: "2px" }}>
          {open ? "▲ hide lineups" : `▼ margin ${game.margin} · click for lineups`}
        </span>
      </button>

      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", borderTop: `1px solid ${C.border}` }}>
          <Roster side={sideFor(game.homeTeamId)} />
          <Roster side={sideFor(game.awayTeamId)} divider />
        </div>
      )}

      {game.blurb && (
        <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.border}` }}>
          <Markdown text={game.blurb} />
        </div>
      )}
    </section>
  );
}

function ScoreLine({ name, score, won }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px" }}>
      <span style={{ fontWeight: won ? 700 : 400, color: won ? C.green : C.text }}>{name}</span>
      <span style={{ fontWeight: won ? 700 : 400, color: won ? C.green : C.text }}>{score}</span>
    </div>
  );
}

function Roster({ side, divider }) {
  if (!side) return <div />;
  const starters = side.players.filter((p) => !p.benched);
  const bench = side.players.filter((p) => p.benched);
  return (
    <div style={{ padding: "14px 18px", borderLeft: divider ? `1px solid ${C.border}` : "none" }}>
      <div style={{ fontWeight: 700, marginBottom: "8px", color: C.text }}>
        {side.teamName} <span style={{ color: C.gold }}>{side.total}</span>
      </div>
      <PlayerRows players={starters} />
      <div style={{ fontSize: "11px", color: C.faint, textTransform: "uppercase", margin: "10px 0 4px" }}>
        Bench · {side.benchPoints}
      </div>
      <PlayerRows players={bench} dim />
    </div>
  );
}

function PlayerRows({ players, dim }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
      <tbody>
        {players.map((p, i) => (
          <tr key={i}>
            <td style={{ padding: "3px 6px 3px 0", color: C.faint, width: "48px" }}>{p.slot}</td>
            <td style={{ padding: "3px 6px 3px 0", color: dim ? C.dim : C.text }}>{p.name}</td>
            <td style={{ padding: "3px 6px 3px 0", width: "38px" }}>
              <span style={{ color: posColor(p.pos), fontWeight: 600 }}>{p.pos}</span>
            </td>
            <td style={{ padding: "3px 0", textAlign: "right", width: "48px", color: p.points >= 20 ? C.green : p.points < 3 ? C.red : (dim ? C.dim : C.text) }}>
              {p.points}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
