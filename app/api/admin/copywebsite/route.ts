import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { DEFAULT_COPYWEBSITE_GATE, type CopyWebsiteGate, type CopyWebsiteGateMode } from '@/lib/copywebsite'

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin(): Promise<{ email: string } | NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email: user.email }
}

export async function GET() {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const [gateRes, requestsRes] = await Promise.all([
    supabaseAdmin
      .from('system_config')
      .select('value')
      .eq('key', 'copywebsite_gate')
      .single(),
    supabaseAdmin
      .from('website_copy_requests')
      .select('*')
      .order('created_at', { ascending: false }),
  ])

  if (requestsRes.error) return NextResponse.json({ error: requestsRes.error.message }, { status: 500 })

  const gate = { ...DEFAULT_COPYWEBSITE_GATE, ...(gateRes.data?.value as Partial<CopyWebsiteGate> ?? {}) }

  return NextResponse.json({ gate, requests: requestsRes.data ?? [] })
}

// POST { mode, codes } — updates the allowlist / global gate mode
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { mode, codes } = body as { mode: CopyWebsiteGateMode; codes: string[] }

  if (!['none', 'all', 'list'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }
  if (!Array.isArray(codes) || !codes.every(c => typeof c === 'string')) {
    return NextResponse.json({ error: 'Invalid codes' }, { status: 400 })
  }

  const normalizedCodes = codes.map(c => c.trim().toUpperCase()).filter(Boolean)

  const { error } = await supabaseAdmin
    .from('system_config')
    .upsert({
      key:        'copywebsite_gate',
      value:      { mode, codes: normalizedCodes },
      updated_at: new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ gate: { mode, codes: normalizedCodes } })
}
