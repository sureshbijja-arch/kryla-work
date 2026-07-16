import type { Metadata } from 'next'

export const metadata: Metadata = {
  manifest: '/api/manifest/customer',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kryla',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
