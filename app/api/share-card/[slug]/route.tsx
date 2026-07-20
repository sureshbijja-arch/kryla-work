/**
 * app/api/share-card/[slug]/route.tsx
 *
 * Generates a 1200×630 branded OG/share-card image for a member's public page.
 * Used in:
 *  • generateMetadata in app/[slug]/page.tsx  → og:image / twitter:image
 *  • Email-signature HTML snippet in ShareKit
 *
 * URL: /api/share-card/{slug}    (served from apex domain via metadataBase)
 *      {slug}.kryla.work/api/share-card/{slug}  (also works — /api prefix is
 *      excluded from the slug-rewrite in middleware.ts)
 *
 * Runtime: Node.js (default for route handlers). Uses supabaseAdmin so we
 * cannot use the Edge runtime safely.
 */

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const W = 1200
const H = 630

interface Props {
  params: { slug: string }
}

export async function GET(_req: NextRequest, { params }: Props) {
  const slug = params.slug

  // --- fetch member data --------------------------------------------------
  let memberName  = ''
  let persona     = ''
  let location    = ''
  let verified    = false
  let avatarUrl: string | null = null

  try {
    const { data: provider } = await supabaseAdmin
      .from('providers')
      .select('first_name, last_name, persona, location, verified, avatar_url')
      .or(`slug.eq.${slug},custom_domain.eq.${slug}`)
      .eq('page_live', true)
      .single()

    if (provider) {
      memberName = `${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim()
      persona    = provider.persona   ?? ''
      location   = provider.location ?? ''
      verified   = !!provider.verified
      avatarUrl  = provider.avatar_url ?? null
    }
  } catch {
    // DB error — fall back to generic Kryla card
  }

  const isGeneric = !memberName

  // --- layout dimensions ---------------------------------------------------
  const PAD      = 72
  const AVATAR_D = 180
  const hasAvatar = !!avatarUrl

  // --- render card ---------------------------------------------------------
  return new ImageResponse(
    (
      <div
        style={{
          display:         'flex',
          width:           `${W}px`,
          height:          `${H}px`,
          background:      '#0D0D0D',
          alignItems:      'center',
          padding:         `${PAD}px`,
          gap:             `${PAD - 8}px`,
          fontFamily:      'sans-serif',
          position:        'relative',
        }}
      >
        {/* Subtle grid lines for depth */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(255,255,255,0.02) 80px, rgba(255,255,255,0.02) 81px)',
            pointerEvents: 'none',
          }}
        />

        {/* Member avatar or placeholder */}
        {hasAvatar ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatarUrl!}
            width={AVATAR_D}
            height={AVATAR_D}
            alt=""
            style={{
              borderRadius: '50%',
              objectFit:    'cover',
              flexShrink:   0,
              border:       '3px solid rgba(255,255,255,0.12)',
            }}
          />
        ) : (
          /* Initials / generic avatar placeholder */
          <div
            style={{
              width:          `${AVATAR_D}px`,
              height:         `${AVATAR_D}px`,
              borderRadius:   '50%',
              background:     '#1A1A1A',
              border:         '3px solid rgba(255,255,255,0.1)',
              flexShrink:     0,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:        '72px',
              color:           '#555',
            }}
          >
            {isGeneric ? '✦' : (memberName[0] ?? '').toUpperCase()}
          </div>
        )}

        {/* Text content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 0 }}>

          {/* Kryla brand badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div
              style={{
                background:      '#F5A623',
                width:           '36px',
                height:          '36px',
                borderRadius:    '9px',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                fontSize:        '22px',
                fontWeight:      '900',
                color:           '#0D0D0D',
                letterSpacing:   '-1px',
              }}
            >
              K
            </div>
            <span style={{ color: '#555', fontSize: '15px', letterSpacing: '3px', textTransform: 'uppercase' }}>
              KRYLA.WORK
            </span>
          </div>

          {isGeneric ? (
            /* Generic card when slug has no live page */
            <>
              <div style={{ color: '#FFFFFF', fontSize: '60px', fontWeight: '700', lineHeight: 1.1, marginBottom: '16px' }}>
                Professional
              </div>
              <div style={{ color: '#FFFFFF', fontSize: '60px', fontWeight: '700', lineHeight: 1.1, marginBottom: '20px' }}>
                Business Page
              </div>
              <div style={{ color: '#666', fontSize: '26px' }}>
                Powered by Kryla.work
              </div>
            </>
          ) : (
            <>
              {/* Member name */}
              <div
                style={{
                  color:        '#FFFFFF',
                  fontSize:     memberName.length > 22 ? '46px' : '58px',
                  fontWeight:   '700',
                  lineHeight:   1.1,
                  marginBottom: '14px',
                }}
              >
                {memberName}
              </div>

              {/* Persona · Location */}
              {(persona || location) && (
                <div style={{ color: '#888', fontSize: '24px', marginBottom: '24px' }}>
                  {[persona, location].filter(Boolean).join(' · ')}
                </div>
              )}

              {/* Verified badge */}
              {verified && (
                <div
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '6px',
                    border:       '1px solid #22C55E',
                    borderRadius: '20px',
                    padding:      '5px 14px',
                    width:        '120px',
                  }}
                >
                  <span style={{ color: '#22C55E', fontSize: '14px', fontWeight: '600' }}>✓ Verified</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    ),
    {
      width:  W,
      height: H,
    }
  )
}
