import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

// Salted hash of the visitor's IP — dedupes/toggles likes server-side
// without ever storing a raw IP. Salted with the service-role key (already
// a private server-only secret) rather than adding a new env var.
function visitorHash(ip: string): string {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'kryla-fallback-salt'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

// Public POST — record a page_event (view, like, etc.)
// For `like`, this now toggles: a second like from the same visitor (same
// salted-IP hash) on the same day un-reacts instead of double-incrementing.
// Previously the only dedupe was client-side localStorage, which incognito
// or another device trivially bypassed, and there was no way to un-react.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { providerId, eventType, referrer } = body

    if (!providerId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validTypes = ['page_view', 'booking_click', 'whatsapp_click', 'like']
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 })
    }

    if (eventType === 'like') {
      const hash = visitorHash(getClientIp(req))
      const { data: existingHit } = await supabaseAdmin
        .from('page_reaction_hits')
        .select('provider_id')
        .eq('provider_id', providerId)
        .eq('visitor_hash', hash)
        .eq('day', new Date().toISOString().slice(0, 10))
        .maybeSingle()

      const { data: existing } = await supabaseAdmin
        .from('page_reactions')
        .select('id, likes')
        .eq('provider_id', providerId)
        .maybeSingle()

      if (existingHit) {
        // Un-react: remove today's hit and decrement (never below 0).
        await supabaseAdmin
          .from('page_reaction_hits')
          .delete()
          .eq('provider_id', providerId)
          .eq('visitor_hash', hash)
          .eq('day', new Date().toISOString().slice(0, 10))

        const nextLikes = Math.max(0, (existing?.likes ?? 1) - 1)
        await supabaseAdmin
          .from('page_reactions')
          .update({ likes: nextLikes })
          .eq('provider_id', providerId)

        await supabaseAdmin.from('page_events').insert({
          provider_id: providerId, event_type: 'like', referrer: referrer ?? null,
        })
        return NextResponse.json({ success: true, liked: false, likes: nextLikes })
      }

      await supabaseAdmin.from('page_reaction_hits').insert({ provider_id: providerId, visitor_hash: hash })

      const nextLikes = (existing?.likes ?? 0) + 1
      if (existing) {
        await supabaseAdmin.from('page_reactions').update({ likes: nextLikes }).eq('provider_id', providerId)
      } else {
        await supabaseAdmin.from('page_reactions').insert({ provider_id: providerId, likes: 1 })
      }

      await supabaseAdmin.from('page_events').insert({
        provider_id: providerId, event_type: 'like', referrer: referrer ?? null,
      })
      return NextResponse.json({ success: true, liked: true, likes: nextLikes })
    }

    await supabaseAdmin.from('page_events').insert({
      provider_id: providerId,
      event_type:  eventType,
      referrer:    referrer ?? null,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

// Public GET — return like count for a provider
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('page_reactions')
    .select('likes')
    .eq('provider_id', providerId)
    .single()

  return NextResponse.json({ likes: data?.likes ?? 0 })
}
