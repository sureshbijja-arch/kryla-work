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

const PAGE_SIZE = 50

// GET ?q=<search>&page=<0-based> — lists member sites for the admin kill-switch
// tab, paginated so this stays flat as the member count grows. Search uses a
// prefix match (col.ilike.q%) rather than a leading-wildcard (%q%) so it can
// use a standard index instead of forcing a sequential scan.
export async function GET(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const q = req.nextUrl.searchParams.get('q')?.trim()
  const page = Math.max(0, Number(req.nextUrl.searchParams.get('page') ?? '0') || 0)
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabaseAdmin
    .from('providers')
    .select('id, slug, first_name, last_name, email, plan, page_live, suspended, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    query = query.or(`slug.ilike.${q}%,first_name.ilike.${q}%,last_name.ilike.${q}%,email.ilike.${q}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ members: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE })
}
