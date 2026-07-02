import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** Strips @prefix, extracts username from a pasted instagram.com URL, else returns bare handle */
function normalizeHandle(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('instagram.com')) {
      const username = url.pathname.replace(/^\//, '').split('/')[0]
      return username || null
    }
  } catch { /* not a URL */ }
  return trimmed.replace(/^@/, '') || null
}

/** Validates and normalises a Nextdoor business-page URL. Returns null if invalid or empty. */
function normalizeNextdoorUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (!url.hostname.endsWith('nextdoor.com')) return null
    return url.href
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, instagramHandle, nextdoorUrl } = body

  if (!providerId) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email')
    .eq('id', providerId)
    .single()

  if (!provider || provider.email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only update fields that were explicitly included in the body
  const update: Record<string, unknown> = {}

  if ('instagramHandle' in body) {
    update.instagram_handle = typeof instagramHandle === 'string' ? normalizeHandle(instagramHandle) : null
  }

  if ('nextdoorUrl' in body) {
    const raw = typeof nextdoorUrl === 'string' ? nextdoorUrl : ''
    if (raw.trim()) {
      const normalized = normalizeNextdoorUrl(raw)
      if (!normalized) {
        return NextResponse.json({ error: 'Please enter a valid nextdoor.com page URL' }, { status: 400 })
      }
      update.nextdoor_url = normalized
    } else {
      update.nextdoor_url = null
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, handle: null, nextdoorUrl: null })
  }

  const { error } = await supabaseAdmin
    .from('providers')
    .update(update)
    .eq('id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    handle:     'instagram_handle' in update ? (update.instagram_handle as string | null) : undefined,
    nextdoorUrl: 'nextdoor_url'    in update ? (update.nextdoor_url     as string | null) : undefined,
  })
}
