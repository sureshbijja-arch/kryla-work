'use client'

import { useState, useEffect } from 'react'
import { TEMPLATE_LABEL, FONT_LABEL, type LayoutOption } from '@/lib/layouts'
import { meetsWcagAA } from '@/lib/colorContrast'

interface Props {
  slug: string
  persona: string
  plan: string
  currentTemplate: string
  currentPalette: string
  currentFont: string
  currentAccentColor: string | null
  currentPageBg: string | null
  currentSurface: string | null
  currentBorderColor: string | null
  onPreview: () => void
  onUpgrade: () => void
}

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }

export default function LayoutsTab({
  slug, persona, plan,
  currentTemplate, currentPalette, currentFont,
  currentAccentColor, currentPageBg, currentSurface, currentBorderColor,
  onPreview, onUpgrade,
}: Props) {
  const [layouts, setLayouts]           = useState<LayoutOption[]>([])
  const [loaded, setLoaded]             = useState(false)
  const [applyingLayout, setApplyingLayout] = useState<string | null>(null)
  const [appliedLayout, setAppliedLayout]   = useState<string | null>(null)

  const [customizing, setCustomizing]   = useState(false)
  const [savingColors, setSavingColors] = useState(false)
  const [colorsSaved, setColorsSaved]   = useState(false)

  // Find the currently-applied preset (if any) so its colors can seed the
  // pickers when the member has no override of their own yet.
  const appliedPreset = layouts.find(
    lo => lo.template === currentTemplate && lo.palette === currentPalette && lo.font === currentFont
  )

  const [accentColor, setAccentColor] = useState(currentAccentColor ?? appliedPreset?.accent ?? '#F5A623')
  const [pageBg, setPageBg]           = useState(currentPageBg      ?? appliedPreset?.bg     ?? '#FFFFFF')
  const [surface, setSurfaceColor]    = useState(currentSurface     ?? '#FFFFFF')
  const [borderColor, setBorderColor] = useState(currentBorderColor ?? '#ECECEA')

  useEffect(() => {
    if (customizing) return // don't override a member's in-progress edit
    if (currentAccentColor) return // member already has an explicit override — never re-seed from preset
    if (!appliedPreset) return
    setAccentColor(appliedPreset.accent)
    setPageBg(appliedPreset.bg)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedPreset?.id])

  const accentContrastWarning = !meetsWcagAA(accentColor, surface)

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
          designMode: lo.designMode,
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

  async function handleSaveColors() {
    if (savingColors || !canLayouts) return
    setSavingColors(true)
    try {
      const res = await fetch('/api/mychat/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          template: currentTemplate,
          palette:  currentPalette,
          font:     currentFont,
          accentColor, pageBg, surface, borderColor,
        }),
      })
      if (res.ok) { setColorsSaved(true); onPreview() }
    } catch {
      // silent
    } finally {
      setSavingColors(false)
    }
  }

  async function handleResetColors() {
    if (savingColors || !canLayouts) return
    setSavingColors(true)
    try {
      const res = await fetch('/api/mychat/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          template: currentTemplate,
          palette:  currentPalette,
          font:     currentFont,
          resetColors: true,
        }),
      })
      if (res.ok) {
        setColorsSaved(false)
        if (appliedPreset) {
          setAccentColor(appliedPreset.accent)
          setPageBg(appliedPreset.bg)
          setSurfaceColor(appliedPreset.surface)
          setBorderColor(appliedPreset.borderColor)
        } else {
          setSurfaceColor('#FFFFFF')
          setBorderColor('#E5E5E5')
        }
        onPreview()
      }
    } catch {
      // silent
    } finally {
      setSavingColors(false)
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

      {canLayouts && (
        <div className="mx-4 mb-4">
          <button
            onClick={() => setCustomizing(v => !v)}
            className="text-xs font-semibold text-[#0D0D0D] flex items-center gap-1.5"
          >
            {customizing ? '▾' : '▸'} Customize colors
          </button>

          {customizing && (
            <div className="mt-3 space-y-3 border border-[#E5E5E5] rounded-xl p-3.5">
              {([
                { label: 'Accent',      value: accentColor, set: setAccentColor },
                { label: 'Background',  value: pageBg,      set: setPageBg },
                { label: 'Surface',     value: surface,     set: setSurfaceColor },
                { label: 'Border',      value: borderColor, set: setBorderColor },
              ] as const).map(({ label, value, set }) => (
                <div key={label} className="flex items-center gap-3">
                  <label className="text-xs text-[#666] w-20 shrink-0">{label}</label>
                  <input
                    type="color"
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-8 h-8 rounded border border-[#E5E5E5] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="flex-1 text-xs font-mono border border-[#E5E5E5] rounded-lg px-2.5 py-1.5"
                    placeholder="#RRGGBB"
                  />
                </div>
              ))}

              {accentContrastWarning && (
                <p className="text-[11px] text-[#B45309] bg-[#FFFBEB] border border-[#F5A623]/30 rounded-lg px-2.5 py-2">
                  Low contrast between accent and surface — may be hard to read.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSaveColors}
                  disabled={savingColors}
                  className="text-xs font-semibold bg-[#0D0D0D] text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  {savingColors ? 'Saving…' : 'Save colors'}
                </button>
                <button
                  onClick={handleResetColors}
                  disabled={savingColors}
                  className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] disabled:opacity-50"
                >
                  Reset to preset colors
                </button>
              </div>

              {colorsSaved && (
                <p className="text-xs font-medium text-[#166534]">✓ Colors saved — your page is updated</p>
              )}
            </div>
          )}
        </div>
      )}

      {appliedLayout && canLayouts && (
        <div className="mx-4 mb-4 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl px-3 py-2.5">
          <p className="text-xs font-medium text-[#166534]">✓ Layout applied — your page is updated</p>
        </div>
      )}
    </div>
  )
}
