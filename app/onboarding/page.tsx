/**
 * /onboarding — 5-step onboarding flow
 * Step 1: Persona picker
 * Step 2: 5 questions (from vertical config)
 * Step 3: Claim your URL
 * Step 4: Pick membership (Seed is free)
 * Step 5: Building your presence…
 *
 * TODO: Build full onboarding UI
 */

export default function OnboardingPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0D0D0D" }}>
          Let's build your presence
        </h1>
        <p style={{ color: "#666666", marginTop: "0.5rem" }}>
          Onboarding flow coming in Week 2.
        </p>
      </div>
    </main>
  )
}
