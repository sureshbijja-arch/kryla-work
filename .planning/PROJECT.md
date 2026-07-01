# kryla.work — WhatsApp Integration

## What This Is

Full-scale WhatsApp integration for kryla.work members. Every member gets a `wa.me/` contact button on their public page (all plans). Members on Sprout+ can upgrade to connect their own WhatsApp Business API account, unlocking a live inbox in My Space where they manage customer conversations without leaving the dashboard.

**Core value:** A member's customers can reach them via WhatsApp from the public page, and the member handles all replies inside My Space — no app-switching.

## Context

- **Codebase:** Next.js 14 App Router, Supabase (Postgres + Realtime), Inngest, Vercel
- **Repo:** github.com/sureshbijja-arch/kryla-work — branch `master`
- **Existing WhatsApp hooks:** `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` in env (Kryla's own Business number, currently unused). `/api/notify/build-failed` exists as a stub.
- **Members:** 9 personas (baker, chef, salon, doctor, tutor, trainer, photographer, musician, other). All have `whatsapp_number` stored at onboarding.
- **My Space tabs today:** Edit profile | Services | Page layout | Bookings | My plan
- **Plan tiers:** seed / sprout / grow / thrive / elevate

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| wa.me for Seed (always) | Personal WhatsApp and Business API are mutually exclusive on same number — no API integration possible without a separate business number | wa.me link on public page for all plans; inbox only for Business API members |
| Customer always initiates first | Avoids Meta template approval bottleneck for outbound messages; 24-hour free window covers all reply flows | WhatsApp button pre-fills message so customer sends first |
| Supabase as webhook buffer | No complex live routing between Meta webhook and member sessions; messages land in DB, My Space subscribes via Realtime | Single webhook endpoint → `whatsapp_messages` table → Supabase Realtime in My Space |
| Business API as Sprout+ add-on | Reduces onboarding friction for small operators; most (seed plan) never need it | Shown as upgrade card in My Space → My Plan; encouraged but not required |
| Kryla's own number for member notifications | Kryla can send booking alerts and build-complete messages to members using Kryla's existing Business API credentials | Members receive Kryla notifications on their personal number; separate from their own Business API |
| Pre-approve 3 templates at Kryla level | Covers edge cases where 24h window has closed; members reuse Kryla-level templates | `booking_confirmed`, `order_update`, `followup` templates approved once |

## Two-Tier Architecture

### Tier 1 — wa.me (All plans including Seed)
- Public page: WhatsApp contact button → `wa.me/{number}?text=Hi, I found you on kryla.work...`
- Onboarding: opt-in toggle (show number publicly / keep confidential)
- Confidential = button hidden on public page, number still used for Kryla→member notifications
- No inbox, no API, no Meta account needed

### Tier 2 — Business API (Sprout+ add-on)
- Member connects their Meta Business account (Phone Number ID + Access Token) in My Space
- My Space gains a **Messages** tab: live inbox with Supabase Realtime
- My Space gains a **WhatsApp** settings panel: connect/disconnect, usage meter, notification prefs
- Webhook at `/api/whatsapp/webhook` routes incoming messages by `phone_number_id` → `whatsapp_messages` table
- Member replies sent via their own Business API credentials (stored per-member in DB)
- Volume meter shows conversations used / daily limit; nudges business verification at 80%

## Requirements

### Validated
- ✓ `whatsapp_number` collected at onboarding — existing
- ✓ Kryla Business API env vars present (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`) — existing
- ✓ `/api/booking` exists with `notification_sent` flag — existing
- ✓ Bookings table has `notification_sent`, `confirmation_sent` columns — existing

### Active
- [ ] wa.me button on all public pages (opt-in at onboarding)
- [ ] Onboarding opt-in toggle: show WhatsApp publicly / keep confidential
- [ ] Kryla → member notifications via Kryla's Business API (booking received, page live)
- [ ] My Space: WhatsApp settings panel (connect Business API, show/hide number)
- [ ] My Space: Messages inbox tab (Business API members, Sprout+)
- [ ] Webhook endpoint + Supabase routing layer
- [ ] Pre-approved message templates (3)
- [ ] Usage meter + business verification nudge in My Space
- [ ] Business API as add-on upgrade card in My Plan tab

### Out of Scope
- WhatsApp for Kryla's own customer support — not this milestone
- Member broadcasting to all customers — not this milestone
- WhatsApp payments — not this milestone
- Meta BSP certification — members manage their own Meta Business accounts

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active

---
*Last updated: 2026-06-30 after initialization*
