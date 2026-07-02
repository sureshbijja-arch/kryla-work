import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** Strips @prefix, extracts username from a pasted instagram.com URL, else returns bare handle */
function normalizeHandle(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Full URL — extract first pathname segment
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('instagram.com')) {
      const username = url.pathname.replace(/^\//, '').split('/')[0]
      return username || null
    }
  } catch { /* not a URL */ }
  // Strip leading @
  return trimmed.replace(/^@/, '') || null
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { providerId, instagramHandle } = await req.json()
  if (!providerId) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email')
    .eq('id', providerId)
    .single()

  if (!provider || provider.email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const handle = typeof instagramHandle === 'string' ? normalizeHandle(instagramHandle) : null

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ instagram_handle: handle })
    .eq('id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, handle })
}
