/**
 * app/opengraph-image.tsx
 *
 * Default OG image for the root Kryla.work landing page.
 * Next.js App Router special file — automatically wired into the root layout
 * openGraph.images without any explicit metadata configuration.
 *
 * Served at: /opengraph-image
 */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Kryla.work — One platform, built around your craft'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display:         'flex',
          width:           '1200px',
          height:          '630px',
          background:      '#0D0D0D',
          alignItems:      'center',
          justifyContent:  'center',
          flexDirection:   'column',
          gap:             '24px',
          fontFamily:      'sans-serif',
          position:        'relative',
        }}
      >
        {/* Subtle grid lines */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(255,255,255,0.02) 80px, rgba(255,255,255,0.02) 81px)',
          }}
        />

        {/* Kryla "K" mark */}
        <div
          style={{
            background:     '#F5A623',
            width:          '80px',
            height:         '80px',
            borderRadius:   '20px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '52px',
            fontWeight:     '900',
            color:          '#0D0D0D',
          }}
        >
          K
        </div>

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0' }}>
          <span style={{ color: '#FFFFFF', fontSize: '72px', fontWeight: '700', letterSpacing: '-2px' }}>kryla</span>
          <span style={{ color: '#F5A623', fontSize: '72px', fontWeight: '700', letterSpacing: '-2px' }}>.work</span>
        </div>

        {/* Tagline */}
        <div style={{ color: '#666', fontSize: '28px', fontWeight: '400', textAlign: 'center', maxWidth: '700px' }}>
          One platform, built around your craft
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
