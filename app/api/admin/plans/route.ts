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

export async function GET() {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const [plansRes, featuresRes] = await Promise.all([
    supabaseAdmin.from('plans').select('*').order('sort_order', { ascending: true }),
    supabaseAdmin.from('plan_features').select('*').order('plan_id').order('sort_order', { ascending: true }),
  ])

  if (plansRes.error)    return NextResponse.json({ error: plansRes.error.message },    { status: 500 })
  if (featuresRes.error) return NextResponse.json({ error: featuresRes.error.message }, { status: 500 })

  const featuresByPlan: Record<string, unknown[]> = {}
  for (const f of featuresRes.data ?? []) {
    const pf = f as { plan_id: string }
    if (!featuresByPlan[pf.plan_id]) featuresByPlan[pf.plan_id] = []
    featuresByPlan[pf.plan_id].push(f)
  }

  const plans = (plansRes.data ?? []).map(p => ({
    ...p,
    features: featuresByPlan[p.id] ?? [],
  }))

  return NextResponse.json({ plans })
}

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as Record<string, unknown>
  const { id, name, emoji, tagline, usa_price, india_price, is_quote, popular, sort_order } = body as {
    id: string; name: string; emoji: string; tagline: string
    usa_price?: string | null; india_price?: string | null
    is_quote?: boolean; popular?: boolean; sort_order?: number
  }

  if (!id?.trim() || !name?.trim())
    return NextResponse.json({ error: 'id and name are required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('plans')
    .insert({ id: id.trim(), name: name.trim(), emoji: emoji ?? '', tagline: tagline ?? '',
              usa_price: usa_price ?? null, india_price: india_price ?? null,
              is_quote: is_quote ?? false, popular: popular ?? false, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: { ...data, features: [] } })
}
