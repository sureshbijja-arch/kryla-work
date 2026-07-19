import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { sendWhatsAppMessage, buildNewBookingMessage } from "@/lib/whatsapp"

// Best-effort parse of a "9:00 AM" style label + "2026-07-20" date into a timestamptz.
// Returns null if either piece is missing or unparseable — the owner can still set
// start_at explicitly when accepting the booking (see BookingsTab in Task 3).
function parseSlotToStartAt(preferredDate?: string, preferredSlot?: string): string | null {
  if (!preferredDate || !preferredSlot) return null
  const match = preferredSlot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  const isPM = match[3].toUpperCase() === 'PM'
  if (hour === 12) hour = 0
  if (isPM) hour += 12
  const iso = `${preferredDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

const schema = z.object({
  providerId:    z.string().uuid(),
  customerName:  z.string().min(1).max(100),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(7).max(20),
  service:       z.string().min(1),
  preferredDate: z.string().optional(),
  preferredSlot: z.string().optional(),  // time slot from availability
  grade:         z.string().optional(),  // tutor-specific
  subject:       z.string().optional(),  // tutor-specific
  message:       z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Slot conflict check — if a slot was chosen, verify it's still available
    if (data.preferredDate && data.preferredSlot) {
      const { data: avail } = await supabaseAdmin
        .from('availability')
        .select('slots, active')
        .eq('provider_id', data.providerId)
        .eq('day_key', data.preferredDate)
        .single()

      if (!avail?.active) {
        return NextResponse.json(
          { error: 'That date is no longer available — please choose another' },
          { status: 409 }
        )
      }

      const availSlots: string[] = avail.slots ?? []
      if (!availSlots.includes(data.preferredSlot)) {
        return NextResponse.json(
          { error: 'That time slot is no longer available — please choose another' },
          { status: 409 }
        )
      }
    }

    // Build service string: include grade/subject for tutors
    let serviceLabel = data.service
    if (data.grade || data.subject) {
      const extras = [data.grade, data.subject].filter(Boolean).join(', ')
      serviceLabel = `${data.service} (${extras})`
    }

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        provider_id:       data.providerId,
        customer_name:     data.customerName,
        customer_phone:    data.customerPhone,
        client_email:      data.customerEmail ?? '',   // still the live email column, keep writing it
        service:           serviceLabel,
        preferred_date:    data.preferredDate ?? null,
        preferred_slot:    data.preferredSlot ?? null,
        start_at:          parseSlotToStartAt(data.preferredDate, data.preferredSlot),
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
        { error: "Something went wrong — please try again" },
        { status: 500 }
      )
    }

    // Remove the booked slot from availability (non-fatal)
    if (data.preferredDate && data.preferredSlot) {
      try {
        const { data: avail } = await supabaseAdmin
          .from('availability')
          .select('slots')
          .eq('provider_id', data.providerId)
          .eq('day_key', data.preferredDate)
          .single()

        if (avail) {
          const remaining: string[] = (avail.slots ?? []).filter((s: string) => s !== data.preferredSlot)
          await supabaseAdmin
            .from('availability')
            .update({
              slots:  remaining,
              active: remaining.length > 0,
              updated_at: new Date().toISOString(),
            })
            .eq('provider_id', data.providerId)
            .eq('day_key', data.preferredDate)
        }
      } catch (err) {
        console.error('[booking] Slot removal failed (non-fatal):', err)
      }
    }

    // Notify the member — non-fatal
    try {
      const { data: provider } = await supabaseAdmin
        .from('providers')
        .select('email, first_name, whatsapp_number')
        .eq('id', data.providerId)
        .single()

      if (provider?.whatsapp_number) {
        const msg = buildNewBookingMessage({
          memberName:    provider.first_name ?? 'there',
          customerName:  data.customerName,
          service:       serviceLabel,
          preferredDate: data.preferredDate,
          bookingId:     booking.id,
          customerPhone: data.customerPhone,
        })
        await sendWhatsAppMessage({ to: provider.whatsapp_number, text: msg })
        await supabaseAdmin.from('bookings').update({ notification_sent: true }).eq('id', booking.id)
      }

      if (provider?.email) {
        const dateLine = data.preferredDate
          ? `<p style="margin:6px 0"><strong>Preferred date:</strong> ${data.preferredDate}${data.preferredSlot ? ` at ${data.preferredSlot}` : ''}</p>` : ''
        const msgLine  = data.message
          ? `<p style="margin:6px 0"><strong>Message:</strong> ${data.message}</p>` : ''

        await sendEmail({
          to: provider.email,
          subject: `New booking from ${data.customerName}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0D0D0D">
              <p style="font-size:20px;font-weight:700;margin-bottom:4px">New booking request</p>
              <p style="color:#666;margin-top:0">Hi ${provider.first_name}, someone wants to book with you on Kryla.</p>
              <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
              <p style="margin:6px 0"><strong>Name:</strong> ${data.customerName}</p>
              <p style="margin:6px 0"><strong>Email:</strong> ${data.customerEmail ?? '—'}</p>
              <p style="margin:6px 0"><strong>WhatsApp:</strong> ${data.customerPhone}</p>
              <p style="margin:6px 0"><strong>Service:</strong> ${serviceLabel}</p>
              ${dateLine}
              ${msgLine}
              <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
              <a href="https://kryla.work/mykryla"
                style="display:inline-block;background:#0D0D0D;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">
                Accept or decline in MyKryla →
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
