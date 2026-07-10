import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { alertAdmin, escHtml } from '@/lib/alertAdmin'
import { captureServerException } from '@/lib/observability'

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

    // Alert admin immediately via email + PostHog
    // slug is validated ^[a-z0-9]{3,30}$ by the onboarding route before it's ever stored,
    // but all values are still escaped here to be safe.
    const safeSlug = /^[a-z0-9]+$/.test(slug) ? slug : escHtml(slug)
    await alertAdmin(
      `Page build failed for ${escHtml(firstName)} (${escHtml(slug)})`,
      `<p><strong>Provider:</strong> ${escHtml(firstName)} — <a href="https://kryla.work/${safeSlug}">${escHtml(slug)}</a></p>
       <p><strong>Email:</strong> ${escHtml(email)}</p>
       <p><strong>WhatsApp:</strong> ${escHtml(whatsappNumber)}</p>
       <p><strong>Provider ID:</strong> ${escHtml(providerId)}</p>
       <p>Check the <strong>build_failures</strong> table and Inngest dashboard for details.</p>`,
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notify/build-failed]', err)
    captureServerException(err, { route: '/api/notify/build-failed' })
    return NextResponse.json({ error: 'Something went wrong on our end' }, { status: 500 })
  }
}
