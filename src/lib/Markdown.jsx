import { C } from "./theme";

// Minimal markdown renderer: headings, bold, unordered lists, paragraphs.
// Enough for the recap format we author.
function inline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={`${keyPrefix}-${i}`} style={{ color: C.text }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={`${keyPrefix}-${i}`} style={{ color: C.dim }}>{p.slice(1, -1)}</em>;
    return <span key={`${keyPrefix}-${i}`}>{p}</span>;
  });
}

export default function Markdown({ text }) {
  const lines = (text || "").split("\n");
  const blocks = [];
  let list = null;

  const flush = () => {
    if (list) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} style={{ margin: "0 0 16px", paddingLeft: "20px", lineHeight: 1.7 }}>
          {list.map((item, i) => <li key={i} style={{ marginBottom: "6px" }}>{inline(item, `li-${blocks.length}-${i}`)}</li>)}
        </ul>
      );
      list = null;
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (/^###\s/.test(line)) { flush(); blocks.push(<h4 key={idx} style={{ color: C.text, margin: "20px 0 8px" }}>{inline(line.replace(/^###\s/, ""), idx)}</h4>); }
    else if (/^##\s/.test(line)) { flush(); blocks.push(<h3 key={idx} style={{ color: C.gold, margin: "26px 0 10px", borderBottom: `1px solid ${C.border}`, paddingBottom: "6px" }}>{inline(line.replace(/^##\s/, ""), idx)}</h3>); }
    else if (/^#\s/.test(line)) { flush(); blocks.push(<h2 key={idx} style={{ color: C.gold, margin: "0 0 12px", fontSize: "26px" }}>{inline(line.replace(/^#\s/, ""), idx)}</h2>); }
    else if (/^[-*]\s/.test(line)) { (list ||= []).push(line.replace(/^[-*]\s/, "")); }
    else if (line.trim() === "") { flush(); }
    else { flush(); blocks.push(<p key={idx} style={{ margin: "0 0 14px", lineHeight: 1.7, color: C.text }}>{inline(line, idx)}</p>); }
  });
  flush();

  return <div>{blocks}</div>;
}
