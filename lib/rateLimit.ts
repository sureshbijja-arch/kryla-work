import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// DB-backed rate limiting (not in-memory) — Vercel serverless instances don't
// share memory, so an in-memory counter resets per cold start and gives a
// false sense of protection. Mirrors the existing DB-backed cooldown pattern
// in app/api/auth/whatsapp/start/route.ts, generalized for reuse.

export function getClientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; take the first (client) address.
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

// Sliding-window check: allows `limit` requests per `windowSeconds` for a
// given (bucket, identifier) pair. Non-fatal on DB error — fails open so a
// transient outage never blocks legitimate traffic (mirrors middleware.ts's
// findLiveSlug fail-open pattern).
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()

    const { count, error } = await supabaseAdmin
      .from('rate_limit_hits')
      .select('id', { count: 'exact', head: true })
      .eq('bucket', bucket)
      .eq('identifier', identifier)
      .gt('created_at', windowStart)

    if (error) {
      console.error('[rateLimit] check failed, failing open:', error.message)
      return { allowed: true }
    }

    if ((count ?? 0) >= limit) {
      return { allowed: false, retryAfterSeconds: windowSeconds }
    }

    // Record this hit (non-fatal if it fails — worst case, one extra request slips through)
    await supabaseAdmin.from('rate_limit_hits').insert({ bucket, identifier })

    return { allowed: true }
  } catch (err) {
    console.error('[rateLimit] unexpected failure, failing open:', err)
    return { allowed: true }
  }
}
