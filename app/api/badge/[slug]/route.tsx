/**
 * app/api/badge/[slug]/route.tsx
 *
 * Generates a branded badge PNG for a member's public page.
 *
 * Formats:
 *   (default)           — 440×260  compact "Find me" card  (warm cream, no black)
 *   format=square       — 1080×1080 Instagram / social card (warm cream)
 *   format=horizontal   — 720×180  legacy amber-gradient badge (kept for compat)
 *
 * Themes:
 *   (default)     — warm cream
 *   theme=dark    — dark #0D0D0D background (legacy)
 *
 * Examples:
 *   /api/badge/priya                        → compact "Find me" card (default)
 *   /api/badge/priya?format=square          → Instagram 1080×1080 card
 *   /api/badge/priya?format=horizontal      → old 720×180 gradient (legacy)
 *   /api/badge/priya?theme=dark             → dark badge (legacy)
 *
 * Palette (cream variants):
 *   Background  #FFFBF2 / #FFF9F0   warm cream, no heavy black
 *   Name        #1A1A1A charcoal
 *   Profession  #8A6D3B warm muted brown
 *   Host URL    #5A5245 warm dark
 *   Accent / K  #F5A623 orange
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
  const slug      = params.slug
  const rawFormat = req.nextUrl.searchParams.get('format')
  // 'compact' = new default; 'square' = 1080×1080; 'horizontal' = legacy 720×180
  const format    = rawFormat === 'square' ? 'square'
                  : rawFormat === 'horizontal' ? 'horizontal'
                  : 'compact'
  const dark      = req.nextUrl.searchParams.get('theme') === 'dark'
  const host      = memberHost(slug)

  // ── Fetch member data ────────────────────────────────────────────────────────
  let memberName = ''
  let persona    = ''
  let avatarUrl: string | null = null

  try {
    const { data: provider } = await supabaseAdmin
      .from('providers')
      .select('first_name, last_name, persona, avatar_url')
      .or(`slug.eq.${slug},custom_domain.eq.${slug}`)
      .eq('page_live', true)
      .single()

    if (provider) {
      memberName = `${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim()
      persona    = provider.persona   ?? ''
      avatarUrl  = provider.avatar_url ?? null
    }
  } catch {
    // DB error or page not live — render minimal badge
  }

  const initial   = memberName ? memberName[0].toUpperCase() : slug[0].toUpperCase()
  const hasAvatar = !!avatarUrl

  // ── Dark (legacy) theme ──────────────────────────────────────────────────────
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
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'54px', height:'54px', background:'#F5A623', borderRadius:'12px', fontSize:'36px', fontWeight:'900', color:'#0D0D0D', flexShrink:0, letterSpacing:'-1px' }}>K</div>
          <div style={{ width:'1px', height:'80px', background:divColor, flexShrink:0, margin:'0 18px' }} />
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl!} width={88} height={88} alt="" style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0, border:`2px solid ${divColor}`, marginRight:'16px' }} />
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'88px', height:'88px', borderRadius:'50%', background:initBg, border:`2px solid ${divColor}`, flexShrink:0, fontSize:'38px', fontWeight:'700', color:muteColor, marginRight:'16px' }}>{initial}</div>
          )}
          <div style={{ display:'flex', flexDirection:'column', flex:1, gap:'2px', minWidth:0 }}>
            {memberName ? (
              <>
                <span style={{ color:txtColor,  fontSize:'30px', fontWeight:'700', lineHeight:'1',   letterSpacing:'-0.5px' }}>{memberName.length > 24 ? memberName.slice(0,22)+'…' : memberName}</span>
                {persona && <span style={{ color:muteColor, fontSize:'18px', fontWeight:'500', lineHeight:'1.2' }}>{persona}</span>}
                <span style={{ color:subColor, fontSize:'15px', fontWeight:'400', letterSpacing:'0.2px' }}>{host}</span>
              </>
            ) : (
              <>
                <span style={{ color:txtColor, fontSize:'30px', fontWeight:'700', lineHeight:'1' }}>{host}</span>
                <span style={{ color:muteColor, fontSize:'18px', fontWeight:'400' }}>Professional business page</span>
              </>
            )}
          </div>
        </div>
      ),
      { width: 720, height: 180 }
    )
  }

  // ── Instagram / social square card (1080×1080, warm cream) ──────────────────
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
            background:     '#FFF9F0',
            fontFamily:     'sans-serif',
            padding:        '100px 80px',
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
                border:       '8px solid #F5A623',
                flexShrink:   0,
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
                background:     '#FFF0D6',
                border:         '8px solid #F5A623',
                flexShrink:     0,
                fontSize:       '140px',
                fontWeight:     '700',
                color:          '#F5A623',
              }}
            >
              {initial}
            </div>
          )}

          {/* Name */}
          <span style={{ color: '#1A1A1A', fontSize: '72px', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-1.5px', textAlign: 'center', marginTop: '56px' }}>
            {memberName ? (memberName.length > 20 ? memberName.slice(0, 18) + '…' : memberName) : host}
          </span>

          {/* Profession */}
          {persona && (
            <span style={{ color: '#8A6D3B', fontSize: '36px', fontWeight: '500', lineHeight: '1.3', marginTop: '16px', textAlign: 'center' }}>
              {persona}
            </span>
          )}

          {/* Warm divider */}
          <div style={{ height: '2px', background: '#EFE3CC', width: '480px', margin: '48px 0 40px', flexShrink: 0 }} />

          {/* Host URL */}
          <span style={{ color: '#5A5245', fontSize: '32px', fontWeight: '500', letterSpacing: '0.3px', textAlign: 'center' }}>
            {host}
          </span>

          {/* Find me on Kryla K */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
            <span style={{ color: '#8A6D3B', fontSize: '28px', fontWeight: '500' }}>Find me on</span>
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:          '56px',
                height:         '56px',
                background:     '#F5A623',
                borderRadius:   '14px',
                fontSize:       '34px',
                fontWeight:     '900',
                color:          '#1A1A1A',
              }}
            >
              K
            </div>
          </div>
        </div>
      ),
      { width: W, height: H }
    )
  }

  // ── Legacy horizontal amber-gradient badge (720×180) ─────────────────────────
  if (format === 'horizontal') {
    return new ImageResponse(
      (
        <div
          style={{
            display:      'flex',
            width:        '720px',
            height:       '180px',
            background:   'linear-gradient(100deg, #FFF8E8 0%, #FFE4A0 55%, #F5A623 100%)',
            alignItems:   'center',
            borderRadius: '20px',
            padding:      '0 24px',
            fontFamily:   'sans-serif',
            border:       '2px solid rgba(245,166,35,0.25)',
          }}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'60px', height:'60px', background:'#0D0D0D', borderRadius:'14px', fontSize:'38px', fontWeight:'900', color:'#F5A623', flexShrink:0, letterSpacing:'-1px', boxShadow:'0 4px 16px rgba(0,0,0,0.18)' }}>K</div>
          <div style={{ width:'1px', height:'80px', background:'rgba(0,0,0,0.12)', flexShrink:0, margin:'0 18px' }} />
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl!} width={96} height={96} alt="" style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'3px solid rgba(255,255,255,0.85)', marginRight:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.14)' }} />
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'96px', height:'96px', borderRadius:'50%', background:'rgba(255,255,255,0.75)', border:'3px solid rgba(255,255,255,0.85)', flexShrink:0, fontSize:'42px', fontWeight:'700', color:'#B87A10', marginRight:'16px' }}>{initial}</div>
          )}
          <div style={{ display:'flex', flexDirection:'column', flex:1, gap:'3px', minWidth:0 }}>
            {memberName ? (
              <>
                <span style={{ color:'#0D0D0D', fontSize:'32px', fontWeight:'800', lineHeight:'1', letterSpacing:'-0.5px' }}>{memberName.length > 22 ? memberName.slice(0,20)+'…' : memberName}</span>
                {persona && <span style={{ color:'#333333', fontSize:'19px', fontWeight:'500', lineHeight:'1.25' }}>{persona}</span>}
                <span style={{ color:'#555555', fontSize:'16px', fontWeight:'400', letterSpacing:'0.2px' }}>{host}</span>
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

  // ── Default: compact "Find me" card (440×260, warm cream) ────────────────────
  // Layout: [avatar | name + profession] / divider / [host url | Find me K]
  // No heavy black. Charcoal text on warm cream background.
  const CW = 440, CH = 260

  return new ImageResponse(
    (
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          width:         `${CW}px`,
          height:        `${CH}px`,
          background:    '#FFFBF2',
          borderRadius:  '20px',
          border:        '1.5px solid rgba(245,166,35,0.30)',
          fontFamily:    'sans-serif',
          overflow:      'hidden',
        }}
      >
        {/* Top row — avatar + name/profession, takes remaining height */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '26px 26px 20px', flex: 1 }}>

          {/* Avatar circle */}
          {hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl!}
              width={90} height={90}
              alt=""
              style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid #F5A623' }}
            />
          ) : (
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:          '90px',
                height:         '90px',
                borderRadius:   '50%',
                background:     '#FFF0D6',
                border:         '3px solid #F5A623',
                flexShrink:     0,
                fontSize:       '38px',
                fontWeight:     '700',
                color:          '#F5A623',
              }}
            >
              {initial}
            </div>
          )}

          {/* Text column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: 0 }}>
            <span style={{ color: '#1A1A1A', fontSize: '26px', fontWeight: '800', lineHeight: '1.1', letterSpacing: '-0.5px' }}>
              {memberName
                ? (memberName.length > 18 ? memberName.slice(0, 16) + '…' : memberName)
                : host}
            </span>
            {(persona || !memberName) && (
              <span style={{ color: '#8A6D3B', fontSize: '16px', fontWeight: '500', lineHeight: '1.25' }}>
                {persona || 'Professional business page'}
              </span>
            )}
          </div>
        </div>

        {/* Warm divider */}
        <div style={{ height: '1px', background: '#EFE3CC', margin: '0 22px', flexShrink: 0 }} />

        {/* Bottom row — host left, "Find me on K" right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 26px 22px', flexShrink: 0 }}>
          <span style={{ color: '#5A5245', fontSize: '15px', fontWeight: '500', letterSpacing: '0.1px' }}>
            {host}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ color: '#8A6D3B', fontSize: '12px', fontWeight: '500' }}>Find me on</span>
            <div
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:          '26px',
                height:         '26px',
                background:     '#F5A623',
                borderRadius:   '6px',
                fontSize:       '16px',
                fontWeight:     '900',
                color:          '#1A1A1A',
              }}
            >
              K
            </div>
          </div>
        </div>
      </div>
    ),
    { width: CW, height: CH }
  )
}
