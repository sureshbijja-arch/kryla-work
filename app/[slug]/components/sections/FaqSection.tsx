import { SectionHeading, FaqList } from '../shared'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  variant: string
}

export default function FaqSection({ data, variant }: Props) {
  const { faq, showSections } = data
  if (!showSections.faq || !faq.length) return null

  if (variant === 'twocol') return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <SectionHeading>Frequently asked</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {faq.map((f, i) => (
            <div key={i} className="border border-[#E5E5E5] rounded-2xl p-5 bg-white">
              <p className="font-bold text-[#0D0D0D] text-sm mb-2">{f.question}</p>
              <p className="text-sm text-[#666] leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  // Default: accordion
  return (
    <section className="py-10 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <SectionHeading>Questions</SectionHeading>
        <FaqList items={faq} />
      </div>
    </section>
  )
}
