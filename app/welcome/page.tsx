'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const APP_DOMAIN    = process.env.NEXT_PUBLIC_APP_DOMAIN    ?? 'kryla.work'
const STUDIO_DOMAIN = process.env.NEXT_PUBLIC_STUDIO_DOMAIN ?? 'kryla.studio'

function WelcomeContent() {
  const params  = useSearchParams()
  const slug    = params.get('slug') ?? ''
  const persona = params.get('persona') ?? ''

  const isTutor  = persona === 'tutor'
  const domain   = isTutor ? STUDIO_DOMAIN : APP_DOMAIN
  const pageUrl  = `https://${slug}.${domain}`
  const waShareText = `Hi! I just set up my presence — find me at ${pageUrl}`

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-[#0D0D0D] rounded-t-2xl px-6 py-3 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#F5A623] rounded-lg flex items-center justify-center font-bold text-[#0D0D0D]">K</div>
          <span className="text-white font-semibold text-sm">
            kryla<span className="text-[#F5A623]">{isTutor ? '.studio' : '.work'}</span>
          </span>
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
            <span className="text-[#F5A623]">{domain}/</span>
            <span>{slug}</span>
            <span className="text-white/40 text-xs ml-1">↗</span>
          </a>
          <div className="flex gap-2.5 justify-center flex-wrap">
            <Link
              href="/my-space"
              className="bg-[#0D0D0D] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#222] transition-colors">
              Go to My Space →
            </Link>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(waShareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#E5E5E5] text-[#444] rounded-xl px-5 py-2.5 text-sm font-semibold hover:border-[#F5A623] transition-colors">
              Share on WhatsApp
            </a>
          </div>
          <p className="text-xs text-[#999] mt-6 leading-relaxed">
            A welcome message from a fellow Kryla member in your city is on its way 👋
          </p>
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
