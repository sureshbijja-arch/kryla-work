import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { revalidatePath } from 'next/cache'
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

Providers fields you can update:
- whatsapp_number (digits with country code, e.g. "919876543210")
- location (string)

Rules:
- ALWAYS return the complete array for services, highlights, and faq — never partial
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

  // Verify this session's email owns the providerId
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, email')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const systemWithProfile = `${SYSTEM_PROMPT}

Current profile (JSON):
${JSON.stringify(currentProfile, null, 2)}`

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

  let changed = false

  if (Object.keys(patch_pages).length > 0) {
    await supabaseAdmin
      .from('pages')
      .update(patch_pages)
      .eq('provider_id', providerId)
    changed = true
  }

  if (Object.keys(patch_providers).length > 0) {
    const allowed = ['whatsapp_number', 'location']
    const safeUpdate = Object.fromEntries(
      Object.entries(patch_providers).filter(([k]) => allowed.includes(k))
    )
    if (Object.keys(safeUpdate).length > 0) {
      await supabaseAdmin
        .from('providers')
        .update(safeUpdate)
        .eq('id', providerId)
      changed = true
    }
  }

  if (changed) {
    revalidatePath(`/${provider.slug}`)
  }

  return NextResponse.json({ message, changed })
}
