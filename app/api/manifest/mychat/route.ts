import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    name:             'My Chat',
    short_name:       'My Chat',
    description:      'Manage your Kryla business from anywhere',
    start_url:        '/mychat?src=pwa',
    scope:            '/mychat',
    display:          'standalone',
    orientation:      'portrait-primary',
    theme_color:      '#0D0D0D',
    background_color: '#0D0D0D',
    icons: [
      { src: '/icons/icon-mychat-192.png',   sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-mychat-512.png',   sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type':  'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
