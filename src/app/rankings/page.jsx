import Link from "next/link";
import data from "../../lib/data";
import { C, card } from "../../lib/theme";

export default function RankingsPage() {
  const rankings = data.powerRankings || [];

  return (
    <>
      <h2 style={{ color: C.gold, marginBottom: "6px" }}>Power Rankings</h2>
      <p style={{ color: C.dim, marginTop: 0 }}>The commissioner's official, correct, not-up-for-debate ordering of the league.</p>

      {rankings.length === 0 && <p style={{ color: C.dim }}>No power rankings posted yet.</p>}

      {rankings.map((r) => (
        <Link key={r.week} href={`/rankings/${r.week}`} style={{ textDecoration: "none" }}>
          <section style={{ ...card, cursor: "pointer", borderLeft: `3px solid ${C.gold}` }}>
            <h3 style={{ margin: "0 0 8px", color: C.text }}>Week {r.week} Power Rankings</h3>
            <div style={{ fontSize: "13px", color: C.dim }}>
              {r.teams.slice(0, 3).map((t) => `${t.rank}. ${t.name}`).join("  ·  ")}
              {r.teams.length > 3 ? "  …" : ""}
            </div>
            <span style={{ color: C.blue, fontSize: "13px", display: "inline-block", marginTop: "8px" }}>See the full board →</span>
          </section>
        </Link>
      ))}
    </>
  );
}
