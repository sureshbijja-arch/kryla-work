/**
 * app/api/badge/[slug]/route.tsx
 *
 * Generates a compact 720×180 branded badge PNG for a member's public page.
 * Renders the amber K mark + "<slug>.kryla.work" text on a dark background.
 *
 * No DB call needed — the badge is entirely driven by the slug param.
 * Works even before page_live is set.
 *
 * URL: /api/badge/{slug}              → dark variant (default)
 *      /api/badge/{slug}?theme=light  → light variant (white background)
 *
 * Used in:
 *  • badgeEmbedImgHtml() in lib/links.ts  → email-signature <img> snippet
 *  • ShareKit.tsx "Embed a badge" download PNG button
 */

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { memberHost } from '@/lib/links'

export const runtime = 'nodejs'

const W = 720
const H = 180

interface Props {
  params: { slug: string }
}

export async function GET(req: NextRequest, { params }: Props) {
  const slug  = params.slug
  const light = req.nextUrl.searchParams.get('theme') === 'light'

  const bg      = light ? '#FFFFFF' : '#0D0D0D'
  const kBg     = '#F5A623'
  const kColor  = '#0D0D0D'
  const txtColor = light ? '#0D0D0D' : '#FFFFFF'
  const host    = memberHost(slug)

  return new ImageResponse(
    (
      <div
        style={{
          display:        'flex',
          width:          `${W}px`,
          height:         `${H}px`,
          background:     bg,
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '20px',
          fontFamily:     'sans-serif',
          borderRadius:   '18px',
          padding:        '0 36px',
          // subtle border for light variant so it stays visible on white pages
          border:         light ? '2px solid #E5E5E5' : 'none',
        }}
      >
        {/* Amber K mark */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          '80px',
            height:         '80px',
            background:     kBg,
            borderRadius:   '18px',
            fontSize:       '52px',
            fontWeight:     '900',
            color:          kColor,
            flexShrink:     0,
            letterSpacing:  '-2px',
          }}
        >
          K
        </div>

        {/* Host text */}
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           '4px',
          }}
        >
          <span
            style={{
              color:         txtColor,
              fontSize:      '38px',
              fontWeight:    '700',
              letterSpacing: '-0.5px',
              lineHeight:    '1',
            }}
          >
            {host}
          </span>
          <span
            style={{
              color:         light ? '#666666' : '#888888',
              fontSize:      '20px',
              fontWeight:    '400',
              letterSpacing: '0.5px',
            }}
          >
            Professional business page
          </span>
        </div>
      </div>
    ),
    { width: W, height: H }
  )
}
