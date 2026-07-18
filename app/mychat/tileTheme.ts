/**
 * Shared tile theme data for the My Chat tile-launcher redesign.
 *
 * Single source of truth for tile → gradient / emoji / label / folded-in
 * feature copy, so MyChatHome and TileDetailShell don't each hardcode their
 * own switch statement over MCTile (would be the exact kind of duplicated
 * lookup logic we want to avoid).
 */

export type MCTile = 'page' | 'services' | 'plan' | 'tools'

/**
 * Shape of one entry in a persona's `studio_config.mykryla_tools` jsonb array
 * (seeded by supabase/migrations/20260718033607_mykryla_tools_config.sql).
 * `action` is the only field interpreted by app code — it maps to a fixed,
 * already-existing overlay/state setter in SpaceClient.tsx. Everything else
 * (icon/title/description) is DB copy rendered as-is.
 */
export interface MykrylaToolCard {
  action:      'court' | 'draft' | 'studio' | 'persona-tab'
  icon:        string
  title:       string
  description: string
}

export interface TileTheme {
  tile: MCTile
  label: string
  emoji: string
  /** CSS var names (not resolved values) — read via var() in inline styles. */
  gradientFromVar: string
  gradientToVar: string
  /** Folded-in feature names shown in small text under the tile label. */
  features: string[]
}

export const TILE_THEME: Record<MCTile, TileTheme> = {
  page: {
    tile: 'page',
    label: 'My Page',
    emoji: '🏠',
    gradientFromVar: '--mc-tile-page-from',
    gradientToVar: '--mc-tile-page-to',
    features: ['Sections', 'Layouts', 'Media', 'Language', 'Ads'],
  },
  services: {
    tile: 'services',
    label: 'My Services',
    emoji: '🧰',
    gradientFromVar: '--mc-tile-services-from',
    gradientToVar: '--mc-tile-services-to',
    features: ['Services & pricing', 'Messages', 'Schedule'],
  },
  plan: {
    tile: 'plan',
    label: 'My Plan',
    emoji: '📈',
    gradientFromVar: '--mc-tile-plan-from',
    gradientToVar: '--mc-tile-plan-to',
    features: ['Plan & billing', 'Insights', 'Reviews', 'Refer', 'Profile'],
  },
  tools: {
    tile: 'tools',
    label: 'My Tools',
    emoji: '🛠️',
    gradientFromVar: '--mc-tile-tools-from',
    gradientToVar: '--mc-tile-tools-to',
    features: ['Persona tools'],
  },
}

/** Resolves a tile's two-stop gradient as a CSS `background` value using the --mc-* vars. */
export function tileGradient(tile: MCTile): string {
  const theme = TILE_THEME[tile]
  return `linear-gradient(135deg, var(${theme.gradientFromVar}), var(${theme.gradientToVar}))`
}
