'use client'
import { useState } from 'react'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  variant: string
}

function galleryLabel(persona: string) {
  if (persona === 'photographer') return 'My Portfolio'
  if (persona === 'baker' || persona === 'chef') return 'Our Work'
  return 'Gallery'
}

function Img({ url, i, className = '' }: { url: string; i: number; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-[#F5F5F5] ${className}`}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-[#E8E8E8]" />}
      <img
        src={url} alt={`Gallery ${i + 1}`}
        onLoad={() => setLoaded(true)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s, transform 0.5s' }}
      />
      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
    </div>
  )
}

/* ── FEATURED ─────────────────────────────────────────────────────────────── */
function Featured({ data }: { data: ProfileData }) {
  const gallery = data.gallery ?? []
  if (!gallery.length) return null
  const [first, ...rest] = gallery

  return (
    <section id="portfolio" className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">{galleryLabel(data.persona ?? '')}</p>
        <div className="grid grid-cols-3 gap-3" style={{ gridTemplateRows: 'auto auto' }}>
          {first && (
            <a href={first} target="_blank" rel="noopener noreferrer"
              className="group col-span-2 row-span-2 overflow-hidden block"
              style={{ borderRadius: 'var(--radius-card)', aspectRatio: '4/5' }}>
              <Img url={first} i={0} className="w-full h-full" />
            </a>
          )}
          {rest.slice(0, 4).map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="group overflow-hidden block aspect-square"
              style={{ borderRadius: 'var(--radius-card)' }}>
              <Img url={url} i={i + 1} className="w-full h-full" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── MASONRY ──────────────────────────────────────────────────────────────── */
function Masonry({ data }: { data: ProfileData }) {
  const gallery = data.gallery ?? []
  if (!gallery.length) return null
  return (
    <section id="portfolio" className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">{galleryLabel(data.persona ?? '')}</p>
        <div className="columns-2 sm:columns-3 gap-3">
          {gallery.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="group block mb-3 overflow-hidden break-inside-avoid"
              style={{ borderRadius: 'var(--radius-card)' }}>
              <img src={url} alt={`Gallery ${i + 1}`}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── SCROLL ───────────────────────────────────────────────────────────────── */
function Scroll({ data }: { data: ProfileData }) {
  const gallery = data.gallery ?? []
  if (!gallery.length) return null
  return (
    <section id="portfolio" className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="px-6 mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999]">{galleryLabel(data.persona ?? '')}</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide px-6">
          {gallery.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="group snap-start shrink-0 w-60 h-60 sm:w-72 sm:h-72 overflow-hidden"
              style={{ borderRadius: 'var(--radius-card)' }}>
              <Img url={url} i={i} className="w-full h-full" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── GRID (default) ───────────────────────────────────────────────────────── */
function Grid({ data }: { data: ProfileData }) {
  const gallery = data.gallery ?? []
  if (!gallery.length) return null
  return (
    <section id="portfolio" className="border-t border-[#E5E5E5]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-6">{galleryLabel(data.persona ?? '')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {gallery.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="group overflow-hidden block aspect-square"
              style={{ borderRadius: 'var(--radius-card)' }}>
              <Img url={url} i={i} className="w-full h-full" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function GallerySection({ data, variant }: Props) {
  if (variant === 'featured') return <Featured data={data} />
  if (variant === 'masonry')  return <Masonry data={data} />
  if (variant === 'scroll')   return <Scroll data={data} />
  return <Grid data={data} />
}
