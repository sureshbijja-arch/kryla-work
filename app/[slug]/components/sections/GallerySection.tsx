import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  variant: string
}

export default function GallerySection({ data, variant }: Props) {
  const { gallery = [] } = data
  if (!gallery.length) return null

  /* ── FEATURED ─────────────────────────────────────────────────────────── */
  if (variant === 'featured') {
    const [first, ...rest] = gallery
    return (
      <section className="py-14 border-t border-[#E5E5E5]">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-5">Gallery</p>
          <div className="grid grid-cols-2 gap-3">
            {first && (
              <a href={first} target="_blank" rel="noopener noreferrer"
                className="col-span-2 sm:col-span-1 sm:row-span-2 rounded-2xl overflow-hidden block hover:opacity-90 transition-opacity"
                style={{ aspectRatio: rest.length ? '1 / 1.1' : '16/9' }}>
                <img src={first} alt="Gallery 1" className="w-full h-full object-cover" />
              </a>
            )}
            {rest.slice(0, 4).map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="rounded-2xl overflow-hidden block hover:opacity-90 transition-opacity aspect-square">
                <img src={url} alt={`Gallery ${i + 2}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      </section>
    )
  }

  /* ── MASONRY ──────────────────────────────────────────────────────────── */
  if (variant === 'masonry') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-5">Gallery</p>
        <div className="columns-2 sm:columns-3 gap-3">
          {gallery.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="block mb-3 rounded-2xl overflow-hidden hover:opacity-90 transition-opacity break-inside-avoid">
              <img src={url} alt={`Gallery ${i + 1}`} className="w-full object-cover" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )

  /* ── SCROLL ───────────────────────────────────────────────────────────── */
  if (variant === 'scroll') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto">
        <div className="px-6 mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999]">Gallery</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide px-6">
          {gallery.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="snap-start shrink-0 w-56 h-56 sm:w-72 sm:h-72 rounded-2xl overflow-hidden hover:opacity-90 transition-opacity">
              <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )

  /* ── GRID (default) ───────────────────────────────────────────────────── */
  return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-5">Gallery</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {gallery.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="rounded-2xl overflow-hidden block hover:opacity-90 hover:scale-[1.01] transition-all duration-200 aspect-square">
              <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
