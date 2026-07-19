# Salon/Makeup Bookings Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bookings for the Salon/Makeup persona duration-aware, self-reminding, and
WhatsApp-native — closing the three real gaps versus WhatsApp-as-notepad: no reminders/no-show
handling, a fake WhatsApp reply loop, and opaque (durationless) slots.

**Architecture:** Extend the existing `bookings`/`availability` tables and `BookingsTab` /
`AvailabilityTab` UI rather than building a parallel system. Add a daily Inngest cron (copying
the proven `hearing-reminders.ts` shape) for WhatsApp reminders, and extend the existing WhatsApp
webhook to parse interactive-button/keyword replies (CONFIRM/CANCEL/RESCHEDULE) deterministically
— no LLM in the booking money path. Surface a new "Today" day-view as a detail card inside the
**existing** My Services tile (`services` → `consultations` is already the Bookings surface;
day-view is a sibling card), gated to salon/makeup personas the same way the advocate-only
`letterhead`/`email` cards are already gated in `SpaceClient.tsx`.

**Tech Stack:** Next.js 14 App Router, Supabase Postgres (service-role writes, RLS disabled on
core tables), Inngest (cron + event functions), Meta WhatsApp Cloud API via `lib/whatsapp.ts`,
Zod validation, Playwright for e2e (no unit test runner exists in this repo — do not introduce one).

## Global Constraints

- No hardcoding of configurable data — persona gating, labels, and reminder copy stay data-driven
  where the codebase already establishes that pattern; UI persona checks (`persona === 'salon'`)
  follow the existing precedent at `SpaceClient.tsx:241,251`, which is the established idiom here,
  not a violation — it's how advocate-only cards are already gated.
- No tech debt: delete/stop the legacy `client_*`/`service_requested`/`requested_slot` writes in
  `/api/booking/route.ts` per CLAUDE.md's own note that they are "unused, do not write to them."
  No TODOs, no duplication.
- No LLM in the booking confirm/cancel/reschedule path (v1). Deterministic parsing only.
- No paid deposits / no-show fees in this plan — track + remind only; payment UI does not exist yet.
- All WhatsApp sends go through `lib/whatsapp.ts` — never call the Meta API directly from routes
  (existing file-header rule).
- Every Inngest cron send must be logged to `notifications` and gated by a `system_config` kill
  switch, matching `inngest/hearing-reminders.ts`.
- This repo has no unit test runner (no Jest/Vitest, `package.json` only has `test:e2e` via
  Playwright, and no test files exist anywhere outside `node_modules`). Do not introduce one.
  Verify via Playwright e2e tests for browser-driven flows, and explicit manual/CLI verification
  (`curl`, Supabase SQL, Inngest dev-server manual run) for backend-only pieces (migrations, cron,
  webhook parsing) — this matches how the rest of the codebase is verified.

---

## File Structure

New/changed files, one responsibility each:

- `supabase/migrations/20260719000001_booking_duration.sql` — schema: `start_at`, `duration_min`,
  `no_show` status, reminder dedupe columns; drops legacy NOT NULL constraints.
- `app/api/booking/route.ts` — modify: stop writing legacy columns, compute `start_at`.
- `app/api/mychat/bookings/route.ts` — modify: PATCH accepts `duration_min`, `no_show` status,
  returns `start_at`/`duration_min` from GET.
- `app/mychat/BookingsTab.tsx` — modify: duration picker on Accept, "Mark no-show" action.
- `app/mychat/BookingsDayView.tsx` — new: "Today" timeline component (salon/makeup detail card).
- `app/mychat/SpaceClient.tsx` — modify: add `dayview` detail card to `services` tile, gated to
  salon/makeup; add `renderTileDetailBody` case.
- `lib/whatsapp.ts` — modify: add `buildBookingReminderMessage`, `buildBookingInteractiveMessage`,
  `sendWhatsAppInteractiveMessage` (buttons), `parseInteractiveReply` helper.
- `inngest/booking-reminders.ts` — new: daily cron, copies `hearing-reminders.ts` shape.
- `app/api/inngest/route.ts` — modify: register `bookingRemindersFunction`.
- `app/api/whatsapp/webhook/route.ts` — modify: parse button/keyword replies, resolve booking,
  apply CONFIRM/CANCEL/RESCHEDULE.
- `e2e/booking-dayview.spec.ts` — new: Playwright e2e for the day-view + duration flow.

---

### Task 1: Schema — duration, start_at, no-show, reminder dedupe

**Files:**
- Create: `supabase/migrations/20260719000001_booking_duration.sql`

**Interfaces:**
- Produces: `bookings.start_at timestamptz`, `bookings.duration_min int`,
  `bookings.end_at` (generated, `start_at + duration_min * interval '1 minute'`),
  `bookings.reminder_24h_sent_at timestamptz`, `bookings.reminder_2h_sent_at timestamptz`,
  status enum extended with `'no_show'`. Legacy columns `client_name`, `client_phone`,
  `service_requested`, `requested_slot` become nullable (still exist, no longer required).
  `client_email` stays as-is (CLAUDE.md confirms it's the live email column the dashboard reads —
  do not touch it). Also produces `notifications.booking_id uuid` (FK to `bookings.id`) — required
  by Task 5/7's cron and webhook, which insert `booking_id` into `notifications`; that column
  doesn't exist on the current table (confirmed via pre-flight scan: `notifications` today only has
  `id, provider_id, student_id, type, channel, recipient, body, status, sent_at`).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260719000001_booking_duration.sql
