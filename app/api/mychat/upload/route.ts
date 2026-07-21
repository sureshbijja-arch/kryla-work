import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteStorageFile } from '@/lib/storage'
import { normalizeImage } from '@/lib/imageNormalize'

// Image processing (sharp) requires the Node runtime, not Edge.
export const runtime = 'nodejs'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Could not parse form data' }, { status: 400 })
  }

  const file = formData.get('file')
  const type = formData.get('type') as string
  const slug = formData.get('slug') as string

  if (!file || !type || !slug) {
    return NextResponse.json({ error: 'Missing file, type, or slug' }, { status: 400 })
  }

  // file must be a Blob/File — check for arrayBuffer method
  if (typeof (file as unknown as { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Invalid file upload' }, { status: 400 })
  }
  const blob = file as Blob

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, plan, email')
    .eq('slug', slug)
    .maybeSingle()

  if (!provider) return NextResponse.json({ error: 'Not your page' }, { status: 403 })

  if (provider.email === null) {
    await supabaseAdmin.from('providers').update({ email: user.email }).eq('id', provider.id)
  } else if (provider.email !== user.email) {
    return NextResponse.json({ error: 'Not your page' }, { status: 403 })
  }

  // All plans (Grow+) include photo & gallery upload — no gating needed

  if (blob.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  if (!ALLOWED_TYPES[blob.type]) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP or GIF images are supported' }, { status: 400 })
  }

  const rawBytes = await blob.arrayBuffer()
  let normalized: { buffer: Buffer; ext: string; contentType: string }
  try {
    normalized = await normalizeImage(rawBytes, blob.type, type)
  } catch (err) {
    console.error('[upload] image processing error:', err)
    return NextResponse.json({ error: 'Could not process image — file may be corrupt' }, { status: 400 })
  }
  const { buffer, ext, contentType } = normalized

  const path = type === 'avatar'
    ? `${provider.id}/avatar.${ext}`
    : `${provider.id}/${type}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('profile-media')
    .upload(path, buffer, { contentType, upsert: type === 'avatar' })

  if (uploadError) {
    console.error('[upload] storage error:', uploadError)
    const msg = uploadError.message?.toLowerCase().includes('bucket')
      ? 'Storage bucket not found — the "profile-media" bucket needs to be created in Supabase'
      : uploadError.message ?? 'Upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('profile-media').getPublicUrl(path)

  if (type === 'avatar') {
    // Cross-format replace (e.g. old avatar.png -> new avatar.jpg) writes a
    // new object at a different path since `upsert` only overwrites an
    // exact-path match — clean up the old one so it doesn't orphan.
    const { data: existingProvider } = await supabaseAdmin
      .from('providers')
      .select('avatar_url')
      .eq('id', provider.id)
      .maybeSingle()
    const oldAvatarUrl = existingProvider?.avatar_url as string | null | undefined
    if (oldAvatarUrl && oldAvatarUrl !== publicUrl) {
      await deleteStorageFile(oldAvatarUrl)
    }

    const { error: dbErr } = await supabaseAdmin
      .from('providers')
      .update({ avatar_url: publicUrl })
      .eq('id', provider.id)
    if (dbErr) {
      console.error('[upload] avatar_url save error:', dbErr)
      return NextResponse.json({ error: 'Image uploaded but could not save — run the SQL migration first' }, { status: 500 })
    }
  } else if (type === 'gallery') {
    const { data: page } = await supabaseAdmin
      .from('pages')
      .select('gallery')
      .eq('provider_id', provider.id)
      .maybeSingle()
    const existing: string[] = Array.isArray(page?.gallery) ? (page.gallery as string[]) : []
    const { error: dbErr } = await supabaseAdmin
      .from('pages')
      .update({ gallery: [...existing, publicUrl] })
      .eq('provider_id', provider.id)
    if (dbErr) {
      console.error('[upload] gallery save error:', dbErr)
      return NextResponse.json({ error: 'Image uploaded but could not save — run the SQL migration first' }, { status: 500 })
    }
  } else if (type === 'service') {
    // Service-photo replace: caller (ServicesTab) passes the previous
    // image_url so the old object can be cleaned up. Array/DB write for the
    // service itself still happens client-side via /api/mychat/services.
    const oldServiceUrl = formData.get('oldUrl') as string | null
    if (oldServiceUrl && oldServiceUrl !== publicUrl) {
      await deleteStorageFile(oldServiceUrl)
    }
  }

  return NextResponse.json({ url: publicUrl })
}

// Shared ownership check used by DELETE/PATCH below — mirrors the POST
// handler's provider lookup + email-ownership assertion.
async function assertOwnership(userEmail: string, slug: string) {
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email')
    .eq('slug', slug)
    .maybeSingle()
  if (!provider) return { error: NextResponse.json({ error: 'Not your page' }, { status: 403 }) }

  if (provider.email === null) {
    await supabaseAdmin.from('providers').update({ email: userEmail }).eq('id', provider.id)
  } else if (provider.email !== userEmail) {
    return { error: NextResponse.json({ error: 'Not your page' }, { status: 403 }) }
  }
  return { provider }
}

// DELETE — removes a single media item. Body: { type: 'avatar' | 'gallery' | 'service', slug, url? }
// avatar: clears providers.avatar_url and deletes the file.
// gallery: removes `url` from pages.gallery and deletes the file.
// service: deletes the file only (caller manages pages.services via /api/mychat/services).
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { type?: string; slug?: string; url?: string }
  const { type, slug, url } = body
  if (!type || !slug) return NextResponse.json({ error: 'Missing type or slug' }, { status: 400 })

  const owned = await assertOwnership(user.email, slug)
  if (owned.error) return owned.error
  const provider = owned.provider!

  if (type === 'avatar') {
    const { data: current } = await supabaseAdmin
      .from('providers')
      .select('avatar_url')
      .eq('id', provider.id)
      .maybeSingle()
    const currentUrl = current?.avatar_url as string | null | undefined
    if (!currentUrl) return NextResponse.json({ ok: true })

    await deleteStorageFile(currentUrl)
    const { error } = await supabaseAdmin.from('providers').update({ avatar_url: null }).eq('id', provider.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (type === 'gallery') {
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    const { data: page } = await supabaseAdmin
      .from('pages')
      .select('gallery')
      .eq('provider_id', provider.id)
      .maybeSingle()
    const existing: string[] = Array.isArray(page?.gallery) ? (page.gallery as string[]) : []
    const next = existing.filter(u => u !== url)
    const { error } = await supabaseAdmin.from('pages').update({ gallery: next }).eq('provider_id', provider.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await deleteStorageFile(url)
    return NextResponse.json({ ok: true, gallery: next })
  }

  if (type === 'service') {
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    await deleteStorageFile(url)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unsupported type' }, { status: 400 })
}

// PATCH — full-array replace, used for gallery reorder. Body: { slug, gallery: string[] }
// Matches the "whole array overwrite on Save" convention used by services/sections.
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { slug?: string; gallery?: unknown }
  const { slug, gallery } = body
  if (!slug || !Array.isArray(gallery) || !gallery.every(u => typeof u === 'string')) {
    return NextResponse.json({ error: 'Missing slug or invalid gallery array' }, { status: 400 })
  }

  const owned = await assertOwnership(user.email, slug)
  if (owned.error) return owned.error
  const provider = owned.provider!

  const { error } = await supabaseAdmin.from('pages').update({ gallery }).eq('provider_id', provider.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, gallery })
}
