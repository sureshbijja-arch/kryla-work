/**
 * Filled "← [label]" pill button — word + arrow, never a bare icon (per the
 * My Chat redesign spec). Shared by TileDetailShell's header, the chat
 * screen's back-to-home affordance, and a tile-detail body's back-to-card-list
 * affordance so the markup exists exactly once. Defaults to "Home".
 */

interface HomeBackPillProps {
  onBack: () => void
  label?: string
  className?: string
}

export default function HomeBackPill({ onBack, label = 'Home', className }: HomeBackPillProps) {
  return (
    <button
      onClick={onBack}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E5E5E5] px-3.5 py-1.5 text-xs font-bold text-[#0D0D0D] shadow-sm transition-colors hover:bg-[#F5F5F5]${className ? ` ${className}` : ''}`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M7.5 2L3 6l4.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  )
}
