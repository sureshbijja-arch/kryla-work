import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteStorageFile } from '@/lib/storage'

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin(): Promise<{ email: string } | NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email: user.email }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as Record<string, unknown>

  const allowed = ['persona', 'name', 'description', 'template', 'palette', 'font', 'sort_order', 'active', 'image_url', 'sections']
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  // If image_url is changing (replace or clear), the previous file is about
  // to become unreferenced — clean it up so it doesn't orphan in Storage.
  let oldImageUrl: string | null = null
  if ('image_url' in patch) {
    const { data: current } = await supabaseAdmin
      .from('layout_presets')
      .select('image_url')
      .eq('id', params.id)
      .maybeSingle()
    oldImageUrl = (current?.image_url as string | null) ?? null
  }

  const { data, error } = await supabaseAdmin
    .from('layout_presets')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (oldImageUrl && oldImageUrl !== patch.image_url) {
    await deleteStorageFile(oldImageUrl)
  }

  return NextResponse.json({ preset: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const { data: existing } = await supabaseAdmin
    .from('layout_presets')
    .select('image_url')
    .eq('id', params.id)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('layout_presets')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (existing?.image_url) await deleteStorageFile(existing.image_url as string)

  return NextResponse.json({ ok: true })
}
