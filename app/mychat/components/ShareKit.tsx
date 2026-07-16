'use client'

/**
 * ShareKit — multi-channel share panel for a member's public Kryla page.
 *
 * Surfaces the canonical {slug}.kryla.work URL across:
 *   • Native OS share sheet (mobile)     → WhatsApp / Instagram / SMS / email / anything
 *   • WhatsApp button                    → wa.me deep-link
 *   • SMS                                → sms: URI
 *   • Email                              → mailto: URI
 *   • Copy link                          → clipboard
 *   • QR code download                   → PNG for posters / packaging / storefront
 *   • Email-signature snippet            → copy-paste HTML with branded card image
 *   • Instagram / link-in-bio hint       → copy the canonical link
 *   • Embed a badge                      → K badge with name+profession for websites/email/social
 */

import { useState } from 'react'
import { memberUrl, memberShareCardUrl, memberBadgeUrl, badgeEmbedHtml, badgeEmbedImgHtml, memberHost } from '@/lib/links'

interface Props {
  slug: string
  /** Member's display name — used in share text. Defaults to "my page" if omitted. */
  displayName?: string
  /** Persona/profession label, e.g. "Advocate". */
  persona?: string
  /** Avatar image URL — shown in the badge preview and passed to badge PNG route. */
  avatarUrl?: string
}

