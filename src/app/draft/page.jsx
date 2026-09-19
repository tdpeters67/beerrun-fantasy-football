"use client";

import Link from "next/link";
import { useState } from "react";
import data from "../../lib/data";
import { Panel } from "../../lib/Panel";
import { C, card, th, td, posColor } from "../../lib/theme";

export default function DraftPage() {
  const [teamFilter, setTeamFilter] = useState("all");

  const draft = data.draft || [];
  const teams = data.teams || [];
  const rounds = [...new Set(draft.map((p) => p.round))].sort((a, b) => a - b);
  const filtered = teamFilter === "all" ? draft : draft.filter((p) => String(p.teamId) === teamFilter);

  return (
    <>
      <h2 style={{ color: C.gold, marginBottom: "6px" }}>Draft Board</h2>
      <p style={{ color: C.dim, marginTop: 0 }}>
        {rounds.length} rounds · {draft.length} picks. Week-1 points shown where the player was rostered.
      </p>

      {/* Filter */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
        <button onClick={() => setTeamFilter("all")} style={chip(teamFilter === "all")}>All teams</button>
        {teams.map((t) => (
          <button key={t.id} onClick={() => setTeamFilter(String(t.id))} style={chip(teamFilter === String(t.id))}>{t.name}</button>
        ))}
      </div>

      <Panel title={teamFilter === "all" ? "All Picks" : filtered[0]?.teamName || "Picks"} icon="📋">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                <th style={th}>Pick</th>
                <th style={th}>Rd</th>
                <th style={th}>Player</th>
                <th style={th}>Pos</th>
                <th style={th}>Team</th>
                <th style={th}>Wk 1</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.overall} style={{ background: i % 2 ? C.panelAlt : "transparent" }}>
                  <td style={{ ...td, color: C.faint }}>{p.overall}</td>
                  <td style={{ ...td, color: C.dim }}>{p.round}.{p.pick}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{p.player}</td>
                  <td style={td}><span style={{ color: posColor(p.pos), fontWeight: 600 }}>{p.pos}</span></td>
                  <td style={{ ...td, color: C.dim }}>
                    <Link href={`/team/${p.teamId}`} style={{ color: C.blue, textDecoration: "none" }}>{p.teamName}</Link>
                  </td>
                  <td style={{ ...td, color: ptsColor(p.firstWeekPts) }}>
                    {p.firstWeekPts == null ? "—" : p.firstWeekPts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function chip(active) {
  return active
    ? {
        padding: "5px 14px", borderRadius: "999px", cursor: "pointer",
        fontSize: "12px", fontWeight: 700, color: "#06344f",
        background: "linear-gradient(to bottom, #f4fbff 0%, #cfeeff 47%, #97d4f6 53%, #c4e9ff 100%)",
        border: "1px solid rgba(255,255,255,0.85)",
        boxShadow: "0 2px 5px rgba(0,20,40,0.3), inset 0 1px 0 rgba(255,255,255,0.95)",
      }
    : {
        padding: "5px 14px", borderRadius: "999px", cursor: "pointer",
        fontSize: "12px", fontWeight: 400, color: C.dim,
        background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`,
      };
}

function ptsColor(v) {
  if (v == null) return C.faint;
  if (v >= 20) return C.green;
  if (v < 5) return C.red;
  return C.text;
}
