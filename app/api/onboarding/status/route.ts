import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get('providerId') ?? ''
  const slug = req.nextUrl.searchParams.get('slug') ?? ''

  if (!providerId && !slug) {
    return NextResponse.json({ error: 'Missing providerId or slug' }, { status: 400 })
  }

  try {
    const supabase = createServerClient()

    // Try by providerId first
    let { data } = await supabase
      .from('providers')
      .select('page_live, slug, id')
      .eq('id', providerId)
      .maybeSingle()

    // If not found or not live yet, try by slug
    if ((!data || !data.page_live) && slug) {
      const { data: bySlug } = await supabase
        .from('providers')
        .select('page_live, slug, id')
        .eq('slug', slug)
        .maybeSingle()
      if (bySlug) data = bySlug
    }

    console.log('[status] providerId:', providerId, 'slug:', slug, 'data:', JSON.stringify(data))
    console.log('[status] raw page_live value:', data?.page_live, typeof data?.page_live)

    if (data?.page_live === true || data?.page_live === 'true') {
      console.log('[status] READY for slug:', data.slug)
      return NextResponse.json({ ready: true, slug: data.slug, presenceUrl: `https://${data.slug}.kryla.work` })
    }

    console.log('[status] not ready, page_live:', data?.page_live)
    return NextResponse.json({ ready: false })
  } catch (err) {
    console.error('[status]', err)
    return NextResponse.json({ ready: false })
  }
}
