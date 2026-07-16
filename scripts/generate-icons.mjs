// scripts/generate-icons.mjs
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

// Base K-mark icon — ink background, white K strokes, saffron lower-right arm
// Proportions match the login page 22×22 SVG scaled to 512×512
const BASE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0D0D0D"/>
  <line x1="256" y1="47"  x2="256" y2="465" stroke="#FFFFFF" stroke-width="70" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="70"  y2="70"  stroke="#FFFFFF" stroke-width="70" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="442" y2="70"  stroke="#FFFFFF" stroke-width="70" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="442" y2="442" stroke="#F5A623" stroke-width="70" stroke-linecap="round"/>
</svg>`

// Maskable — same icon scaled to 70 % of canvas (safe zone = inner 80 %)
const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0D0D0D"/>
  <line x1="256" y1="110" x2="256" y2="402" stroke="#FFFFFF" stroke-width="52" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="126" y2="126" stroke="#FFFFFF" stroke-width="52" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="386" y2="126" stroke="#FFFFFF" stroke-width="52" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="386" y2="386" stroke="#F5A623" stroke-width="52" stroke-linecap="round"/>
</svg>`

// My Chat variant — base K-mark + small saffron badge circle (top-right corner)
const MYCHAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0D0D0D"/>
  <line x1="256" y1="47"  x2="256" y2="465" stroke="#FFFFFF" stroke-width="70" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="70"  y2="70"  stroke="#FFFFFF" stroke-width="70" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="442" y2="70"  stroke="#FFFFFF" stroke-width="70" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="442" y2="442" stroke="#F5A623" stroke-width="70" stroke-linecap="round"/>
  <circle cx="420" cy="92" r="72" fill="#F5A623"/>
  <circle cx="420" cy="82" r="26" fill="#0D0D0D"/>
  <circle cx="398" cy="116" r="10" fill="#0D0D0D"/>
</svg>`

function render(svgStr, size) {
  const resvg = new Resvg(svgStr, { fitTo: { mode: 'width', value: size } })
  return resvg.render().asPng()
}

writeFileSync('public/icons/icon-192.png',          render(BASE_SVG, 192))
writeFileSync('public/icons/icon-512.png',          render(BASE_SVG, 512))
writeFileSync('public/icons/icon-maskable-192.png', render(MASKABLE_SVG, 192))
writeFileSync('public/icons/icon-maskable-512.png', render(MASKABLE_SVG, 512))
writeFileSync('public/icons/apple-touch-icon.png',  render(BASE_SVG, 180))
writeFileSync('public/icons/icon-mychat-192.png',   render(MYCHAT_SVG, 192))
writeFileSync('public/icons/icon-mychat-512.png',   render(MYCHAT_SVG, 512))

console.log('Icons generated in public/icons/')
