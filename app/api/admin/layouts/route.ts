import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin(): Promise<{ email: string } | NextResponse> {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email: user.email }
}

export async function GET() {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('layout_presets')
    .select('*')
    .order('persona', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presets: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as {
    persona: string; name: string; description: string
    template: string; palette: string; font: string; sort_order: number
    design_mode?: string; page_bg?: string; surface?: string; border_color?: string
  }

  const { persona, name, description, template, palette, font, sort_order,
          design_mode, page_bg, surface, border_color } = body
  const image_url = (body as Record<string, unknown>).image_url as string | null | undefined
  const sections  = (body as Record<string, unknown>).sections  as unknown[] | null | undefined
  if (!persona || !name || !template || !palette || !font)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('layout_presets')
    .insert({
      persona, name, description: description ?? '',
      template, palette, font, sort_order: sort_order ?? 0,
      design_mode:  design_mode  ?? 'craft',
      page_bg:      page_bg      ?? '#FFFFFF',
      surface:      surface      ?? '#FFFFFF',
      border_color: border_color ?? '#E5E5E5',
      image_url: image_url ?? null,
      sections: sections ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preset: data })
}
