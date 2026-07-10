/**
 * GET /api/print/hearings/pdf?providerId=
 * Downloads a server-generated PDF of upcoming hearings.
 */

export const runtime     = 'nodejs'
export const maxDuration = 60

import { buildPrintHtml }          from '@/lib/print/template'
import { htmlToPdf }               from '@/lib/print/pdf'
import { getAuthedProviderForPrint, fetchHearingsData } from '@/lib/print/data'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')

  if (!providerId) return new Response('Missing providerId', { status: 400 })

  const auth = await getAuthedProviderForPrint(providerId)
  if (!auth) return new Response('Unauthorized', { status: 401 })

  const { provider } = auth
  const data = await fetchHearingsData(providerId)

  const html = buildPrintHtml({
    kind:       'hearings',
    letterhead: provider.letterhead,
    provider,
    data,
    autoprint: false,
  })

  const pdfBuffer = await htmlToPdf(html)

  return new Response(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'attachment; filename="hearing-schedule.pdf"',
    },
  })
}
