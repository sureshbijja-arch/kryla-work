import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { inngest, IMPORT_CONTENT_EVENT } from '@/lib/inngest'

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin(): Promise<{ email: string } | NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email: user.email }
}

// POST — fires the content import for an approved-native request. Distinct
// from Approve (bookkeeping only): this is the deliberate second action that
// actually fetches the source site and stages a draft. Never publishes.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const { data: request, error } = await supabaseAdmin
    .from('website_copy_requests')
    .select('id, provider_id, slug, source_url, status, output_type')
    .eq('id', params.id)
    .single()

  if (error || !request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.status !== 'approved' || request.output_type !== 'native') {
    return NextResponse.json({ error: 'Request must be approved as Native pre-fill first' }, { status: 400 })
  }
  if (!request.provider_id) {
    return NextResponse.json({ error: 'Request has no linked provider' }, { status: 400 })
  }

  await inngest.send({
    name: IMPORT_CONTENT_EVENT,
    data: {
      providerId: request.provider_id,
      slug:       request.slug,
      requestId:  request.id,
      sourceUrl:  request.source_url,
    },
  })

  return NextResponse.json({ ok: true })
}
