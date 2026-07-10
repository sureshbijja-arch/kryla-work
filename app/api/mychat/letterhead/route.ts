/**
 * GET  /api/mychat/letterhead?providerId=   → returns { letterhead }
 * POST /api/mychat/letterhead               → body { providerId, letterhead } → saves + returns { letterhead }
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'
import type { Letterhead } from '@/lib/print/template'

async function getAuthedProvider(providerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id, persona')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()
  return data
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('providers')
    .select('letterhead')
    .eq('id', providerId)
    .single()

  return NextResponse.json({ letterhead: (data?.letterhead as Letterhead | null) ?? null })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { providerId, letterhead } = body as { providerId: string; letterhead: Letterhead }

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (provider.persona !== 'advocate') return NextResponse.json({ error: 'Advocate only' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ letterhead })
    .eq('id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ letterhead })
}
