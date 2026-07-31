import type { Metadata, Viewport } from "next"
import { Fraunces, Inter, Bricolage_Grotesque, Public_Sans } from "next/font/google"
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

// Ganesh-only display/body override (see app/[slug]/components/LayoutRenderer.tsx
// and supabase/migrations/20260731090000_ganesh_theme_font_columns.sql). Loaded
// site-wide since next/font/google font loaders must be called at module scope,
// but only sellganeshidols' pages.display_font/body_font ever reference these
// CSS vars — every other persona's rendering is unaffected.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${bricolage.variable} ${publicSans.variable}`}>
      <body>
        <RegisterServiceWorker />
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  )
}
