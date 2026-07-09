/**
 * POST /api/mychat/draft/import
 *
 * Imports a .docx file and converts it to HTML for the TipTap editor.
 * Conversion is done server-side with `mammoth` to keep it out of the
 * client bundle and avoid browser-incompatible Node.js APIs.
 *
 * Accepts multipart/form-data with:
 *   - providerId (text field)
 *   - file (.docx blob)
 *
 * Returns: { html: string, warnings: string[] }
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'
import mammoth           from 'mammoth'

export const maxDuration = 30

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Parse multipart form data ─────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const providerId = formData.get('providerId') as string | null
  const file       = formData.get('file') as File | null

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
  if (!file)       return NextResponse.json({ error: 'Missing file' },       { status: 400 })

  // Validate file type
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ]
  if (!validMimeTypes.includes(file.type) && !file.name.endsWith('.docx')) {
    return NextResponse.json({ error: 'Only .docx files are supported' }, { status: 400 })
  }

  // File size limit: 5 MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 })
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
    return NextResponse.json({ error: 'Import is for the advocate persona only.' }, { status: 403 })
  }

  // ── Convert .docx → HTML with mammoth ────────────────────────────────────
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          // Preserve headings as HTML heading tags
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          // Bold text
          "b => strong",
          // Italic text
          "i => em",
        ],
      },
    )

    const html     = result.value
    const warnings = result.messages
      .filter(m => m.type === 'warning')
      .map(m => m.message)
      .slice(0, 10)  // cap at 10 warnings

    return NextResponse.json({ html, warnings })
  } catch (err) {
    console.error('[import] mammoth conversion failed:', err)
    return NextResponse.json({ error: 'Failed to convert document — please try a different file.' }, { status: 502 })
  }
}
