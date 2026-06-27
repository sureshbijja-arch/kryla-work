import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { providerId } = await req.json()
    if (!providerId) return NextResponse.json({ error: 'providerId required' }, { status: 400 })

    const supabase = createServerClient()

    const { data: provider } = await supabase
      .from('providers')
      .select('first_name, slug, whatsapp_number, email')
      .eq('id', providerId)
      .single()

    const firstName = provider?.first_name ?? 'Unknown'
    const slug = provider?.slug ?? '(no slug)'
    const whatsappNumber = provider?.whatsapp_number ?? '(no number)'
    const email = provider?.email ?? '(no email)'

    await supabase.from('build_failures').insert({
      provider_id: providerId,
      slug,
      failed_at: new Date().toISOString(),
    })

    // WhatsApp and email sending comes in Week 4 — placeholder log for now
    console.error(`BUILD FAILED for ${firstName} (${slug}) - whatsapp: ${whatsappNumber} - email: ${email}`)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notify/build-failed]', err)
    return NextResponse.json({ error: 'Something went wrong on our end' }, { status: 500 })
  }
}
