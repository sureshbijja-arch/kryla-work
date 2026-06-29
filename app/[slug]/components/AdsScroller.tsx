'use client'

import { useState, useEffect } from 'react'
import type { Ad } from '../types'

export default function AdsScroller({ slug }: { slug: string }) {
  const [ads, setAds] = useState<Ad[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    fetch(`/api/ads/list?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.ads)) setAds(d.ads) })
      .catch(() => {})
  }, [slug])

  if (!ads.length) return null

  const ad = ads[idx]
  const multi = ads.length > 1

  return (
    <section className="border-t border-[#E5E5E5] py-6 max-w-2xl mx-auto px-6">
      <p className="text-[10px] text-[#bbb] uppercase tracking-widest mb-3">Sponsored</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIdx(i => (i - 1 + ads.length) % ads.length)}
          disabled={!multi}
          className="shrink-0 w-7 h-7 rounded-full border border-[#E5E5E5] flex items-center justify-center text-[#999] hover:border-[#0D0D0D] transition-colors disabled:opacity-0"
          aria-label="Previous ad"
        >
          ‹
        </button>

        <div className="flex-1 flex gap-3 items-center">
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E5E5E5]"
            />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-[#0D0D0D] text-sm truncate">{ad.title}</p>
            {ad.description && (
              <p className="text-xs text-[#666] mt-0.5 leading-relaxed line-clamp-2">{ad.description}</p>
            )}
            {ad.linkUrl && (
              <a
                href={ad.linkUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="text-xs font-semibold text-[#F5A623] hover:underline mt-1 inline-block"
              >
                Learn more →
              </a>
            )}
          </div>
        </div>

        <button
          onClick={() => setIdx(i => (i + 1) % ads.length)}
          disabled={!multi}
          className="shrink-0 w-7 h-7 rounded-full border border-[#E5E5E5] flex items-center justify-center text-[#999] hover:border-[#0D0D0D] transition-colors disabled:opacity-0"
          aria-label="Next ad"
        >
          ›
        </button>
      </div>

      {multi && (
        <div className="flex justify-center gap-1.5 mt-3">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-[#0D0D0D]' : 'bg-[#E5E5E5]'}`}
              aria-label={`Ad ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
