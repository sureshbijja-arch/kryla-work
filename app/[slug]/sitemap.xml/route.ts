import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { memberUrl } from '@/lib/links'

interface Props {
  params: { slug: string }
}

/**
 * Per-member sitemap — served at https://{slug}.kryla.work/sitemap.xml
 * (middleware rewrites the subdomain request to /{slug}/sitemap.xml).
 * Lists only that member's own public URL so each subdomain presents as a
 * self-contained site to crawlers, independent of the apex sitemap.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { data: bySlug } = await supabaseAdmin
    .from('providers')
    .select('slug')
    .eq('slug', params.slug)
    .eq('page_live', true)
    .single()

  const provider = bySlug ?? (
    await supabaseAdmin
      .from('providers')
      .select('slug')
      .eq('custom_domain', params.slug)
      .eq('page_live', true)
      .single()
  ).data

  if (!provider) {
    return new NextResponse('Not found', { status: 404 })
  }

  const url = memberUrl(params.slug)
  const lastmod = new Date().toISOString()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
