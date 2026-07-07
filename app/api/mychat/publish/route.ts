import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await req.json() as { slug: string }
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('slug', slug)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Not your page' }, { status: 403 })

  // Read the pending draft
  const { data: pageRow } = await supabaseAdmin
    .from('pages')
    .select('draft_data')
    .eq('provider_id', provider.id)
    .single()

  type DraftShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown> }
  const draft = (pageRow?.draft_data ?? {}) as DraftShape
  const dp    = draft.pages     ?? {}
  const dpr   = draft.providers ?? {}

  // Apply draft page fields to live columns
  if (Object.keys(dp).length > 0) {
    await supabaseAdmin.from('pages').update(dp).eq('provider_id', provider.id)
  }

  // Apply draft provider fields (only safe fields)
  const allowedProviderFields = ['location', 'whatsapp_number', 'business_hours', 'instagram_handle', 'nextdoor_url']
  const safeProviderUpdate = Object.fromEntries(
    Object.entries(dpr).filter(([k]) => allowedProviderFields.includes(k))
  )
  if (Object.keys(safeProviderUpdate).length > 0) {
    await supabaseAdmin.from('providers').update(safeProviderUpdate).eq('id', provider.id)
  }

  // Clear draft_data now that changes are live
  await supabaseAdmin.from('pages').update({ draft_data: null }).eq('provider_id', provider.id)

  revalidatePath(`/${slug}`)
  return NextResponse.json({ ok: true })
}
