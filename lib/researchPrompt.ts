/**
 * Shared persona co-pilot system-prompt builder.
 * Used by both /api/mychat/research (My Chat) and the WhatsApp do_research handler.
 *
 * Research is now a full-scope co-pilot: it helps with the member's
 * PROFESSION (subject teaching, recipe technique, workout planning, etc.)
 * AND their BUSINESS (pricing, marketing, demand, competitors).
 *
 * Persona-specific guidance (what the co-pilot is authorised to do beyond
 * generic business help) comes from config/verticals researchGuidance.
 * Absent ⇒ generic professional co-pilot (safe default for all personas).
 */

// ── Location helpers ─────────────────────────────────────────────────────────
export function inferCountry(location: string): string {
  const l = location.toLowerCase()
  if (l.includes('india') || /\b(delhi|mumbai|bangalore|bengaluru|chennai|hyderabad|kolkata|pune|ahmedabad|jaipur|surat)\b/.test(l)) return 'IN'
  if (l.includes('united kingdom') || l.includes(' uk') || l.includes('england') || l.includes('london') || l.includes('scotland') || l.includes('wales')) return 'GB'
  if (l.includes('canada') || l.includes('toronto') || l.includes('vancouver') || l.includes('montreal')) return 'CA'
  if (l.includes('australia') || l.includes('sydney') || l.includes('melbourne') || l.includes('brisbane')) return 'AU'
  return 'US'
}

export function inferCity(location: string): string {
  return location.split(',')[0].trim()
}

// ── Persona display ──────────────────────────────────────────────────────────
const PERSONA_LABEL: Record<string, string> = {
  tutor:        'tutor',
  trainer:      'personal trainer',
  baker:        'baker/pastry chef',
  photographer: 'photographer',
  salon:        'salon/beauty professional',
  chef:         'private chef',
  doctor:       'healthcare professional',
  musician:     'musician/music teacher',
  advocate:     'advocate/lawyer',
  retailer:     'retailer',
  other:        'professional',
}

function personaLabel(persona: string, customName?: string | null): string {
  if (persona === 'other' && customName) return customName
  return PERSONA_LABEL[persona] ?? persona
}

// ── Generic fallback professional guidance ───────────────────────────────────
const GENERIC_PROFESSIONAL_GUIDANCE = `You are helping a professional with both their actual work AND their business.
- Answer professional craft questions directly: techniques, how-tos, best practices.
- For business questions: pricing, marketing, local demand, competitor analysis — search and give 3-5 specific actionable ideas.`

// ── Main export ──────────────────────────────────────────────────────────────
export interface ResearchPromptOpts {
  name: string
  persona: string
  customPersona?: string | null
  location: string
  services: string
  /** Per-persona guidance from config/verticals researchGuidance. Absent ⇒ generic fallback. */
  guidance?: string | null
  /** true = WhatsApp: plain text, no markdown, concise. false = My Chat: formatted, full length. */
  concise?: boolean
}

export function buildResearchSystemPrompt(opts: ResearchPromptOpts): string {
  const role     = personaLabel(opts.persona, opts.customPersona)
  const today    = new Date().toISOString().split('T')[0]
  const guidance = opts.guidance?.trim() || GENERIC_PROFESSIONAL_GUIDANCE

  const doctorGuardrail = opts.persona === 'doctor'
    ? '\n\nIMPORTANT: This is a healthcare professional. NEVER give medical advice, diagnoses, or treatment recommendations. Limit to business topics (marketing, pricing, patient experience, practice management).'
    : ''

  const advocateGuardrail = opts.persona === 'advocate'
    ? '\n\nIMPORTANT — LEGAL AI GUARDRAIL: This member is a practising advocate. You may draft documents and explain law, but: (a) always note the jurisdiction your answer assumes and state that laws differ by jurisdiction; (b) NEVER invent case citations, section numbers, or judgments — if uncertain, say so and direct them to verify on the official source (e.g. Indian Kanoon, SCC Online, official gazette); (c) frame every output as a professional draft or starting point for the advocate\'s own review, not as final legal advice, and never as creating an attorney–client relationship with any end user.'
    : ''

  const formatRules = opts.concise
    ? `
FORMAT: Plain text only — no markdown, no asterisks, no headers. Concise — this is a WhatsApp reply. 3–5 key points maximum.`
    : `
FORMAT: Use clear structure when helpful (numbered steps, bullet points). Cite 1–2 specific sources by name when web search is used. End business answers with one concrete next step they can take in My Chat (e.g. "Want me to add X as a service?").`

  return `You are Kryla's co-pilot for ${opts.name}, a ${role} based in ${opts.location || 'their area'}.

TODAY: ${today}
Their services: ${opts.services || 'not specified'}

You help ${opts.name} with TWO things:
1. Their professional work — teaching, crafting, coaching, creating (whatever their role demands)
2. Their business — pricing, marketing, local demand, growth

${guidance}

GENERAL RULES:
- Use web search when the question needs real-world facts, current data, local pricing, or competitor info. Do NOT search for timeless subject-matter questions (e.g. solving a maths problem — just reason and answer directly).
- Frame researched business insights as "ideas to consider" or "what others in your field are doing" — not definitive facts.
- Keep tone warm and practical — like a knowledgeable colleague, not a consultant.
- Never say "AI" — you are Kryla.
- Never refuse a professional or business question — always engage helpfully.${doctorGuardrail}${advocateGuardrail}${formatRules}`
}
