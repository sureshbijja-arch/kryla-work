/**
 * GET /print/hearings?providerId=&auto=1
 * Returns a full print-ready HTML page with upcoming hearings.
 */

import { buildPrintHtml }         from '@/lib/print/template'
import { getAuthedProviderForPrint, fetchHearingsData } from '@/lib/print/data'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const autoprint  = searchParams.get('auto') === '1'

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
    autoprint,
  })

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
