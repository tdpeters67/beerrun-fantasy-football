import Link from "next/link";
import data from "../../../lib/data";
import Markdown from "../../../lib/Markdown";
import { Panel } from "../../../lib/Panel";
import { C, card } from "../../../lib/theme";

export default function RankingWeekPage({ params }) {
  const { week } = params;
  const pr = (data.powerRankings || []).find((r) => String(r.week) === String(week));

  if (!pr) return (
    <>
      <Link href="/rankings" style={{ color: C.blue, textDecoration: "none", fontSize: "13px" }}>← All rankings</Link>
      <p style={{ color: C.dim, padding: "40px 0" }}>No power rankings for week {week} yet.</p>
    </>
  );

  // Biggest riser / faller from movement (positive = up). Null until there's a prior week.
  const moved = pr.teams.filter((t) => typeof t.movement === "number" && t.movement !== 0);
  const riser = moved.filter((t) => t.movement > 0).sort((a, b) => b.movement - a.movement)[0] || null;
  const faller = moved.filter((t) => t.movement < 0).sort((a, b) => a.movement - b.movement)[0] || null;

  return (
    <>
      <Link href="/rankings" style={{ color: C.blue, textDecoration: "none", fontSize: "13px" }}>← All rankings</Link>
      <h2 style={{ color: C.gold, margin: "10px 0 4px", fontSize: "26px" }}>Week {pr.week} Power Rankings</h2>

      {(riser || faller) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "12px", marginBottom: "22px" }}>
          {riser && <Mover kind="riser" team={riser} />}
          {faller && <Mover kind="faller" team={faller} />}
        </div>
      )}

      {pr.intro && (
        <Panel title="Commissioner's Note">
          <Markdown text={pr.intro} />
        </Panel>
      )}

      {pr.teams.map((t) => (
        <section key={t.teamId} className="win" style={{ padding: 0 }}>
          <div className="win-bar" style={{ gap: "12px" }}>
            <span style={{ fontSize: "20px", fontWeight: 800, color: "#f2fbff", minWidth: "30px", textShadow: "0 1px 2px rgba(0,0,0,0.55)" }}>
              {t.rank}
            </span>
            <Move movement={t.movement} />
            <span className="win-cap" style={{ flex: 1 }}>
              <Link href={`/team/${t.teamId}`} style={{ color: "inherit", textDecoration: "none" }}>{t.name}</Link>
            </span>
            <span style={{ fontSize: "12px", color: "#eaf4ff", opacity: 0.9, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
              {t.wins}-{t.losses}{t.weekScore != null ? ` · ${t.weekScore} pts` : ""}
            </span>
          </div>
          {t.blurb && <div className="win-body"><Markdown text={t.blurb} /></div>}
        </section>
      ))}
    </>
  );
}

function Mover({ kind, team }) {
  const up = kind === "riser";
  const accent = up ? C.green : C.red;
  const spots = Math.abs(team.movement);
  return (
    <Link href={`/team/${team.teamId}`} style={{ textDecoration: "none" }}>
      <div style={{ background: C.panelAlt, borderRadius: "8px", padding: "14px 16px", border: `1px solid ${C.border}`, borderTop: `2px solid ${accent}`, cursor: "pointer" }}>
        <div style={{ fontSize: "12px", color: C.dim, textTransform: "uppercase", letterSpacing: "0.4px" }}>
          {up ? "Biggest Riser" : "Biggest Faller"}
        </div>
        <div style={{ fontSize: "17px", fontWeight: 700, color: C.text, margin: "6px 0 2px" }}>{team.name}</div>
        <div style={{ fontSize: "22px", fontWeight: 800, color: accent }}>
          {up ? "▲" : "▼"} {spots} spot{spots === 1 ? "" : "s"}
        </div>
        <div style={{ fontSize: "12px", color: C.dim, marginTop: "4px" }}>now #{team.rank} in the league</div>
      </div>
    </Link>
  );
}

function Move({ movement }) {
  if (movement === null || movement === undefined)
    return <span style={{ fontSize: "12px", color: C.faint, fontWeight: 700 }}>NEW</span>;
  if (movement === 0)
    return <span style={{ fontSize: "13px", color: C.faint }} title="no change">—</span>;
  const up = movement > 0;
  return (
    <span style={{ fontSize: "12px", fontWeight: 700, color: up ? C.green : C.red }} title={`${up ? "up" : "down"} ${Math.abs(movement)}`}>
      {up ? "▲" : "▼"}{Math.abs(movement)}
    </span>
  );
}
