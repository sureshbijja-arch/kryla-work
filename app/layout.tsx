import type { Metadata, Viewport } from "next"
import { Fraunces, Inter } from "next/font/google"
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D0D0D',
  userScalable: false,
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <RegisterServiceWorker />
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  )
}
