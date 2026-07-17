import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        amber: {
          brand: "#F5A623",
          dark:  "#C17A3A",
        },
        kryla: {
          dark:    "#0D0D0D",
          bg:      "#FAFAFA",
          muted:   "#666666",
          body:    "#444444",
          border:  "#E5E5E5",
          success: "#22C55E",
        },
        // Dynamic accent tokens — set as CSS vars on LayoutRenderer wrapper
        accent: {
          DEFAULT: 'var(--color-accent)',
          surface: 'var(--color-accent-surface)',
          border:  'var(--color-accent-border)',
          glow:    'var(--color-accent-glow)',
        },
        // My Chat redesign — "Kryla brand + russet" tokens (mc-* namespace).
        // Flat (non-gradient-pair) tokens only — gradient pairs are consumed
        // via inline styles (see app/mychat/tileTheme.ts) since Tailwind
        // can't express arbitrary two-stop var() gradients.
        mc: {
          canvas: 'var(--mc-canvas)',
          accent: 'var(--mc-accent)',
          ink:    'var(--mc-tile-ink)',
        },
      },
      fontFamily: {
        inter:     ["Inter", "sans-serif"],
        georgia:   ["Georgia", "serif"],
        trebuchet: ["Trebuchet MS", "sans-serif"],
      },
      // Design system — values read from CSS custom properties set by [data-mode]
      fontSize: {
        'display':    'var(--type-display)',
        'heading':    'var(--type-heading)',
        'subheading': 'var(--type-subheading)',
        'body-base':  'var(--type-body)',
        'label':      'var(--type-label)',
      },
      spacing: {
        'section': 'var(--space-section)',
        'card':    'var(--space-card)',
      },
      padding: {
        'safe-top':    'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left':   'env(safe-area-inset-left, 0px)',
        'safe-right':  'env(safe-area-inset-right, 0px)',
      },
      borderRadius: {
        'card': 'var(--radius-card)',
        'btn':  'var(--radius-btn)',
      },
    },
  },
  plugins: [
    // Adds pt-safe, pb-safe, px-safe utilities
    function ({ addUtilities }: { addUtilities: (u: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        '.pt-safe': { 'padding-top':    'env(safe-area-inset-top, 0px)' },
        '.pb-safe': { 'padding-bottom': 'env(safe-area-inset-bottom, 0px)' },
        '.px-safe': { 'padding-left': 'env(safe-area-inset-left, 0px)', 'padding-right': 'env(safe-area-inset-right, 0px)' },
        '.h-safe-bottom': { height: 'env(safe-area-inset-bottom, 0px)' },
      })
    },
  ],
}

export default config
