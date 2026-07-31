import type { ProfileData } from '../../types'
import { EyebrowLabel } from '../shared'

interface Props {
  data: ProfileData
}

/* ── FOOTER NOTE ──────────────────────────────────────────────────────────
   Matches the approved mockup's footer exactly (per design-audit follow-up):
   a kicker + one sentence, sitting directly above the platform Footer
   ("Powered by kryla.work"). This is a fixed content slot, not a reorderable
   `sections` entry — a member doesn't need to move or remove this the way
   they can hero/services/gallery, so it's rendered unconditionally by
   LayoutRenderer rather than wired through PERSONA_SECTIONS/SectionsTab.
   Renders nothing when the member/persona has no footer_note set.
──────────────────────────────────────────────────────────────────────────── */
export default function FooterNoteSection({ data }: Props) {
  const note = data.footerNote
  if (!note) return null

  return (
    <div className="border-t border-[var(--kryla-border)]"
      style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}>
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-1.5"><EyebrowLabel text={note.kicker} color="var(--color-accent)" /></div>
        <p className="text-sm" style={{ color: 'var(--kryla-muted)' }}>{note.body}</p>
      </div>
    </div>
  )
}
