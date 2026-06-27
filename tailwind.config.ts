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
        // Kryla design tokens
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
      },
      fontFamily: {
        // 3 template fonts
        inter:     ["Inter", "sans-serif"],
        georgia:   ["Georgia", "serif"],
        trebuchet: ["Trebuchet MS", "sans-serif"],
      },
    },
  },
  plugins: [],
}

export default config
