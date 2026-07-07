'use client'

import { useState, useEffect } from 'react'
import { TEMPLATE_LABEL, FONT_LABEL, type LayoutOption } from '@/lib/layouts'

interface Props {
  slug: string
  persona: string
  plan: string
  currentTemplate: string
  currentPalette: string
  currentFont: string
  onPreview: () => void
  onUpgrade: () => void
}

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }

export default function LayoutsTab({
  slug, persona, plan,
  currentTemplate, currentPalette, currentFont,
  onPreview, onUpgrade,
}: Props) {
  const [layouts, setLayouts]           = useState<LayoutOption[]>([])
  const [loaded, setLoaded]             = useState(false)
  const [applyingLayout, setApplyingLayout] = useState<string | null>(null)
  const [appliedLayout, setAppliedLayout]   = useState<string | null>(null)

  const canLayouts = (PLAN_RANK[plan] ?? 0) >= 1

  useEffect(() => {
    fetch(`/api/mychat/layouts?persona=${encodeURIComponent(persona)}`)
      .then(r => r.json())
      .then(data => { setLayouts(data.layouts ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona])

  async function handleApplyLayout(lo: LayoutOption) {
    if (applyingLayout || !canLayouts) return
    setApplyingLayout(lo.id)
    try {
      const res = await fetch('/api/mychat/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          template: lo.template,
          palette:  lo.palette,
          font:     lo.font,
          sections: lo.sections ?? null,
        }),
      })
      if (res.ok) { setAppliedLayout(lo.id); onPreview() }
    } catch {
      // silent
    } finally {
      setApplyingLayout(null)
    }
  }

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full bg-[#E5E5E5] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs text-[#666]">Choose a visual style for your page. Changes save to your draft — preview and publish when ready.</p>
      </div>

      {!canLayouts && (
        <div className="mx-4 mt-3 mb-1 bg-[#FFF7ED] border border-[#F5A623]/30 rounded-xl px-4 py-3.5">
          <p className="text-xs font-semibold text-[#0D0D0D] mb-1">Upgrade to Sprout to apply layouts</p>
          <p className="text-xs text-[#666] mb-3">Browse the styles below, then upgrade to make changes live.</p>
          <button onClick={onUpgrade} className="text-xs font-semibold text-[#EA8C00] hover:underline">
            See plans →
          </button>
        </div>
      )}

      <div className={`px-4 pt-3 pb-4 grid grid-cols-2 gap-3 ${!canLayouts ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        {layouts.map(lo => {
          const isCurrent  = lo.template === currentTemplate && lo.palette === currentPalette && lo.font === currentFont
          const isApplying = applyingLayout === lo.id

          return (
            <button
              key={lo.id}
              onClick={() => handleApplyLayout(lo)}
              disabled={!!applyingLayout || !canLayouts}
              className={`text-left rounded-xl border overflow-hidden transition-all disabled:cursor-not-allowed ${
                isCurrent
                  ? 'border-[#0D0D0D] ring-1 ring-[#0D0D0D]'
                  : 'border-[#E5E5E5] hover:border-[#0D0D0D]'
              }`}>
              <div className="w-full h-[72px] relative overflow-hidden">
                {lo.imageUrl ? (
                  <img src={lo.imageUrl} alt={lo.name} className="w-full h-full object-cover" />
                ) : (
                  <div style={{ background: lo.bg }} className="w-full h-full">
                    <div style={{ background: lo.accent }} className="h-2.5 w-full" />
                    <div className="px-2.5 pt-2 space-y-1.5">
                      <div style={{ background: lo.accent }} className="h-1.5 w-2/3 rounded-full opacity-60" />
                      <div className="h-1 w-1/2 rounded-full opacity-25" style={{ background: '#374151' }} />
                      <div className="h-1 w-3/4 rounded-full opacity-15" style={{ background: '#374151' }} />
                    </div>
                  </div>
                )}
                {isCurrent && !isApplying && (
                  <div className="absolute top-1.5 right-1.5 w-[18px] h-[18px] bg-[#22C55E] rounded-full flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                {isApplying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                    <div className="w-4 h-4 border-2 border-[#0D0D0D] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-[#0D0D0D] leading-tight mb-0.5">{lo.name}</p>
                <p className="text-[10px] text-[#888] leading-tight mb-2">{lo.description}</p>
                <div className="flex gap-1 flex-wrap">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-[#666] bg-[#F0F0F0] rounded px-1.5 py-0.5">
                    {TEMPLATE_LABEL[lo.template]}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-[#666] bg-[#F0F0F0] rounded px-1.5 py-0.5">
                    {FONT_LABEL[lo.font]}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {appliedLayout && canLayouts && (
        <div className="mx-4 mb-4 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl px-3 py-2.5">
          <p className="text-xs font-medium text-[#166534]">✓ Layout applied — your page is updated</p>
        </div>
      )}
    </div>
  )
}
