/**
 * lib/claude.ts — Anthropic API helpers.
 *
 * RULE: Never call this directly from a Next.js route handler.
 * Always invoke via an Inngest job so the user never waits.
 *
 * Model: claude-sonnet-4-6 (non-negotiable per CLAUDE.md)
 */

import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface PageGenerationInput {
  persona: string
  name: string
  city: string
  answers: Record<string, string>
}

export interface GeneratedPage {
  headline: string
  tagline: string
  bio: string
  services: Array<{ name: string; description: string; price?: string }>
  highlights: Array<{ label: string; value: string }>
  template: "focus" | "portfolio" | "clinic" | "storefront" | "premium"
  palette: string
  font: "inter" | "georgia" | "trebuchet"
  seo_title: string
  seo_description: string
}

export async function generateMemberPage(
  input: PageGenerationInput
): Promise<GeneratedPage> {
  const prompt = buildPagePrompt(input)

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")

  // Strip markdown fences if present
  const json = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  return JSON.parse(json) as GeneratedPage
}

function buildPagePrompt(input: PageGenerationInput): string {
  const answersText = Object.entries(input.answers)
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join("\n\n")

  return `You are building a professional online presence for a ${input.persona} named ${input.name} based in ${input.city}.

Here are their answers to 5 onboarding questions:

${answersText}

Return ONLY a valid JSON object (no markdown, no preamble) matching this exact shape:
{
  "headline": "short punchy headline — max 8 words",
  "tagline": "one sentence that says what they do and who they help",
  "bio": "2–3 warm sentences in first person. No corporate language.",
  "services": [
    { "name": "...", "description": "...", "price": "optional" }
  ],
  "highlights": [
    { "label": "Years experience", "value": "..." }
  ],
  "template": "focus | portfolio | clinic | storefront | premium",
  "palette": "professional | fresh | warm | minimal | creative | calm",
  "font": "inter | georgia | trebuchet",
  "seo_title": "max 60 chars — name + profession + city",
  "seo_description": "max 155 chars — what they do, who they help, where they are"
}

Pick template, palette, and font to match their persona and answers.
Write all copy in English. Be warm, specific, and avoid clichés.`
}
