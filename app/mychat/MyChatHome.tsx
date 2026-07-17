'use client'

import KLogo from './KLogo'
import AskFab from './AskFab'
import { TILE_THEME, tileGradient, type MCTile } from './tileTheme'

interface MyChatHomeProps {
  firstName: string
  lastName: string
  persona: string
  slug: string
  pageLive: boolean
  /** My Tools tile is persona-gated — hidden entirely unless explicitly shown. */
  showToolsTile?: boolean
  toolsTileLabel?: string
  onOpenTile: (tile: MCTile) => void
  onOpenChat: () => void
}

const CORE_TILES: MCTile[] = ['page', 'services', 'plan']

/**
 * Tile-launcher home screen for the My Chat redesign: kryla-dark gradient
 * header + member identity, a 2x2 russet-family tile grid folding in the
 * ~20 old sub-tabs, and a card to reach the AI assistant.
 */
export default function MyChatHome({
  firstName,
  lastName,
  persona,
  slug,
  pageLive,
  showToolsTile = false,
  toolsTileLabel,
  onOpenTile,
  onOpenChat,
}: MyChatHomeProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const tiles = showToolsTile ? [...CORE_TILES, 'tools' as MCTile] : CORE_TILES

  return (
    <div className="flex-1 overflow-y-auto bg-mc-canvas">
      {/* ── Header ── */}
      <header
        className="px-5 pt-6 pb-8"
        style={{ background: 'linear-gradient(135deg, var(--mc-header-from), var(--mc-header-to))' }}
      >
        <div className="flex items-center gap-2">
          <KLogo size={28} strokeColor="#ffffff" accentColor="var(--mc-accent)" />
          <span className="text-base font-extrabold tracking-tight text-mc-ink">kryla</span>
        </div>

        <div className="mt-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-mc-ink truncate">{fullName || 'there'}</h1>
            <p className="text-xs font-medium text-mc-accent mt-0.5 truncate">
              {persona ? `${persona} · ` : ''}{slug}.kryla.work
            </p>
          </div>
          {pageLive && (
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-mc-accent bg-white/10 border border-mc-accent/30 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-mc-accent" />
              Page live
            </span>
          )}
        </div>
      </header>

      {/* ── Tile grid ── */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map(tile => (
            <TileCard
              key={tile}
              tile={tile}
              label={tile === 'tools' && toolsTileLabel ? toolsTileLabel : TILE_THEME[tile].label}
              onOpen={() => onOpenTile(tile)}
            />
          ))}
        </div>
      </div>

      {/* ── Ask your assistant card ── */}
      <div className="px-4 mt-4 pb-8">
        <button
          onClick={onOpenChat}
          className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white border-2 border-mc-accent/40 px-5 py-4 text-left shadow-sm transition-colors hover:border-mc-accent"
        >
          <div>
            <p className="font-bold text-sm text-[#0D0D0D]">Ask your assistant</p>
            <p className="text-xs text-[#888] mt-0.5">Edit your page, get help, or ask anything — just chat.</p>
          </div>
          <AskFab onClick={onOpenChat} variant="inline" />
        </button>
      </div>
    </div>
  )
}

function TileCard({ tile, label, onOpen }: { tile: MCTile; label: string; onOpen: () => void }) {
  const theme = TILE_THEME[tile]
  return (
    <button
      onClick={onOpen}
      className="rounded-2xl p-4 text-left shadow-md transition-transform hover:scale-[1.02] flex flex-col gap-3 min-h-[152px]"
      style={{ background: tileGradient(tile) }}
    >
      <span className="text-2xl leading-none">{theme.emoji}</span>
      <div>
        <p className="font-extrabold text-sm text-mc-ink">{label}</p>
        <p className="text-[11px] text-white/85 mt-1 leading-snug">
          {theme.features.join(' · ')}
        </p>
      </div>
    </button>
  )
}
