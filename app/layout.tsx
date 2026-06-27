import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Kryla.work — Your craft deserves a name online",
  description: "Give your business its own identity. Answer 5 questions, go live in 15 minutes.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
