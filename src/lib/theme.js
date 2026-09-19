// Windows Vista / Frutiger Aero visual tokens — glass panels, aqua gloss, light
// text over a dark aurora background (see src/app/globals.css).
export const C = {
  bg: "#07202f",
  text: "#eaf4ff",
  dim: "#b4cade",
  faint: "#8199ad",
  gold: "#ffd06b",   // glossy amber — high scores
  green: "#7fe57f",
  red: "#ff8064",
  blue: "#93d4ff",   // aqua links
  // translucent "glass" fills
  panel: "rgba(255,255,255,0.10)",
  panelAlt: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.22)",
};

// Aero glass card: frosted, translucent, with a glossy top highlight.
export const card = {
  background: "linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(255,255,255,0.04))",
  backdropFilter: "blur(14px) saturate(140%)",
  WebkitBackdropFilter: "blur(14px) saturate(140%)",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: "14px",
  padding: "18px",
  marginBottom: "22px",
  boxShadow: "0 10px 30px rgba(0,20,40,0.45), inset 0 1px 0 rgba(255,255,255,0.55)",
};

export const th = { padding: "8px", textAlign: "left", color: C.dim, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.4px" };
export const td = { padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.12)" };

// Glossy aqua gradient used for the hero / accents.
export const aquaGloss = "linear-gradient(to bottom, rgba(120,200,240,0.30) 0%, rgba(60,140,200,0.18) 50%, rgba(30,90,150,0.22) 100%)";

export function posColor(pos) {
  return { QB: "#ff8064", RB: "#7fe57f", WR: "#93d4ff", TE: "#ffd06b", "D/ST": "#c69bff", K: "#b4cade" }[pos] || C.dim;
}
