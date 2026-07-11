import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { buildPageFunction } from '@/inngest/build-page'
import { generatePersonaFunction } from '@/inngest/generate-persona-template'
import { trialWatchFunction } from '@/inngest/trial-watch'
import { paymentAlertsFunction } from '@/inngest/payment-alerts'
import { hearingRemindersFunction } from '@/inngest/hearing-reminders'
import { consultationFollowupFunction } from '@/inngest/consultation-followup'
import { liveLawSyncFunction } from '@/inngest/livelaw-sync'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    buildPageFunction,
    generatePersonaFunction,
    trialWatchFunction,
    paymentAlertsFunction,
    hearingRemindersFunction,
    consultationFollowupFunction,
    liveLawSyncFunction,
  ],
})
