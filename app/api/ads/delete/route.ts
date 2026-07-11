import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { adId } = await req.json() as { adId: string }
  if (!adId) return NextResponse.json({ error: 'adId is required' }, { status: 400 })

  const { data: ad } = await supabaseAdmin
    .from('ads')
    .select('id, provider_id')
    .eq('id', adId)
    .single()

  if (!ad) return NextResponse.json({ error: 'Ad not found' }, { status: 404 })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug')
    .eq('id', ad.provider_id)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Not your ad' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('ads')
    .delete()
    .eq('id', adId)

  if (error) {
    console.error('[ads/delete]', error)
    return NextResponse.json({ error: 'Could not delete ad' }, { status: 500 })
  }

  revalidatePath(`/${provider.slug}`)

  return NextResponse.json({ ok: true })
}
