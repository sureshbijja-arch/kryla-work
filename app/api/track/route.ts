import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Public POST — record a page_event (view, like, etc.)
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

    await supabaseAdmin.from('page_events').insert({
      provider_id: providerId,
      event_type:  eventType,
      referrer:    referrer ?? null,
    })

    if (eventType === 'like') {
      // Upsert like counter
      const { data: existing } = await supabaseAdmin
        .from('page_reactions')
        .select('id, likes')
        .eq('provider_id', providerId)
        .single()

      if (existing) {
        await supabaseAdmin
          .from('page_reactions')
          .update({ likes: existing.likes + 1 })
          .eq('provider_id', providerId)
      } else {
        await supabaseAdmin
          .from('page_reactions')
          .insert({ provider_id: providerId, likes: 1 })
      }
    }

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
