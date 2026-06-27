/**
 * notify-booking — sends a WhatsApp to the Member when a new booking arrives.
 * Only fires for Sprout plan and above.
 */

import { inngest } from "@/inngest/client"
import { sendWhatsAppMessage, buildNewBookingMessage } from "@/lib/whatsapp"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { can } from "@/lib/plan"
import type { Plan } from "@/types"

export const notifyBooking = inngest.createFunction(
  { id: "notify-booking", name: "Notify Member of New Booking" },
  { event: "kryla/booking.created" },
  async ({ event, step }) => {
    const { bookingId } = event.data

    // Fetch booking + provider in one go
    const booking = await step.run("fetch-booking", async () => {
      const { data, error } = await supabaseAdmin
        .from("bookings")
        .select("*, providers(name, phone, plan)")
        .eq("id", bookingId)
        .single()

      if (error || !data) throw new Error("Booking not found")
      return data
    })

    const provider = (booking as any).providers
    if (!can.receiveWhatsApp(provider.plan as Plan)) {
      // Seed members get email only — handled elsewhere
      return { skipped: "seed-plan-no-whatsapp" }
    }

    // Send WhatsApp to Member
    const result = await step.run("send-whatsapp", async () => {
      return sendWhatsAppMessage({
        to: provider.phone,
        text: buildNewBookingMessage({
          memberName: provider.name.split(" ")[0],
          customerName: booking.customer_name,
          service: booking.service,
          preferredDate: booking.preferred_date ?? undefined,
          bookingId: booking.id,
        }),
      })
    })

    // Update delivery status
    await step.run("update-notification-log", async () => {
      await supabaseAdmin.from("notifications").insert({
        provider_id: booking.provider_id,
        booking_id: bookingId,
        channel: "whatsapp",
        recipient: provider.phone,
        message: "new booking notification",
        delivery_status: result.success ? "sent" : "failed",
      })

      if (result.success) {
        await supabaseAdmin
          .from("bookings")
          .update({ notification_sent: true })
          .eq("id", bookingId)
      }
    })

    return result
  }
)
