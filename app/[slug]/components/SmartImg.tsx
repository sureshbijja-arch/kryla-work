'use client'
import { useState } from 'react'

/**
 * Shared, intelligent image renderer for every member-uploaded photo on the
 * public page (avatars, gallery tiles, service photos, hero/section
 * backgrounds). Centralizes the loading shimmer + fade-in that used to live
 * only in GallerySection's local `Img` helper, and adds two fit strategies:
 *
 * - `cover`  — fills its box, cropping overflow (fixed-shape thumbnails:
 *              avatars, gallery tiles, service cards). Accepts an optional
 *              `focus` (object-position) so a portrait subject isn't beheaded
 *              by a naive center crop.
 * - `band`   — shows the WHOLE image un-cropped (object-contain) over a solid
 *              color fill. This is the fix for full-bleed backgrounds: a wide
 *              banner shows full-width with color bands above/below instead of
 *              being magnified to fill a tall viewport; a tall photo shows
 *              full-height with bands on the sides. Nothing is ever cropped or
 *              zoomed beyond its natural size.
 *
 * className controls sizing/shape (the caller's container classes); this
 * component only controls how the image fills that box.
 */

type Fit = 'cover' | 'band'
type Rounded = boolean | 'card' | 'full'

interface SmartImgProps {
  src?: string | null
  alt?: string
  fit?: Fit
  focus?: string
  hover?: boolean
  rounded?: Rounded   // true/'card' -> --radius-card, 'full' -> circle
  bandColor?: string
  className?: string
  style?: React.CSSProperties
}

export default function SmartImg({
  src,
  alt = '',
  fit = 'cover',
  focus = 'center',
  hover = false,
  rounded = false,
  bandColor = '#111',
  className = '',
  style,
}: SmartImgProps) {
  const [loaded, setLoaded] = useState(false)

  const wrapperClass = [
    'relative overflow-hidden',
    fit === 'band' ? '' : 'bg-[#F5F5F5]',
    className,
  ].filter(Boolean).join(' ')

  const radius = rounded === 'full' ? '9999px' : rounded ? 'var(--radius-card)' : undefined

  const wrapperStyle: React.CSSProperties = {
    ...(fit === 'band' ? { background: bandColor } : {}),
    ...(radius ? { borderRadius: radius } : {}),
    ...style,
  }

  if (!src) {
    return <div className={wrapperClass} style={wrapperStyle} aria-hidden />
  }

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {!loaded && fit === 'cover' && <div className="absolute inset-0 animate-pulse bg-[#E8E8E8]" />}
      <img
        src={src}
        alt={alt}
        aria-hidden={alt === '' ? true : undefined}
        onLoad={() => setLoaded(true)}
        className={[
          'w-full h-full',
          fit === 'band' ? 'object-contain' : 'object-cover',
          hover ? 'transition-transform duration-500 group-hover:scale-105' : '',
        ].filter(Boolean).join(' ')}
        style={{
          objectPosition: fit === 'cover' ? focus : undefined,
          opacity: fit === 'band' ? 1 : (loaded ? 1 : 0),
          transition: fit === 'band' ? undefined : 'opacity 0.3s, transform 0.5s',
        }}
      />
      {hover && (
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
      )}
    </div>
  )
}
