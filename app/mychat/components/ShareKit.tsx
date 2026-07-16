'use client'

/**
 * ShareKit — multi-channel share panel for a member's public Kryla page.
 *
 * Surfaces the canonical {slug}.kryla.work URL (not the /get-app install link)
 * across every channel the user asked for:
 *   • Native OS share sheet (mobile)     → WhatsApp / Instagram / SMS / email / anything
 *   • WhatsApp button                    → wa.me deep-link
 *   • SMS                                → sms: URI
 *   • Email                              → mailto: URI
 *   • Copy link                          → clipboard
 *   • QR code download                   → PNG for posters / packaging / storefront
 *   • Email-signature snippet            → copy-paste HTML with branded card image
 *   • Instagram / link-in-bio hint       → copy the canonical link
 */

import { useState } from 'react'
import { memberUrl, memberShareCardUrl } from '@/lib/links'

interface Props {
  slug: string
  /** Member's display name — used in share text. Defaults to "my page" if omitted. */
  displayName?: string
}

export default function ShareKit({ slug, displayName }: Props) {
  const [linkCopied,  setLinkCopied]  = useState(false)
  const [sigCopied,   setSigCopied]   = useState(false)
  const [igCopied,    setIgCopied]    = useState(false)
  const [showSig,     setShowSig]     = useState(false)
  const [qrLoading,   setQrLoading]   = useState(false)

  const pageUrl  = memberUrl(slug)
  const cardUrl  = memberShareCardUrl(slug)
  const name     = displayName || 'my page'
  const title    = displayName ? `${displayName} — on Kryla` : 'My Kryla page'
  const text     = `Check out ${name} on Kryla`

  // ── Channel URLs ────────────────────────────────────────────────────────
  const waUrl    = `https://wa.me/?text=${encodeURIComponent(`${text}: ${pageUrl}`)}`
  const smsUrl   = `sms:?body=${encodeURIComponent(`${text}: ${pageUrl}`)}`
  const emailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${pageUrl}`)}`

  // Email-signature HTML block — paste into Gmail / Outlook signature
  const sigHtml  = [
    `<a href="${pageUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none">`,
    `<img src="${cardUrl}" alt="${displayName ?? 'My Kryla page'}" width="300" height="158" `,
    `style="display:block;border:none;border-radius:8px" />`,
    `</a>`,
  ].join('')

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function nativeShare() {
    try {
      await navigator.share({ url: pageUrl, title, text })
    } catch {
      // User cancelled or not supported — handled below by showing channel buttons
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {})
  }

  function copyIg() {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setIgCopied(true)
      setTimeout(() => setIgCopied(false), 2500)
    }).catch(() => {})
  }

  function copySig() {
    navigator.clipboard.writeText(sigHtml).then(() => {
      setSigCopied(true)
      setTimeout(() => setSigCopied(false), 2500)
    }).catch(() => {})
  }

  async function downloadQr() {
    setQrLoading(true)
    try {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(pageUrl, {
        width:  400,
        margin: 2,
        color:  { dark: '#0D0D0D', light: '#FFFFFF' },
      })
      const a = document.createElement('a')
      a.href     = dataUrl
      a.download = `${slug}-qr.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('[ShareKit] QR generation failed:', err)
    } finally {
      setQrLoading(false)
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator?.share

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white mb-4 space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#0D0D0D] flex items-center justify-center flex-shrink-0">
          {/* Kryla K mark (inline SVG arrow-up-and-branch) */}
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <line x1="11" y1="2"  x2="11" y2="20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="3"  y2="3"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="3"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
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
        {/* WhatsApp */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: '#25D366' }}
        >
          <WaIcon />
          WhatsApp
        </a>

        {/* SMS */}
        <a
          href={smsUrl}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#333] hover:border-[#0D0D0D] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          SMS
        </a>

        {/* Email */}
        <a
          href={emailUrl}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#333] hover:border-[#0D0D0D] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email
        </a>

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#333] hover:border-[#0D0D0D] transition-colors"
        >
          {linkCopied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              Copy link
            </>
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
        <button
          onClick={copyIg}
          className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-lg bg-[#C026D3] text-white hover:opacity-80 transition-opacity"
        >
          {igCopied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* QR code download */}
      <button
        onClick={downloadQr}
        disabled={qrLoading}
        className="w-full py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="8" height="8" rx="1.5"/>
          <rect x="5" y="5" width="4" height="4" fill="white"/>
          <rect x="13" y="3" width="8" height="8" rx="1.5"/>
          <rect x="15" y="5" width="4" height="4" fill="white"/>
          <rect x="3" y="13" width="8" height="8" rx="1.5"/>
          <rect x="5" y="15" width="4" height="4" fill="white"/>
          <rect x="13" y="13" width="4" height="4" rx="1"/>
          <rect x="19" y="13" width="2" height="2" rx="0.5"/>
          <rect x="13" y="19" width="2" height="2" rx="0.5"/>
          <rect x="17" y="17" width="4" height="4" rx="1"/>
        </svg>
        {qrLoading ? 'Generating…' : 'Download QR code'}
        <span className="text-[#999] font-normal">for posters &amp; packaging</span>
      </button>

      {/* Email signature */}
      <div>
        <button
          onClick={() => setShowSig(v => !v)}
          className="w-full py-2.5 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors flex items-center justify-center gap-2"
        >
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
            <button
              onClick={copySig}
              className="w-full py-2 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] hover:border-[#0D0D0D] transition-colors"
            >
              {sigCopied ? '✓ Copied HTML!' : 'Copy signature HTML'}
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
