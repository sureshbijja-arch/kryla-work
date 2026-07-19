import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/links'

/**
 * Apex robots.txt — served at https://kryla.work/robots.txt.
 * Per-member robots.txt (own subdomain) is served separately by
 * app/[slug]/robots.txt/route.ts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/mykryla', '/mychat', '/admin', '/print', '/consent', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
