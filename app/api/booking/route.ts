/**
 * POST /api/booking
 *
 * A customer submits a booking request from the Member's profile page.
 * Creates the booking row, then fires a notification job.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/admin"

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
        // legacy columns with NOT NULL constraints — keep in sync
        client_name:       data.customerName,
        client_phone:      data.customerPhone,
        service_requested: data.service,
        requested_slot:    data.preferredDate ?? '',
      })
      .select()
      .single()

    if (error || !booking) {
      console.error("[booking] Insert failed:", error)
      return NextResponse.json(
        { error: "Something went wrong — please try again" },
        { status: 500 }
      )
    }

    // Email the member — non-fatal: booking is saved regardless
    try {
      const { data: provider } = await supabaseAdmin
        .from('providers')
        .select('email, first_name')
        .eq('id', data.providerId)
        .single()

      if (provider?.email && process.env.RESEND_API_KEY) {
        const dateLine = data.preferredDate ? `<p><strong>Preferred date:</strong> ${data.preferredDate}</p>` : ''
        const msgLine  = data.message       ? `<p><strong>Message:</strong> ${data.message}</p>` : ''

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Kryla <hello@kryla.work>',
            to: provider.email,
            subject: `New booking request from ${data.customerName}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0D0D0D">
                <p style="font-size:18px;font-weight:700;margin-bottom:4px">New booking request</p>
                <p style="color:#666;margin-top:0">Hi ${provider.first_name}, someone wants to book with you.</p>
                <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
                <p><strong>Name:</strong> ${data.customerName}</p>
                <p><strong>WhatsApp:</strong> ${data.customerPhone}</p>
                <p><strong>Service:</strong> ${data.service}</p>
                ${dateLine}
                ${msgLine}
                <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
                <p style="color:#666;font-size:13px">Log in to <a href="https://kryla.work/my-space" style="color:#F5A623">My Space</a> to accept or decline.</p>
              </div>`,
          }),
        })
      }
    } catch (emailErr) {
      console.error('[booking] Email failed (non-fatal):', emailErr)
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
