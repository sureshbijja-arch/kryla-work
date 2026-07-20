import { NextRequest, NextResponse } from 'next/server'
import { isCopyWebsiteAllowed } from '@/lib/copywebsite'

// Public, unauthenticated — used by OnboardingClient to decide whether to show
// the "bring your existing website over" field. Leaks nothing beyond a boolean.
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref')
  const allowed = await isCopyWebsiteAllowed(ref)
  return NextResponse.json({ allowed })
}
