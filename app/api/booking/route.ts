/**
 * POST /api/booking
 *
 * A customer submits a booking request from the Member's profile page.
 * Creates the booking row, then fires a notification job.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { inngest } from "@/inngest/client"

const schema = z.object({
  providerId:    z.string().uuid(),
  customerName:  z.string().min(1).max(100),
  customerPhone: z.string().min(7).max(20),
  service:       z.string().min(1),
  preferredDate: z.string().optional(),
  message:       z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const data   = schema.parse(body)

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        provider_id:       data.providerId,
        customer_name:     data.customerName,
        customer_phone:    data.customerPhone,
        service:           data.service,
        preferred_date:    data.preferredDate ?? null,
        message:           data.message ?? null,
        status:            "pending",
        notification_sent: false,
        confirmation_sent: false,
      })
      .select()
      .single()

    if (error || !booking) {
      console.error("[booking] Insert failed:", error)
      return NextResponse.json(
        { error: error?.message ?? "Insert returned no data" },
        { status: 500 }
      )
    }

    // Fire notification job — non-fatal: booking is saved regardless
    try {
      await inngest.send({
        name: "kryla/booking.created",
        data: { bookingId: booking.id },
      })
    } catch (notifyErr) {
      console.error("[booking] Inngest send failed (non-fatal):", notifyErr)
    }

    return NextResponse.json({ success: true, bookingId: booking.id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 422 })
    }
    console.error("[booking] Unexpected error:", err)
    return NextResponse.json(
      { error: "Something went wrong — please try again" },
      { status: 500 }
    )
  }
}
