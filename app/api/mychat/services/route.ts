import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type DraftShape = { pages: Record<string, unknown>; providers: Record<string, unknown> }

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { providerId, services, menuFiles } = await req.json()

  if (!providerId || !Array.isArray(services)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email')
    .eq('id', providerId)
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (provider.email === null) {
    await supabaseAdmin.from('providers').update({ email: user.email }).eq('id', providerId)
  } else if (provider.email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: currentPage } = await supabaseAdmin
    .from('pages')
    .select('draft_data')
    .eq('provider_id', providerId)
    .maybeSingle()

  const existing = (currentPage?.draft_data ?? {}) as Partial<DraftShape>

  const pagesUpdate: Record<string, unknown> = { ...(existing.pages ?? {}), services }
  // Only write menu_files when the client explicitly sends it (Part B — keep-file checkbox)
  if (Array.isArray(menuFiles) && menuFiles.length > 0) {
    const existing_menu = Array.isArray(existing.pages?.menu_files) ? (existing.pages.menu_files as string[]) : []
    pagesUpdate.menu_files = [...existing_menu, ...menuFiles]
  }

  const newDraft: DraftShape = {
    pages:     pagesUpdate,
    providers: existing.providers ?? {},
  }

  const { error } = await supabaseAdmin
    .from('pages')
    .update({ draft_data: newDraft })
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
