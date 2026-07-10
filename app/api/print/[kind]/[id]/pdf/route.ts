/**
 * GET /api/print/[kind]/[id]/pdf?providerId=
 * Downloads a server-generated PDF. Node.js runtime required for Chromium.
 * Covers: document / case-sheet / consultation
 */

export const runtime    = 'nodejs'
export const maxDuration = 60

import { buildPrintHtml }            from '@/lib/print/template'
import type { PrintKind }            from '@/lib/print/template'
import { htmlToPdf }                 from '@/lib/print/pdf'
import {
  getAuthedProviderForPrint,
  fetchDocumentData,
  fetchCaseSheetData,
  fetchConsultationData,
} from '@/lib/print/data'

const VALID_KINDS: PrintKind[] = ['document', 'case-sheet', 'consultation']

const FILENAME: Record<PrintKind, string> = {
  'document':     'document.pdf',
  'case-sheet':   'case-sheet.pdf',
  'consultation': 'consultation.pdf',
  'hearings':     'hearings.pdf',
}

export async function GET(
  req: Request,
  { params }: { params: { kind: string; id: string } },
) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')

  if (!providerId) return new Response('Missing providerId', { status: 400 })

  const kind = params.kind as PrintKind
  if (!VALID_KINDS.includes(kind)) return new Response('Invalid kind', { status: 400 })

  const auth = await getAuthedProviderForPrint(providerId)
  if (!auth) return new Response('Unauthorized', { status: 401 })

  const { provider } = auth
  let data

  if (kind === 'document') {
    data = await fetchDocumentData(providerId, params.id)
  } else if (kind === 'case-sheet') {
    data = await fetchCaseSheetData(providerId, params.id)
  } else {
    data = await fetchConsultationData(providerId, params.id)
  }

  if (!data) return new Response('Not found', { status: 404 })

  const html = buildPrintHtml({
    kind,
    letterhead: provider.letterhead,
    provider,
    data,
    autoprint: false,
  })

  const pdfBuffer = await htmlToPdf(html)

  return new Response(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${FILENAME[kind]}"`,
    },
  })
}
