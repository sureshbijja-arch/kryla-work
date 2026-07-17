'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function WelcomeContent() {
  const params = useSearchParams()
  const slug   = params.get('slug') ?? ''
  // memberUrl reads NEXT_PUBLIC_APP_DOMAIN — safe in client components
  const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'
  const pageUrl = `https://${slug}.${APP_DOMAIN}`
  const shareText = `Hi! I just set up my presence on Kryla — find me at ${pageUrl}`

  const [igCopied, setIgCopied]  = useState(false)
  const [ndCopied, setNdCopied]  = useState(false)

  async function copyFor(platform: 'instagram' | 'nextdoor') {
    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      // fallback for browsers that block clipboard
    }
    if (platform === 'instagram') {
      setIgCopied(true)
      setTimeout(() => setIgCopied(false), 2500)
    } else {
      setNdCopied(true)
      setTimeout(() => setNdCopied(false), 2500)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-[#0D0D0D] rounded-t-2xl px-6 py-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#F5A623] rounded-lg flex items-center justify-center font-bold text-[#0D0D0D]">K</div>
          <span className="text-white font-semibold text-sm">kryla<span className="text-[#F5A623]">.work</span></span>
        </div>
        <div className="h-1 bg-[#22C55E]" />
        <div className="bg-white border border-[#E5E5E5] border-t-0 rounded-b-2xl px-7 py-10">
          <div className="w-16 h-16 rounded-full bg-[#22C55E] flex items-center justify-center text-3xl mx-auto mb-5">🎉</div>
          <h1 className="text-2xl font-semibold text-[#0D0D0D] mb-2">You&apos;re live!</h1>
          <p className="text-sm text-[#666] mb-6 leading-relaxed">
            Your presence is live on Kryla. Share it and your first business will come.
          </p>
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#0D0D0D] text-white rounded-full px-5 py-2.5 text-sm mb-6 hover:bg-[#222] transition-colors">
            <span className="text-[#F5A623]">kryla.work/</span>
            <span>{slug}</span>
            <span className="text-white/40 text-xs ml-1">↗</span>
          </a>

          {/* Share options */}
          <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Share your business profile</p>
          <div className="flex flex-col gap-2">
            <Link
              href={`/${slug}/mykryla`}
              className="bg-[#0D0D0D] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#222] transition-colors">
              Go to My Space →
            </Link>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 justify-center border border-[#E5E5E5] text-[#444] rounded-xl px-5 py-2.5 text-sm font-semibold hover:border-[#25D366] hover:text-[#25D366] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" fill="#25D366"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.557 4.118 1.529 5.849L.057 23.286a.75.75 0 00.914.914l5.504-1.455A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.98 0-3.824-.578-5.378-1.572l-.378-.237-3.925 1.038 1.055-3.851-.249-.393A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#25D366"/>
              </svg>
              Share on WhatsApp
            </a>

            {/* Instagram — copy caption to clipboard */}
            <button
              onClick={() => copyFor('instagram')}
              className="flex items-center gap-2.5 justify-center border border-[#E5E5E5] text-[#444] rounded-xl px-5 py-2.5 text-sm font-semibold hover:border-[#E1306C] hover:text-[#E1306C] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
              </svg>
              {igCopied ? '✓ Copied — paste on Instagram!' : 'Share on Instagram'}
            </button>

            {/* Nextdoor — copy caption to clipboard */}
            <button
              onClick={() => copyFor('nextdoor')}
              className="flex items-center gap-2.5 justify-center border border-[#E5E5E5] text-[#444] rounded-xl px-5 py-2.5 text-sm font-semibold hover:border-[#00B246] hover:text-[#00B246] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 8v12h5v-7h6v7h5V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
              {ndCopied ? '✓ Copied — paste on Nextdoor!' : 'Share on Nextdoor'}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-[#999] mt-4">
          Need anything? Ask us on WhatsApp — we&apos;re always there.
        </p>
      </div>
    </div>
  )
}

export default function WelcomePage() {
  return <Suspense><WelcomeContent /></Suspense>
}
