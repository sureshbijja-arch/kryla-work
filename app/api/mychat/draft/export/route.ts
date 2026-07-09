/**
 * POST /api/mychat/draft/export
 *
 * Exports a TipTap JSON document as a real .docx file.
 * Done server-side so the docx bundle is never shipped to the client.
 *
 * Body: { providerId, json, title }
 * Returns: binary .docx stream
 */

import { createClient }     from '@/lib/supabase/server'
import { supabaseAdmin }    from '@/lib/supabase/admin'
import { tiptapJsonToDocx } from '@/lib/docx/export'
import { NextResponse }     from 'next/server'

export const maxDuration = 30

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, json, title } = body as {
    providerId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json:       any
    title?:     string
  }

  if (!providerId || !json) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, persona')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (provider.persona !== 'advocate') {
    return NextResponse.json({ error: 'Export is for the advocate persona only.' }, { status: 403 })
  }

  // ── Generate .docx ────────────────────────────────────────────────────────
  try {
    const buffer = await tiptapJsonToDocx(json, title ?? 'Legal Document')
    const docTitle = (title ?? 'legal-document').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)
    // Convert Node.js Buffer to Uint8Array for the Web Response API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(buffer as any, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${docTitle}.docx"`,
        'Content-Length':      buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('[export] docx generation failed:', err)
    return NextResponse.json({ error: 'Export failed — please try again.' }, { status: 502 })
  }
}
