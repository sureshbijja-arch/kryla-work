'use client'
import type { ProfileData } from '../../types'
import SmartImg from '../SmartImg'

interface Props {
  data: ProfileData
  variant: string
}

function galleryLabel(persona: string) {
  if (persona === 'photographer') return 'My Portfolio'
  if (persona === 'baker' || persona === 'chef') return 'Our Work'
  return 'Gallery'
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
              <SmartImg src={first} alt="Gallery 1" hover className="w-full h-full" />
            </a>
          )}
          {rest.slice(0, 4).map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="group overflow-hidden block aspect-square"
              style={{ borderRadius: 'var(--radius-card)' }}>
              <SmartImg src={url} alt={`Gallery ${i + 2}`} hover className="w-full h-full" />
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
              style={{ borderRadius: 'var(--radius-card)', aspectRatio: '3/4' }}>
              <SmartImg src={url} alt={`Gallery ${i + 1}`} hover className="w-full h-full" />
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
              <SmartImg src={url} alt={`Gallery ${i + 1}`} hover className="w-full h-full" />
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
              <SmartImg src={url} alt={`Gallery ${i + 1}`} hover className="w-full h-full" />
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