-- Adds duration-aware scheduling to bookings (salon/makeup vertical build) and a
-- no_show status. Backfills start_at from the legacy preferred_date/preferred_slot
-- free-text fields on a best-effort basis; NULL where unparseable (free-text
-- requests with no slot chosen) — the day-view simply won't show those until the
-- owner sets a duration/time on accept, which now also sets start_at explicitly.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_min int,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz;

-- end_at is derived, not stored redundantly by hand — generated column keeps it
-- always consistent with start_at + duration_min.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS end_at timestamptz
  GENERATED ALWAYS AS (start_at + (duration_min || ' minutes')::interval) STORED;

-- Extend status check to include no_show (Step 2 of the build spine).
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','accepted','rejected','cancelled','onhold','no_show'));

-- Drop NOT NULL on legacy columns — CLAUDE.md: "unused, do not write to them."
-- Columns are kept (existing rows still have data) but no longer required for new inserts.
ALTER TABLE bookings ALTER COLUMN client_name DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN client_phone DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN service_requested DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN requested_slot DROP NOT NULL;

-- Index for the day-view query (provider's bookings for a date range, ordered by time).
CREATE INDEX IF NOT EXISTS idx_bookings_provider_start
  ON bookings (provider_id, start_at)
  WHERE start_at IS NOT NULL;

-- Index for the reminder cron's window scan.
CREATE INDEX IF NOT EXISTS idx_bookings_start_status
  ON bookings (start_at, status)
  WHERE status = 'accepted';

-- Task 5/7's reminder cron and webhook logging both write notifications.booking_id,
-- which doesn't exist yet (pre-flight scan found this — notifications only has
-- provider_id/student_id today). Add it here since Task 1 already owns schema changes.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id);
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` (or the project's existing migration-apply command — check
`package.json`/README for the exact one; there is no `db:migrate` script defined today, so
confirm with whichever Supabase CLI workflow the project already uses for prior migrations
in `supabase/migrations/`).

Expected: migration applies with no errors; `\d bookings` in `psql` (or the Supabase table
editor) shows `start_at`, `duration_min`, `end_at`, `reminder_24h_sent_at`,
`reminder_2h_sent_at` columns and the updated status check constraint.

- [ ] **Step 3: Manual verification query**

Run in Supabase SQL editor:
```sql
insert into bookings (provider_id, customer_name, customer_phone, service, status)
values ('<any existing provider_id>', 'Test Customer', '+15551234567', 'Haircut', 'pending')
returning id, start_at, duration_min, end_at;
```
Expected: insert succeeds (no NOT NULL violation on legacy columns), `start_at`/`duration_min`/
`end_at` are NULL. Then:
```sql
update bookings set start_at = now(), duration_min = 30 where id = '<returned id>' returning end_at;
```
Expected: `end_at` = `start_at + 30 minutes`, computed automatically.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260719000001_booking_duration.sql
git commit -m "feat(bookings): add duration-aware scheduling + no_show status"
```

---

### Task 2: Stop writing legacy columns; compute start_at on booking creation

**Files:**
- Modify: `app/api/booking/route.ts`

**Interfaces:**
- Consumes: `bookings.start_at`, `duration_min` from Task 1.
- Produces: booking insert no longer writes `client_name`/`client_phone`/`service_requested`/
  `requested_slot`. `preferred_slot` (a free-text label like "9:00 AM") is parsed into a
  best-effort `start_at` when possible; left NULL otherwise (owner sets it on Accept in Task 3).

- [ ] **Step 1: Add a slot-label parser helper and remove legacy column writes**

Edit `app/api/booking/route.ts` — replace the insert block (originally lines 57-76):

```ts
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
```

Note: `client_email` is kept — CLAUDE.md and the exploration confirm the dashboard's GET/PATCH
read `client_email`, not `customer_email`. This is not legacy debt, it's the live column; only
`client_name`/`client_phone`/`service_requested`/`requested_slot` are the dead legacy writes
being removed (they duplicated `customer_name`/`customer_phone`/`service`/`preferred_slot`).

- [ ] **Step 2: Manual verification**

Run the dev server (`npm run dev`) and submit a booking through a real provider's public page
booking form (pick a date + slot). Then check in Supabase:
```sql
select customer_name, client_email, service, preferred_date, preferred_slot, start_at,
       client_name, client_phone, service_requested, requested_slot
from bookings order by created_at desc limit 1;
```
Expected: `customer_name`/`client_email`/`service`/`preferred_date`/`preferred_slot`/`start_at`
populated; `client_name`/`client_phone`/`service_requested`/`requested_slot` are NULL (no longer
written) and `client_email` is populated with the submitted email.

- [ ] **Step 3: Commit**

```bash
git add app/api/booking/route.ts
git commit -m "fix(bookings): stop writing legacy columns, compute start_at from slot label"
```

---

### Task 3: Duration picker on Accept + day-view API support

**Files:**
- Modify: `app/api/mychat/bookings/route.ts`
- Modify: `app/mychat/BookingsTab.tsx`

