import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kryla.work',
  description: 'Your professional identity online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
