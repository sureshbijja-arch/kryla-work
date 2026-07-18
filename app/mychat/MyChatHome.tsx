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
  onPreview: () => void
  onPublish: () => void
  publishing: boolean
  published: boolean
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
  onPreview,
  onPublish,
  publishing,
  published,
}: MyChatHomeProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const tiles = showToolsTile ? [...CORE_TILES, 'tools' as MCTile] : CORE_TILES
  // Desktop tiles form a single full row — the column count must match the
  // tile count exactly, or the row either wraps awkwardly (3 cols with 4
  // tiles → 3+1) or leaves a trailing gap (4 cols with only 3 tiles).
  const desktopCols = tiles.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'

  return (
    <div className="flex-1 overflow-y-auto bg-mc-canvas">
      {/* ── Header ── */}
      <header
        className="px-5 pt-6 pb-8"
        style={{ background: 'linear-gradient(135deg, var(--mc-header-from), var(--mc-header-to))' }}
      >
        <div className="mx-auto w-full max-w-2xl">
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

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={onPreview}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/25 text-mc-ink hover:bg-white/10 transition-colors"
            >
              Preview
            </button>
            <button
              onClick={onPublish}
              disabled={publishing}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
                published ? 'bg-[#22C55E] text-white' : 'bg-white text-[#0D0D0D] hover:opacity-80'
              }`}
            >
              {publishing ? 'Publishing…' : published ? '✓ Published' : 'Publish →'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Tile grid — 2x2 on mobile, single full row on desktop ── */}
      <div className="px-4 -mt-4">
        <div className={`mx-auto w-full max-w-2xl grid grid-cols-2 ${desktopCols} gap-3 sm:gap-4`}>
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
          className="mx-auto w-full max-w-2xl flex items-center justify-between gap-3 rounded-2xl bg-white border-2 border-mc-accent/40 px-5 py-4 text-left shadow-sm transition-colors hover:border-mc-accent"
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
      className="rounded-2xl p-4 sm:p-5 text-left shadow-md transition-transform hover:scale-[1.02] flex flex-col gap-2.5 min-h-[150px]"
      style={{ background: tileGradient(tile) }}
    >
      <span className="text-2xl sm:text-3xl leading-none">{theme.emoji}</span>
      <div>
        <p className="font-extrabold text-sm sm:text-base text-mc-ink">{label}</p>
        <p className="text-[11px] text-white/85 mt-1 leading-snug line-clamp-1 sm:line-clamp-2">
          {theme.features.join(' · ')}
        </p>
      </div>
    </button>
  )
}
