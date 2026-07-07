import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { BusinessHours } from '@/app/[slug]/types'

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('providers')
    .select('business_hours')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  return NextResponse.json({ businessHours: (data as Record<string, unknown> | null)?.business_hours ?? null })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, businessHours } = body as { providerId: string; businessHours: BusinessHours }

  if (!providerId || !businessHours) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, slug, custom_domain')
    .eq('id', providerId)
    .single()

  if (!provider || provider.email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ business_hours: businessHours })
    .eq('id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Revalidate the public member page so hours changes appear immediately
  // (page is ISR-cached at 1h; on-demand revalidation bypasses the wait)
  revalidatePath(`/${provider.slug}`)
  if (provider.custom_domain) revalidatePath(`/${provider.custom_domain}`)

  return NextResponse.json({ ok: true })
}
