import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Public — return active availability for a provider (used by BookingForm)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabaseAdmin
    .from('availability')
    .select('day_key, slots')
    .eq('provider_id', providerId)
    .eq('active', true)
    .gte('day_key', today)
    .order('day_key')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ availability: data ?? [] })
}
