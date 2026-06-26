# Kryla.work — MVP Build Plan (6 Weeks)

## What MVP Is

**MVP = Claude API + Supabase + wildcard subdomain + WhatsApp notification.**

No AI agents. No custom domains. No payments (until Week 5). No advanced features.

The goal: a real person completes onboarding, gets a real AI-generated profile, and receives their first booking notification on WhatsApp. Everything else is Phase 2.

## Week 1: Foundation

**Goal:** Next.js running, Supabase connected, wildcard DNS configured, landing page live.

### Tasks
- [ ] Next.js 14 project initialized (App Router)
- [ ] Supabase project created, all 7 tables from `db/supabase_schema.sql` applied
- [ ] Cloudflare: wildcard DNS `*.kryla.work → Vercel`
- [ ] `middleware.ts` reads subdomain, routes `slug.kryla.work → /[slug]`
- [ ] `app/page.tsx` — landing page live on Vercel
- [ ] `app/[slug]/page.tsx` — basic member profile route (static placeholder)
- [ ] Environment variables set in Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

### Key files
```
middleware.ts
app/page.tsx
app/[slug]/page.tsx
app/layout.tsx
lib/supabase.ts
```

## Week 2: Onboarding

**Goal:** A real person can complete 5 questions and claim their slug.

### Tasks
- [ ] `app/onboarding/page.tsx` — 5-step flow
  - Step 1: Persona picker (tutor / baker / trainer / photographer / other)
  - Step 2: Name, city, phone number
  - Step 3: Claim your URL (check slug availability live)
  - Step 4: Choose membership (Seed = free, Sprout = ₹299/$5)
  - Step 5: "Building your profile..." loading state
- [ ] `app/api/onboarding/route.ts` — saves to Supabase, triggers page generation
- [ ] Supabase Auth: phone OTP verification
- [ ] Slug availability check API
- [ ] Auto-save per step (don't lose progress)

### Key files
```
app/onboarding/page.tsx
app/onboarding/steps/Step1Persona.tsx
app/onboarding/steps/Step2Details.tsx
app/onboarding/steps/Step3URL.tsx
app/onboarding/steps/Step4Plan.tsx
app/onboarding/steps/Step5Building.tsx
app/api/onboarding/route.ts
lib/supabase.ts
```

## Week 3: AI Page Generation

**Goal:** Claude builds a real profile. Member sees it live.

### Tasks
- [ ] Inngest set up (`inngest.ts`, `app/api/inngest/route.ts`)
- [ ] `functions/build-page.ts` — Inngest function that calls Claude
- [ ] Claude prompt engineering per persona
- [ ] Response parsing → save to `pages` table
- [ ] `app/[slug]/page.tsx` — renders real page from `pages` table
- [ ] `providers.page_live = true` after generation
- [ ] Environment variable: `ANTHROPIC_API_KEY`
- [ ] Test: complete full onboarding, see generated profile

### Key files
```
inngest.ts
app/api/inngest/route.ts
functions/build-page.ts
lib/claude.ts
app/[slug]/page.tsx
app/[slug]/components/FocusTemplate.tsx
```

### Claude prompt structure (tutor example)
```
You are building a professional online profile for a home tutor.
Their name is [name], based in [city].

They answered 5 questions:
1. What subjects do you teach? [answer]
2. What age groups? [answer]
3. What makes you different? [answer]
4. What are your rates? [answer]
5. Anything else to know? [answer]

Return valid JSON with:
- headline (one punchy line, max 10 words)
- bio (3 sentences, warm and personal)
- services (array of {name, description, price, duration})
- highlights (3 bullet points — what makes them great)
- palette (one of: professional, fresh, warm, minimal, creative, calm)
- seo_title (city + subject + "tutor" format)
- seo_description (150 chars max)
```

## Week 4: Booking

**Goal:** A customer can submit a booking. The member gets a WhatsApp. They can accept/reject.

### Tasks
- [ ] `app/[slug]/components/BookingForm.tsx` — customer-facing booking form
- [ ] `app/api/booking/route.ts` — saves booking, triggers WhatsApp
- [ ] `lib/whatsapp.ts` — Meta WhatsApp API wrapper
- [ ] Inngest function: `send-booking-notification.ts`
- [ ] Member reply handling: "1 to accept, 2 to decline" WhatsApp flow
- [ ] Webhook: `app/api/whatsapp/webhook/route.ts` — handles member reply
- [ ] Customer confirmation WhatsApp on accept
- [ ] Environment variables: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`

### Key files
```
app/[slug]/components/BookingForm.tsx
app/api/booking/route.ts
app/api/whatsapp/webhook/route.ts
lib/whatsapp.ts
functions/send-booking-notification.ts
functions/send-confirmation.ts
```

## Week 5: Payments + Support

**Goal:** Members can upgrade to paid. Basic support works.

### Tasks
- [ ] Stripe integration (USA): `lib/stripe.ts`
- [ ] `app/api/billing/route.ts` — create Stripe checkout session
- [ ] Stripe webhook: `app/api/billing/webhook/route.ts`
- [ ] Plan gating: check `providers.plan` before showing paid features
- [ ] Razorpay integration (India): `lib/razorpay.ts`
- [ ] Basic support: WhatsApp → `support_tickets` table → manual review
- [ ] Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

## Week 6: Beta Launch

**Goal:** First 5 real members. Everything works.

### Tasks
- [ ] Error handling on all API routes (no silent failures)
- [ ] Mobile responsive — all pages work on iPhone
- [ ] Basic meta tags + OG image for sharing
- [ ] Uptime monitoring (Uptime Robot, free tier)
- [ ] Error logging (Vercel logs or Sentry free tier)
- [ ] Seed 5 real profiles (walk in to businesses)
- [ ] Share profiles on Nextdoor + Celina Facebook

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=

# WhatsApp (Meta Business API)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Queue
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Email (Resend)
RESEND_API_KEY=
```

## What Is NOT in MVP

- AI agents (Phase 3)
- Custom domains (Phase 2)
- Member Groups (Phase 2)
- Advanced analytics
- Admin panel (use Supabase dashboard)
- Razorpay (Week 5, India only)
- Automatic page rebuilds via WhatsApp (Thrive feature, Phase 2)
