# Kryla.work — Developer Context

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (OTP — not yet wired) |
| AI | Anthropic `claude-sonnet-4-6` via `@anthropic-ai/sdk` |
| Job queue | Inngest |
| Hosting | Vercel |
| Notifications | Meta WhatsApp API (placeholder — Week 4) |
| Payments | Stripe / Razorpay (not yet built) |

## Repo

`github.com/sureshbijja-arch/kryla-work` — default branch `master`

---

## Onboarding Flow

`app/onboarding/page.tsx` — 'use client', 5 visual steps

| Step | What it collects |
|---|---|
| 1 | Persona (9 options: tutor, trainer, baker, photographer, salon, chef, doctor, musician, other) |
| 2 | firstName, lastName, tagline, location |
| 3 | slug (debounced availability check), whatsappCountryCode + whatsappNumber, email (optional) |
| 4 | region (usa/india toggle) + plan (Seed/Sprout/Grow/Thrive) |
| 5 | Building screen — animated 4-step progress, polls /api/onboarding/status every 2s |

**Building screen behaviour:**
- Steps 1–3 auto-checkmark at 0 / 2.5s / 5s / 7.5s
- Step 4 ("Making your presence live") stays spinning until `ready: true` from API
- On ready: setBuildStep(5) → step 4 checks → 1.5s → redirect to /welcome?slug=...
- Timeout: 5 minutes → calm "You're all set — we're on it" state, polling stops
- Slug stored in `slugRef` (ref, not closure) so polling interval always has latest value

**Slug logic** (`lib/slug.ts`):
- `toSlug` — normalise to lowercase alphanumeric, max 30 chars
- `suggestSlug` — firstName + lastName, auto-suggested on entering step 3
- `validateSlug` — min 3, max 30, letters+numbers only, not all-digits
- `RESERVED_SLUGS` — 30 reserved words (admin, api, app, kryla, etc.)

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/onboarding/check-slug` | GET | Validates + checks slug availability |
| `/api/onboarding/submit` | POST | Creates provider row, fires Inngest build event |
| `/api/onboarding/status` | GET | Polls page_live for providerId + slug |
| `/api/inngest` | GET/POST/PUT | Inngest serve endpoint |
| `/api/notify/build-failed` | POST | Logs build failures (WhatsApp send is Week 4 placeholder) |
| `/api/booking` | POST | Customer booking submission |

### /api/onboarding/submit — key behaviour

**Idempotency:** checks for existing provider by slug BEFORE inserting.
- If exists + `page_live = true` → return success immediately (already built)
- If exists + `page_live = false` → re-fire Inngest with existing `providerId`, return success
- If not exists → insert, then fire Inngest

**Error codes:**
- `23505` → slug unique violation → 409 "That address is already taken"
- `23502` → not-null violation → 400 "Some required information is missing"
- `23503` → FK violation → 500 "Something went wrong linking your account"

**Non-fatal steps:** `onboarding_answers` insert and Inngest send are both wrapped in try/catch — provider row creation is the only hard failure.

**Email/phone:** NOT unique constraints. Multiple providers can share email or phone. Only slug is unique.

### /api/onboarding/status — key behaviour

Queries by `providerId` first, then by `slug` if not found or `page_live` is false.
Two sequential queries (not `.or()`) to avoid Supabase filter syntax issues.
Handles `page_live` as boolean OR string `'true'` (old schema compatibility).

---

## Inngest Function

`inngest/build-page.ts` — `id: 'build-member-page'`, retries: 3, concurrency: 5

**Steps:**
1. `call-claude-api` — sends prompt to `claude-sonnet-4-6`, max_tokens 2000
2. `parse-response` — strips markdown fences, JSON.parse
3. `save-raw` — updates `onboarding_answers` with raw prompt + response
4. `write-pages-row` — upserts to `pages` table
5. `mark-page-live` — sets `providers.page_live = true`

**onFailure:** calls `/api/notify/build-failed` with providerId after all 3 retries exhausted.

**Template mapping:** tutor/trainer/musician/other → focus | baker/photographer → portfolio | salon/chef → storefront | doctor → clinic

**Palette mapping:** tutor → professional | trainer → fresh | baker/chef → warm | photographer → minimal | salon → creative | doctor → calm

---

## Database Tables

### providers
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| slug | text | unique |
| first_name | text | |
| last_name | text | |
| persona | text | tutor/trainer/baker/photographer/salon/chef/doctor/musician/other |
| location | text | |
| whatsapp_number | text | formatted as `{countryCode}{digits}` |
| email | text | optional, NOT unique |
| plan | text | seed/sprout/grow/thrive/elevate |
| plan_status | text | active / pending_payment |
| region | text | usa / india |
| page_live | boolean | set true by Inngest after build completes |
| verified | boolean | |

### pages
| Column | Type | Notes |
|---|---|---|
| provider_id | uuid | FK → providers.id |
| headline | text | |
| subheadline | text | |
| bio | text | |
| cta_primary | text | |
| cta_secondary | text | |
| services | jsonb | array of {name, description, duration_or_unit} |
| highlights | jsonb | array of {icon, title, body} |
| faq | jsonb | array of {question, answer} |
| seo_title | text | |
| seo_description | text | |
| schema_type | text | |
| template | text | focus/portfolio/storefront/clinic |
| palette | text | professional/fresh/warm/minimal/creative/calm |
| font | text | default: inter |
| show_sections | jsonb | {hero, services, highlights, booking, faq, contact} |
| build_version | int | |

### onboarding_answers
| Column | Type |
|---|---|
| id | uuid PK |
| provider_id | uuid FK |
| persona | text |
| first_name | text |
| last_name | text |
| tagline | text |
| location | text |
| slug | text |
| whatsapp_number | text |
| email | text |
| plan | text |
| region | text |
| claude_prompt | text |
| claude_response | text |

### build_failures
Columns: id (uuid PK), provider_id (uuid), slug (text), failed_at (timestamptz)

### bookings
Columns: provider_id, customer_name, customer_phone, customer_email, service, preferred_date, message, status (pending/accepted/rejected/cancelled), notification_sent, confirmation_sent

**RLS:** Disabled on all three core tables (`providers`, `pages`, `onboarding_answers`). Service role key used for all writes.

---

## Supabase Client Pattern

Three files:
- `lib/supabase/server.ts` — SSR client with cookies (Auth)
- `lib/supabase/client.ts` — browser client
- `lib/supabase/admin.ts` — service role, lazy Proxy (defers URL check to call time so builds don't fail with blank env vars)
- `lib/supabase.ts` — flat file used by API routes: `createServerClient()` and `createBrowserClient()`

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
NEXT_PUBLIC_APP_URL=https://kryla.work
NEXT_PUBLIC_APP_DOMAIN=kryla.work
WHATSAPP_PHONE_NUMBER_ID=        # Week 4
WHATSAPP_ACCESS_TOKEN=           # Week 4
STRIPE_SECRET_KEY=               # Week 5
STRIPE_WEBHOOK_SECRET=           # Week 5
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # Week 5
RESEND_API_KEY=                  # Week 5
```

