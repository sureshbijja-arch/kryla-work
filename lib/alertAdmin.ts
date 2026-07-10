/**
 * lib/alertAdmin.ts — Send critical-failure alerts to ADMIN_EMAIL via Resend.
 *
 * Reuses lib/email.ts sendEmail() — no new vendor.
 * Also fires a PostHog server event so alerts appear in the observability dashboard.
 *
 * Usage:
 *   await alertAdmin('Build failed', `<p>Provider ${slug} page build failed.</p>`)
 *
 * Silently no-ops if ADMIN_EMAIL is not set (warns to console).
 */

import { sendEmail } from '@/lib/email'
import { captureServerEvent } from '@/lib/observability'

export function escHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function alertAdmin(subject: string, detailsHtml: string) {
  // Fire PostHog event regardless of email config
  captureServerEvent('admin_alert', { subject })

  const adminEmails = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  if (!adminEmails.length) {
    console.warn('[alertAdmin] ADMIN_EMAIL not set — cannot send alert:', subject)
    return
  }

  for (const to of adminEmails) {
    await sendEmail({
      to,
      subject: `🚨 Kryla Alert: ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#0D0D0D">🚨 ${subject}</h2>
          <div style="background:#FFF5F5;border:1px solid #FCA5A5;border-radius:8px;padding:16px;margin:16px 0">
            ${detailsHtml}
          </div>
          <p style="color:#999;font-size:12px">Sent by Kryla alertAdmin — ${new Date().toISOString()}</p>
        </div>
      `,
    })
  }
}
