/**
 * scripts/generate-icons.mjs
 *
 * Regenerates all PWA / app-icon PNGs in public/icons/ from a correct canonical K.
 *
 * Canonical Kryla K (matches HomeClient.tsx:820-823 and KrylaLogo in shared.tsx):
 *   • Vertical spine on the LEFT
 *   • Upper arm: spine-midpoint → upper RIGHT   (white)
 *   • Lower arm: spine-midpoint → lower RIGHT   (amber #F5A623)
 *   NOT the broken 4-line X that was previously baked into the PNGs.
 *
 * Usage: node scripts/generate-icons.mjs
 * Requires: @resvg/resvg-js (already in devDependencies)
 */

import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

// ── Canonical K geometry in a 512×512 canvas ─────────────────────────────────
//
// Source: HomeClient viewBox="0 0 100 100"
//   spine:      M20 10  L20 90   (full height, left column)
//   upper arm:  M20 50  L70 10   (mid-left → upper right)
//   lower arm:  M20 50  L70 90   (mid-left → lower right, amber)
//   strokeWidth: 14/100 = 14%
//
// Scale to fill ~70% of 512 height, then centre both axes:
//   height span = 80 units → 80 * 4.475 = 357.6 ≈ 358px  (70% of 512)
//   width  span = 50 units → 50 * 4.475 = 223.75 ≈ 224px
//   left padding  = (512 - 224) / 2 = 144
//   top  padding  = (512 - 358) / 2 = 77
//   spine x = 144,   arm tip x = 144 + 224 = 368
//   spine y1 = 77,   mid y = 256,   spine y2 = 435
//   strokeWidth = 14 * 4.475 ≈ 63

const K_LINES = `
  <line x1="144" y1="77"  x2="144" y2="435" stroke="#FFFFFF" stroke-width="63" stroke-linecap="round"/>
  <line x1="144" y1="256" x2="368" y2="77"  stroke="#FFFFFF" stroke-width="63" stroke-linecap="round"/>
  <line x1="144" y1="256" x2="368" y2="435" stroke="#F5A623" stroke-width="63" stroke-linecap="round"/>
`

// Plain K — customer PWA
const BASE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0D0D0D"/>
  ${K_LINES}
</svg>`

// Maskable — K at ~55% scale inside the safe zone (inner 80% circle)
// Scale = 55% of 512 / 80 = 3.52 → stroke ~49
// spine x=168, arm tip x=344, y1=116, mid=256, y2=396
const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0D0D0D"/>
  <line x1="168" y1="116" x2="168" y2="396" stroke="#FFFFFF" stroke-width="49" stroke-linecap="round"/>
  <line x1="168" y1="256" x2="344" y2="116" stroke="#FFFFFF" stroke-width="49" stroke-linecap="round"/>
  <line x1="168" y1="256" x2="344" y2="396" stroke="#F5A623" stroke-width="49" stroke-linecap="round"/>
</svg>`

// My Chat — same K + small amber chat-bubble badge in top-right corner
const MYCHAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0D0D0D"/>
  ${K_LINES}
  <!-- Amber notification dot (chat badge) — top-right corner -->
  <circle cx="412" cy="100" r="68" fill="#F5A623"/>
  <circle cx="412" cy="88"  r="24" fill="#0D0D0D"/>
  <circle cx="394" cy="118" r="9"  fill="#0D0D0D"/>
</svg>`

function render(svgStr, size) {
  const resvg = new Resvg(svgStr, { fitTo: { mode: 'width', value: size } })
  return resvg.render().asPng()
}

const icons = [
  ['public/icons/icon-192.png',          BASE_SVG,     192],
  ['public/icons/icon-512.png',          BASE_SVG,     512],
  ['public/icons/icon-maskable-192.png', MASKABLE_SVG, 192],
  ['public/icons/icon-maskable-512.png', MASKABLE_SVG, 512],
  ['public/icons/apple-touch-icon.png',  BASE_SVG,     180],
  ['public/icons/icon-mychat-192.png',   MYCHAT_SVG,   192],
  ['public/icons/icon-mychat-512.png',   MYCHAT_SVG,   512],
]

for (const [path, svg, size] of icons) {
  writeFileSync(path, render(svg, size))
  console.log(`✓ ${path} (${size}×${size})`)
}

console.log('\nAll icons written to public/icons/')
