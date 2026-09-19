import Link from "next/link";
import data from "../../lib/data";
import { C, card } from "../../lib/theme";

export default function RecapsPage() {
  const recaps = data.recaps || [];

  return (
    <>
      <h2 style={{ color: C.gold, marginBottom: "6px" }}>Weekly Recaps</h2>
      <p style={{ color: C.dim, marginTop: 0 }}>The commissioner's take on every week of the season.</p>

      {recaps.length === 0 && <p style={{ color: C.dim }}>No recaps posted yet.</p>}

      {recaps.map((r) => (
        <Link key={r.week} href={`/recaps/${r.week}`} style={{ textDecoration: "none" }}>
          <section style={{ ...card, cursor: "pointer", borderLeft: `3px solid ${C.gold}` }}>
            <h3 style={{ margin: "0 0 6px", color: C.text }}>Week {r.week} Recap</h3>
            <p style={{ color: C.dim, margin: "0 0 8px", fontSize: "14px" }}>{teaser(r.intro)}</p>
            <span style={{ color: C.blue, fontSize: "13px" }}>Read →</span>
          </section>
        </Link>
      ))}
    </>
  );
}

function teaser(text) {
  const body = (text || "").split("\n").find((l) => l.trim() && !l.startsWith("#")) || "";
  const clean = body.replace(/\*\*/g, "").replace(/\*/g, "");
  return clean.length > 180 ? clean.slice(0, 180) + "…" : clean;
}
