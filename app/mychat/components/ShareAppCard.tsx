'use client'

import { useState } from 'react'
import { getAppUrl } from '@/lib/links'

interface Props {
  slug: string
}

export default function ShareAppCard({ slug }: Props) {
  const [copied, setCopied] = useState(false)

  const link = getAppUrl(slug, 'customer')
  const waText = encodeURIComponent(
    `Hey! Check out my business page and install it on your phone: ${link}`
  )
  const waShare = `https://wa.me/?text=${waText}`

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#0D0D0D] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none" aria-hidden>
            <line x1="11" y1="2"  x2="11" y2="20" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="3"  y2="3"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="3"  stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="11" y1="11" x2="19" y2="19" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-[#0D0D0D]">Share your app</div>
          <div className="text-xs text-[#666]">Customers install it from their phone</div>
        </div>
      </div>

      <div className="bg-[#F5F5F5] rounded-lg px-3 py-2 text-xs text-[#333] font-mono break-all mb-3">
        {link}
      </div>

      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="flex-1 py-2 rounded-lg border border-[#E5E5E5] text-xs font-semibold text-[#0D0D0D] transition-colors hover:border-[#0D0D0D]">
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
        <a
          href={waShare}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 rounded-lg bg-[#25D366] text-white text-xs font-semibold text-center transition-opacity hover:opacity-80">
          Share via WhatsApp
        </a>
      </div>
    </div>
  )
}
