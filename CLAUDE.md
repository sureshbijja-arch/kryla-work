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
| `/api/my-space/chat` | POST | AI chat editor — updates pages via draft_data |
| `/api/my-space/sections` | POST | Updates pages.sections (auth-gated by email ownership) |
| `/api/my-space/services` | POST | Updates pages.services array (auth-gated by email ownership) |
| `/api/my-space/upload` | POST | Uploads image to profile-media bucket; types: avatar, gallery, service (Grow+) |
| `/api/revalidate` | POST | ISR revalidation trigger from Inngest (requires REVALIDATE_SECRET) |

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

**Design mode mapping:** baker/chef/salon/trainer/other → craft | photographer/doctor/musician/tutor → editorial

**Sections mapping (PERSONA_SECTIONS):** Each persona has a curated `SectionEntry[]` default written to `pages.sections` at build time. Hero always uses `variant: 'auto'` — resolved at render time by `resolveVariant()` in LayoutRenderer.

---

## Design System

### Design Modes
Three modes defined in `app/[slug]/types.ts` as `DesignMode = 'craft' | 'editorial' | 'product'`:
- **craft** — baker, chef, salon, trainer, other. Warm feel: 4.5rem headline, 5rem section spacing, 1.5rem card radius, pill buttons
- **editorial** — photographer, doctor, musician, tutor. Magazine feel: 6rem headline, 6.5rem spacing, 1rem card radius, 0.75rem buttons
- **product** — reserved for future tech/SaaS personas

### CSS Custom Properties (`app/globals.css`)
Set per `[data-mode]` attribute on the LayoutRenderer wrapper div:
```
--type-display    --type-heading    --type-subheading    --type-body    --type-label
--fw-display      --space-section   --space-card
--radius-card     --radius-btn
```
Dynamic accent tokens set as **inline styles** on the LayoutRenderer wrapper (not via `[data-mode]`):
```
--color-accent    --color-accent-surface    --color-accent-border    --color-accent-glow
```

### Tailwind Extensions (`tailwind.config.ts`)
`text-display`, `text-heading`, `text-subheading`, `text-body-base`, `text-label` → CSS vars
`p-section`, `p-card` → CSS vars | `rounded-card`, `rounded-btn` → CSS vars
`bg-accent`, `bg-accent-surface`, `border-accent-border`, `shadow-accent-glow` → CSS vars

### Section Layout Engine
- `pages.sections` — `SectionEntry[]` → `{ sectionKey, variant, order }`
- `LayoutRenderer` reads `sections`, sorts by order, renders each section component
- `resolveVariant(sectionKey, variant)` — converts `auto` hero variant: gallery → `photo`, avatar+editorial → `centered`, avatar+craft → `split`, no media → `dark`
- `section_types` table — registry of valid sections and their variants (used by admin UI)

### Member Page Routes
- `app/[slug]/page.tsx` — live public page (ISR, 1h revalidate)
- `app/[slug]/preview/page.tsx` — always-fresh draft preview (force-dynamic)
- Both select `sections`, `design_mode`, `gallery` from pages table

### My Space (Dashboard)

> **IMPORTANT:** My Space has TWO parallel implementations that must always be kept in sync:
> 1. **`/my-space` page** — `app/my-space/SpaceClient.tsx` (full-page, server-loaded)
> 2. **Member page popup** — `app/[slug]/components/MySpacePanel.tsx` (slide-in panel, client-only auth)
> When adding a new tab or feature to one, add it to both.

At `/my-space` — protected by Supabase email OTP auth (middleware guards route).
Tabs: **Edit profile** (AI chat editor) | **Services** (service card manager) | **Page layout** (section builder) | **Bookings** | **My plan**

Services tab (`app/my-space/ServicesTab.tsx`):
- Add, edit, delete, reorder services
- Fields: name, description, price, duration_or_unit, badge (Popular/New/Best Value), image_url
- Image upload per service (Grow+ — enforced by `/api/my-space/upload`)
- Save → POST `/api/my-space/services`
- `ServiceItem` type defined here (name, description, price, duration_or_unit, image_url?, badge?)

Section builder (`app/my-space/SectionsTab.tsx`):
- Reorder with up/down buttons
- Swap variant via pill picker (expands on card click)
- Add/remove sections
- Save → POST `/api/my-space/sections` (verifies email ownership)
- Preview link opens `/[slug]/preview`

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
| custom_persona_name | text | set when persona='other' |
| avatar_url | text | profile photo URL (Supabase Storage, profile-media bucket) |

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
| gallery | jsonb | array of image URLs (Supabase Storage, profile-media bucket) |
| sections | jsonb | array of {sectionKey, variant, order} — drives LayoutRenderer; null = use legacy template |
| design_mode | text | craft \| editorial \| product — controls CSS token values; default 'craft' |
| draft_data | jsonb | pending edits from AI chat (pages + providers sub-keys) |

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

### ads
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| provider_id | uuid | FK → providers.id |
| title | text | max 100 chars |
| description | text | max 500 chars, nullable |
| image_url | text | nullable, Supabase Storage |
| link_url | text | nullable |
| status | text | pending / approved / rejected |
| created_at | timestamptz | |

**Plan gating:** upload (avatar + gallery) requires Grow+; posting ads requires Thrive+.

### build_failures
Columns: id (uuid PK), provider_id (uuid), slug (text), failed_at (timestamptz)

### bookings
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| created_at | timestamptz | |
| provider_id | uuid | FK → providers.id |
| customer_name | text | |
| customer_phone | text | |
| service | text | |
| preferred_date | text | |
| message | text | |
| status | text | pending/accepted/rejected/cancelled |
| status_updated_at | timestamptz | |
| notification_sent | boolean | |
| confirmation_sent | boolean | |

Note: table also has legacy columns `client_name`, `client_phone`, `client_email`, `service_requested`, `requested_slot` — unused, do not write to them.

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
REVALIDATE_SECRET=               # Random string — used by /api/revalidate to authorize ISR revalidation from Inngest jobs
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

1. **WhatsApp notifications** — build-complete message, booking alerts (Week 4)
2. **Payments** — Stripe (USA) / Razorpay (India) for Sprout+ plans (Week 5)
3. **Avatar/gallery upload UI** — drag-drop uploader in My Space for Grow+ members
4. **Custom domains** — Phase 2

## What's Built

- ✅ Public member pages at `[slug].kryla.work` — LayoutRenderer with section engine
- ✅ Design system — 3 design modes, CSS custom properties, Tailwind token extensions
- ✅ Section builder — all 7 section types, multiple variants each, scroll/hover animations
- ✅ Persona-smart defaults — PERSONA_SECTIONS in Inngest, auto variant in hero
- ✅ Auth / login — Supabase email OTP at `/login`, session via `@supabase/ssr`
- ✅ My Space dashboard — AI chat editor, section builder tab, bookings tab, plan tab
- ✅ Bookings — form on public page → DB → viewable in My Space
- ✅ Draft data — AI edits saved to draft_data, applied on preview

## What's NOT Built Yet

- WhatsApp sending (Week 4)
- Stripe / Razorpay (Week 5)
- Avatar/gallery upload UI in My Space (media upload endpoint exists, UI not built)
- Custom domains (Phase 2)
- All 6 AI agents (Phase 3)
- SEO tooling beyond basic meta tags
