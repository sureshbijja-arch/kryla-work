/**
 * lib/push/send.ts — ALL Web Push sends go through here.
 * Mirrors lib/whatsapp.ts / lib/email.ts: a single send function, inline
 * process.env guards, never throws — best-effort, like every other
 * notification channel in this app.
 */

import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface SendPushOptions {
  title: string
  body:  string
  /** Path or full URL to open when the notification is tapped. */
  url:   string
}

interface SendPushResult {
  success: boolean
  sent:    number
  error?:  string
}

function vapidConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  )
}

/**
 * Send a Web Push notification to every device a provider has subscribed
 * from. Best-effort per subscription — one failing device never blocks
 * another. Subscriptions that the push service reports as gone (404/410)
 * are pruned so future sends don't keep retrying dead endpoints.
 */
export async function sendPush(
  providerId: string,
  opts: SendPushOptions,
): Promise<SendPushResult> {
  if (!vapidConfigured()) {
    console.error('[push] VAPID env vars not set — skipping push to', providerId)
    return { success: false, sent: 0, error: 'VAPID not configured' }
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('provider_id', providerId)

  if (error) {
    console.error('[push] Failed to load subscriptions:', error.message)
    return { success: false, sent: 0, error: error.message }
  }
  if (!subs?.length) return { success: false, sent: 0, error: 'No subscriptions' }

  const payload = JSON.stringify({ title: opts.title, body: opts.body, url: opts.url })

  let sent = 0
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      sent++
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        // Subscription is gone (uninstalled / expired) — prune it.
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('[push] Send failed for subscription', sub.id, ':', err)
      }
    }
  }))

  return { success: sent > 0, sent }
}
