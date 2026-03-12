export const metadata = {
  title: "Beer Run Fantasy Football",
  description: "Historical stats for the Beer Run fantasy football league",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#0f1923",
          color: "#e8e8e8",
          minHeight: "100vh",
        }}
      >
        <header
          style={{
            background: "linear-gradient(135deg, #1a2a3a 0%, #0d1b2a 100%)",
            borderBottom: "2px solid #d4a017",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <a href="/" style={{ fontSize: "28px", textDecoration: "none" }}>🍺🏈</a>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "20px", color: "#d4a017" }}>
              <a href="/" style={{ color: "inherit", textDecoration: "none" }}>Beer Run Fantasy Football</a>
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#8899aa" }}>
              Historical Stats & Records
            </p>
          </div>
          <nav style={{ display: "flex", gap: "16px" }}>
            <a href="/" style={{ color: "#8899aa", textDecoration: "none", fontSize: "14px" }}>Standings</a>
            <a href="/records" style={{ color: "#8899aa", textDecoration: "none", fontSize: "14px" }}>Records</a>
          </nav>
        </header>
        <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
