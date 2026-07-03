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

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as {
    plan_id: string; label: string; description?: string | null
    feature_key?: string | null; sort_order?: number
  }

  if (!body.plan_id?.trim() || !body.label?.trim())
    return NextResponse.json({ error: 'plan_id and label are required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('plan_features')
    .insert({
      plan_id:     body.plan_id.trim(),
      label:       body.label.trim(),
      description: body.description?.trim() ?? null,
      feature_key: body.feature_key?.trim() ?? null,
      sort_order:  body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feature: data })
}
