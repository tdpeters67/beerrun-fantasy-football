import "./globals.css";

export const metadata = {
  title: "Goodell What About the Good Things?",
  description:
    "Standings, weekly recaps, records and the draft board for the Goodell What @ the Good Things? fantasy football league.",
};

const dim = "#cfe6f6";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh" }}>
        <header
          className="aero-header"
          style={{
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/"
            style={{
              fontSize: "28px",
              textDecoration: "none",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
            }}
          >
            🏈
          </a>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <h1 className="aero-title" style={{ margin: 0, fontSize: "20px" }}>
              <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
                Goodell What About the Good Things?
              </a>
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: dim,
                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}
            >
              2026 Season · Fantasy Football
            </p>
          </div>
          <nav style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a href="/" className="gloss-btn">
              Standings
            </a>
            <a href="/recaps" className="gloss-btn">
              Recaps
            </a>
            <a href="/records" className="gloss-btn">
              Records
            </a>
            <a href="/draft" className="gloss-btn">
              Draft
            </a>
          </nav>
        </header>

        <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "24px" }}>
          {children}
        </main>

        <footer
          style={{
            textAlign: "center",
            color: "#8fb2ca",
            fontSize: "12px",
            padding: "30px",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          Goodell What About the Good Things? · Commissioner HQ
        </footer>
      </body>
    </html>
  );
}
