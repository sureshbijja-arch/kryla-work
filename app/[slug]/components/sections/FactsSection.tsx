'use client'
import type { ProfileData } from '../../types'
import { EyebrowLabel } from '../shared'

interface Props {
  data: ProfileData
  variant: string
}

/* ── STRIP (default, currently the only variant) ────────────────────────────
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

export default function FactsSection({ data, variant }: Props) {
  if (variant === 'strip') return <Strip data={data} />
  return <Strip data={data} />
}
