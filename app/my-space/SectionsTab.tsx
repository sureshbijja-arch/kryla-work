'use client'
import { useState } from 'react'

export interface SectionEntry {
  sectionKey: string
  variant: string
  order: number
}

interface SectionMeta {
  label: string
  icon: string
  variants: { key: string; label: string }[]
}

const SECTION_META: Record<string, SectionMeta> = {
  hero: {
    label: 'Hero',
    icon: '◆',
    variants: [
      { key: 'auto',     label: 'Auto — smart pick' },
      { key: 'photo',    label: 'Photo — full bleed' },
      { key: 'split',    label: 'Split — text + photo' },
      { key: 'centered', label: 'Centered — everything centered' },
      { key: 'dark',     label: 'Dark — black background' },
      { key: 'gradient', label: 'Gradient — soft aurora' },
      { key: 'banner',   label: 'Banner — accent header' },
      { key: 'minimal',  label: 'Minimal — clean left-aligned' },
    ],
  },
  services: {
    label: 'Services',
    icon: '◈',
    variants: [
      { key: 'list',     label: 'List — stacked rows' },
      { key: 'grid',     label: 'Grid — 2-column cards' },
      { key: 'menu',     label: 'Menu — price-forward' },
      { key: 'pricing',  label: 'Pricing — bold cards' },
      { key: 'features', label: 'Features — detailed cards' },
    ],
  },
  highlights: {
    label: 'Highlights',
    icon: '◉',
    variants: [
      { key: 'icons',    label: 'Icons — 3-column emoji' },
      { key: 'cards',    label: 'Cards — bordered cards' },
      { key: 'stats',    label: 'Stats — big number cards' },
      { key: 'numbered', label: 'Numbered — step-by-step' },
      { key: 'strip',    label: 'Strip — horizontal scroll' },
    ],
  },
  bio: {
    label: 'About',
    icon: '◎',
    variants: [
      { key: 'paragraph', label: 'Paragraph — plain text' },
      { key: 'accent',    label: 'Accent — left colour bar' },
      { key: 'callout',   label: 'Callout — tinted quote box' },
      { key: 'dark',      label: 'Dark — black background' },
    ],
  },
  gallery: {
    label: 'Gallery',
    icon: '▦',
    variants: [
      { key: 'grid',     label: 'Grid — uniform squares' },
      { key: 'featured', label: 'Featured — hero + thumbnails' },
      { key: 'masonry',  label: 'Masonry — variable heights' },
      { key: 'scroll',   label: 'Scroll — horizontal strip' },
    ],
  },
  faq: {
    label: 'FAQ',
    icon: '◐',
    variants: [
      { key: 'accordion', label: 'Accordion — expand/collapse' },
      { key: 'twocol',    label: 'Two column — always visible' },
    ],
  },
  contact: {
    label: 'Contact',
    icon: '◌',
    variants: [
      { key: 'both',      label: 'Form + WhatsApp' },
      { key: 'form',      label: 'Booking form only' },
      { key: 'whatsapp',  label: 'WhatsApp only' },
      { key: 'minimal',   label: 'Minimal — link cards' },
      { key: 'dark',      label: 'Dark — black background' },
    ],
  },
}

const ALL_KEYS = Object.keys(SECTION_META)

interface Props {
  providerId: string
  slug: string
  initialSections: SectionEntry[]
}