**Interfaces:**
- Consumes: `bookings.start_at`, `duration_min`, `end_at` (Task 1).
- Produces: `PATCH /api/mychat/bookings` accepts optional `startAt` (ISO string) and
  `durationMin` (number) alongside `status`; writes them when status is `'accepted'`.
  `GET /api/mychat/bookings` returns `start_at`, `duration_min`, `end_at` per booking.
  `BookingsTab` exposes `onAccept(bookingId, startAt, durationMin)` via an inline
  date/time + duration form show only when accepting a `pending`/`onhold` booking that has
  no `start_at` yet (i.e. came in as a free-text request or via slot-label parse failure).

- [ ] **Step 1: Extend the PATCH/GET API**

Edit `app/api/mychat/bookings/route.ts` — extend the GET select (line 31) and PATCH body:

```ts
  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('id, created_at, customer_name, client_email, customer_phone, service, preferred_date, preferred_slot, start_at, duration_min, end_at, message, status')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(100)
```

```ts
export async function PATCH(req: Request) {
  const body = await req.json()
  const { providerId, bookingId, status, startAt, durationMin } = body

  if (!providerId || !bookingId || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const allowed = ['accepted', 'rejected', 'cancelled', 'onhold', 'no_show']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch booking before updating so we have customer details + slot info
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('customer_name, client_email, service, preferred_date, preferred_slot, start_at, duration_min')
    .eq('id', bookingId)
    .eq('provider_id', providerId)
    .single()

  const update: Record<string, unknown> = { status, status_updated_at: new Date().toISOString() }
  if (status === 'accepted') {
    if (startAt) update.start_at = startAt
    if (durationMin) update.duration_min = durationMin
    // Overlap check: reject if this block collides with another accepted booking.
    if (update.start_at && (update.duration_min ?? booking?.duration_min)) {
      const durMin = (update.duration_min ?? booking?.duration_min) as number
      const newStart = new Date(update.start_at as string)
      const newEnd = new Date(newStart.getTime() + durMin * 60000)
      const { data: existing } = await supabaseAdmin
        .from('bookings')
        .select('id, start_at, end_at')
        .eq('provider_id', providerId)
        .eq('status', 'accepted')
        .neq('id', bookingId)
        .not('start_at', 'is', null)
      const collision = (existing ?? []).some(b => {
        const bStart = new Date(b.start_at as string)
        const bEnd = new Date(b.end_at as string)
        return newStart < bEnd && newEnd > bStart
      })
      if (collision) {
        return NextResponse.json({ error: 'That time overlaps an existing accepted booking' }, { status: 409 })
      }
    }
  }

  const { error } = await supabaseAdmin
    .from('bookings')
    .update(update)
    .eq('id', bookingId)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
```

(The rest of the function — slot restore, student auto-create, customer email — is unchanged;
keep it exactly as-is below this block.)

- [ ] **Step 2: Add the duration picker to BookingsTab**

Edit `app/mychat/BookingsTab.tsx` — add local state for the accept form and wire it into the
existing Accept button. Insert after the `Booking` interface (extend it) and before
`STATUS_STYLES`:

```ts
interface Booking {
  id: string
  created_at: string
  customer_name: string
  customer_phone: string
  client_email: string | null
  service: string
  preferred_date: string | null
  preferred_slot: string | null
  start_at: string | null
  duration_min: number | null
  message: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'onhold' | 'no_show'
}
```

Replace `updateStatus` and the Accept button block with a version that collects start/duration
when accepting a booking that has no `start_at` yet:

```ts
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [acceptDate, setAcceptDate]   = useState('')
  const [acceptTime, setAcceptTime]   = useState('')
  const [acceptDuration, setAcceptDuration] = useState(30)

  async function updateStatus(bookingId: string, status: string, startAt?: string, durationMin?: number) {
    setUpdating(bookingId)
    try {
      const res = await fetch('/api/mychat/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, bookingId, status, startAt, durationMin }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Could not update booking')
        return
      }
      setBookings(prev => {
        const updated = prev.map(b => b.id === bookingId ? { ...b, status: status as Booking['status'] } : b)
        onPendingCount?.(updated.filter(b => b.status === 'pending').length)
        return updated
      })
      setAcceptingId(null)
    } finally {
      setUpdating(null)
    }
  }

  function startAccept(b: Booking) {
    if (b.start_at) {
      // Already has a parsed time from the slot picker — accept directly.
      updateStatus(b.id, 'accepted')
      return
    }
    setAcceptingId(b.id)
    setAcceptDate(b.preferred_date ?? new Date().toISOString().slice(0, 10))
    setAcceptTime('10:00')
    setAcceptDuration(30)
  }

  function confirmAccept(bookingId: string) {
    const startAt = new Date(`${acceptDate}T${acceptTime}:00`).toISOString()
    updateStatus(bookingId, 'accepted', startAt, acceptDuration)
  }
```

Replace the Accept/Hold/Decline button block (original lines 211-235) with:

