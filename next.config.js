/** @type {import('next').NextConfig} */
const nextConfig = {
  // ISR revalidation for member profile pages
  experimental: {
    serverActions: { allowedOrigins: ["kryla.work", "*.kryla.work"] },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
}

module.exports = nextConfig
