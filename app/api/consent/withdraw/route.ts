/**
 * POST /api/consent/withdraw
 * Public (unauthenticated), token-gated consent withdrawal.
 * Client visits /consent/[token] which POSTs here with { token }.
 */

import { NextResponse }    from 'next/server'
import { supabaseAdmin }   from '@/lib/supabase/admin'
import { logConsentEvent } from '@/lib/consent'

export async function POST(req: Request) {
  const body  = await req.json()
  const token = body.token as string | undefined

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, provider_id, whatsapp_consent, pii_erased_at')
    .eq('consent_token', token)
    .single()

  if (!student) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  if (student.pii_erased_at) return NextResponse.json({ error: 'Account already erased' }, { status: 410 })
  if (!student.whatsapp_consent) return NextResponse.json({ already_withdrawn: true })

  const { error } = await supabaseAdmin
    .from('students')
    .update({
      whatsapp_consent: false,
      remind_client:    false,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', student.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logConsentEvent(supabaseAdmin, {
    providerId: student.provider_id,
    studentId:  student.id,
    event:      'withdrawn',
    source:     'client_withdrawal',
    actor:      'client',
  })

  return NextResponse.json({ success: true })
}
