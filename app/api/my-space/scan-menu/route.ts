import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGES    = 5
const MAX_TOTAL_B64 = 4_000_000   // ~4 MB of base64, safely under Vercel's 4.5 MB body limit

const SCAN_SYSTEM = `You extract services and offerings from photos of a physical menu, price list, or services board.

Return ONLY a valid JSON array — no prose, no markdown fences, nothing else. Each element:
{ "name": string, "description": string, "duration_or_unit": string | null, "price": string | null }

Rules:
- One array element per distinct service or offering, across ALL photos combined.
- name: the item name exactly as written.
- price: copy the printed price with its currency symbol and unit exactly (e.g. "₹800", "$45", "£12/hr", "₹200 per plate"). If NO price is visible, set null — NEVER guess or invent a price.
- duration_or_unit: only if printed (e.g. "60 min", "per kg", "per session"), else null.
- description: any printed sub-text or description for that item; if none, use "".
- Skip: section headers, page titles, addresses, phone numbers, opening hours, decorative text, and watermarks.
- If photos span multiple pages of one menu, de-duplicate offerings that appear on multiple pages.
- If the photos contain no recognizable services or offerings, return exactly: []
- Do not translate — preserve the original language exactly as written.`

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { providerId?: string; images?: { media_type: string; data: string }[] }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { providerId, images } = body
  if (!providerId || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'providerId and at least one image are required' }, { status: 400 })
  }

  // Verify ownership + plan gate (server-side — never trust client)
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, plan')
    .eq('id', providerId)
    .single()

  if (!provider || provider.email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if ((PLAN_RANK[provider.plan ?? 'seed'] ?? 0) < 2) {
    return NextResponse.json({ error: 'Menu scanning requires the Grow plan or higher' }, { status: 403 })
  }

  // Validate images
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Please scan at most ${MAX_IMAGES} photos at a time` }, { status: 400 })
  }
  let totalB64 = 0
  for (const img of images) {
    if (!ALLOWED_TYPES.includes(img.media_type) || typeof img.data !== 'string') {
      return NextResponse.json({ error: 'Unsupported image format — use JPEG, PNG, or WebP' }, { status: 400 })
    }
    totalB64 += img.data.length
  }
  if (totalB64 > MAX_TOTAL_B64) {
    return NextResponse.json({ error: 'Images too large — try fewer or lower-resolution photos' }, { status: 413 })
  }

  // Vision call — all images + text instruction in one user message
  const completion = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SCAN_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        ...images.map(img => ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: img.media_type as 'image/jpeg' | 'image/png' | 'image/webp',
            data: img.data,
          },
        })),
        {
          type: 'text' as const,
          text: images.length > 1
            ? `These ${images.length} photos are pages of one menu. Extract every service or offering as the JSON array described.`
            : 'Extract every service or offering from this menu photo as the JSON array described.',
        },
      ],
    }],
  })

  const raw = completion.content[0]?.type === 'text' ? completion.content[0].text : ''

  let parsed: unknown
  try {
    const m = raw.match(/\[[\s\S]*\]/)
    parsed = JSON.parse(m ? m[0] : raw)
  } catch {
    return NextResponse.json({ error: "Couldn't read that menu — try a clearer, well-lit photo" }, { status: 422 })
  }
  if (!Array.isArray(parsed)) {
    return NextResponse.json({ error: "Couldn't read that menu — try a clearer, well-lit photo" }, { status: 422 })
  }

  const services = parsed
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map(x => ({
      name:             String(x.name         ?? '').slice(0, 120).trim(),
      description:      String(x.description   ?? '').slice(0, 600).trim(),
      duration_or_unit: x.duration_or_unit != null ? String(x.duration_or_unit).slice(0, 60).trim() : null,
      price:            x.price            != null ? String(x.price).slice(0, 40).trim()            : null,
      // image_url and badge intentionally omitted — member adds later
    }))
    .filter(s => s.name.length > 0)

  return NextResponse.json({ services })
}
