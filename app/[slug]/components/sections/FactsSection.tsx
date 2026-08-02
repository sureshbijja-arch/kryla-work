'use client'
import type { ProfileData } from '../../types'
import { getPersonaConfig } from '../../personaConfig'
import { EyebrowLabel } from '../shared'
import SmartImg from '../SmartImg'
import { getVariants, priceRange } from '../../variants'
import { useIdolSelection } from '../IdolSelectionContext'
import { useOrderActions, OrderActionModals } from './orderActions'

interface Props {
  data: ProfileData
  variant: string
}

/* ── STRIP — 4-column labeled facts (legacy; kept for any persona that still
   registers it, though sellganeshidols itself has moved to `idols` below) ──
   Matches the approved mockup's "fact strip" exactly — the mockup's own
   Direction Contract names this the Explora "DEPARTURE PORT / RETURN PORT"
   pattern: a hairline-bordered row of label/value cells directly under the
   hero. 2-column grid on mobile, 4-column on desktop; hairline dividers
   between cells via divide utilities (matches the mockup's per-cell
   border-right rather than a gap-based grid, so dividers reach full height
   regardless of content length).
──────────────────────────────────────────────────────────────────────────── */
function Strip({ data }: { data: ProfileData }) {
  const facts = data.facts ?? []
  if (!facts.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-y divide-x divide-y sm:divide-y-0"
      style={{ borderColor: 'var(--kryla-border)' }}>
      {facts.map((f, i) => (
        <div key={i} className="px-5 py-4" style={{ borderColor: 'var(--kryla-border)' }}>
          <EyebrowLabel text={f.label} />
          <p className="font-display-token mt-1" style={{ fontSize: 'var(--type-subheading)' }}>{f.value}</p>
        </div>
      ))}
    </div>
  )
}

/* ── IDOLS — idol-showcase cards (sellganeshidols v3.1) ──────────────────────
   Replaces the text-only Strip for this persona: the facts strip becomes a
   real browsable catalogue instead of four static Material/Sizes/Colours/
   Delivery cells. Each card is one idol (one `services` row) — photo, name,
   size range, price range. Clicking a card loads that idol into the PDP
   hero above (via IdolSelectionContext) and scrolls it into view, matching
   the "click an idol → see its detail" requirement. Reuses the PDP's own
   4:5 image ratio so a selected card visually "docks" into the hero, and the
   same dashed-placeholder idiom HeroSection uses for photo-less idols — one
   placeholder treatment across the page, not two.
──────────────────────────────────────────────────────────────────────────── */
function Idols({ data }: { data: ProfileData }) {
  const { services, persona, providerId } = data
  const selection = useIdolSelection()
  const { orderItem, setOrderItem, customOpen, setCustomOpen, openCustomOrder } = useOrderActions()
  if (!services.length) return null

  const selectedIdx = selection?.selectedIdolIdx ?? 0
  const cfg = getPersonaConfig(persona)
  const accentColor = 'var(--color-accent)'

  return (
    <div id="idols" className="max-w-6xl mx-auto px-6"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="mb-6">
        <EyebrowLabel text="The Collection" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {services.map((s, i) => {
          const variants = getVariants(s)
          const range = priceRange(variants)
          const sizes = variants.map(v => v.size).filter(Boolean)
          const sizeLabel = sizes.length > 1 ? `${sizes[0]} – ${sizes[sizes.length - 1]}` : sizes[0]
          const active = i === selectedIdx

          return (
            <button key={i} type="button"
              onClick={() => { selection?.selectIdol(i); selection?.scrollToPdp() }}
              aria-pressed={active}
              className="text-left group"
              style={{
                borderRadius: 'var(--radius-card)',
                border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--kryla-border)'}`,
                background: active ? 'var(--color-accent-surface)' : 'var(--color-surface)',
                overflow: 'hidden',
                minHeight: 44,
              }}>
              <div style={{ aspectRatio: '4 / 5' }}>
                {s.image_url ? (
                  <SmartImg src={s.image_url} alt={s.name} fit="cover" hover className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center px-4 border-2 border-dashed"
                    style={{ borderColor: 'var(--color-accent-border)', background: 'var(--color-accent-surface)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5, color: 'var(--color-ink)' }}>
                      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M21 15l-5-5-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-ink)', opacity: 0.7 }}>Add a photo</p>
                  </div>
                )}
              </div>
              <div className="px-3 py-3">
                <p className="font-display-token text-sm leading-tight" style={{ color: 'var(--color-ink)' }}>{s.name}</p>
                {sizeLabel && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>{sizeLabel}</p>
                )}
                {range && (
                  <p className="text-xs font-black uppercase tracking-wide mt-1.5" style={{ color: 'var(--color-accent)' }}>
                    {range.min !== null && range.min !== range.max ? `From ${range.display.split(' – ')[0]}` : range.display}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {cfg.hasCustomOrder && (
        <button
          id="custom"
          type="button"
          onClick={openCustomOrder}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 border border-dashed text-left hover:shadow-lg transition-all duration-200 mt-6"
          style={{ borderRadius: 'var(--radius-card)', borderColor: 'var(--color-accent-border)', minHeight: 44 }}>
          <span>
            <span className="block font-black" style={{ color: 'var(--color-ink)' }}>Something special in mind?</span>
            <span className="block text-sm mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>Share your vision — we&apos;ll make it happen</span>
          </span>
          <span
            className="shrink-0 inline-flex items-center justify-center text-xs font-black text-white px-4"
            style={{ borderRadius: 'var(--radius-btn)', background: accentColor, minHeight: 44 }}>
            Custom Order
          </span>
        </button>
      )}

      <OrderActionModals
        orderItem={orderItem} customOpen={customOpen}
        onCloseOrder={() => setOrderItem(null)} onCloseCustomOrder={() => setCustomOpen(false)}
        providerId={providerId} accentColor={accentColor}
        orderConfig={data.orderConfig} persona={persona}
      />
    </div>
  )
}

export default function FactsSection({ data, variant }: Props) {
  if (variant === 'idols') return <Idols data={data} />
  return <Strip data={data} />
}
