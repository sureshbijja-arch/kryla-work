import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getEnabledPersonas } from '@/lib/personas'
import { memberUrl, SITE_URL } from '@/lib/links'

/**
 * Apex sitemap — served at https://kryla.work/sitemap.xml.
 * Lists marketing pages, live directory pages, and every live member's
 * subdomain URL. Per-member sitemaps (own subdomain) are served separately
 * by app/[slug]/sitemap.xml/route.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [personas, membersRes] = await Promise.all([
    getEnabledPersonas(),
    supabaseAdmin.from('providers').select('slug, persona').eq('page_live', true),
  ])

  const members = (membersRes.data ?? []) as { slug: string; persona: string }[]
  const personaIds = new Set(personas.map((p) => p.id))
  const listedPersonas = new Set(members.map((m) => m.persona).filter((p) => personaIds.has(p)))

  const marketing: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/directory`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const directoryEntries: MetadataRoute.Sitemap = [...listedPersonas].map((persona) => ({
    url: `${SITE_URL}/directory/${persona}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const memberEntries: MetadataRoute.Sitemap = members.map((m) => ({
    url: memberUrl(m.slug),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...marketing, ...directoryEntries, ...memberEntries]
}
