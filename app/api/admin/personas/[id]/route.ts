import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
  const allowed = ['label', 'emoji', 'enabled', 'sort_order', 'template', 'palette', 'font']
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('personas')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ persona: data })
}

// Previously a bare delete with no usage check — deleting a persona that
// live providers still reference stranded them pointing at a missing id
// (onboarding/build/public-page copy all fall back to 'other' or break).
// Hard-blocks until every provider using it has been reassigned.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const { count, error: countError } = await supabaseAdmin
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('persona', params.id)

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `${count} member${count === 1 ? '' : 's'} still use this persona — reassign them first`, memberCount: count },
      { status: 409 },
    )
  }

  const { error } = await supabaseAdmin.from('personas').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
