import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'

export async function GET(req: NextRequest) {
  const host     = req.headers.get('host') ?? ''
  const hostname = host.split(':')[0]
  const slug     = hostname.endsWith('.' + APP_DOMAIN)
    ? hostname.replace('.' + APP_DOMAIN, '')
    : null

  let name      = 'Kryla'
  let shortName = 'Kryla'

  if (slug) {
    const { data: provider } = await supabaseAdmin
      .from('providers')
      .select('first_name, display_name')
      .eq('slug', slug)
      .single()

    if (provider) {
      name      = provider.display_name || `${provider.first_name} on Kryla`
      shortName = provider.first_name   || 'Kryla'
    }
  }

  const manifest = {
    name,
    short_name:       shortName,
    description:      'Your Kryla business space',
    start_url:        '/?src=pwa',
    scope:            '/',
    display:          'standalone',
    orientation:      'portrait-primary',
    theme_color:      '#0D0D0D',
    background_color: '#0D0D0D',
    icons: [
      { src: '/icons/icon-192.png',          sizes: '192x192',  type: 'image/png' },
      { src: '/icons/icon-512.png',          sizes: '512x512',  type: 'image/png' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192',  type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512',  type: 'image/png', purpose: 'maskable' },
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
