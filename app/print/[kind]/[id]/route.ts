/**
 * GET /print/[kind]/[id]?providerId=&auto=1
 * Returns a full print-ready HTML page. ?auto=1 triggers window.print() on load.
 * Covers: document / case-sheet / consultation
 */

import { NextResponse }              from 'next/server'
import { buildPrintHtml }            from '@/lib/print/template'
import type { PrintKind }            from '@/lib/print/template'
import {
  getAuthedProviderForPrint,
  fetchDocumentData,
  fetchCaseSheetData,
  fetchConsultationData,
} from '@/lib/print/data'

const VALID_KINDS: PrintKind[] = ['document', 'case-sheet', 'consultation']

export async function GET(
  req: Request,
  { params }: { params: { kind: string; id: string } },
) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const autoprint  = searchParams.get('auto') === '1'

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
    autoprint,
  })

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
