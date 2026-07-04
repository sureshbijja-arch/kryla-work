import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { buildPageFunction } from '@/inngest/build-page'
import { generatePersonaFunction } from '@/inngest/generate-persona-template'
import { trialWatchFunction } from '@/inngest/trial-watch'
import { paymentAlertsFunction } from '@/inngest/payment-alerts'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [buildPageFunction, generatePersonaFunction, trialWatchFunction, paymentAlertsFunction],
})
