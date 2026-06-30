'use client'
import { useState } from 'react'
import type { ProfileData } from '../../types'

interface Props {
  data: ProfileData
  variant: string
  accent: string
}

const STYLES = `
@keyframes faqOpen {
  from { opacity:0; transform:translateY(-8px); }
  to   { opacity:1; transform:translateY(0); }
}
`

/* ── ACCORDION ───────────────────────────────────────────────────────────────── */
function Accordion({ data, accent }: { data: ProfileData; accent: string }) {
  const { faq, showSections } = data
  if (!showSections.faq || !faq.length) return null
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-8">Questions</p>
        <div className="space-y-2">
          {faq.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={i}
                className="rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer"
                style={{
                  border: `1.5px solid ${isOpen ? accent : '#E5E5E5'}`,
                  boxShadow: isOpen ? `0 8px 32px ${accent}15` : 'none',
                  background: isOpen ? `${accent}06` : 'white',
                }}
                onClick={() => setOpen(isOpen ? null : i)}>
                <div className="flex justify-between items-center px-5 py-4 select-none">
                  <p className={`font-black text-sm transition-colors ${isOpen ? '' : 'text-[#0D0D0D]'}`}
                    style={{ color: isOpen ? accent : '#0D0D0D' }}>
                    {f.question}
                  </p>
                  <div
                    className="ml-4 shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: isOpen ? accent : '#F0F0F0',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4.5l4 4 4-4" stroke={isOpen ? 'white' : '#666'}
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {isOpen && (
                  <p className="px-5 pb-5 pt-1 text-sm text-[#666] leading-relaxed border-t border-[#E5E5E5]"
                    style={{ animation: 'faqOpen 0.25s ease both' }}>
                    {f.answer}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ── TWO-COL ─────────────────────────────────────────────────────────────────── */
function TwoCol({ data, accent }: { data: ProfileData; accent: string }) {
  const { faq, showSections } = data
  if (!showSections.faq || !faq.length) return null
  return (
    <section className="py-16 border-t border-[#E5E5E5]">
      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#999] mb-8">Frequently asked</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {faq.map((f, i) => (
            <div key={i}
              className="rounded-3xl p-6 bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-default"
              style={{ border: `1.5px solid ${accent}18`, boxShadow: `0 2px 16px ${accent}08` }}>
              <p className="font-black text-[#0D0D0D] text-sm mb-3 leading-snug">{f.question}</p>
              <p className="text-sm text-[#666] leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function FaqSection({ data, variant, accent }: Props) {
  if (variant === 'twocol') return <TwoCol data={data} accent={accent} />
  return <Accordion data={data} accent={accent} />
}
