import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  variant: string
  accent: string
}

export default function FaqSection({ data, variant, accent }: Props) {
  const { faq, showSections } = data
  if (!showSections.faq || !faq.length) return null

  /* ── TWO-COL ──────────────────────────────────────────────────────────── */
  if (variant === 'twocol') return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-8">Frequently asked</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {faq.map((f, i) => (
            <div key={i}
              className="rounded-2xl p-6 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              style={{ border: `1.5px solid ${accent}15`, boxShadow: `0 2px 12px ${accent}08` }}>
              <p className="font-black text-[#0D0D0D] text-sm mb-3 leading-snug">{f.question}</p>
              <p className="text-sm text-[#666] leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  /* ── ACCORDION (default) ──────────────────────────────────────────────── */
  return (
    <section className="py-14 border-t border-[#E5E5E5]">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#999] mb-8">Questions</p>
        <div className="space-y-2">
          {faq.map((f, i) => (
            <details key={i} className="group rounded-2xl overflow-hidden"
              style={{ border: `1.5px solid ${accent}15` }}>
              <summary className="flex justify-between items-center px-5 py-4 cursor-pointer text-[#0D0D0D] font-black text-sm list-none select-none hover:bg-[#FAFAFA] transition-colors">
                {f.question}
                <svg className="ml-4 shrink-0 transition-transform group-open:rotate-180 text-[#999]"
                  width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </summary>
              <p className="px-5 pb-5 pt-2 text-sm text-[#666] leading-relaxed border-t border-[#E5E5E5]">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
