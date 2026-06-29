'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Ad } from '../types'

export default function AdsScroller({ slug }: { slug: string }) {
  const [ads, setAds]     = useState<Ad[]>([])
  const [idx, setIdx]     = useState(0)
  const [visible, setVisible] = useState(true) // drives fade transition

  useEffect(() => {
    fetch(`/api/ads/list?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.ads)) setAds(d.ads) })
      .catch(() => {})
  }, [slug])

  const goTo = useCallback((next: number) => {
    setVisible(false)
    setTimeout(() => {
      setIdx(next)
      setVisible(true)
    }, 220)
  }, [])

  // Auto-advance
  useEffect(() => {
    if (ads.length <= 1) return
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % ads.length)
        setVisible(true)
      }, 220)
    }, 4000)
    return () => clearInterval(t)
  }, [ads.length])

  if (!ads.length) return null

  const ad    = ads[idx]
  const multi = ads.length > 1

  const AdCard = () => (
    <div
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.22s ease' }}
    >
      {ad.imageUrl && (
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="w-full h-32 object-cover rounded-t-xl"
        />
      )}
      <div className={`p-3 ${ad.imageUrl ? '' : 'pt-3'}`}>
        <p className="font-semibold text-[#0D0D0D] text-xs leading-snug line-clamp-2">{ad.title}</p>
        {ad.description && (
          <p className="text-[11px] text-[#666] mt-1 leading-relaxed line-clamp-3">{ad.description}</p>
        )}
        {ad.linkUrl && (
          <a
            href={ad.linkUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="mt-2 inline-block text-[11px] font-semibold text-[#F5A623] hover:underline"
          >
            Learn more →
          </a>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop: fixed right sidebar ── */}
      <div className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-2 w-44">
        <p className="text-[9px] text-[#bbb] uppercase tracking-widest self-start pl-1">Sponsored</p>

        <div className="w-full bg-white border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden">
          <AdCard />
        </div>

        {multi && (
          <div className="flex gap-1.5">
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-[#0D0D0D]' : 'bg-[#E5E5E5]'}`}
                aria-label={`Ad ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile: compact bottom bar ── */}
      <div
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E5E5] px-4 py-3"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.22s ease' }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <p className="text-[9px] text-[#bbb] uppercase tracking-widest shrink-0">Ad</p>
          {ad.imageUrl && (
            <img src={ad.imageUrl} alt={ad.title} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[#E5E5E5]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#0D0D0D] text-xs truncate">{ad.title}</p>
            {ad.description && (
              <p className="text-[11px] text-[#999] truncate">{ad.description}</p>
            )}
          </div>
          {ad.linkUrl ? (
            <a
              href={ad.linkUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="shrink-0 text-[11px] font-semibold text-white bg-[#F5A623] px-3 py-1.5 rounded-lg hover:opacity-90"
            >
              View
            </a>
          ) : null}
          {multi && (
            <div className="shrink-0 flex gap-1">
              {ads.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-[#0D0D0D]' : 'bg-[#E5E5E5]'}`}
                  aria-label={`Ad ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
