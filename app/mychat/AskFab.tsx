/**
 * Floating amber "Ask" chat-launcher button. Shared by MyChatHome (as the
 * "Ask your assistant" card trigger context) and TileDetailShell (as the
 * bottom-right FAB on every tile-detail screen) so the markup exists once.
 */

interface AskFabProps {
  onClick: () => void
  label?: string
  /** 'fab' = floating circular/pill button pinned bottom-right (tile-detail screens).
   *  'inline' = static pill, used inside the home-screen "Ask your assistant" card. */
  variant?: 'fab' | 'inline'
}

export default function AskFab({ onClick, label = 'Ask', variant = 'fab' }: AskFabProps) {
  if (variant === 'inline') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-105 bg-mc-accent"
      >
        <AskIcon />
        {label}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 bg-mc-accent"
      style={{ boxShadow: '0 8px 24px rgba(245, 166, 35, 0.45)' }}
    >
      <AskIcon />
      {label}
    </button>
  )
}

function AskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.2l1.76 4.8H14.8l-4 2.9 1.53 4.8L8 10.72l-4.33 2.98 1.53-4.8-4-2.9h5.04z"
        fill="currentColor"
      />
    </svg>
  )
}
