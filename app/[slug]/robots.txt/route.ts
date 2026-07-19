import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { memberUrl } from '@/lib/links'

interface Props {
  params: { slug: string }
}

/**
 * Per-member robots.txt — served at https://{slug}.kryla.work/robots.txt.
 * Makes each subdomain read as its own self-describing site: allows the
 * public page, disallows the member's private surfaces, and points at this
 * member's own sitemap (not the apex sitemap).
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { data: bySlug } = await supabaseAdmin
    .from('providers')
    .select('slug')
    .eq('slug', params.slug)
    .eq('page_live', true)
    .maybeSingle()

  const provider = bySlug ?? (
    await supabaseAdmin
      .from('providers')
      .select('slug')
      .eq('custom_domain', params.slug)
      .eq('page_live', true)
      .maybeSingle()
  ).data

  if (!provider) {
    return new NextResponse('Not found', { status: 404 })
  }

  const body = `User-agent: *
Allow: /
Disallow: /mykryla
Disallow: /mychat
Disallow: /preview
Disallow: /print

Sitemap: ${memberUrl(params.slug)}/sitemap.xml
`

  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
