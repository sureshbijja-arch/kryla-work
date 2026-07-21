import sharp from 'sharp'

// Shared by every path that writes a member-facing photo into the
// `profile-media` bucket: the member's own upload (app/api/mychat/upload) and
// the CopyWebsite import pipeline (inngest/import-content.ts, which re-hosts
// images scraped from an external site). Both ingest photos of unknown
// size/orientation/aspect-ratio — a raw phone photo, a sideways EXIF-rotated
// portrait, a giant scraped banner — and every display spot on the page
// depends on getting a clean, predictable image out of storage. Normalizing
// once here (rather than duplicating the sharp pipeline per ingestion route)
// means both paths behave identically.
//
// - avatar: cropped to a fixed square, biased toward the salient region
//   (faces) so a portrait doesn't get its head cut off by a naive center crop.
// - gallery / service / anything else: capped to a max dimension, aspect
//   ratio preserved (never cropped), never upscaled.
// - GIFs are passed through untouched — sharp would flatten the animation.
export async function normalizeImage(
  bytes: ArrayBuffer,
  mime: string,
  type: string
): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  if (mime === 'image/gif') {
    return { buffer: Buffer.from(bytes), ext: 'gif', contentType: 'image/gif' }
  }

  // .rotate() with no args reads the EXIF orientation tag and bakes it into
  // the pixels, then strips the tag — fixes sideways/upside-down phone photos.
  let pipeline = sharp(Buffer.from(bytes)).rotate()

  pipeline = type === 'avatar'
    ? pipeline.resize(512, 512, { fit: 'cover', position: 'attention' })
    : pipeline.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })

  const buffer = await pipeline.webp({ quality: 82 }).toBuffer()
  return { buffer, ext: 'webp', contentType: 'image/webp' }
}
