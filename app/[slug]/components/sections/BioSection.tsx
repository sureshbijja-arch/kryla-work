import { SectionHeading } from '../shared'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  accent: string
  variant: string
}

export default function BioSection({ data, accent, variant }: Props) {
  const { bio } = data
  if (!bio) return null

  if (variant === 'accent') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>About me</SectionHeading>
        <div className="flex items-start gap-5">
          <div className="w-1 rounded-full shrink-0 self-stretch" style={{ background: accent, minHeight: 48 }} />
          <p className="text-[#444] leading-relaxed text-lg">{bio}</p>
        </div>
      </div>
    </section>
  )

  if (variant === 'callout') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>About me</SectionHeading>
        <div className="rounded-2xl p-6 sm:p-8" style={{ background: `${accent}12` }}>
          <svg className="w-8 h-8 mb-4 opacity-40" viewBox="0 0 32 32" fill="none">
            <path d="M9.333 8C7.493 8 6 9.493 6 11.333v5.334C6 18.507 7.493 20 9.333 20H12l-2 4h2.667l2.666-4H16V11.333C16 9.493 14.507 8 12.667 8H9.333zM22.667 8c-1.84 0-3.334 1.493-3.334 3.333v5.334C19.333 18.507 20.827 20 22.667 20H24l-2 4h2.667L27.333 20H28v-8.667C28 9.493 26.507 8 24.667 8h-2z"
              fill={accent} />
          </svg>
          <p className="text-[#333] leading-relaxed text-lg italic">{bio}</p>
        </div>
      </div>
    </section>
  )

  // Default: paragraph
  return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>About me</SectionHeading>
        <p className="text-[#444] leading-relaxed">{bio}</p>
      </div>
    </section>
  )
}
