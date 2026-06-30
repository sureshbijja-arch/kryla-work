import { SectionHeading } from '../shared'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  variant: string
}

export default function GallerySection({ data, variant }: Props) {
  const { gallery = [] } = data
  if (!gallery.length) return null

  if (variant === 'masonry') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <SectionHeading>Gallery</SectionHeading>
        <div style={{ columns: 2, columnGap: 12 }} className="sm:[column-count:3]">
          {gallery.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="block mb-3 rounded-xl overflow-hidden hover:opacity-90 transition-opacity break-inside-avoid">
              <img src={url} alt={`Gallery ${i + 1}`} className="w-full object-cover" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )

  if (variant === 'scroll') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto">
        <div className="px-6 mb-4">
          <SectionHeading>Gallery</SectionHeading>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide px-6">
          {gallery.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="snap-start shrink-0 w-52 h-52 sm:w-64 sm:h-64 rounded-2xl overflow-hidden hover:opacity-90 transition-opacity">
              <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )

  // Default: grid
  return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <SectionHeading>Gallery</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {gallery.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="hover:opacity-90 transition-opacity">
              <img src={url} alt={`Gallery ${i + 1}`}
                className="w-full aspect-square object-cover rounded-2xl" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
