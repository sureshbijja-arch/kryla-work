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
      borderRadius: {
        'card': 'var(--radius-card)',
        'btn':  'var(--radius-btn)',
      },
    },
  },
  plugins: [],
}

export default config
