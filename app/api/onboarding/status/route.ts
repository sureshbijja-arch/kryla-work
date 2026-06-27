import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get('providerId')
  const slug = req.nextUrl.searchParams.get('slug')

  if (!providerId && !slug) {
    return NextResponse.json({ error: 'Missing providerId or slug' }, { status: 400 })
  }

  try {
    const supabase = createServerClient()

    console.log('[status] querying for providerId:', providerId, 'slug:', slug)

    const { data, error } = await supabase
      .from('providers')
      .select('page_live, slug, id')
      .or(`id.eq.${providerId},slug.eq.${slug}`)
      .maybeSingle()

    console.log('[status] result:', JSON.stringify(data), 'error:', JSON.stringify(error))

    if (data?.page_live) {
      console.log('[status] READY - returning true for slug:', data.slug)
      return NextResponse.json({ ready: true, slug: data.slug, presenceUrl: `https://${data.slug}.kryla.work` })
    }

    console.log('[status] not ready yet, page_live:', data?.page_live)
    return NextResponse.json({ ready: false })
  } catch (err) {
    console.error('[status]', err)
    return NextResponse.json({ ready: false })
  }
}
