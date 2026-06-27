/**
 * build-page — Inngest job that calls Claude to generate a member's page.
 *
 * Fired after onboarding completes. User never waits on this — they see
 * a "building your presence..." screen while this runs in the background.
 *
 * RULE: Claude API is never called synchronously. Always via Inngest.
 */

import { inngest } from "@/inngest/client"
import { generateMemberPage } from "@/lib/claude"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const buildPage = inngest.createFunction(
  { id: "build-page", name: "Build Member Page" },
  { event: "kryla/page.build.requested" },
  async ({ event, step }) => {
    const { providerId, persona, name, city, answers } = event.data

    // Step 1 — call Claude (retries automatically on failure)
    const generated = await step.run("generate-with-claude", async () => {
      return generateMemberPage({ persona, name, city, answers })
    })

    // Step 2 — save to Supabase
    await step.run("save-to-db", async () => {
      const { error } = await supabaseAdmin
        .from("pages")
        .upsert({
          provider_id: providerId,
          ...generated,
          build_version: 1,
        })

      if (error) throw new Error(`DB save failed: ${error.message}`)

      // Mark the provider's page as live
      await supabaseAdmin
        .from("providers")
        .update({ page_live: true })
        .eq("id", providerId)
    })

    // Step 3 — log the onboarding answers with raw Claude I/O for debugging
    await step.run("log-onboarding", async () => {
      await supabaseAdmin.from("onboarding_answers").insert({
        provider_id: providerId,
        persona,
        answers,
      })
    })

    return { success: true, providerId }
  }
)