```tsx
            {(b.status === 'pending' || b.status === 'onhold') ? (
              acceptingId === b.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="date" value={acceptDate} onChange={e => setAcceptDate(e.target.value)}
                      className="flex-1 text-xs border border-[#E5E5E5] rounded-lg px-2 py-1.5" />
                    <input type="time" value={acceptTime} onChange={e => setAcceptTime(e.target.value)}
                      className="flex-1 text-xs border border-[#E5E5E5] rounded-lg px-2 py-1.5" />
                    <select value={acceptDuration} onChange={e => setAcceptDuration(Number(e.target.value))}
                      className="text-xs border border-[#E5E5E5] rounded-lg px-2 py-1.5">
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hr</option>
                      <option value={90}>1.5 hr</option>
                      <option value={180}>3 hr</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button disabled={updating === b.id} onClick={() => confirmAccept(b.id)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#0D0D0D] text-white hover:opacity-80 disabled:opacity-40">
                      {updating === b.id ? '…' : 'Confirm time & accept'}
                    </button>
                    <button onClick={() => setAcceptingId(null)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold border border-[#E5E5E5] text-[#666]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    disabled={updating === b.id}
                    onClick={() => startAccept(b)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#0D0D0D] text-white hover:opacity-80 disabled:opacity-40 transition-opacity">
                    {updating === b.id ? '…' : 'Accept'}
                  </button>
                  <button
                    disabled={updating === b.id}
                    onClick={() => updateStatus(b.id, 'onhold')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border disabled:opacity-40 transition-colors ${
                      b.status === 'onhold'
                        ? 'border-[#F59E0B] text-[#9A5F00] bg-[#FFF7ED]'
                        : 'border-[#E5E5E5] text-[#666] hover:border-[#F59E0B] hover:text-[#9A5F00]'
                    }`}>
                    Hold
                  </button>
                  <button
                    disabled={updating === b.id}
                    onClick={() => updateStatus(b.id, 'rejected')}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[#E5E5E5] text-[#666] hover:border-[#DC2626] hover:text-[#DC2626] disabled:opacity-40 transition-colors">
                    Decline
                  </button>
                </div>
              )
            ) : b.status === 'accepted' ? (
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, sign in as a test provider, open My Services → Consultations. Accept a
pending booking with no `start_at` — the duration picker should appear; confirm a time; verify
the booking now shows `accepted` and (via Supabase) has `start_at`/`duration_min`/`end_at` set.
Try accepting a second booking with an overlapping time for the same provider — expect the
409 "overlaps" error surfaced via `alert()`.

- [ ] **Step 4: Commit**

```bash
git add app/api/mychat/bookings/route.ts app/mychat/BookingsTab.tsx
git commit -m "feat(bookings): duration picker on accept + overlap prevention"
```

---

### Task 4: "Today" day-view for salon/makeup

**Files:**
- Create: `app/mychat/BookingsDayView.tsx`
- Modify: `app/mychat/SpaceClient.tsx`

**Interfaces:**
- Consumes: `GET /api/mychat/bookings` (Task 3, now returns `start_at`/`duration_min`).
- Produces: `BookingsDayView({ providerId }: { providerId: string })` — a component rendering
  today's `accepted` bookings sorted by `start_at`, with a WhatsApp tap-through per row.

- [ ] **Step 1: Create the day-view component**

```tsx
// app/mychat/BookingsDayView.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Booking {
  id: string
  customer_name: string
  customer_phone: string
  service: string
  start_at: string | null
  duration_min: number | null
  status: string
}

function waLink(phone: string, name: string) {
  const num = phone.replace(/\D/g, '')
  return `https://wa.me/${num}?text=Hi%20${encodeURIComponent(name)}!`
}

