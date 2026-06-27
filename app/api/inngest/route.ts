import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { buildPage } from "@/inngest/functions/build-page"
import { notifyBooking } from "@/inngest/functions/notify-booking"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [buildPage, notifyBooking],
})
