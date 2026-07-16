/**
 * app/api/badge/[slug]/route.tsx
 *
 * Generates a compact 720×180 branded badge PNG for a member's public page.
 * Shows: K mark · avatar (or initial) · member name · profession · slug.kryla.work
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
import { supabaseAdmin } from '@/lib/supabase/admin'
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

  const bg        = light ? '#FFFFFF' : '#0D0D0D'
  const txtColor  = light ? '#0D0D0D' : '#FFFFFF'
  const muteColor = light ? '#444444' : '#AAAAAA'
  const subColor  = light ? '#777777' : '#666666'
  const divColor  = light ? '#E5E5E5' : '#2A2A2A'
  const initBg    = light ? '#F0F0F0' : '#1E1E1E'
  const host      = memberHost(slug)

  // ── Fetch member data ───────────────────────────────────────────────────
  let memberName  = ''
  let persona     = ''
  let avatarUrl: string | null = null

  try {
    const { data: provider } = await supabaseAdmin
      .from('providers')
      .select('display_name, first_name, last_name, persona, avatar_url')
      .or(`slug.eq.${slug},custom_domain.eq.${slug}`)
      .eq('page_live', true)
      .single()

    if (provider) {
      memberName = provider.display_name || `${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim()
      persona    = provider.persona   ?? ''
      avatarUrl  = provider.avatar_url ?? null
    }
  } catch {
    // DB error or page not live — render minimal badge (K + host only)
  }

  const initial   = memberName ? memberName[0].toUpperCase() : 'K'
  const hasAvatar = !!avatarUrl

  return new ImageResponse(
    (
      <div
        style={{
          display:     'flex',
          width:       `${W}px`,
          height:      `${H}px`,
          background:  bg,
          alignItems:  'center',
          borderRadius:'18px',
          padding:     '0 24px',
          gap:         '0',
          fontFamily:  'sans-serif',
          border:      light ? '2px solid #E5E5E5' : 'none',
        }}
      >
        {/* Amber K mark */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          '54px',
            height:         '54px',
            background:     '#F5A623',
            borderRadius:   '12px',
            fontSize:       '36px',
            fontWeight:     '900',
            color:          '#0D0D0D',
            flexShrink:     0,
            letterSpacing:  '-1px',
          }}
        >
          K
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '80px', background: divColor, flexShrink: 0, margin: '0 18px' }} />

        {/* Avatar circle */}
        {hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl!}
            width={88}
            height={88}
            alt=""
            style={{
              borderRadius: '50%',
              objectFit:    'cover',
              flexShrink:   0,
              border:       `2px solid ${divColor}`,
              marginRight:  '16px',
            }}
          />
        ) : (
          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          '88px',
              height:         '88px',
              borderRadius:   '50%',
              background:     initBg,
              border:         `2px solid ${divColor}`,
              flexShrink:     0,
              fontSize:       '38px',
              fontWeight:     '700',
              color:          muteColor,
              marginRight:    '16px',
            }}
          >
            {initial}
          </div>
        )}

        {/* Text column */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '2px', minWidth: 0 }}>
          {memberName ? (
            <>
              <span style={{ color: txtColor,  fontSize: '30px', fontWeight: '700', lineHeight: '1', letterSpacing: '-0.5px' }}>
                {memberName.length > 24 ? memberName.slice(0, 22) + '…' : memberName}
              </span>
              {persona && (
                <span style={{ color: muteColor, fontSize: '18px', fontWeight: '500', lineHeight: '1.2' }}>
                  {persona}
                </span>
              )}
              <span style={{ color: subColor, fontSize: '15px', fontWeight: '400', letterSpacing: '0.2px' }}>
                {host}
              </span>
            </>
          ) : (
            <>
              <span style={{ color: txtColor,  fontSize: '30px', fontWeight: '700', lineHeight: '1', letterSpacing: '-0.5px' }}>
                {host}
              </span>
              <span style={{ color: muteColor, fontSize: '18px', fontWeight: '400' }}>
                Professional business page
              </span>
            </>
          )}
        </div>
      </div>
    ),
    { width: W, height: H }
  )
}
