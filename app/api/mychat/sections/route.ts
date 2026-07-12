import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type DraftShape = { pages: Record<string, unknown>; providers: Record<string, unknown> }

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, sections } = body as { providerId: string; sections: unknown[] }

  if (!providerId || !Array.isArray(sections)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email')
    .eq('id', providerId)
    .single()

  if (!provider) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  const newDraft: DraftShape = {
    pages:     { ...(existing.pages ?? {}), sections },
    providers: existing.providers ?? {},
  }

  const { error } = await supabaseAdmin
    .from('pages')
    .update({ draft_data: newDraft })
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
