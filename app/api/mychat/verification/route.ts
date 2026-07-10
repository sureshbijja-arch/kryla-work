/**
 * GET  /api/mychat/verification?providerId= — load own verification status
 * POST /api/mychat/verification             — submit enrolment for verification
 *
 * Provider can submit (forces status:pending). Cannot self-verify.
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

async function getAuthedAdvocate(providerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, persona')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()
  if (!provider || provider.persona !== 'advocate') return null
  return provider
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await getAuthedAdvocate(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('providers')
    .select('verification')
    .eq('id', providerId)
    .single()

  return NextResponse.json({ verification: data?.verification ?? {} })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { providerId, enrolmentNo, barCouncil, state } = body as {
    providerId: string; enrolmentNo: string; barCouncil: string; state: string
  }

  if (!providerId || !enrolmentNo || !barCouncil) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedAdvocate(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const verification = {
    enrolment_no: enrolmentNo,
    bar_council:  barCouncil,
    state:        state ?? null,
    status:       'pending',
    submitted_at: new Date().toISOString(),
    verified_at:  null,
    verified_by:  null,
  }

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ verification })
    .eq('id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ verification })
}
