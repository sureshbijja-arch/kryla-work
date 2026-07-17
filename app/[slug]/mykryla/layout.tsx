import type { Metadata } from 'next'

export const metadata: Metadata = {
  manifest: '/api/manifest/mychat',
  title: 'MyKryla — Kryla',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MyKryla',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function MyChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
