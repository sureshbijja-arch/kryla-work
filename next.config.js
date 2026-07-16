// next.config.js
const withSerwist = require('@serwist/next').default

/** @type {import('next').NextConfig} */
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: { allowedOrigins: ['kryla.work', '*.kryla.work'] },
  },
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: `${POSTHOG_HOST}/static/:path*` },
      { source: '/ingest/:path*',        destination: `${POSTHOG_HOST}/:path*` },
    ]
  },
}

module.exports = withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)
