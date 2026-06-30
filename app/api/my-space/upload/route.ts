import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }
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
    .select('id, plan')
    .eq('slug', slug)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Not your page' }, { status: 403 })

  const rank = PLAN_RANK[provider.plan ?? 'seed'] ?? 0
  const minRank = type === 'section-bg' ? 1 : 2
  if (rank < minRank) {
    const planName = minRank >= 2 ? 'Grow' : 'Sprout'
    return NextResponse.json({ error: `This feature requires the ${planName} plan or higher` }, { status: 403 })
  }

  if (blob.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const ext = ALLOWED_TYPES[blob.type]
  if (!ext) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP or GIF images are supported' }, { status: 400 })
  }

  const path = type === 'avatar'
    ? `${provider.id}/avatar.${ext}`
    : `${provider.id}/${type}/${Date.now()}.${ext}`

  const bytes = await blob.arrayBuffer()
  const { error: uploadError } = await supabaseAdmin.storage
    .from('profile-media')
    .upload(path, bytes, { contentType: blob.type, upsert: type === 'avatar' })

  if (uploadError) {
    console.error('[upload] storage error:', uploadError)
    const msg = uploadError.message?.toLowerCase().includes('bucket')
      ? 'Storage bucket not found — the "profile-media" bucket needs to be created in Supabase'
      : uploadError.message ?? 'Upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('profile-media').getPublicUrl(path)

  if (type === 'avatar') {
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
  }

  return NextResponse.json({ url: publicUrl })
}
