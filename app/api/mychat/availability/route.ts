import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function getAuthedProvider(providerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()
  return provider
}

// GET — return all availability rows for provider (active only unless ?all=1)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('availability')
    .select('day_key, active, slots')
    .eq('provider_id', providerId)
    .order('day_key')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ availability: data ?? [] })
}

// POST — upsert a day's availability
export async function POST(req: Request) {
  const body = await req.json()
  const { providerId, dayKey, active, slots } = body

  if (!providerId || !dayKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('availability')
    .upsert(
      {
        provider_id: providerId,
        day_key: dayKey,
        active: active ?? true,
        slots: slots ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider_id,day_key' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — remove a day (deactivate it)
export async function DELETE(req: Request) {
  const body = await req.json()
  const { providerId, dayKey } = body

  if (!providerId || !dayKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin
    .from('availability')
    .delete()
    .eq('provider_id', providerId)
    .eq('day_key', dayKey)

  return NextResponse.json({ success: true })
}