function formatTimeRange(startAt: string, durationMin: number | null): string {
  const start = new Date(startAt)
  const startLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (!durationMin) return startLabel
  const end = new Date(start.getTime() + durationMin * 60000)
  const endLabel = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${startLabel} – ${endLabel}`
}

export default function BookingsDayView({ providerId }: { providerId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/mychat/bookings?providerId=${providerId}`)
      const data = await res.json()
      const list: Booking[] = data.bookings ?? []
      const todayStr = new Date().toDateString()
      const today = list
        .filter(b => b.status === 'accepted' && b.start_at && new Date(b.start_at).toDateString() === todayStr)
        .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())
      setBookings(today)
    } finally {
      setLoading(false)
    }
  }, [providerId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#bbb] text-sm">Loading today…</div>
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <p className="font-semibold text-[#0D0D0D] text-sm">Nothing booked today</p>
        <p className="text-[#999] text-xs mt-1">Accepted appointments with a confirmed time show up here.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <p className="text-xs text-[#999] font-semibold uppercase tracking-wide mb-4">
        {bookings.length} appointment{bookings.length !== 1 ? 's' : ''} today
      </p>
      <div className="space-y-3">
        {bookings.map(b => (
          <a
            key={b.id}
            href={waLink(b.customer_phone, b.customer_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 bg-white border border-[#E5E5E5] rounded-2xl p-4 hover:border-[#25D366] transition-colors">
            <div>
              <p className="font-semibold text-[#0D0D0D] text-sm">{b.customer_name}</p>
              <p className="text-xs text-[#666] mt-0.5">{b.service}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-[#0D0D0D]">{formatTimeRange(b.start_at!, b.duration_min)}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into SpaceClient's services tile, gated to salon/makeup**

Edit `app/mychat/SpaceClient.tsx` — add the import near the other tab imports (after
`BookingsTab` import, line 23):

```ts
import BookingsDayView from './BookingsDayView'
```

Edit `getTileDetailCards`'s `services` case (line 247-257) to add the gated card, following the
exact pattern already used for `persona === 'advocate'` at line 251-253:

```ts
    case 'services':
      return [
        { key: 'services', icon: '\u{1F6E0}️', title: 'Services & pricing', description: 'What you offer and what it costs' },
        { key: 'inbox', icon: '\u{1F4E5}', title: 'Messages', description: 'Inbox from your page visitors' },
        ...(persona === 'advocate'
          ? [{ key: 'email', icon: '✉️', title: 'Email', description: 'Connected email inbox' }]
          : []),
        ...(persona === 'salon' || persona === 'makeup'
          ? [{ key: 'dayview', icon: '\u{1F4C6}', title: 'Today', description: "Today's appointment timeline" }]
          : []),
        { key: 'consultations', icon: '\u{1F4C5}', title: 'Consultations', description: 'Booking requests' },
        { key: 'clients', icon: '\u{1F465}', title: 'Clients', description: 'Your client and matter roster' },
        { key: 'schedule', icon: '\u{1F553}', title: 'Schedule', description: 'Hours and availability' },
      ]
```

Add the render case inside `renderTileDetailBody`'s `tile === 'services'` switch, alongside the
existing `case 'consultations':` (near line 700):

```tsx
        case 'dayview':
          return (
            <div className="flex-1 overflow-y-auto">
              <BookingsDayView providerId={providerId} />
            </div>
          )
```

- [ ] **Step 3: Manual verification**

`npm run dev`, sign in as a provider whose `persona` is `salon` or `makeup` (check/set via the
`providers` table if no such test account exists yet). Confirm the "Today" card appears in My
Services alongside Consultations; tapping it shows accepted bookings with a `start_at` of today,
sorted by time, with a working WhatsApp tap-through. Sign in as a non-salon persona (e.g. tutor)
and confirm the card does NOT appear.

- [ ] **Step 4: Commit**

```bash
git add app/mychat/BookingsDayView.tsx app/mychat/SpaceClient.tsx
git commit -m "feat(bookings): add salon/makeup Today day-view"
```

---

### Task 5: WhatsApp reminder cron

**Files:**
- Modify: `lib/whatsapp.ts`
- Create: `inngest/booking-reminders.ts`
- Modify: `app/api/inngest/route.ts`

**Interfaces:**
- Consumes: `bookings.start_at`, `duration_min`, `reminder_24h_sent_at`, `reminder_2h_sent_at`
  (Task 1); `sendWhatsAppMessage` (existing).
- Produces: `buildBookingReminderMessage(opts): string` in `lib/whatsapp.ts`; exported
  `bookingRemindersFunction` Inngest function, registered in the serve handler.

- [ ] **Step 1: Add the reminder message builder**

Append to `lib/whatsapp.ts`:

```ts
/** Reminder sent to a customer ahead of their accepted booking. */
export function buildBookingReminderMessage(opts: {
  customerName: string
  memberName: string
  service: string
  startAt: string
  windowLabel: '24 hours' | '2 hours'
}) {
  const when = new Date(opts.startAt).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
  return (
    `Hi ${opts.customerName}! Reminder: you have *${opts.service}* with ${opts.memberName} ` +
    `in *${opts.windowLabel}* — ${when}.\n\n` +
    `Reply *CONFIRM* to keep it, *CANCEL* to cancel, or *RESCHEDULE* to pick a new time.`
  )
}
```

- [ ] **Step 2: Write the cron, copying the hearing-reminders.ts shape**

```ts
// inngest/booking-reminders.ts — Daily cron: WhatsApp reminders for accepted bookings.
//
// Cron: hourly (bookings have specific times, unlike hearing dates which are whole days —
// an hourly check keeps the 24h/2h windows accurate without a wide miss window).
//
// Two reminder windows per run, checked against each accepted booking's start_at:
//   24h: start_at is 23.5-24.5h from now AND reminder_24h_sent_at is null
//   2h:  start_at is 1.5-2.5h from now  AND reminder_2h_sent_at is null
//
// Dedupe: the corresponding *_sent_at column is set after a successful send, so
// re-runs within the same window don't double-send.
// All sends are written to the notifications table regardless of success/failure.
//
// Registered in app/api/inngest/route.ts

import { inngest }       from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, buildBookingReminderMessage } from '@/lib/whatsapp'

async function sendRemindersForWindow(
  hoursOut: number,
  dedupeCol: 'reminder_24h_sent_at' | 'reminder_2h_sent_at',
  windowLabel: '24 hours' | '2 hours',
): Promise<number> {
  const now = new Date()
  const windowStart = new Date(now.getTime() + (hoursOut - 0.5) * 3600_000)
  const windowEnd   = new Date(now.getTime() + (hoursOut + 0.5) * 3600_000)

  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('id, customer_name, customer_phone, service, start_at, provider_id, providers!provider_id(first_name)')
    .eq('status', 'accepted')
    .is(dedupeCol, null)
    .gte('start_at', windowStart.toISOString())
    .lte('start_at', windowEnd.toISOString())

  if (error) {
    console.error(`[booking-reminders] query failed (${hoursOut}h):`, error.message)
    return 0
  }
  if (!bookings?.length) return 0

  let sent = 0
  for (const b of bookings) {
    const provider = b.providers as unknown as { first_name: string } | null
    const msg = buildBookingReminderMessage({
      customerName: b.customer_name,
      memberName:   provider?.first_name ?? 'your provider',
      service:      b.service,
      startAt:      b.start_at as string,
      windowLabel,
    })
    const res = await sendWhatsAppMessage({ to: b.customer_phone, text: msg })
    await supabaseAdmin.from('notifications').insert({
      provider_id: b.provider_id,
      booking_id:  b.id,
      type:        `booking_reminder_${hoursOut}h`,
      channel:     'whatsapp',
      recipient:   b.customer_phone,
      body:        msg,
      status:      res.success ? 'sent' : 'failed',
    })
    if (res.success) sent++
    await supabaseAdmin.from('bookings').update({ [dedupeCol]: new Date().toISOString() }).eq('id', b.id)
  }

  console.log(`[booking-reminders] ${hoursOut}h window: sent ${sent} of ${bookings.length}`)
  return sent
}

export const bookingRemindersFunction = inngest.createFunction(
  { id: 'booking-reminders', name: 'Booking WhatsApp reminders' },
  { cron: '0 * * * *' },   // hourly
  async ({ step }) => {
    const cfg = await step.run('load-notification-config', async () => {
      const { data } = await supabaseAdmin
        .from('system_config')
        .select('value')
        .eq('key', 'notification_types_enabled')
        .single()
      return (data?.value ?? {}) as Record<string, boolean>
    })

    const enabled = cfg['booking_reminders'] !== false

    const sent24h = enabled
      ? await step.run('send-24h-reminders', () => sendRemindersForWindow(24, 'reminder_24h_sent_at', '24 hours'))
      : 0
    const sent2h = enabled
      ? await step.run('send-2h-reminders', () => sendRemindersForWindow(2, 'reminder_2h_sent_at', '2 hours'))
      : 0

    return { sent24h, sent2h }
  },
)
```

- [ ] **Step 3: Register the function**

Open `app/api/inngest/route.ts`, find the existing function list (it registers
`hearingRemindersFunction` etc.), and add:

```ts
import { bookingRemindersFunction } from '@/inngest/booking-reminders'
```

and add `bookingRemindersFunction` to the `functions: [...]` array passed to `serve(...)`,
alongside the existing entries.

- [ ] **Step 4: Manual verification**

Using the Inngest dev server (`npx inngest-cli dev`, per this project's existing Inngest local
workflow — check README/CLAUDE.md if a different command is documented), manually trigger
`booking-reminders`. Before triggering, set a test booking's `start_at` to ~24h from now and
`status = 'accepted'`. Confirm: one WhatsApp message sent (check `notifications` table row and,
if a real test WhatsApp number is configured, the actual message), `reminder_24h_sent_at` set.
Re-trigger the function — confirm no duplicate send (dedupe works). Flip
`system_config.notification_types_enabled.booking_reminders` to `false` — confirm no send.

- [ ] **Step 5: Commit**

```bash
git add lib/whatsapp.ts inngest/booking-reminders.ts app/api/inngest/route.ts
git commit -m "feat(bookings): hourly WhatsApp reminder cron for accepted bookings"
```

---

### Task 6: No-show tracking from the day-view

**Files:**
- Modify: `app/mychat/BookingsDayView.tsx`

**Interfaces:**
- Consumes: `PATCH /api/mychat/bookings` with `status: 'no_show'` (already allowed by Task 3's
  API change).
- Produces: a "Mark no-show" action per row in the day-view for past-time appointments.

- [ ] **Step 1: Add the no-show action**

Edit `app/mychat/BookingsDayView.tsx` — add an `updating` state and a mark-no-show handler,
and render the action only for rows whose `start_at` has passed:

```tsx
  const [updating, setUpdating] = useState<string | null>(null)

  async function markNoShow(providerId: string, bookingId: string) {
    setUpdating(bookingId)
    try {
      await fetch('/api/mychat/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, bookingId, status: 'no_show' }),
      })
      setBookings(prev => prev.filter(b => b.id !== bookingId))
    } finally {
      setUpdating(null)
    }
  }
```

Replace the `<a>` row wrapper with a `<div>` containing both the WhatsApp link and a no-show
button, only showing the button once `start_at` is in the past:

```tsx
        {bookings.map(b => {
          const isPast = new Date(b.start_at!).getTime() < Date.now()
          return (
            <div key={b.id} className="flex items-center justify-between gap-3 bg-white border border-[#E5E5E5] rounded-2xl p-4">
              <a
                href={waLink(b.customer_phone, b.customer_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 hover:opacity-70 transition-opacity">
                <p className="font-semibold text-[#0D0D0D] text-sm">{b.customer_name}</p>
                <p className="text-xs text-[#666] mt-0.5">{b.service}</p>
              </a>
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <p className="text-xs font-semibold text-[#0D0D0D]">{formatTimeRange(b.start_at!, b.duration_min)}</p>
                {isPast && (
                  <button
                    disabled={updating === b.id}
                    onClick={() => markNoShow(providerId, b.id)}
                    className="text-[10px] font-semibold text-[#DC2626] hover:underline disabled:opacity-40">
                    {updating === b.id ? '…' : 'Mark no-show'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
```

- [ ] **Step 2: Manual verification**

Create a test accepted booking with `start_at` a few minutes in the past. Confirm the "Mark
no-show" button appears in the day-view, and clicking it removes the row and sets
`status = 'no_show'` in Supabase (check directly). Confirm a future booking shows no such button.

- [ ] **Step 3: Commit**

```bash
git add app/mychat/BookingsDayView.tsx
git commit -m "feat(bookings): mark no-show from the day-view"
```

---

### Task 7: Real WhatsApp reply loop (CONFIRM/CANCEL/RESCHEDULE)

**Files:**
- Modify: `lib/whatsapp.ts`
- Modify: `app/api/whatsapp/webhook/route.ts`

**Interfaces:**
- Consumes: `bookings` table (Task 1-3); `whatsapp_messages` dedupe (existing).
- Produces: `sendWhatsAppInteractiveMessage(opts)` in `lib/whatsapp.ts` (buttons); webhook
  parses inbound button-reply payloads AND plain-text keyword fallback, resolves the customer's
  most recent `accepted` booking by phone + provider, applies the action.

- [ ] **Step 1: Add interactive-button sending to lib/whatsapp.ts**

Append:

```ts
interface SendInteractiveOptions {
  to: string
  bodyText: string
  buttons: { id: string; title: string }[]   // max 3 — WhatsApp button-message limit
}

/** Send a WhatsApp interactive button message (max 3 buttons). */
export async function sendWhatsAppInteractiveMessage(
  opts: SendInteractiveOptions
): Promise<SendMessageResult> {
  try {
    const res = await fetch(WA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: opts.bodyText },
          action: {
            buttons: opts.buttons.slice(0, 3).map(b => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error("[whatsapp] Interactive API error:", body)
      return { success: false, error: JSON.stringify(body) }
    }

    const data = await res.json()
    return { success: true, messageId: data?.messages?.[0]?.id }
  } catch (err) {
    console.error("[whatsapp] Unexpected interactive error:", err)
    return { success: false, error: String(err) }
  }
}

/**
 * Parse an inbound WhatsApp booking-action reply — either an interactive button
 * tap (payload id: 'booking_confirm' | 'booking_cancel' | 'booking_reschedule')
 * or a plain-text keyword fallback ("confirm", "cancel", "reschedule",
 * case-insensitive, ignoring surrounding whitespace/punctuation).
 * Returns null if the text/payload doesn't match a known booking action.
 */
export function parseBookingReply(input: { buttonPayloadId?: string; text?: string }):
  'confirm' | 'cancel' | 'reschedule' | null {
  if (input.buttonPayloadId === 'booking_confirm')    return 'confirm'
  if (input.buttonPayloadId === 'booking_cancel')     return 'cancel'
  if (input.buttonPayloadId === 'booking_reschedule') return 'reschedule'

  const t = (input.text ?? '').trim().toLowerCase().replace(/[^a-z]/g, '')
  if (t === 'confirm' || t === 'yes' || t === 'accept') return 'confirm'
  if (t === 'cancel' || t === 'no')                     return 'cancel'
  if (t === 'reschedule' || t === 'resched')            return 'reschedule'
  return null
}
```

- [ ] **Step 2: Update reminder sends to use interactive buttons**

Edit `inngest/booking-reminders.ts`'s send call (from Task 5) to use the new interactive sender
instead of plain text, so replies are button taps by default (keyword remains a fallback for
clients whose WhatsApp client can't render buttons):

```ts
import { sendWhatsAppInteractiveMessage, buildBookingReminderMessage } from '@/lib/whatsapp'
```

Replace the `sendWhatsAppMessage({ to: b.customer_phone, text: msg })` call with:

```ts
    const res = await sendWhatsAppInteractiveMessage({
      to: b.customer_phone,
      bodyText: msg,
      buttons: [
        { id: 'booking_confirm',    title: 'Confirm' },
        { id: 'booking_cancel',     title: 'Cancel' },
        { id: 'booking_reschedule', title: 'Reschedule' },
      ],
    })
```

- [ ] **Step 3: Extend the webhook to parse and apply replies**

Edit `app/api/whatsapp/webhook/route.ts` — extend the inbound message loop (originally lines
63-93) to also handle `interactive` message types and apply booking actions:

```ts
import { parseBookingReply } from '@/lib/whatsapp'

// ... inside the POST handler, replace the message loop:

    for (const m of messages) {
      const msg = m as Record<string, unknown>

      const from      = msg.from as string
      const waId      = msg.id as string
      const tsSeconds = msg.timestamp ? parseInt(msg.timestamp as string, 10) : Math.floor(Date.now() / 1000)

      let text: string | undefined
      let buttonPayloadId: string | undefined

      if (msg.type === 'text') {
        text = (msg.text as Record<string, unknown>)?.body as string | undefined
      } else if (msg.type === 'interactive') {
        const interactive = msg.interactive as Record<string, unknown>
        const btnReply = interactive?.button_reply as Record<string, unknown> | undefined
        buttonPayloadId = btnReply?.id as string | undefined
        text = btnReply?.title as string | undefined
      } else {
        continue
      }
      if (!text) continue

      // Deduplicate by wa_message_id
      const { data: existing } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('id')
        .eq('wa_message_id', waId)
        .maybeSingle()

      if (existing) continue

      await supabaseAdmin.from('whatsapp_messages').insert({
        provider_id:    conn.provider_id,
        customer_phone: from,
        customer_name:  contactMap[from] ?? null,
        body:           text,
        direction:      'inbound',
        wa_message_id:  waId,
        read:           false,
        msg_timestamp:  new Date(tsSeconds * 1000).toISOString(),
      })

      // ── Booking reply handling ────────────────────────────────────────────
      const action = parseBookingReply({ buttonPayloadId, text })
      if (action) {
        const { data: booking } = await supabaseAdmin
          .from('bookings')
          .select('id, start_at')
          .eq('provider_id', conn.provider_id)
          .eq('customer_phone', from)
          .eq('status', 'accepted')
          .not('start_at', 'is', null)
          .order('start_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (booking) {
          if (action === 'confirm') {
            // Already accepted — confirm is a no-op acknowledgement, no status change needed.
            // (v1 doesn't have a separate "customer-confirmed" flag; accepted already implies it.)
          } else if (action === 'cancel') {
            await supabaseAdmin
              .from('bookings')
              .update({ status: 'cancelled', status_updated_at: new Date().toISOString() })
              .eq('id', booking.id)
          } else if (action === 'reschedule') {
            // v1: mark on_hold so the owner sees it needs attention; a full slot-picker-over-
            // WhatsApp reschedule flow is out of scope for this plan (see Out of scope).
            await supabaseAdmin
              .from('bookings')
              .update({ status: 'onhold', status_updated_at: new Date().toISOString() })
              .eq('id', booking.id)
          }
        }
      }
    }
```

- [ ] **Step 4: Manual verification**

Using a real (or Meta test) WhatsApp number connected via `whatsapp_connections`, send a booking
reminder (trigger the cron manually per Task 5) and reply by tapping "Cancel" on the interactive
message. Confirm: the booking's status flips to `cancelled` in Supabase, and the inbound
`whatsapp_messages` row is recorded (no duplicate on webhook retry — Meta retries deliveries).
Repeat with plain-text "cancel" typed instead of tapping — confirm the keyword fallback works
identically. Send an unrelated text ("hi") — confirm no booking is affected (parse returns null).

- [ ] **Step 5: Commit**

```bash
git add lib/whatsapp.ts inngest/booking-reminders.ts app/api/whatsapp/webhook/route.ts
git commit -m "feat(bookings): parse WhatsApp CONFIRM/CANCEL/RESCHEDULE replies"
```

---

### Task 8: Playwright e2e for the day-view + accept-with-duration flow

**Files:**
- Create: `e2e/booking-dayview.spec.ts`

**Interfaces:**
- Consumes: the running dev/staging app, a seeded test provider with `persona = 'salon'`.

- [ ] **Step 1: Write the e2e spec**

```ts
// e2e/booking-dayview.spec.ts
import { test, expect } from '@playwright/test'

// Requires a seeded test salon provider — see playwright.config.ts / e2e setup docs for
// how existing specs authenticate; reuse that same fixture/login helper rather than
// duplicating auth logic here. Adjust TEST_SLUG to the project's actual seeded fixture.
const TEST_SLUG = process.env.E2E_SALON_SLUG ?? 'test-salon'

test.describe('Salon bookings day-view', () => {
  test('accepting a booking with a duration shows it on Today', async ({ page }) => {
    await page.goto(`/${TEST_SLUG}/mykryla`)

    // Navigate: My Services tile -> Consultations
    await page.getByText('My Services').click()
    await page.getByText('Consultations').click()

    // Accept the first pending booking, setting a duration.
    const acceptButton = page.getByRole('button', { name: 'Accept' }).first()
    await acceptButton.click()
    await page.getByRole('button', { name: 'Confirm time & accept' }).click()

    // Navigate back and open the Today day-view.
    await page.getByText('← Consultations').click()
    await page.getByText('Today').click()

    // The accepted booking should now appear in the day-view timeline.
    await expect(page.locator('text=appointment today')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the e2e test**

Run: `npx playwright test e2e/booking-dayview.spec.ts`
Expected: PASS against a dev server with a seeded test salon provider and at least one
pending booking. If no seed fixture exists yet, this step surfaces that gap — flag it rather
than skip verification; a seed script for a test salon provider + one pending booking is a
reasonable prerequisite to add here if the project has no existing e2e seed convention.

- [ ] **Step 3: Commit**

```bash
git add e2e/booking-dayview.spec.ts
git commit -m "test(bookings): e2e coverage for accept-with-duration + day-view"
```

---

## Out of Scope (do not build in this plan)

- Paid deposits / no-show fees — waits for the ledger engine + Stripe/Razorpay UI.
- AI natural-language booking parsing — v2 layer on top of this deterministic loop.
- Full WhatsApp-native reschedule (picking a new slot via chat) — v1 marks `onhold` for owner
  follow-up; a chat-driven slot picker is a follow-on plan.
- Recurrence-from-hours auto-slot generation, per-service duration catalog, multi-staff
  resources, timezone normalization beyond `timestamptz` storage.
- Physio/tiffin replication — extract shared pieces only after this salon build is live and proven.

## Final Verification (whole feature, end-to-end)

1. Book via a salon provider's public page → Accept in MyKryla with a duration → appears
   correctly ordered on Today, at the right time; a colliding accept is rejected with a clear error.
2. An accepted booking ~24h out triggers exactly one WhatsApp reminder with buttons; re-running
   the cron sends no duplicate; the `system_config` kill switch stops sends when disabled.
3. Tapping "Cancel" on a reminder cancels the booking and it disappears from Today; tapping
   "Reschedule" puts it on hold for the owner; a stray unrelated text does not affect any booking.
4. A past-time accepted booking can be marked no-show from Today and disappears from the list.
5. Legacy `client_name`/`client_phone`/`service_requested`/`requested_slot` columns receive no
   new writes from `/api/booking/route.ts` (spot-check the most recent rows in Supabase).
