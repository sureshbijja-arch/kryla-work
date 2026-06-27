/**
 * Main landing page — kryla.work
 * v2 design: cinematic, warm, alternating sections per CLAUDE.md
 *
 * TODO: Wire in v2 landing component
 */

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 480, padding: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#0D0D0D", lineHeight: 1.2 }}>
          Your craft deserves<br />
          <span style={{ color: "#F5A623" }}>a name online.</span>
        </h1>
        <p style={{ marginTop: "1rem", color: "#444444" }}>
          Answer 5 questions. Go live in 15 minutes. Free to start.
        </p>
        <a
          href="/onboarding"
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            padding: "0.75rem 1.5rem",
            background: "#0D0D0D",
            color: "#fff",
            borderRadius: "0.5rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Claim your spot →
        </a>
      </div>
    </main>
  )
}
