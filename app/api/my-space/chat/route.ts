import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are Kryla's profile assistant. You help members update their public presence page through natural conversation.

You MUST respond with ONLY valid JSON — no extra text before or after. Shape:
{
  "message": "string — your warm, plain-English reply (2-3 sentences max)",
  "patch_pages": {},
  "patch_providers": {}
}

- patch_pages: object with ONLY the fields changing in the pages table, or {}
- patch_providers: object with ONLY the fields changing in the providers table, or {}

Pages fields you can update:
- headline (string)
- subheadline (string)
- bio (string)
- cta_primary (string)
- cta_secondary (string)
- services (full array: [{name, description, duration_or_unit}])
- highlights (full array: [{icon, title, body}])
- faq (full array: [{question, answer}])
- palette ("professional" | "fresh" | "warm" | "minimal" | "creative" | "calm")
- font ("inter" | "georgia" | "trebuchet")
- template ("focus" | "portfolio" | "storefront" | "clinic")
- show_sections (full object: {hero, services, highlights, booking, faq, contact} — all booleans)
- sections: the page layout order and style. ONLY patch this to change a section's visual variant.
  ALWAYS return the FULL array — keep every section, only change the variant of the one being updated.
  Valid variants:
    hero: auto | photo | split | centered | dark | gradient | banner | minimal
    services: list | grid | menu | pricing | features
    highlights: icons | cards | stats | numbered | strip
    bio: paragraph | accent | callout | dark
    gallery: grid | featured | masonry | scroll
    faq: accordion | twocol
    contact: both | form | whatsapp | minimal | dark

Providers fields you can update:
- whatsapp_number (digits with country code, e.g. "919876543210")
- location (string — city, area or full address; this automatically becomes a clickable Google Maps "Get Directions" link on the page)

Member's media (read-only — uploaded via the Media tab, not patchable via chat):
- avatarUrl: profile photo URL (if set, hero variants "photo" and "split" will show it prominently)
- gallery: array of uploaded image URLs

Rules:
- When member says "add map", "add directions", "show my location on map", or similar: if their location is already in the current profile use it; otherwise ask them to tell you their location, then set it via patch_providers.location
- When member asks to use their photo, show their face, or make the hero more personal:
  - If avatarUrl is set: patch sections with hero variant "photo" or "split" (their choice; default "photo")
  - If avatarUrl is null: tell them to upload a photo in the Media tab first, then come back
- When member asks to change how a section looks or its layout: patch sections with the appropriate variant
- ALWAYS return the complete array for services, highlights, faq, and sections — never partial
- ALWAYS return the complete show_sections object if any section visibility changes
- Never invent content the member didn't provide
- Preserve the member's own words and voice
- When adding to a list: include all existing items plus the new one
- When removing from a list: include all remaining items
- Never say "AI" — you are Kryla
- Keep message field warm, plain English, no jargon`

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { providerId, messages, currentProfile } = body

  if (!providerId || !messages || !currentProfile) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify ownership
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, email, avatar_url')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Fetch fresh page data (draft_data + gallery) — overrides the stale client snapshot
  const { data: pageRow } = await supabaseAdmin
    .from('pages')
    .select('gallery, draft_data')
    .eq('provider_id', providerId)
    .maybeSingle()

  type DraftShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown> }
  const draft = (pageRow?.draft_data ?? {}) as DraftShape
  const dp    = draft.pages     ?? {}

  const gallery = Array.isArray(pageRow?.gallery) ? pageRow.gallery : []

  // Build the freshest possible profile: client snapshot + draft overrides + live media
  const enrichedProfile = {
    ...currentProfile,
    ...dp,                          // draft values win over the stale client snapshot
    avatarUrl: provider.avatar_url ?? null,
    gallery,
  }

  const systemWithProfile = `${SYSTEM_PROMPT}

Current profile (JSON):
${JSON.stringify(enrichedProfile, null, 2)}`

  const completion = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemWithProfile,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  const raw = completion.content[0].type === 'text' ? completion.content[0].text : ''

  let parsed: { message: string; patch_pages: Record<string, unknown>; patch_providers: Record<string, unknown> }
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
  } catch {
    return NextResponse.json({ message: raw, changed: false })
  }

  const { message, patch_pages = {}, patch_providers = {} } = parsed

  // Only allow safe provider fields
  const allowed = ['whatsapp_number', 'location']
  const safePatchProviders = Object.fromEntries(
    Object.entries(patch_providers).filter(([k]) => allowed.includes(k))
  )

  const hasPatchPages     = Object.keys(patch_pages).length > 0
  const hasPatchProviders = Object.keys(safePatchProviders).length > 0

  if (!hasPatchPages && !hasPatchProviders) {
    return NextResponse.json({ message, changed: false })
  }

  // Merge into draft_data — live columns stay unchanged until member publishes
  const { data: currentPageFresh } = await supabaseAdmin
    .from('pages')
    .select('draft_data')
    .eq('provider_id', providerId)
    .maybeSingle()

  const existingFresh = (currentPageFresh?.draft_data ?? {}) as Partial<DraftShape>

  const newDraft = {
    pages:     { ...(existingFresh.pages     ?? {}), ...patch_pages },
    providers: { ...(existingFresh.providers ?? {}), ...safePatchProviders },
  }

  const { error } = await supabaseAdmin
    .from('pages')
    .update({ draft_data: newDraft })
    .eq('provider_id', providerId)

  if (error) {
    console.error('[chat] draft save error:', error)
    return NextResponse.json({ message: 'Something went wrong saving your changes — please try again.', changed: false })
  }

  return NextResponse.json({ message, changed: true })
}
