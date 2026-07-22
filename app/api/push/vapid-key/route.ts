import { NextResponse } from 'next/server'

/** Public — the VAPID public key is, by design, safe to expose to the client. */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!publicKey) {
    return NextResponse.json({ error: 'Push is not configured' }, { status: 503 })
  }
  return NextResponse.json({ publicKey })
}
