/**
 * Reusable Kryla "K" mark — extracted faithfully from app/HomeClient.tsx
 * (inline SVG around lines 820-824). Two strokes form the K shape, a third
 * amber stroke is the lower-right diagonal accent. Parameterized so the new
 * dark My Chat header can render a white-stroke variant without duplicating
 * the markup.
 *
 * Do not modify HomeClient.tsx's copy — this is an independent extraction.
 */

interface KLogoProps {
  size?: number
  /** Stroke color for the two main K strokes (vertical bar + upper diagonal). */
  strokeColor?: string
  /** Stroke color for the lower-right diagonal accent. */
  accentColor?: string
}

export default function KLogo({
  size = 32,
  strokeColor = '#0D0D0D',
  accentColor = '#F5A623',
}: KLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10 L20 90" stroke={strokeColor} strokeWidth="14" strokeLinecap="round" />
      <path d="M20 50 L70 10" stroke={strokeColor} strokeWidth="14" strokeLinecap="round" />
      <path d="M20 50 L70 90" stroke={accentColor} strokeWidth="14" strokeLinecap="round" />
    </svg>
  )
}
