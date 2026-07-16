import type { Metadata } from 'next'

export const metadata: Metadata = {
  manifest: '/api/manifest/mychat',
  title: 'My Chat — Kryla',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'My Chat',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function MyChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
