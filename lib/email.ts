export async function sendEmail({
  to,
  subject,
  html,
  from = 'Kryla <hello@kryla.work>',
  replyTo,
  headers,
}: {
  to: string
  subject: string
  html: string
  /** Defaults to 'Kryla <hello@kryla.work>' for transactional email */
  from?: string
  /** Reply-To address (e.g. the provider's @kryla.work address) */
  replyTo?: string
  /**
   * Extra RFC 2822 headers for threading.
   * Pass { 'In-Reply-To': '<msgId>', 'References': '<msgId>' } to thread
   * the email correctly in the customer's mail client.
   */
  headers?: Record<string, string>
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is not set — skipping email to', to)
    return
  }

  const body: Record<string, unknown> = {
    from,
    to,
    subject,
    html,
  }
  if (replyTo) body.reply_to = replyTo
  if (headers && Object.keys(headers).length > 0) body.headers = headers

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[email] Resend ${res.status} sending to ${to}:`, text)
    throw new Error(`Resend ${res.status}: ${text}`)
  }
}
