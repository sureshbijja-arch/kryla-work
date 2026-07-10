/**
 * POST /api/mychat/clients/[id]/erase
 * DPDP Act 2023: right to erasure — soft-anonymizes PII while preserving audit trail.
 *
 * Soft anonymize: redacts name/phone/email/notes, clears consent flags + token, sets pii_erased_at.
 * Does NOT hard-delete: student_sessions and notifications are kept intact for audit integrity.
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'
import { logConsentEvent } from '@/lib/consent'

async function getAuthedProviderWithEmail(providerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()
  return provider ? { ...provider, email: user.email } : null
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body       = await req.json()
  const providerId = body.providerId as string | undefined
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const auth = await getAuthedProviderWithEmail(providerId)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = params.id

  // Verify the client belongs to this provider
  const { data: existing } = await supabaseAdmin
    .from('students')
    .select('id, pii_erased_at')
    .eq('id', studentId)
    .eq('provider_id', providerId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (existing.pii_erased_at) return NextResponse.json({ error: 'PII already erased' }, { status: 409 })

  const { error } = await supabaseAdmin
    .from('students')
    .update({
      name:             'Redacted client',
      parent_name:      null,
      parent_email:     null,
      parent_phone:     null,
      notes:            null,
      label_1:          null,
      label_2:          null,
      whatsapp_consent: false,
      remind_client:    false,
      consent_token:    null,
      consent_purpose:  null,
      pii_erased_at:    new Date().toISOString(),
      updated_at:       new Date().toISOString(),
    })
    .eq('id', studentId)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logConsentEvent(supabaseAdmin, {
    providerId,
    studentId,
    event:  'erased',
    source: 'erasure',
    actor:  auth.email,
  })

  return NextResponse.json({ success: true })
}
