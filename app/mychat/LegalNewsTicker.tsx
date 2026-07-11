'use client'

/**
 * LegalNewsTicker — horizontal auto-scrolling strip of LiveLaw headlines.
 *
 * Shown only when persona='advocate' AND region='india' (enforced server-side
 * by /api/mychat/legal-news; the component just renders nothing on empty).
 *
 * Styling matches the SpaceClient / ResearchChat token conventions:
 *   border-[#E5E5E5], text-[11px], text-[#666], hover:text-[#0D0D0D].
 *
 * The scroll animation is a pure CSS marquee — no JS timer, no dependencies.
 * The `prefers-reduced-motion` media query pauses the animation automatically.
 */

import { useEffect, useState } from 'react'

interface NewsItem {
  title: string
  link: string
  category: string
  published_at: string | null
}

interface Props {
  providerId: string
}

export default function LegalNewsTicker({ providerId }: Props) {
  const [items, setItems]     = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/mychat/legal-news?providerId=${encodeURIComponent(providerId)}`)
        if (!res.ok) { setLoading(false); return }
        const data = await res.json()
        if (!cancelled) {
          setItems(data.items ?? [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [providerId])

  // Loading skeleton — one shimmering bar
  if (loading) {
    return (
      <div className="border-b border-[#F0F0F0] px-4 py-2 bg-[#FAFAFA] shrink-0">
        <div className="h-3 w-48 rounded bg-[#E5E5E5] animate-pulse" />
      </div>
    )
  }

  // Nothing to show — don't render at all (keeps the UI clean when not eligible)
  if (items.length === 0) return null

  // Duplicate the list so the marquee appears seamless when it loops
  const doubled = [...items, ...items]

  return (
    <div
      className="border-b border-[#E5E5E5] bg-[#FAFAFA] shrink-0 overflow-hidden"
      title="Latest from LiveLaw">

      {/* Label */}
      <div className="px-3 pt-1.5 pb-0.5 flex items-center gap-1.5">
        <span className="text-[9px] font-semibold text-[#bbb] uppercase tracking-widest">Live Law</span>
        {/* Red live dot */}
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      </div>

      {/* Scrolling strip */}
      <div className="relative pb-2 overflow-hidden">
        <div
          className="flex gap-0 ticker-scroll"
          style={{ width: 'max-content' }}
          aria-live="off">
          {doubled.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mx-3 whitespace-nowrap text-[11px] text-[#666] hover:text-[#0D0D0D] transition-colors shrink-0">
              {/* Category chip */}
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F0F0F0] text-[#999] uppercase tracking-wide">
                {item.category}
              </span>
              {item.title}
              {/* External link micro-icon */}
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="shrink-0 opacity-40">
                <path d="M4 1.5H2A.5.5 0 001.5 2v6a.5.5 0 00.5.5h6A.5.5 0 008.5 8V6M6 1.5h2.5V4M5 5l3.5-3.5"
                  stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* Inline CSS — scoped marquee animation.
          Uses @media (prefers-reduced-motion) to auto-pause for accessibility.
          Duration scales loosely with item count so reading speed is consistent. */}
      <style>{`
        .ticker-scroll {
          animation: ticker-move ${Math.max(20, items.length * 4)}s linear infinite;
        }
        @keyframes ticker-move {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-scroll { animation-play-state: paused; }
        }
      `}</style>
    </div>
  )
}
