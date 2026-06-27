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

    // Match by providerId OR slug so Inngest retries (which may use a different
    // row) don't cause the browser to miss the page_live=true signal.
    let query = supabase.from('providers').select('page_live, slug')
    if (providerId && slug) {
      query = query.or(`id.eq.${providerId},slug.eq.${slug}`)
    } else if (providerId) {
      query = query.eq('id', providerId)
    } else {
      query = query.eq('slug', slug!)
    }

    const { data, error } = await query.limit(1).maybeSingle()

    if (error || !data) return NextResponse.json({ ready: false })

    if (data.page_live) {
      return NextResponse.json({ ready: true, slug: data.slug, presenceUrl: `https://${data.slug}.kryla.work` })
    }

    return NextResponse.json({ ready: false })
  } catch (err) {
    console.error('[status]', err)
    return NextResponse.json({ ready: false })
  }
}
