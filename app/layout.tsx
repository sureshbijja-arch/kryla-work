import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Kryla.work — One platform, built around your craft",
  description: "Run it, grow it — your way. The business platform built around your craft, alongside how you already work. Live in 15 minutes.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
