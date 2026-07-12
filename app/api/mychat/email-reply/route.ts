/**
 * app/api/mychat/email-reply/route.ts
 *
 * Sends an outbound email from the provider's @kryla.work address and
 * persists it to the `emails` table so it appears in the Email thread.
 *
 * Auth: signed-in user must own the providerId (mirrors whatsapp-reply).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

const schema = z.object({
  providerId:  z.string().uuid(),
  toEmail:     z.string().email(),
  subject:     z.string().min(1).max(500),
  body:        z.string().min(1).max(50000),
  /** RFC 2822 Message-ID of the email we're replying to (for threading) */
  inReplyTo:   z.string().optional(),
  /** Full References chain (for threading) */
  references:  z.string().optional(),
})

export async function POST(req: NextRequest) {
  // ── 1. Auth guard ─────────────────────────────────────────────────────────
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Validate body ──────────────────────────────────────────────────────
  let parsed: z.infer<typeof schema>
  try {
    parsed = schema.parse(await req.json())
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 422 })
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // ── 3. Verify caller owns this provider ───────────────────────────────────
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, slug')
    .eq('id', parsed.providerId)
    .eq('email', user.email)
    .maybeSingle()

  if (!provider) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 4. Look up the provider's email address ───────────────────────────────
  const { data: providerEmail } = await supabaseAdmin
    .from('provider_email')
    .select('address, enabled')
    .eq('provider_id', parsed.providerId)
    .maybeSingle()

  if (!providerEmail || !providerEmail.enabled) {
    return NextResponse.json({ error: 'Email inbox not enabled for this provider' }, { status: 404 })
  }

  const fromAddress = `${providerEmail.address.split('@')[0]} <${providerEmail.address}>`

  // ── 5. Build threading headers ────────────────────────────────────────────
  const threadingHeaders: Record<string, string> = {}
  if (parsed.inReplyTo) {
    threadingHeaders['In-Reply-To'] = parsed.inReplyTo
    threadingHeaders['References']  = parsed.references ?? parsed.inReplyTo
  }

  // ── 6. Send via Resend ────────────────────────────────────────────────────
  // Wrap plain-text body in minimal HTML so email clients render it cleanly
  const bodyHtml = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111;">${
    parsed.body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
  }</div>`

  try {
    await sendEmail({
      from:    fromAddress,
      to:      parsed.toEmail,
      subject: parsed.subject,
      html:    bodyHtml,
      replyTo: providerEmail.address,
      headers: threadingHeaders,
    })
  } catch (err) {
    console.error('[email-reply] send error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
  }

  // ── 7. Generate a synthetic Message-ID for the outbound row ──────────────
  const outboundMessageId = `<kryla-${Date.now()}-${Math.random().toString(36).slice(2)}@kryla.work>`

  // ── 8. Persist outbound email ─────────────────────────────────────────────
  const { error: insertErr } = await supabaseAdmin
    .from('emails')
    .insert({
      provider_id:    parsed.providerId,
      customer_email: parsed.toEmail,
      direction:      'outbound',
      subject:        parsed.subject,
      body_text:      parsed.body,
      body_html:      bodyHtml,
      message_id:     outboundMessageId,
      in_reply_to:    parsed.inReplyTo ?? null,
      attachments:    [],
      read:           true,    // outbound messages are always "read"
    })

  if (insertErr) {
    // Not fatal — email was sent; log and continue
    console.error('[email-reply] insert error:', insertErr.message)
  }

  return NextResponse.json({ ok: true, messageId: outboundMessageId })
}
