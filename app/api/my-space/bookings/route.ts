import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

async function getAuthedProvider(providerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, first_name, whatsapp_number')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  return provider
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('id, created_at, customer_name, client_email, customer_phone, service, preferred_date, preferred_slot, message, status')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bookings })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { providerId, bookingId, status } = body

  if (!providerId || !bookingId || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const allowed = ['accepted', 'rejected', 'cancelled', 'onhold']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch booking before updating so we have customer details + slot info
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('customer_name, client_email, service, preferred_date, preferred_slot')
    .eq('id', bookingId)
    .eq('provider_id', providerId)
    .single()

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // On rejected/onhold — restore the slot to availability (non-fatal)
  if ((status === 'rejected' || status === 'cancelled' || status === 'onhold') &&
      booking?.preferred_date && booking?.preferred_slot) {
    try {
      const { data: avail } = await supabaseAdmin
        .from('availability')
        .select('slots')
        .eq('provider_id', providerId)
        .eq('day_key', booking.preferred_date)
        .single()

      if (avail) {
        const slots: string[] = avail.slots ?? []
        if (!slots.includes(booking.preferred_slot)) {
          await supabaseAdmin
            .from('availability')
            .update({
              slots: [...slots, booking.preferred_slot].sort(),
              active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('provider_id', providerId)
            .eq('day_key', booking.preferred_date)
        }
      }
    } catch (err) {
      console.error('[bookings] Slot restore failed (non-fatal):', err)
    }
  }

  // On accepted — auto-create student record (idempotent: skip if booking_id already exists)
  if (status === 'accepted' && booking) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('provider_id', providerId)
        .eq('booking_id', bookingId)
        .single()

      if (!existing) {
        // Parse grade/subject from service string "(grade, subject)" if present
        const serviceStr: string = booking.service ?? ''
        const match = serviceStr.match(/\(([^)]+)\)/)
        const extras = match ? match[1].split(',').map((s: string) => s.trim()) : []

        await supabaseAdmin.from('students').insert({
          provider_id:  providerId,
          booking_id:   bookingId,
          name:         booking.customer_name,
          label_1:      extras[0] ?? null,
          label_2:      extras[1] ?? null,
          sessions:     0,
          avatar_color: randomColor(),
        })
      }
    } catch (err) {
      console.error('[bookings] Auto-student failed (non-fatal):', err)
    }
  }

  // Email the customer — non-fatal
  if (booking?.client_email) {
    try {
      const dateLine = booking.preferred_date
        ? `<p style="margin:6px 0"><strong>Date requested:</strong> ${booking.preferred_date}${booking.preferred_slot ? ` at ${booking.preferred_slot}` : ''}</p>` : ''

      if (status === 'accepted') {
        await sendEmail({
          to: booking.client_email,
          subject: `Your booking with ${provider.first_name} is confirmed!`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0D0D0D">
              <p style="font-size:20px;font-weight:700;margin-bottom:4px">Booking confirmed</p>
              <p style="color:#666;margin-top:0">Hi ${booking.customer_name}, your booking has been accepted.</p>
              <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
              <p style="margin:6px 0"><strong>Service:</strong> ${booking.service}</p>
              ${dateLine}
              <p style="margin:6px 0"><strong>With:</strong> ${provider.first_name}</p>
              <hr style="border:none;border-top:1px solid #E5E5E5;margin:16px 0"/>
              ${provider.whatsapp_number
                ? `<p style="color:#666;font-size:13px">
                    Reach out on WhatsApp to confirm the details:
                    <a href="https://wa.me/${provider.whatsapp_number}" style="color:#F5A623">+${provider.whatsapp_number}</a>
                   </p>`
                : ''}
            </div>`,
        })
      } else if (status === 'rejected') {
        await sendEmail({
          to: booking.client_email,
          subject: `Update on your booking request with ${provider.first_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0D0D0D">
              <p style="font-size:20px;font-weight:700;margin-bottom:4px">Booking update</p>
              <p style="color:#666;margin-top:0">Hi ${booking.customer_name},</p>
              <p style="color:#444">Unfortunately, ${provider.first_name} isn't able to take your booking for <strong>${booking.service}</strong> at this time.</p>
              <p style="color:#666;font-size:13px;margin-top:20px">You're welcome to visit their page and submit a new request with a different date or service.</p>
            </div>`,
        })
      } else if (status === 'onhold') {
        await sendEmail({
          to: booking.client_email,
          subject: `Your request with ${provider.first_name} is on hold`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#0D0D0D">
              <p style="font-size:20px;font-weight:700;margin-bottom:4px">Request on hold</p>
              <p style="color:#666;margin-top:0">Hi ${booking.customer_name},</p>
              <p style="color:#444">Your booking request for <strong>${booking.service}</strong> is on hold — ${provider.first_name} needs a bit more information and will reach out to you shortly.</p>
              ${dateLine}
            </div>`,
        })
      }
    } catch (err) {
      console.error('[bookings] Customer email failed (non-fatal):', err)
    }
  }

  return NextResponse.json({ success: true })
}

const COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EF4444','#14B8A6']
function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}