export default function ShareKit({ slug, displayName, persona, avatarUrl }: Props) {
  const [linkCopied,     setLinkCopied]     = useState(false)
  const [sigCopied,      setSigCopied]      = useState(false)
  const [igCopied,       setIgCopied]       = useState(false)
  const [showSig,        setShowSig]        = useState(false)
  const [qrLoading,      setQrLoading]      = useState(false)
  const [showBadge,      setShowBadge]      = useState(false)
  const [badgeCopied,    setBadgeCopied]    = useState(false)
  const [badgeSigCopied, setBadgeSigCopied] = useState(false)
  const [badgeSharing,   setBadgeSharing]   = useState(false)

  const pageUrl  = memberUrl(slug)
  const cardUrl  = memberShareCardUrl(slug)
  const host     = memberHost(slug)
  const name     = displayName || 'my page'
  const title    = displayName ? `${displayName} — on Kryla` : 'My Kryla page'
  const text     = `Check out ${name} on Kryla`

  // ── Channel URLs ─────────────────────────────────────────────────────────
  const waUrl    = `https://wa.me/?text=${encodeURIComponent(`${text}: ${pageUrl}`)}`
  const smsUrl   = `sms:?body=${encodeURIComponent(`${text}: ${pageUrl}`)}`
  const emailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${pageUrl}`)}`

  // Email-signature HTML — paste into Gmail / Outlook
  const sigHtml = [
    `<a href="${pageUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none">`,
    `<img src="${cardUrl}" alt="${displayName ?? 'My Kryla page'}" width="300" height="158" `,
    `style="display:block;border:none;border-radius:8px" />`,
    `</a>`,
  ].join('')

  // Badge embed snippets
  const badgeHtml    = badgeEmbedHtml(slug, { name: displayName, persona })
  const badgeSigHtml = badgeEmbedImgHtml(slug)

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Robust clipboard copy: async API → execCommand fallback
  function robustCopy(text: string, onSuccess: () => void) {
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = text
      Object.assign(ta.style, { position: 'fixed', top: '0', left: '0', opacity: '0' })
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try { if (document.execCommand('copy')) onSuccess() } catch { /* ignore */ }
      document.body.removeChild(ta)
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(fallback)
    } else {
      fallback()
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function nativeShare() {
    try { await navigator.share({ url: pageUrl, title, text }) } catch { /* cancelled */ }
  }

  function copyLink()    { robustCopy(pageUrl,  () => { setLinkCopied(true);     setTimeout(() => setLinkCopied(false),     2000) }) }
  function copyIg()      { robustCopy(pageUrl,  () => { setIgCopied(true);       setTimeout(() => setIgCopied(false),       2500) }) }
  function copySig()     { robustCopy(sigHtml,  () => { setSigCopied(true);      setTimeout(() => setSigCopied(false),      2500) }) }
  function copyBadge()   { robustCopy(badgeHtml,() => { setBadgeCopied(true);    setTimeout(() => setBadgeCopied(false),    2500) }) }
  function copyBadgeSig(){ robustCopy(badgeSigHtml,() => { setBadgeSigCopied(true); setTimeout(() => setBadgeSigCopied(false), 2500) }) }

  async function downloadQr() {
    setQrLoading(true)
    try {
      const QRCode  = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(pageUrl, { width: 400, margin: 2, color: { dark: '#0D0D0D', light: '#FFFFFF' } })
      const a = Object.assign(document.createElement('a'), { href: dataUrl, download: `${slug}-qr.png` })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch (err) { console.error('[ShareKit] QR failed:', err) }
    finally { setQrLoading(false) }
  }

  // Badge PNG download (horizontal) — relative URL avoids cross-origin CORS on member subdomains
  async function downloadBadgePng() {
    try {
      const res  = await fetch(`/api/badge/${slug}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), { href: url, download: `${slug}-badge.png` })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) { console.error('[ShareKit] badge download failed:', err) }
  }

  // Instagram square card download (1080×1080)
  async function downloadInstagramCard() {
    try {
      const res  = await fetch(`/api/badge/${slug}?format=square`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), { href: url, download: `${slug}-instagram.png` })
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) { console.error('[ShareKit] Instagram card download failed:', err) }
  }

  // Native share of the badge PNG image (mobile) — shares the square card for IG stories
  async function shareBadgeImage() {
    if (!navigator.canShare) return
    setBadgeSharing(true)
    try {
      const res  = await fetch(`/api/badge/${slug}?format=square`)
      const blob = await res.blob()
      const file = new File([blob], `${slug}-instagram.png`, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${displayName ?? slug} on Kryla`, url: pageUrl })
      } else {
        await navigator.share({ url: pageUrl, title })
      }
    } catch { /* cancelled */ }
    finally { setBadgeSharing(false) }
  }

  const canNativeShare   = typeof navigator !== 'undefined' && !!navigator?.share
  const canShareFiles    = typeof navigator !== 'undefined' && !!navigator?.canShare

  // Badge preview initial letter
  const initial = displayName ? displayName[0].toUpperCase() : slug[0].toUpperCase()

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white mb-4 space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#0D0D0D] flex items-center justify-center flex-shrink-0">
          {/* Canonical Kryla K: spine left, two arms right, lower arm amber */}
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <line x1="5" y1="2"  x2="5"  y2="20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="5" y1="11" x2="17" y2="2"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="5" y1="11" x2="17" y2="20" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0D0D0D]">Share your page</p>
          <p className="text-xs text-[#666]">WhatsApp · Instagram · Email · SMS · QR code</p>
        </div>
      </div>

      {/* Canonical link pill */}
      <div className="bg-[#F5F5F5] rounded-lg px-3 py-2 text-xs text-[#333] font-mono break-all select-all">
        {pageUrl}
      </div>

      {/* Native share (mobile primary) */}
      {canNativeShare && (
        <button
          onClick={nativeShare}
          className="w-full py-2.5 rounded-xl bg-[#0D0D0D] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share
        </button>
      )}

      {/* Channel grid */}
      <div className="grid grid-cols-2 gap-2">
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: '#25D366' }}>
          <WaIcon />
          WhatsApp
        </a>

        <a href={smsUrl}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#333] hover:border-[#0D0D0D] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          SMS
        </a>

        <a href={emailUrl}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#333] hover:border-[#0D0D0D] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email
        </a>

        <button onClick={copyLink}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#333] hover:border-[#0D0D0D] transition-colors">
          {linkCopied ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>Copy link</>
          )}
        </button>
      </div>

      {/* Instagram / link-in-bio */}
      <div className="rounded-lg border border-[#E8D5F0] bg-[#FCF5FF] px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C026D3" strokeWidth="1.8">
            <rect x="2" y="2" width="20" height="20" rx="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="#C026D3"/>
          </svg>
          <span className="text-xs text-[#86198F] font-medium truncate">Instagram bio link</span>
        </div>
        <button onClick={copyIg}
          className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-lg bg-[#C026D3] text-white hover:opacity-80 transition-opacity">
          {igCopied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* QR code download */}
      <button onClick={downloadQr} disabled={qrLoading}
        className="w-full py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="5" y="5" width="4" height="4" fill="white"/>
          <rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="15" y="5" width="4" height="4" fill="white"/>
          <rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="5" y="15" width="4" height="4" fill="white"/>
          <rect x="13" y="13" width="4" height="4" rx="1"/><rect x="19" y="13" width="2" height="2" rx="0.5"/>
          <rect x="13" y="19" width="2" height="2" rx="0.5"/><rect x="17" y="17" width="4" height="4" rx="1"/>
        </svg>
        {qrLoading ? 'Generating…' : 'Download QR code'}
        <span className="text-[#999] font-normal">for posters &amp; packaging</span>
      </button>

      {/* Email signature */}
      <div>
        <button onClick={() => setShowSig(v => !v)}
          className="w-full py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email signature snippet
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ transform: showSig ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M1 3l4 4 4-4"/>
          </svg>
        </button>
        {showSig && (
          <div className="mt-2 space-y-2">
            <p className="text-[11px] text-[#666] leading-relaxed">
              Paste this into your Gmail or Outlook signature. It adds a clickable branded Kryla card that opens your page when tapped.
            </p>
            <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-2.5 text-[10px] font-mono text-[#555] break-all leading-relaxed">
              {sigHtml}
            </div>
            <button onClick={copySig}
              className="w-full py-2 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors">
              {sigCopied ? '✓ Copied HTML!' : 'Copy signature HTML'}
            </button>
          </div>
        )}
      </div>

      {/* Embed a badge */}
      <div>
        <button onClick={() => setShowBadge(v => !v)}
          className="w-full py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors flex items-center justify-center gap-2">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] text-[9px] font-black" style={{ background: '#F5A623', color: '#0D0D0D' }}>K</span>
          Embed a badge
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ transform: showBadge ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M1 3l4 4 4-4"/>
          </svg>
        </button>

        {showBadge && (
          <div className="mt-2 space-y-3">
            <p className="text-[11px] text-[#666] leading-relaxed">
              Drop the K badge anywhere — website, blog, bio, or email. It links directly to your Kryla page.
            </p>

            {/* Live badge preview — gradient card, clickable, links to member page */}
            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl px-4 py-5 flex items-center justify-center">
              <a
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Click to open your page"
                style={{
                  display:        'inline-flex',
                  alignItems:     'center',
                  gap:            '10px',
                  background:     'linear-gradient(100deg, #FFF8E8 0%, #FFE4A0 55%, #F5A623 100%)',
                  borderRadius:   '10px',
                  padding:        '8px 14px 8px 10px',
                  textDecoration: 'none',
                  border:         '1px solid rgba(245,166,35,0.3)',
                  boxShadow:      '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                {/* K mark — dark square on amber gradient */}
                <span style={{
                  display:        'inline-flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  width:          '30px',
                  height:         '30px',
                  background:     '#0D0D0D',
                  borderRadius:   '7px',
                  fontSize:       '17px',
                  fontWeight:     900,
                  color:          '#F5A623',
                  flexShrink:     0,
                }}>K</span>

                {/* Thin divider */}
                <span style={{ width: '1px', height: '28px', background: 'rgba(0,0,0,0.12)', flexShrink: 0 }} />

                {/* Avatar */}
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.8)' }}
                  />
                ) : (
                  <span style={{
                    display:        'inline-flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    width:          '30px',
                    height:         '30px',
                    borderRadius:   '50%',
                    background:     'rgba(255,255,255,0.7)',
                    fontSize:       '14px',
                    fontWeight:     700,
                    color:          '#B87A10',
                    flexShrink:     0,
                  }}>{initial}</span>
                )}

                {/* Text — dark on light amber = high contrast */}
                <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '1px' }}>
                  {displayName && (
                    <span style={{ color: '#0D0D0D', fontSize: '12px', fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                      {displayName}
                    </span>
                  )}
                  {persona && (
                    <span style={{ color: '#333333', fontSize: '10px', fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                      {persona}
                    </span>
                  )}
                  <span style={{ color: '#555555', fontSize: '10px', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                    {host}
                  </span>
                </span>
              </a>
            </div>
            <p className="text-[10px] text-[#999] text-center -mt-1">↑ Click to preview your live page</p>

            {/* Copy embed code (for websites — inline HTML, no external image) */}
            <button onClick={copyBadge}
              className="w-full py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors flex items-center justify-center gap-1.5">
              {badgeCopied ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  Copy badge code <span className="text-[#999] font-normal ml-1">for website / blog</span></>
              )}
            </button>

            {/* Copy image-based snippet (for email signatures) */}
            <button onClick={copyBadgeSig}
              className="w-full py-2 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors flex items-center justify-center gap-1.5">
              {badgeSigCopied ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Copy for email signature <span className="text-[#999] font-normal ml-1">image-based</span></>
              )}
            </button>

            {/* Instagram square card */}
            <div className="rounded-lg border border-[#E8D5F0] bg-[#FCF5FF] px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C026D3" strokeWidth="1.8">
                  <rect x="2" y="2" width="20" height="20" rx="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="#C026D3"/>
                </svg>
                <span className="text-xs text-[#86198F] font-medium truncate">Instagram / stories (1080×1080)</span>
              </div>
              {canShareFiles ? (
                <button onClick={shareBadgeImage} disabled={badgeSharing}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-lg bg-[#C026D3] text-white hover:opacity-80 transition-opacity disabled:opacity-50">
                  {badgeSharing ? 'Preparing…' : 'Share'}
                </button>
              ) : (
                <button onClick={downloadInstagramCard}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-lg bg-[#C026D3] text-white hover:opacity-80 transition-opacity">
                  Download
                </button>
              )}
            </div>

            {/* Horizontal badge download */}
            <button onClick={downloadBadgePng}
              className="w-full py-2 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors flex items-center justify-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download badge PNG <span className="text-[#999] font-normal ml-1">for website / email</span>
            </button>
          </div>
        )}
      </div>

    </div>
  )
}

function WaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.848L0 24l6.336-1.51A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.79 9.79 0 01-5.001-1.374l-.36-.214-3.732.888.938-3.63-.235-.374A9.773 9.773 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
    </svg>
  )
}
