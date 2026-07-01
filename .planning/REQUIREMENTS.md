# Requirements — WhatsApp Integration

## v1 Requirements

### Onboarding
- [ ] **ONB-01**: Member can opt in to show WhatsApp number publicly on their page during onboarding step 3
- [ ] **ONB-02**: Member can keep WhatsApp number confidential (hidden from public page, used for backend notifications only)

### Public Page
- [ ] **PUB-01**: Public page shows a WhatsApp contact button when member opted in (all plans)
- [ ] **PUB-02**: WhatsApp button pre-fills message: "Hi, I found you on kryla.work — I'd like to enquire about [page headline]"
- [ ] **PUB-03**: WhatsApp button is hidden when member chose confidential

### Kryla → Member Notifications (Kryla's Business API)
- [ ] **NOT-01**: Member receives WhatsApp message from Kryla when a new booking is submitted on their page
- [ ] **NOT-02**: Member receives WhatsApp message from Kryla when their page goes live (build complete)
- [ ] **NOT-03**: Notification messages use pre-approved Kryla templates (`booking_received`, `page_live`)
- [ ] **NOT-04**: Notifications only sent if member has a stored `whatsapp_number`

### WhatsApp Settings (My Space — all plans)
- [ ] **SET-01**: Member can toggle WhatsApp number visibility (public / confidential) from My Space settings
- [ ] **SET-02**: Sprout+ member can connect their Meta Business account (enter Phone Number ID + Access Token)
- [ ] **SET-03**: Member can disconnect their Business API connection
- [ ] **SET-04**: Member sees their current connection status (personal wa.me / Business API connected)

### Messages Inbox (My Space — Sprout+ with Business API connected)
- [ ] **MSG-01**: Member sees incoming WhatsApp messages from customers in a Messages tab
- [ ] **MSG-02**: Messages update in real time without page refresh (Supabase Realtime)
- [ ] **MSG-03**: Member can reply to a customer message from inside My Space
- [ ] **MSG-04**: Conversations are grouped by customer phone number (thread view)
- [ ] **MSG-05**: Member sees timestamp and read/unread state per message
- [ ] **MSG-06**: Unread message count shown as badge on Messages tab

### Webhook & Routing
- [ ] **WHK-01**: `/api/whatsapp/webhook` handles Meta verification challenge (GET)
- [ ] **WHK-02**: Webhook receives incoming customer messages and routes to correct member by `phone_number_id`
- [ ] **WHK-03**: Incoming messages saved to `whatsapp_messages` table with `provider_id`, `customer_phone`, `body`, `timestamp`, `direction`
- [ ] **WHK-04**: Webhook responds within 5 seconds (Meta requirement)

### Usage & Upgrade
- [ ] **UPG-01**: My Space WhatsApp settings shows daily conversation count vs limit (250 unverified / 1000 verified)
- [ ] **UPG-02**: At 80% of daily limit, member sees nudge to verify Meta Business account
- [ ] **UPG-03**: My Plan tab shows Business WhatsApp as an add-on upgrade card for Seed plan members
- [ ] **UPG-04**: My Plan tab shows Business WhatsApp connection status for Sprout+ members

## v2 Requirements (Deferred)

- Member can set auto-reply template when they're unavailable
- Member can broadcast a message to all customers who have messaged them
- WhatsApp link in booking confirmation email (if member has email enabled)
- Customer opt-out / STOP handling
- Message search within inbox
- File/image attachments in inbox

## Out of Scope

- WhatsApp for Kryla's own customer support — separate product concern
- Meta BSP certification — members manage their own Meta Business accounts
- WhatsApp payments — Phase 2 (Stripe/Razorpay is payments path)
- Broadcasting to cold contacts — Meta policy prohibits this without opt-in

## Traceability

| Phase | Requirements Covered |
|-------|----------------------|
| Phase 1 — Foundation | ONB-01, ONB-02, PUB-01, PUB-02, PUB-03, NOT-01, NOT-02, NOT-03, NOT-04 |
| Phase 2 — Inbox & Webhook | WHK-01, WHK-02, WHK-03, WHK-04, MSG-01, MSG-02, MSG-03, MSG-04, MSG-05, MSG-06 |
| Phase 3 — Settings & Upgrade | SET-01, SET-02, SET-03, SET-04, UPG-01, UPG-02, UPG-03, UPG-04 |
