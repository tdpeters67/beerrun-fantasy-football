import Link from "next/link";
import data from "../../../lib/data";
import Markdown from "../../../lib/Markdown";
import MatchupCard from "./MatchupCard";
import { Panel } from "../../../lib/Panel";
import { C, card } from "../../../lib/theme";

export default function RecapPage({ params }) {
  const { week } = params;
  const wk = (data.weeks || []).find((w) => String(w.week) === String(week));

  if (!wk) return (
    <>
      <Link href="/recaps" style={{ color: C.blue, textDecoration: "none", fontSize: "13px" }}>← All recaps</Link>
      <p style={{ color: C.dim, padding: "40px 0" }}>No recap for week {week} yet.</p>
    </>
  );

  const games = [...wk.games].sort((a, b) => b.combined - a.combined);
  const s = wk.superlatives || {};

  return (
    <>
      <Link href="/recaps" style={{ color: C.blue, textDecoration: "none", fontSize: "13px" }}>← All recaps</Link>
      <h2 style={{ color: C.gold, margin: "10px 0 4px", fontSize: "26px" }}>Week {wk.week} Recap</h2>

      {wk.intro && (
        <Panel title="Commissioner's Note" icon="📰">
          <Markdown text={wk.intro} />
        </Panel>
      )}

      {games.map((g, i) => <MatchupCard key={i} game={g} />)}

      <Panel title="Superlatives" icon="🏅">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "12px" }}>
          <Award emoji="🏆" label="Biggest Winner" accent={C.green}
            team={s.biggestWinner?.team} big={s.biggestWinner?.score}
            sub={s.biggestWinner && `beat ${s.biggestWinner.opp}`} />
          <Award emoji="💩" label="Biggest Loser" accent={C.red}
            team={s.biggestLoser?.team} big={s.biggestLoser?.score}
            sub="low score of the week" />
          <Award emoji="🎭" label="Most Unlucky" accent={C.gold}
            team={s.mostUnlucky?.team} big={s.mostUnlucky?.score}
            sub={s.mostUnlucky && `scored big, still lost to ${s.mostUnlucky.opp}`} />
          <Award emoji="🪑" label="Most on the Bench" accent={C.blue}
            team={s.mostBench?.team} big={s.mostBench?.benchPoints}
            sub={s.mostBench?.topBench && `incl. ${s.mostBench.topBench.name} (${s.mostBench.topBench.points})`} />
        </div>
      </Panel>
    </>
  );
}

function Award({ emoji, label, team, big, sub, accent }) {
  if (!team) return null;
  return (
    <div style={{ background: C.panelAlt, borderRadius: "8px", padding: "14px", border: `1px solid ${C.border}`, borderTop: `2px solid ${accent}` }}>
      <div style={{ fontSize: "12px", color: C.dim, textTransform: "uppercase", letterSpacing: "0.4px" }}>{emoji} {label}</div>
      <div style={{ fontSize: "16px", fontWeight: 700, color: C.text, margin: "6px 0 2px" }}>{team}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: accent }}>{big}</div>
      {sub && <div style={{ fontSize: "12px", color: C.dim, marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}