export default function SectionsTab({ providerId, slug, initialSections }: Props) {
  const [sections, setSections] = useState<SectionEntry[]>(
    [...initialSections].sort((a, b) => a.order - b.order)
  )
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  const activeKeys = sections.map(s => s.sectionKey)
  const available  = ALL_KEYS.filter(k => !activeKeys.includes(k))

  function move(index: number, dir: -1 | 1) {
    const next = [...sections]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setSections(next.map((s, i) => ({ ...s, order: i + 1 })))
    setSaved(false)
  }

  function setVariant(sectionKey: string, variant: string) {
    setSections(prev => prev.map(s => s.sectionKey === sectionKey ? { ...s, variant } : s))
    setSaved(false)
  }

  function remove(sectionKey: string) {
    setSections(prev =>
      prev
        .filter(s => s.sectionKey !== sectionKey)
        .map((s, i) => ({ ...s, order: i + 1 }))
    )
    if (expanded === sectionKey) setExpanded(null)
    setSaved(false)
  }

  function add(sectionKey: string) {
    const meta     = SECTION_META[sectionKey]
    const defaultV = meta?.variants[0]?.key ?? 'auto'
    setSections(prev => [
      ...prev,
      { sectionKey, variant: sectionKey === 'hero' ? 'auto' : defaultV, order: prev.length + 1 },
    ])
    setExpanded(sectionKey)
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/my-space/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, sections }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
    } catch {
      setError('Could not save — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-2">

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-black text-[#0D0D0D]">Page sections</p>
            <p className="text-xs text-[#999] mt-0.5">Drag to reorder · click to change style</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-[#22C55E] font-semibold">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved
              </span>
            )}
            <a href={`/${slug}/preview`} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-[#F5A623] hover:underline">
              Preview ↗
            </a>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-black text-white bg-[#0D0D0D] disabled:opacity-40 hover:opacity-80 transition-opacity">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs px-1">{error}</p>}

        {/* Section cards */}
        {sections.map((s, i) => {
          const meta       = SECTION_META[s.sectionKey]
          const isExpanded = expanded === s.sectionKey
          const variantLabel = meta?.variants.find(v => v.key === s.variant)?.label ?? s.variant

          return (
            <div key={s.sectionKey}
              className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Up / Down */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="w-5 h-5 flex items-center justify-center text-[#CCC] hover:text-[#0D0D0D] disabled:opacity-20 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 2L1 7h8L5 2z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === sections.length - 1}
                    className="w-5 h-5 flex items-center justify-center text-[#CCC] hover:text-[#0D0D0D] disabled:opacity-20 transition-colors">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 8L1 3h8L5 8z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>

                {/* Icon + label */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : s.sectionKey)}
                  className="flex-1 flex items-center gap-3 text-left">
                  <span className="text-[#999] text-sm select-none w-4 shrink-0">{meta?.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#0D0D0D] leading-tight">{meta?.label}</p>
                    <p className="text-[10px] text-[#999] truncate leading-tight">{variantLabel}</p>
                  </div>
                  <svg
                    className="ml-auto shrink-0 text-[#CCC] transition-transform duration-200"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Remove */}
                {s.sectionKey !== 'hero' && (
                  <button onClick={() => remove(s.sectionKey)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center text-[#CCC] hover:text-red-400 transition-colors rounded">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Variant picker */}
              {isExpanded && meta && (
                <div className="border-t border-[#F5F5F5] px-4 py-3 bg-[#FAFAFA]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#999] mb-2.5">Style</p>
                  <div className="flex flex-wrap gap-1.5">
                    {meta.variants.map(v => (
                      <button
                        key={v.key}
                        onClick={() => setVariant(s.sectionKey, v.key)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                        style={{
                          background:   s.variant === v.key ? '#0D0D0D' : 'white',
                          color:        s.variant === v.key ? 'white'   : '#444',
                          borderColor:  s.variant === v.key ? '#0D0D0D' : '#E5E5E5',
                        }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Add section */}
        {available.length > 0 && (
          <div className="pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#999] mb-2.5 px-1">Add section</p>
            <div className="flex flex-wrap gap-2">
              {available.map(key => (
                <button key={key}
                  onClick={() => add(key)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-dashed border-[#CCC] text-[#666] hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors bg-white">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  {SECTION_META[key]?.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-[#CCC] text-center pt-6 pb-2">
          Changes apply when you hit Save
        </p>
      </div>
    </div>
  )
}
