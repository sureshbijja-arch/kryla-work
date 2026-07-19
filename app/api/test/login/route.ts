import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * E2E TEST-ONLY LOGIN BYPASS — mints a real Supabase session without an email round-trip.
 *
 * SECURITY: This route is a full account-takeover primitive if reachable. It is gated so it
 * can NEVER work unless ALL of the following hold:
 *   1. process.env.NODE_ENV !== 'production'
 *   2. process.env.E2E_TEST_AUTH_SECRET is set (non-empty)
 *   3. the request's `x-e2e-test-secret` header exactly matches that secret
 *   4. the requested email exactly matches process.env.E2E_TEST_PROVIDER_EMAIL (also required
 *      to be set) — this route can only ever mint a session for one specific, known test
 *      account, never an arbitrary attacker-supplied email, even in a shared non-prod env.
 *
 * Any failure of the above returns 404 (not 401/403) so the route's existence is not
 * discoverable by probing. There is no code path that proceeds past the gate without all
 * four conditions holding.
 */
export async function POST(req: NextRequest) {
  const notFound = () => new NextResponse(null, { status: 404 })

  // Gate 1: never in production, no exceptions.
  if (process.env.NODE_ENV === 'production') {
    return notFound()
  }

  // Gate 2: secret must be configured. An unset/empty secret means the route is always
  // unreachable — "no secret configured" is never treated as "no secret required."
  const expectedSecret = process.env.E2E_TEST_AUTH_SECRET
  if (!expectedSecret) {
    return notFound()
  }

  // Gate 3: header must exactly match the configured secret.
  const providedSecret = req.headers.get('x-e2e-test-secret')
  if (!providedSecret || providedSecret !== expectedSecret) {
    return notFound()
  }

  // Gate 4: the known test email must also be configured, and the request must ask for
  // exactly that email — this route cannot mint a session for an arbitrary address.
  const expectedEmail = process.env.E2E_TEST_PROVIDER_EMAIL
  if (!expectedEmail) {
    return notFound()
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return notFound()
  }

  const email = (body as { email?: unknown } | null)?.email
  if (typeof email !== 'string' || email !== expectedEmail) {
    return notFound()
  }

  // All gates passed — look up the seeded test provider by its known email.
  const { data: provider, error: providerError } = await supabaseAdmin
    .from('providers')
    .select('slug, email')
    .eq('email', expectedEmail)
    .single()

  if (providerError || !provider?.slug) {
    return NextResponse.json(
      { error: 'Test provider not seeded — run scripts/seed-e2e-provider.mjs first' },
      { status: 500 }
    )
  }

  // Mint a magic-link token via the admin API (no email is actually sent) and verify it
  // server-side to establish a real Supabase session — same generateLink/verifyOtp
  // composition already used by app/api/auth/whatsapp/verify/route.ts.
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: expectedEmail,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
  }

  const token_hash = linkData.properties.hashed_token

  // Verify via the SSR client (from lib/supabase/server.ts) so it sets auth cookies on the
  // response through Next's cookies() adapter — reusing the established pattern rather than
  // reimplementing cookie handling.
  const supabase = createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type: 'magiclink',
  })

  if (verifyError) {
    return NextResponse.json({ error: 'Failed to establish session' }, { status: 500 })
  }

  return NextResponse.json({ slug: provider.slug })
}
