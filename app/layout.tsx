import type { Metadata } from "next"
import "./globals.css"
import { PHProvider } from "./providers"

export const metadata: Metadata = {
  title: "Kryla.work — One platform, built around your craft",
  description: "Run it, grow it — your way. The business platform built around your craft, alongside how you already work. Live in 15 minutes.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  )
}
