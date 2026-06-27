import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { buildPageFunction } from '@/inngest/build-page'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [buildPageFunction],
})
