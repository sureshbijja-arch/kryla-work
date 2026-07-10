/**
 * app/api/health/route.ts — Lightweight liveness probe.
 *
 * Returns 200 + { ok: true, db: true, ts } when the app and DB are healthy.
 * Returns 503 + { ok: false, db: false } on failure.
 *
 * Point an external uptime monitor (BetterStack, UptimeRobot, etc.) at:
 *   https://kryla.work/api/health
 * with an email alert to ADMIN_EMAIL on any non-200 response.
 *
 * No auth, no PII exposed.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const ts = new Date().toISOString()
  try {
    const { error } = await supabaseAdmin
      .from('plans')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('[health] DB check failed:', error.message)
      return NextResponse.json({ ok: false, db: false, ts, error: error.message }, { status: 503 })
    }

    return NextResponse.json({ ok: true, db: true, ts })
  } catch (err) {
    console.error('[health] unexpected error:', err)
    return NextResponse.json({ ok: false, db: false, ts, error: String(err) }, { status: 503 })
  }
}
