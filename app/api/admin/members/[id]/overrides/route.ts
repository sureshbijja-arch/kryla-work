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

// GET/PATCH the per-member cosmetic overlay (pages.custom_css,
// pages.content_overrides). Admin-set only, scoped to styling and text-field
// exceptions — headline/subheadline/bio. Any request implying new business
// logic or an integration should become a persona-level feature instead; see
// CLAUDE.md for the full guardrail.
const ALLOWED_CONTENT_FIELDS = ['headline', 'subheadline', 'bio']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('pages')
    .select('custom_css, content_overrides')
    .eq('provider_id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    customCss: data?.custom_css ?? '',
    contentOverrides: data?.content_overrides ?? {},
  })
}

// PATCH { customCss?: string | null, contentOverrides?: Record<string, string> }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as { customCss?: string | null; contentOverrides?: Record<string, unknown> }
  const patch: Record<string, unknown> = {}

  if ('customCss' in body) {
    patch.custom_css = typeof body.customCss === 'string' && body.customCss.trim() ? body.customCss : null
  }
  if ('contentOverrides' in body && body.contentOverrides && typeof body.contentOverrides === 'object') {
    patch.content_overrides = Object.fromEntries(
      Object.entries(body.contentOverrides).filter(
        ([k, v]) => ALLOWED_CONTENT_FIELDS.includes(k) && typeof v === 'string' && v.trim()
      )
    )
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('pages')
    .update(patch)
    .eq('provider_id', params.id)
    .select('custom_css, content_overrides')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    customCss: data?.custom_css ?? '',
    contentOverrides: data?.content_overrides ?? {},
  })
}
