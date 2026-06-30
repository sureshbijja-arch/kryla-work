import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { enrichLayout } from '@/lib/layouts'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const persona = req.nextUrl.searchParams.get('persona') ?? 'other'

  const { data, error } = await supabaseAdmin
    .from('layout_presets')
    .select('id, name, description, template, palette, font, sort_order, image_url, sections')
    .in('persona', [persona, 'all'])
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ layouts: [] })

  return NextResponse.json({ layouts: (data ?? []).map(enrichLayout) })
}
