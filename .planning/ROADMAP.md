# Roadmap — WhatsApp Integration

**3 phases** | **26 requirements mapped** | All v1 requirements covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 1 | Foundation | wa.me on public pages + member notifications | ONB-01, ONB-02, PUB-01, PUB-02, PUB-03, NOT-01, NOT-02, NOT-03, NOT-04 | 3 |
| 2 | Inbox & Webhook | Business API inbox in My Space | WHK-01, WHK-02, WHK-03, WHK-04, MSG-01, MSG-02, MSG-03, MSG-04, MSG-05, MSG-06 | 4 |
| 3 | Settings & Upgrade | WhatsApp settings panel + upgrade path | SET-01, SET-02, SET-03, SET-04, UPG-01, UPG-02, UPG-03, UPG-04 | 3 |

---

### Phase 1: Foundation
**Goal:** Every member gets a working WhatsApp contact button on their public page. Members receive WhatsApp notifications from Kryla when a booking arrives or their page goes live.
**Mode:** mvp

**Requirements:** ONB-01, ONB-02, PUB-01, PUB-02, PUB-03, NOT-01, NOT-02, NOT-03, NOT-04

**Success Criteria:**
1. A visitor on a member's public page can tap the WhatsApp button and land in WhatsApp with a pre-filled message
2. A member whose WhatsApp is set to confidential has no WhatsApp button on their public page
3. When a booking is submitted, the member receives a WhatsApp message on their personal number via Kryla's Business API

**DB changes:**
- Add `whatsapp_public` boolean to `providers` table (default true for existing members who provided a number)

**Files to touch:**
- `app/onboarding/page.tsx` — add opt-in toggle in step 3
- `app/[slug]/components/sections/ContactSection.tsx` — add WhatsApp button to all contact variants
- `app/[slug]/components/sections/HeroSection.tsx` — optional WhatsApp CTA
- `inngest/build-page.ts` — fire notification on page live
- `app/api/booking/route.ts` — fire notification on booking received
- `app/api/notify/` — implement `booking-received.ts` and `page-live.ts` using Kryla's WHATSAPP_PHONE_NUMBER_ID

---

### Phase 2: Inbox & Webhook
**Goal:** Members on Sprout+ who have connected their WhatsApp Business API can receive and reply to customer messages from inside My Space. Messages arrive in real time via Supabase Realtime.
**Mode:** mvp

**Requirements:** WHK-01, WHK-02, WHK-03, WHK-04, MSG-01, MSG-02, MSG-03, MSG-04, MSG-05, MSG-06

**Success Criteria:**
1. A customer taps the WhatsApp button on a member's page, sends a message, and it appears in the member's My Space Messages tab within 3 seconds
2. A member types a reply in My Space and the customer receives it in WhatsApp
3. Conversations are grouped by customer phone number in thread view
4. Unread message count badge updates in real time on the Messages tab

**DB changes:**
- New `whatsapp_messages` table: `id`, `provider_id`, `customer_phone`, `customer_name`, `body`, `direction` (inbound/outbound), `timestamp`, `read`, `wa_message_id`
- New `whatsapp_connections` table: `provider_id`, `phone_number_id`, `access_token`, `display_phone_number`, `connected_at`

**Files to touch:**
- `app/api/whatsapp/webhook/route.ts` — new: Meta verification + inbound message handler
- `app/my-space/SpaceClient.tsx` — add Messages tab (Sprout+ + Business API connected)
- `app/[slug]/components/MySpacePanel.tsx` — mirror Messages tab (keep in sync)
- `app/my-space/MessagesTab.tsx` — new: inbox UI with Supabase Realtime
- `app/api/my-space/whatsapp-reply/route.ts` — new: send reply via member's Business API

---

### Phase 3: Settings & Upgrade
**Goal:** Members can manage their WhatsApp settings (visibility, Business API connection) from My Space. Seed members see an upgrade prompt. Sprout+ members see usage stats and a verification nudge at 80% of daily limit.
**Mode:** mvp

**Requirements:** SET-01, SET-02, SET-03, SET-04, UPG-01, UPG-02, UPG-03, UPG-04

**Success Criteria:**
1. A member can connect their WhatsApp Business API credentials in My Space and see their connection status update
2. A Seed plan member sees a Business WhatsApp add-on card in My Plan tab
3. A Business API member at 80% of daily conversations sees a nudge to verify their Meta Business account

**Files to touch:**
- `app/my-space/SpaceClient.tsx` — WhatsApp settings section in Edit profile or new WhatsApp tab
- `app/[slug]/components/MySpacePanel.tsx` — mirror (keep in sync)
- `app/my-space/WhatsAppSettingsTab.tsx` — new: connect/disconnect, visibility toggle, usage meter
- `app/my-space/PlanTab.tsx` — add Business WhatsApp add-on card
- `app/api/my-space/whatsapp-connect/route.ts` — new: save/delete Business API credentials

---

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| ONB-01 | 1 |
| ONB-02 | 1 |
| PUB-01 | 1 |
| PUB-02 | 1 |
| PUB-03 | 1 |
| NOT-01 | 1 |
| NOT-02 | 1 |
| NOT-03 | 1 |
| NOT-04 | 1 |
| WHK-01 | 2 |
| WHK-02 | 2 |
| WHK-03 | 2 |
| WHK-04 | 2 |
| MSG-01 | 2 |
| MSG-02 | 2 |
| MSG-03 | 2 |
| MSG-04 | 2 |
| MSG-05 | 2 |
| MSG-06 | 2 |
| SET-01 | 3 |
| SET-02 | 3 |
| SET-03 | 3 |
| SET-04 | 3 |
| UPG-01 | 3 |
| UPG-02 | 3 |
| UPG-03 | 3 |
| UPG-04 | 3 |
