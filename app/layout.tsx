import type { Metadata, Viewport } from "next"
import { Fraunces, Inter, Newsreader } from "next/font/google"
import "./globals.css"
import { PHProvider } from "./providers"
import RegisterServiceWorker from "./RegisterServiceWorker"

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Ganesh-only display override (see app/[slug]/components/LayoutRenderer.tsx
// and supabase/migrations/20260731100000_ganesh_mockup_fidelity.sql). Loaded
// site-wide since next/font/google font loaders must be called at module scope,
// but only sellganeshidols' pages.display_font ever references this CSS var —
// every other persona's rendering is unaffected. Ganesh's body_font reuses the
// existing --font-inter variable above (Inter is already the default body face
// site-wide), so no separate body-face load is needed here. Newsreader
// (not Bricolage Grotesque, the original choice) matches the approved
// mockup's Direction Contract exactly — see the migration comment for why.
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D0D0D',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://kryla.work'),
  title: {
    default: "Kryla.work — One platform, built around your craft",
    template: '%s — Kryla',
  },
  description: "Run it, grow it — your way. The business platform built around your craft, alongside how you already work. Live in 15 minutes.",
  openGraph: {
    siteName: 'Kryla',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${newsreader.variable}`}>
      <body>
        <RegisterServiceWorker />
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  )
}
