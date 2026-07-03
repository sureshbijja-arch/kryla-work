import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanGate } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    slug: string
    title?: string
    description?: string
    imageUrl?: string
    linkUrl?: string
  }
  const { slug, title, description, imageUrl, linkUrl } = body

  if (!slug || !title?.trim()) {
    return NextResponse.json({ error: 'slug and title are required' }, { status: 400 })
  }

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, plan')
    .eq('slug', slug)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Not your page' }, { status: 403 })

  const gate = await getPlanGate()
  if (!gate.allows('ads', provider.plan)) {
    return NextResponse.json({ error: 'Upgrade to post ads' }, { status: 403 })
  }

  const { data: ad, error } = await supabaseAdmin
    .from('ads')
    .insert({
      provider_id: provider.id,
      title:       title.trim().slice(0, 100),
      description: description?.trim().slice(0, 500) ?? null,
      image_url:   imageUrl ?? null,
      link_url:    linkUrl  ?? null,
      status:      'approved',
    })
    .select('id')
    .single()

  if (error || !ad) {
    console.error('[ads/submit]', error)
    const msg = error?.message?.includes('relation') || error?.message?.includes('does not exist')
      ? 'Ads table not found — run the SQL migration first'
      : 'Could not save ad'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  revalidatePath(`/${slug}`)

  return NextResponse.json({ ok: true, adId: ad.id })
}
