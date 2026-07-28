'use client'
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_HERO_FIT_CROP_TOLERANCE } from '@/lib/heroFit'

/**
 * Shared, intelligent image renderer for every member-uploaded photo on the
 * public page (avatars, gallery tiles, service photos, hero/section
 * backgrounds). Centralizes the loading shimmer + fade-in that used to live
 * only in GallerySection's local `Img` helper, and adds three fit strategies:
 *
 * - `cover`  — fills its box, cropping overflow (fixed-shape thumbnails:
 *              avatars, gallery tiles, service cards). Accepts an optional
 *              `focus` (object-position) so a portrait subject isn't beheaded
 *              by a naive center crop.
 * - `band`   — shows the WHOLE image un-cropped (object-contain) over a solid
 *              color fill. Nothing is ever cropped or zoomed beyond its
 *              natural size, at the cost of color bands on an off-ratio image.
 * - `auto`   — for full-bleed backgrounds whose box shape is unpredictable
 *              (hero/section backgrounds sized by the viewport, showing a
 *              member's arbitrary-ratio upload). Measures the image's natural
 *              ratio against the rendered box: if `cover` would only crop a
 *              little, it behaves like `cover`. If the image is far enough
 *              from the box's shape that `cover` would crop heavily (e.g. an
 *              ultra-wide banner in a tall phone hero), it instead shows the
 *              WHOLE image un-cropped over a blurred, zoomed copy of itself
 *              — full-bleed with nothing cropped and no empty bands (the
 *              Spotify/YouTube "ambient background" pattern).
 *
 * className controls sizing/shape (the caller's container classes); this
 * component only controls how the image fills that box.
 */

type Fit = 'cover' | 'band' | 'auto'
type Rounded = boolean | 'card' | 'full'

interface SmartImgProps {
  src?: string | null
  alt?: string
  fit?: Fit
  focus?: string
  hover?: boolean
  rounded?: Rounded   // true/'card' -> --radius-card, 'full' -> circle
  bandColor?: string
  // Only used by fit="auto": how far the image's aspect ratio can be from the
  // box's before it gives up on cropping and switches to blurred-fill.
  // Expressed as the ratio-of-ratios (always >= 1): 1.35 means "cover would
  // need to crop away more than ~26% of one dimension" (1 - 1/1.35 ≈ 0.26).
  // Admin-tunable via system_config — see lib/heroFit.ts. Callers should pass
  // ProfileData.heroFitCropTolerance; the default here only covers callers
  // that haven't been wired to that config (e.g. tests).
  cropTolerance?: number
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
  cropTolerance = DEFAULT_HERO_FIT_CROP_TOLERANCE,
  className = '',
  style,
}: SmartImgProps) {
  const [loaded, setLoaded] = useState(false)
  const [imageRatio, setImageRatio] = useState<number | null>(null)
  const [boxRatio, setBoxRatio] = useState<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Server-rendered <img src> starts fetching/decoding before React hydrates
  // and attaches onLoad — a cached or fast-decoding image can fire `load`
  // before the listener exists, so it's silently missed and `loaded` never
  // flips, leaving the image stuck at opacity:0 behind the shimmer forever.
  // The ref callback runs on mount, after the DOM node (and its network
  // state) already exists, so `.complete` catches that already-finished case.
  const checkComplete = (node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) {
      setLoaded(true)
      if (fit === 'auto') setImageRatio(node.naturalWidth / node.naturalHeight)
    }
  }

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true)
    if (fit === 'auto') {
      const img = e.currentTarget
      if (img.naturalWidth > 0) setImageRatio(img.naturalWidth / img.naturalHeight)
    }
  }

  // `auto` needs the *rendered* box shape, which differs desktop vs phone and
  // changes on resize/rotate — a plain read-once measurement would go stale.
  useEffect(() => {
    if (fit !== 'auto' || !wrapperRef.current) return
    const el = wrapperRef.current
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) setBoxRatio(width / height)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])

  // Until both measurements land, default to `cover` so the hero is never
  // empty during the brief measure window — this only flips to blurred-fill
  // after load, it never flashes empty first.
  const mismatch = imageRatio && boxRatio
    ? Math.max(imageRatio / boxRatio, boxRatio / imageRatio)
    : 1
  const resolvedAuto: 'cover' | 'blurredFill' =
    fit === 'auto' && mismatch > cropTolerance ? 'blurredFill' : 'cover'

  const effectiveFit: 'cover' | 'band' | 'blurredFill' =
    fit === 'auto' ? resolvedAuto : fit

  // Default to position:relative so the wrapper can host absolutely-positioned
  // children (shimmer, hover overlay). Some callers instead need this element
  // itself to be position:absolute (full-bleed backgrounds) — passing both
  // `relative` and `absolute` classes on one element is a real bug: Tailwind's
  // generated stylesheet order (not className order) decides which wins, so it
  // can silently collapse the element to zero height. Skip the default when
  // the caller's className already declares a position.
  const hasPositionOverride = /(^|\s)(absolute|fixed|sticky|static)(\s|$)/.test(className)
  const wrapperClass = [
    hasPositionOverride ? '' : 'relative',
    'overflow-hidden',
    effectiveFit === 'band' ? '' : effectiveFit === 'cover' ? 'bg-[#F5F5F5]' : '',
    className,
  ].filter(Boolean).join(' ')

  const radius = rounded === 'full' ? '9999px' : rounded ? 'var(--radius-card)' : undefined

  const wrapperStyle: React.CSSProperties = {
    ...(effectiveFit === 'band' ? { background: bandColor } : {}),
    ...(effectiveFit === 'blurredFill' ? { background: '#0c0c0c' } : {}),
    ...(radius ? { borderRadius: radius } : {}),
    ...style,
  }

  if (!src) {
    return <div ref={wrapperRef} className={wrapperClass} style={wrapperStyle} aria-hidden />
  }

  if (effectiveFit === 'blurredFill') {
    return (
      <div ref={wrapperRef} className={wrapperClass} style={wrapperStyle}>
        {/* Back layer — same image, cropped + blurred, fills the box so
            there's never an empty band beside the un-cropped front layer. */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(28px) saturate(1.2) brightness(0.75)', transform: 'scale(1.2)' }}
        />
        {/* Front layer — the whole image, un-cropped. */}
        <img
          ref={checkComplete}
          src={src}
          alt={alt}
          aria-hidden={alt === '' ? true : undefined}
          onLoad={handleLoad}
          className="relative w-full h-full object-contain"
        />
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className={wrapperClass} style={wrapperStyle}>
      {!loaded && effectiveFit === 'cover' && <div className="absolute inset-0 animate-pulse bg-[#E8E8E8]" />}
      <img
        ref={checkComplete}
        src={src}
        alt={alt}
        aria-hidden={alt === '' ? true : undefined}
        onLoad={handleLoad}
        className={[
          'w-full h-full',
          effectiveFit === 'band' ? 'object-contain' : 'object-cover',
          hover ? 'transition-transform duration-500 group-hover:scale-105' : '',
        ].filter(Boolean).join(' ')}
        style={{
          objectPosition: effectiveFit === 'cover' ? focus : undefined,
          opacity: effectiveFit === 'band' ? 1 : (loaded ? 1 : 0),
          transition: effectiveFit === 'band' ? undefined : 'opacity 0.3s, transform 0.5s',
        }}
      />
      {hover && (
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
      )}
    </div>
  )
}