---

## Landing Page

`app/page.tsx` — full v2 landing, 'use client', ~1020 lines

**Sections:** hero (floating photos, geo-detected loc toggle) → HorizontalSlider (4 slides) → community ticker → pricing (region toggle, 4 plans) → testimonials → CTA → footer

**Slider:** pixel-based `translateX(-${current * width}px)` using `outerRef.current.offsetWidth` — NOT percentage (breaks iOS Safari). Touch swipe (40px threshold). Auto-advance 4s. Timer resets on manual nav.

**Logo system:** inline SVG K mark everywhere — never image files.
- Vertical + top diagonal: `stroke="#0D0D0D"`
- Bottom diagonal: `stroke="#F5A623"`
- Wordmark: `kryla` dark + `.work` amber

**Geo-detection:** `ipapi.co` → `data.country_code === 'IN'` → india, else usa. Default: usa.

---

## Known Fixes Applied

- **iOS Safari slider** — percentage translateX breaks; fixed with `offsetWidth` pixels
- **Build-time Supabase crash** — `createClient()` at module level with blank env vars; fixed with lazy Proxy in `lib/supabase/admin.ts`
- **409 on retry** — idempotency check in submit route resumes existing provider instead of re-inserting
- **Stale slug in polling** — `slugRef` (useRef) updated via separate `useEffect`, read inside interval closure
- **Status API .or() issues** — replaced with two sequential Supabase queries
- **page_live type mismatch** — status route checks `=== true || === 'true'`
- **Email/phone unique constraints** — removed from DB; only slug is unique

---

## What's Next

1. **Member profile page** — `[slug].kryla.work` public presence page (reads from `pages` table)
2. **Dashboard** — logged-in view at `/dashboard`: bookings, edit bio, share page
3. **WhatsApp notifications** — build-complete message, booking alerts (Week 4)
4. **Payments** — Stripe (USA) / Razorpay (India) for Sprout+ plans (Week 5)

## What's NOT Built Yet

- Auth / login (Supabase OTP)
- Member dashboard ("Your space")
- Public member pages at `[slug].kryla.work` (middleware + `app/[slug]/page.tsx` placeholder exists)
- WhatsApp sending (Week 4)
- Stripe / Razorpay (Week 5)
- Custom domains (Phase 2)
- All 6 AI agents (Phase 3)
- SEO tooling beyond basic meta tags
