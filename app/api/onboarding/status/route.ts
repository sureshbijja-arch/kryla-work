import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get('providerId')

  if (!providerId) {
    return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
  }

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('providers')
      .select('page_live, slug')
      .eq('id', providerId)
      .maybeSingle()

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
