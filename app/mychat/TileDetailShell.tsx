'use client'

import type { ReactNode } from 'react'
import { tileGradient, type MCTile } from './tileTheme'
import HomeBackPill from './HomeBackPill'
import AskFab from './AskFab'

interface TileDetailShellProps {
  tile: MCTile
  icon: ReactNode
  title: string
  subtitle?: string
  onBack: () => void
  onOpenChat: () => void
  children: ReactNode
}

/**
 * Full-screen wrapper for tile-detail pages: colored header (matching the
 * tile's russet gradient), a filled "← Home" pill, and a floating amber
 * "Ask" FAB. Presentational shell only — Phase 2 fills in real body content.
 */
export default function TileDetailShell({
  tile,
  icon,
  title,
  subtitle,
  onBack,
  onOpenChat,
  children,
}: TileDetailShellProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-mc-canvas relative">
      <header
        className="shrink-0 px-4 pt-4 pb-6"
        style={{ background: tileGradient(tile) }}
      >
        <HomeBackPill onBack={onBack} />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-mc-ink truncate">{title}</h1>
            {subtitle && <p className="text-xs text-white/80 truncate">{subtitle}</p>}
          </div>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto px-4 pt-5"
        style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
      >
        {children}
      </main>

      <AskFab onClick={onOpenChat} />
    </div>
  )
}
