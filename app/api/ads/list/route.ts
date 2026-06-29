import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ ads: [] })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('slug', slug)
    .eq('page_live', true)
    .single()

  if (!provider) return NextResponse.json({ ads: [] })

  const { data } = await supabaseAdmin
    .from('ads')
    .select('id, title, description, image_url, link_url')
    .eq('provider_id', provider.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  const ads = (data ?? []).map(a => ({
    id: a.id,
    title: a.title,
    description: a.description ?? null,
    imageUrl: a.image_url ?? null,
    linkUrl: a.link_url ?? null,
  }))

  return NextResponse.json({ ads })
}
