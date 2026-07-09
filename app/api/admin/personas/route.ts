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

  const { data, error } = await supabaseAdmin
    .from('personas')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ personas: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as Record<string, unknown>
  const { id, label, emoji, sort_order, template, palette, font } = body as {
    id: string; label: string; emoji?: string
    sort_order?: number; template?: string; palette?: string; font?: string
  }

  if (!id?.trim() || !label?.trim())
    return NextResponse.json({ error: 'id and label are required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('personas')
    .insert({
      id:           id.trim().toLowerCase().replace(/\s+/g, '_'),
      label:        label.trim(),
      emoji:        emoji?.trim() ?? '✨',
      sort_order:   sort_order ?? 99,
      template:     template ?? 'focus',
      palette:      palette  ?? 'professional',
      font:         font     ?? 'inter',
      enabled:      true,
      needs_config: true,   // new admin-added personas always need code config
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ persona: data })
}
