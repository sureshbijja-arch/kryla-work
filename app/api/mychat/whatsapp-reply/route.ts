import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  providerId:     z.string().uuid(),
  customerPhone:  z.string().min(7).max(20),
  body:           z.string().min(1).max(4096),
})

export async function POST(req: NextRequest) {
  // Auth guard — must be signed-in owner
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let parsed: z.infer<typeof schema>
  try {
    parsed = schema.parse(await req.json())
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 422 })
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Verify caller owns this provider
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email')
    .eq('id', parsed.providerId)
    .eq('email', user.email)
    .maybeSingle()

  if (!provider) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get the member's Business API credentials
  const { data: conn } = await supabaseAdmin
    .from('whatsapp_connections')
    .select('phone_number_id, access_token')
    .eq('provider_id', parsed.providerId)
    .maybeSingle()

  if (!conn) {
    return NextResponse.json({ error: 'No WhatsApp Business connection found' }, { status: 404 })
  }

  // Send via Meta Cloud API
  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${conn.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conn.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: parsed.customerPhone,
        type: 'text',
        text: { body: parsed.body },
      }),
    }
  )

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}))
    console.error('[wa-reply] Meta API error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 502 })
  }

  const metaData = await metaRes.json()
  const waMessageId = (metaData.messages as { id: string }[] | undefined)?.[0]?.id ?? null

  // Save outbound message to DB
  await supabaseAdmin.from('whatsapp_messages').insert({
    provider_id:    parsed.providerId,
    customer_phone: parsed.customerPhone,
    body:           parsed.body,
    direction:      'outbound',
    wa_message_id:  waMessageId,
    read:           true,
    msg_timestamp:  new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
