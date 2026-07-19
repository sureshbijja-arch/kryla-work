import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseBookingReply } from '@/lib/whatsapp'

// Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Inbound message handler
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    const entry = (body.entry as unknown[])?.[0] as Record<string, unknown> | undefined
    const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined
    const value  = change?.value as Record<string, unknown> | undefined

    if (!value) return NextResponse.json({ ok: true })

    const phoneNumberId = value.metadata
      ? (value.metadata as Record<string, unknown>).phone_number_id as string | undefined
      : undefined

    const messages = value.messages as unknown[] | undefined
    if (!messages?.length || !phoneNumberId) return NextResponse.json({ ok: true })

    // Resolve member by phone_number_id
    const { data: conn } = await supabaseAdmin
      .from('whatsapp_connections')
      .select('provider_id')
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle()

    if (!conn) {
      console.warn('[wa-webhook] No connection found for phone_number_id:', phoneNumberId)
      return NextResponse.json({ ok: true })
    }

    // Extract contacts for name lookup
    const contacts = (value.contacts as unknown[]) ?? []
    const contactMap: Record<string, string> = {}
    for (const c of contacts) {
      const contact = c as Record<string, unknown>
      const waId = contact.wa_id as string | undefined
      const name = (contact.profile as Record<string, unknown>)?.name as string | undefined
      if (waId && name) contactMap[waId] = name
    }

    // Insert each inbound message
    for (const m of messages) {
      const msg = m as Record<string, unknown>

      const from      = msg.from as string
      const waId      = msg.id as string
      const tsSeconds = msg.timestamp ? parseInt(msg.timestamp as string, 10) : Math.floor(Date.now() / 1000)

      let text: string | undefined
      let buttonPayloadId: string | undefined

      if (msg.type === 'text') {
        text = (msg.text as Record<string, unknown>)?.body as string | undefined
      } else if (msg.type === 'interactive') {
        const interactive = msg.interactive as Record<string, unknown>
        const btnReply = interactive?.button_reply as Record<string, unknown> | undefined
        buttonPayloadId = btnReply?.id as string | undefined
        text = btnReply?.title as string | undefined
      } else {
        continue
      }
      if (!text) continue

      // Deduplicate by wa_message_id
      const { data: existing } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('id')
        .eq('wa_message_id', waId)
        .maybeSingle()

      if (existing) continue

      await supabaseAdmin.from('whatsapp_messages').insert({
        provider_id:    conn.provider_id,
        customer_phone: from,
        customer_name:  contactMap[from] ?? null,
        body:           text,
        direction:      'inbound',
        wa_message_id:  waId,
        read:           false,
        msg_timestamp:  new Date(tsSeconds * 1000).toISOString(),
      })

      // ── Booking reply handling ────────────────────────────────────────────
      const action = parseBookingReply({ buttonPayloadId, text })
      if (action) {
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .select('id, start_at')
          .eq('provider_id', conn.provider_id)
          .eq('customer_phone', from)
          .eq('status', 'accepted')
          .not('start_at', 'is', null)
          .order('start_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (booking) {
          if (action === 'confirm') {
            // Already accepted — confirm is a no-op acknowledgement, no status change needed.
            // (v1 doesn't have a separate "customer-confirmed" flag; accepted already implies it.)
          } else if (action === 'cancel') {
            await supabaseAdmin
              .from('bookings')
              .update({ status: 'cancelled', status_updated_at: new Date().toISOString() })
              .eq('id', booking.id)
          } else if (action === 'reschedule') {
            // v1: mark on_hold so the owner sees it needs attention; a full slot-picker-over-
            // WhatsApp reschedule flow is out of scope for this plan (see Out of scope).
            await supabaseAdmin
              .from('bookings')
              .update({ status: 'onhold', status_updated_at: new Date().toISOString() })
              .eq('id', booking.id)
          }
        }
      }
    }
  } catch (err) {
    console.error('[wa-webhook] Error processing message:', err)
  }

  // Always return 200 — Meta retries on anything else
  return NextResponse.json({ ok: true })
}
