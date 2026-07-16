/**
 * app/api/badge/[slug]/route.tsx
 *
 * Generates a branded badge PNG for a member's public page.
 *
 * Formats:
 *   format=horizontal (default) — 720×180  compact badge for websites / email signatures
 *   format=square               — 1080×1080 Instagram / social card
 *
 * Themes:
 *   theme=gradient (default) — warm amber gradient, dark legible text
 *   theme=dark               — dark #0D0D0D background (legacy)
 *
 * Examples:
 *   /api/badge/priya                        → amber-gradient horizontal badge
 *   /api/badge/priya?format=square          → Instagram card
 *   /api/badge/priya?theme=dark             → dark badge (legacy)
 *
 * Used in:
 *  • badgeEmbedImgHtml() in lib/links.ts   → email-signature <img> snippet
 *  • ShareKit.tsx "Embed a badge" preview + download buttons
 */

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { memberHost } from '@/lib/links'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function GET(req: NextRequest, { params }: Props) {
  const slug   = params.slug
  const format = req.nextUrl.searchParams.get('format') === 'square' ? 'square' : 'horizontal'
  const dark   = req.nextUrl.searchParams.get('theme') === 'dark'
  const host   = memberHost(slug)

  // ── Fetch member data ────────────────────────────────────────────────────────
  let memberName = ''
  let persona    = ''
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
    // DB error or page not live — render minimal badge
  }

  const initial   = memberName ? memberName[0].toUpperCase() : 'K'
  const hasAvatar = !!avatarUrl

  // ── Dark (legacy) theme tokens ───────────────────────────────────────────────
  if (dark) {
    const bg        = '#0D0D0D'
    const txtColor  = '#FFFFFF'
    const muteColor = '#AAAAAA'
    const subColor  = '#666666'
    const divColor  = '#2A2A2A'
    const initBg    = '#1E1E1E'

    return new ImageResponse(
      (
        <div style={{ display:'flex', width:'720px', height:'180px', background:bg, alignItems:'center', borderRadius:'18px', padding:'0 24px', fontFamily:'sans-serif' }}>
          {/* Amber K mark */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'54px', height:'54px', background:'#F5A623', borderRadius:'12px', fontSize:'36px', fontWeight:'900', color:'#0D0D0D', flexShrink:0, letterSpacing:'-1px' }}>K</div>
          {/* Divider */}
          <div style={{ width:'1px', height:'80px', background:divColor, flexShrink:0, margin:'0 18px' }} />
          {/* Avatar */}
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl!} width={88} height={88} alt="" style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0, border:`2px solid ${divColor}`, marginRight:'16px' }} />
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'88px', height:'88px', borderRadius:'50%', background:initBg, border:`2px solid ${divColor}`, flexShrink:0, fontSize:'38px', fontWeight:'700', color:muteColor, marginRight:'16px' }}>{initial}</div>
          )}
          {/* Text */}
          <div style={{ display:'flex', flexDirection:'column', flex:1, gap:'2px', minWidth:0 }}>
            {memberName ? (
              <>
                <span style={{ color:txtColor,  fontSize:'30px', fontWeight:'700', lineHeight:'1',   letterSpacing:'-0.5px' }}>{memberName.length > 24 ? memberName.slice(0,22)+'…' : memberName}</span>
                {persona && <span style={{ color:muteColor, fontSize:'18px', fontWeight:'500', lineHeight:'1.2' }}>{persona}</span>}
                <span style={{ color:subColor, fontSize:'15px', fontWeight:'400', letterSpacing:'0.2px' }}>{host}</span>
              </>
            ) : (
              <>
                <span style={{ color:txtColor,  fontSize:'30px', fontWeight:'700', lineHeight:'1' }}>{host}</span>
                <span style={{ color:muteColor, fontSize:'18px', fontWeight:'400' }}>Professional business page</span>
              </>
            )}
          </div>
        </div>
      ),
      { width: 720, height: 180 }
    )
  }

  // ── Square Instagram card (1080×1080, gradient) ──────────────────────────────
  if (format === 'square') {
    const W = 1080, H = 1080

    return new ImageResponse(
      (
        <div
          style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            width:          `${W}px`,
            height:         `${H}px`,
            // Warm amber gradient — light top, richer amber bottom
            background:     'linear-gradient(160deg, #FFF8E8 0%, #FFE7A0 45%, #F5A623 100%)',
            fontFamily:     'sans-serif',
            padding:        '80px 60px',
            gap:            '0',
          }}
        >
          {/* Large avatar circle */}
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl!}
              width={320} height={320}
              alt=""
              style={{
                borderRadius: '50%',
                objectFit:    'cover',
                border:       '8px solid #FFFFFF',
                flexShrink:   0,
                boxShadow:    '0 12px 48px rgba(0,0,0,0.18)',
              }}
            />
          ) : (
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:          '320px',
                height:         '320px',
                borderRadius:   '50%',
                background:     '#FFFFFF',
                border:         '8px solid rgba(255,255,255,0.8)',
                flexShrink:     0,
                fontSize:       '140px',
                fontWeight:     '700',
                color:          '#F5A623',
              }}
            >
              {initial}
            </div>
          )}

          {/* White card panel for text — ensures legibility over any gradient */}
          <div
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              background:     'rgba(255,255,255,0.92)',
              borderRadius:   '28px',
              padding:        '40px 60px 48px',
              marginTop:      '48px',
              width:          '100%',
              maxWidth:       '860px',
              gap:            '0',
              boxShadow:      '0 4px 40px rgba(0,0,0,0.10)',
            }}
          >
            {/* Name */}
            {memberName ? (
              <>
                <span style={{ color:'#0D0D0D', fontSize:'72px', fontWeight:'800', lineHeight:'1.1', letterSpacing:'-1.5px', textAlign:'center' }}>
                  {memberName.length > 20 ? memberName.slice(0,18)+'…' : memberName}
                </span>
                {persona && (
                  <span style={{ color:'#555555', fontSize:'36px', fontWeight:'500', lineHeight:'1.3', marginTop:'12px', textAlign:'center' }}>
                    {persona}
                  </span>
                )}
              </>
            ) : null}

            {/* K divider accent */}
            <div style={{ display:'flex', alignItems:'center', gap:'20px', margin:'32px 0 24px' }}>
              <div style={{ flex:1, height:'2px', background:'#F5E8C8' }} />
              <div
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  width:          '52px',
                  height:         '52px',
                  background:     '#F5A623',
                  borderRadius:   '12px',
                  fontSize:       '32px',
                  fontWeight:     '900',
                  color:          '#0D0D0D',
                }}
              >
                K
              </div>
              <div style={{ flex:1, height:'2px', background:'#F5E8C8' }} />
            </div>

            {/* Host */}
            <span style={{ color:'#888888', fontSize:'32px', fontWeight:'500', letterSpacing:'0.3px', textAlign:'center' }}>
              {host}
            </span>
          </div>
        </div>
      ),
      { width: W, height: H }
    )
  }

  // ── Horizontal gradient badge (720×180, default) ─────────────────────────────
  // Gradient goes from light cream #FFF8E8 on the left to amber #F5A623 on the right.
  // Text column sits in the lighter zone — use dark #0D0D0D text for maximum legibility.
  // A semi-transparent white overlay behind the text block keeps it crisp on any host bg.

  return new ImageResponse(
    (
      <div
        style={{
          display:        'flex',
          width:          '720px',
          height:         '180px',
          // Left = lightest, right = amber — text is on the left; K mark on the amber end
          background:     'linear-gradient(100deg, #FFF8E8 0%, #FFE4A0 55%, #F5A623 100%)',
          alignItems:     'center',
          borderRadius:   '20px',
          padding:        '0 24px',
          gap:            '0',
          fontFamily:     'sans-serif',
          border:         '2px solid rgba(245,166,35,0.25)',
        }}
      >
        {/* K mark — amber square on the richest amber part of the gradient */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          '60px',
            height:         '60px',
            background:     '#0D0D0D',
            borderRadius:   '14px',
            fontSize:       '38px',
            fontWeight:     '900',
            color:          '#F5A623',
            flexShrink:     0,
            letterSpacing:  '-1px',
            boxShadow:      '0 4px 16px rgba(0,0,0,0.18)',
          }}
        >
          K
        </div>

        {/* Divider */}
        <div style={{ width:'1px', height:'80px', background:'rgba(0,0,0,0.12)', flexShrink:0, margin:'0 18px' }} />

        {/* Avatar */}
        {hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl!}
            width={96} height={96}
            alt=""
            style={{
              borderRadius: '50%',
              objectFit:    'cover',
              flexShrink:   0,
              border:       '3px solid rgba(255,255,255,0.85)',
              marginRight:  '16px',
              boxShadow:    '0 2px 12px rgba(0,0,0,0.14)',
            }}
          />
        ) : (
          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          '96px',
              height:         '96px',
              borderRadius:   '50%',
              background:     'rgba(255,255,255,0.75)',
              border:         '3px solid rgba(255,255,255,0.85)',
              flexShrink:     0,
              fontSize:       '42px',
              fontWeight:     '700',
              color:          '#B87A10',
              marginRight:    '16px',
            }}
          >
            {initial}
          </div>
        )}

        {/* Text column — sits on the lighter part of the gradient; use dark text */}
        <div style={{ display:'flex', flexDirection:'column', flex:1, gap:'3px', minWidth:0 }}>
          {memberName ? (
            <>
              <span style={{ color:'#0D0D0D', fontSize:'32px', fontWeight:'800', lineHeight:'1', letterSpacing:'-0.5px' }}>
                {memberName.length > 22 ? memberName.slice(0,20)+'…' : memberName}
              </span>
              {persona && (
                <span style={{ color:'#333333', fontSize:'19px', fontWeight:'500', lineHeight:'1.25' }}>
                  {persona}
                </span>
              )}
              <span style={{ color:'#555555', fontSize:'16px', fontWeight:'400', letterSpacing:'0.2px' }}>
                {host}
              </span>
            </>
          ) : (
            <>
              <span style={{ color:'#0D0D0D', fontSize:'32px', fontWeight:'800', lineHeight:'1' }}>{host}</span>
              <span style={{ color:'#444444', fontSize:'18px', fontWeight:'400' }}>Professional business page</span>
            </>
          )}
        </div>
      </div>
    ),
    { width: 720, height: 180 }
  )
}
