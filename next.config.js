/** @type {import('next').NextConfig} */
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

const nextConfig = {
  // ISR revalidation for member profile pages
  experimental: {
    serverActions: { allowedOrigins: ["kryla.work", "*.kryla.work"] },
  },
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // PostHog reverse-proxy: routes /ingest/* through the server so ad-blockers
  // don't drop analytics events captured from the browser.
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: `${POSTHOG_HOST}/static/:path*`,
      },
      {
        source: '/ingest/:path*',
        destination: `${POSTHOG_HOST}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
