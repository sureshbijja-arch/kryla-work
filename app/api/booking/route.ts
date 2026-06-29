import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"

const schema = z.object({
  providerId:    z.string().uuid(),
  customerName:  z.string().min(1).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(7).max(20),
  service:       z.string().min(1),
  preferredDate: z.string().optional(),
  message:       z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

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
        // legacy NOT NULL columns — keep in sync
        client_name:       data.customerName,
        client_phone:      data.customerPhone,
        client_email:      data.customerEmail,
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

    // Notify the member — non-fatal
    try {
      const { data: provider } = await supabaseAdmin
        .from('providers')
        .select('email, first_name')
        .eq('id', data.providerId)
        .single()

      if (provider?.email) {
        const dateLine = data.preferredDate ? `<p style="margin:6px 0"><strong>Preferred date:</strong> ${data.preferredDate}</p>` : ''
        const msgLine  = data.message       ? `<p style="margin:6px 0"><strong>Message:</strong> ${data.message}</p>` : ''

        await sendEmail({
          to: provider.email,
          subject: `New booking from ${data.customerName}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0D0D0D">
              <p style="font-size:20px;font-weight:700;margin-bottom:4px">New booking request</p>
              <p style="color:#666;margin-top:0">Hi ${provider.first_name}, someone wants to book with you on Kryla.</p>
              <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
              <p style="margin:6px 0"><strong>Name:</strong> ${data.customerName}</p>
              <p style="margin:6px 0"><strong>Email:</strong> ${data.customerEmail}</p>
              <p style="margin:6px 0"><strong>WhatsApp:</strong> ${data.customerPhone}</p>
              <p style="margin:6px 0"><strong>Service:</strong> ${data.service}</p>
              ${dateLine}
              ${msgLine}
              <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
              <a href="https://kryla.work/my-space"
                style="display:inline-block;background:#0D0D0D;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">
                Accept or decline in My Space →
              </a>
            </div>`,
        })
      }
    } catch (err) {
      console.error('[booking] Member email failed (non-fatal):', err)
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
