# Kryla.work — Developer Context

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (OTP — email magic link) |
| AI | Anthropic `claude-sonnet-4-6` via `@anthropic-ai/sdk` |
| Job queue | Inngest |
| Hosting | Vercel |
| Notifications | Meta WhatsApp API (built — connect + reply flows) |
| Payments | Stripe / Razorpay (infrastructure in DB; UI not built) |

## Repo

`github.com/sureshbijja-arch/kryla-work` — default branch `master`

---

## Persona System

Personas are **fully DB-driven** — not hardcoded. The `personas` table is the canonical catalog.

**Two synced registries (both required for a persona to work):**
1. **DB `personas` table** — drives onboarding UI (`getEnabledPersonas()`), template/palette/font defaults, `studio_archetype` / `studio_guidance` / `studio_config`. Missing here → persona absent from onboarding.
2. **`config/verticals/index.ts`** — `VerticalConfig` per id: onboarding questions, `chatGuidance`, `researchGuidance`, template/palette/font defaults. Consumed by `getVertical(id)` in chat, research, and onboarding API routes. Missing here → no AI guidance.

**`app/[slug]/personaConfig.ts`** — `PERSONA_CONFIG` (section labels, CTA copy, service card action, contact variant) and roster presets (`DISTRIBUTOR_ROSTER`, `AGENCY_ROSTER`, `TUTOR_ROSTER`, etc.) keyed by persona id. Controls public page copy. Falls back to `other` if id not listed.

**Current persona count:** 46 rows in `personas` table. Families:
- Classic 9: tutor, trainer, baker, photographer, salon, chef, doctor, musician, other
- Storefront expansion: retailer + others
- Distributor family (7): fmcgdist, pharmadist, electronicsdist, autopartsdist, buildingdist, agridist, distributor
- Agency family (9): travel, realestate, insurance, staffing, marketing, immigration, events, logistics, agency
- Specialist personas: advocate, physio, counselor, occtherapist, speech, chiro, dietitian, etc.

---

## Onboarding Flow

`app/onboarding/page.tsx` — 'use client', 5 visual steps

| Step | What it collects |
|---|---|
| 1 | Persona — loaded from `getEnabledPersonas()` (DB `personas` table, `enabled=true`) |
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

### Core / Onboarding

| Route | Method | Purpose |
|---|---|---|
| `/api/onboarding/check-slug` | GET | Validates + checks slug availability |
| `/api/onboarding/submit` | POST | Creates provider row, fires Inngest build event |
| `/api/onboarding/status` | GET | Polls page_live for providerId + slug |
| `/api/inngest` | GET/POST/PUT | Inngest serve endpoint |
| `/api/notify/build-failed` | POST | Logs build failures |
| `/api/revalidate` | POST | ISR revalidation trigger from Inngest (requires REVALIDATE_SECRET) |

### My Chat — Page & Design

| Route | Method | Purpose |
|---|---|---|
| `/api/mychat/chat` | POST | AI chat editor — updates pages via draft_data |
| `/api/mychat/sections` | POST | Updates pages.sections (auth-gated by email ownership) |
| `/api/mychat/services` | POST | Updates pages.services array |
| `/api/mychat/upload` | POST | Uploads image to profile-media bucket; types: avatar, gallery, service (Grow+) |
| `/api/mychat/profile` | GET/POST | Member profile read/write |
| `/api/mychat/publish` | POST | Publish/unpublish public page |
| `/api/mychat/layout` | GET/POST | Layout read/write |
| `/api/mychat/layouts` | GET | Layout presets list |
| `/api/mychat/check-owner` | GET | Verifies email owns slug |
| `/api/mychat/custom-domain` | GET/POST | Vanity name management (Thrive+) |
| `/api/mychat/display-name` | POST | Display name update |
| `/api/mychat/verification` | GET/POST | Profile verification status |
| `/api/mychat/suggestion` | POST | AI page suggestion |
| `/api/mychat/hours` | GET/POST | Business hours |
| `/api/mychat/availability` | GET/POST | Availability slots |

### My Chat — Communication

| Route | Method | Purpose |
|---|---|---|
| `/api/mychat/bookings` | GET/POST | Bookings management |
| `/api/mychat/whatsapp-connect` | POST | WhatsApp number connection |
| `/api/mychat/whatsapp-reply` | POST | Send WhatsApp reply |
| `/api/mychat/email-settings` | GET/POST | Email settings |
| `/api/mychat/email-reply` | POST | Send email reply |
| `/api/booking` | POST | Public booking form submission |

### My Chat — AI Tools

| Route | Method | Purpose |
|---|---|---|
| `/api/mychat/research` | POST | AI research feature |
| `/api/mychat/tts` | POST | Text-to-speech |
| `/api/mychat/transcribe` | POST | Audio transcription |
| `/api/mychat/translate` | POST | Text translation |
| `/api/mychat/scan-menu` | POST | Menu scanning (storefront personas) |
| `/api/mychat/legal-news` | GET | Legal news feed (advocate) |
| `/api/mychat/court/config` | GET | Court tools config + portal URLs (advocate, india) |
| `/api/mychat/court/locator` | GET | Court complex search — in-app seeded data (advocate, india) |
| `/api/mychat/court/watched` | GET/POST | List / save watched cases (advocate, india) |
| `/api/mychat/court/watched/[id]` | PATCH/DELETE | Update hearing date / archive watched case (advocate, india) |

### My Chat — Studio (Business Documents)

| Route | Method | Purpose |
|---|---|---|
| `/api/mychat/studio` | POST | Generate document (streaming) |
| `/api/mychat/studio/documents` | GET/POST | Saved documents CRUD |
| `/api/mychat/studio/templates` | GET | Document templates |
| `/api/mychat/studio/library` | GET/POST | Studio content library |
| `/api/mychat/studio/config` | GET | Studio config for persona |

### My Chat — Drafting Studio (Advocate)

| Route | Method | Purpose |
|---|---|---|
| `/api/mychat/draft` | POST | AI drafting generation |
| `/api/mychat/draft/proofread` | POST | Proofread draft |
| `/api/mychat/draft/import` | POST | Import document |
| `/api/mychat/draft/citations` | POST | Extract/format citations |
| `/api/mychat/draft/export` | POST | Export draft |
| `/api/mychat/drafts` | GET/POST | Saved drafts CRUD |
| `/api/mychat/draft-templates` | GET | Drafting templates |
| `/api/mychat/clauses` | GET/POST | Clause library management |
| `/api/mychat/letterhead` | GET/POST | Letterhead settings |
| `/api/mychat/clients/[id]/export` | POST | Export client data |
| `/api/mychat/clients/[id]/erase` | DELETE | GDPR erase client data |

### My Chat — Clinical Studio (Doctor / Physio / Allied Health)

| Route | Method | Purpose |
|---|---|---|
| `/api/mychat/clinical-notes` | GET/POST | Clinical notes |
| `/api/mychat/clinical-templates` | GET | Clinical doc templates |
| `/api/mychat/treatment-plans` | GET/POST | Treatment plans |
| `/api/mychat/hep` | GET/POST | Home exercise programs |
| `/api/mychat/outcome-measures` | GET/POST | Outcome measures |
| `/api/mychat/exercises` | GET | Exercise library |
| `/api/mychat/working` | GET/POST | Working documents |
| `/api/mychat/working/export` | POST | Export working doc |
| `/api/mychat/working/import` | POST | Import working doc |

### My Chat — Members & Plan

| Route | Method | Purpose |
|---|---|---|
| `/api/mychat/students` | GET/POST | Student/roster management |
| `/api/mychat/student-sessions` | GET/POST | Session logging (tutor) |
| `/api/mychat/reviews` | GET/POST | Reviews management |
| `/api/mychat/stats` | GET | Member page stats |
| `/api/mychat/referral-code` | GET | Referral code |

### /api/onboarding/submit — key behaviour

**Idempotency:** checks for existing provider by slug BEFORE inserting.
- If exists + `page_live = true` → return success immediately (already built)
- If exists + `page_live = false` → re-fire Inngest with existing `providerId`, return success
- If not exists → insert, then fire Inngest

**Error codes:** `23505` → slug unique violation → 409 | `23502` → not-null violation → 400 | `23503` → FK violation → 500

**Non-fatal steps:** `onboarding_answers` insert and Inngest send are both wrapped in try/catch.

**Email/phone:** NOT unique constraints. Multiple providers can share email or phone. Only slug is unique.

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

**Config-driven mappings** (defined in `inngest/build-page.ts`, backed by `config/verticals/index.ts`):
- `TEMPLATE_MAP` — persona id → template ('focus' | 'portfolio' | 'storefront' | 'clinic'). Falls back to `VerticalConfig.defaultTemplate` from verticals registry.
- `PALETTE_MAP` — persona id → palette. Falls back to `VerticalConfig.defaultPalette`.
- `DESIGN_MODE_MAP` — persona id → 'craft' | 'editorial' | 'product'. Covers all 46 personas.
- `PERSONA_SECTIONS` — persona id → `SectionEntry[]` default layout. Covers all 46 personas. Hero always uses `variant: 'auto'` — resolved at render time by `resolveVariant()`.

---

## Studio System

Two studio implementations — different use cases:

### PractitionerStudio (`app/mychat/PractitionerStudio.tsx`)
- **Triggered:** Slide-in overlay via "Studio" button in Chat tab (visible when `provider.studioArchetype` is non-null)
- **Powered by:** `studio_archetypes` + `studio_modes` tables (fully DB-driven)
- **Personas:** All studio-enabled personas — distributor family, agency family, allied health, etc.
- **Archetype `business_docs`:** 7 modes — quotation, agreement, price_list, appointment, proposal, purchase_order, refine (redline)
- **Generation:** `POST /api/mychat/studio` streams response; system prompt = `archetype.base_guidance` + `persona.studio_guidance`; per-mode form driven by `studio_modes.form_schema` jsonb
- **Plan gate:** Blocked unless `feature_key='studio_business'` (or archetype-specific key) in `plan_features` for member's plan
- **Documents saved to:** `studio_documents` table

### DraftingStudio (`app/mychat/DraftingStudio.tsx`)
- **Triggered:** Slide-in overlay via "Drafting Studio" button in Chat tab — **advocate persona only**
- **Features:** Draft generation, proofread, citations, import/export, clause library
- **Routes:** `/api/mychat/draft*`, `/api/mychat/clauses`, `/api/mychat/drafts`

### Clinical Studio
- **Personas:** doctor, physio, occtherapist, counselor, chiro, speech, dietitian, etc.
- **Surfaced via:** PersonaTab (rendered inside Chat tab) — per-persona workspace panel
- **Routes:** `/api/mychat/clinical-notes`, `/api/mychat/treatment-plans`, `/api/mychat/hep`, `/api/mychat/outcome-measures`, `/api/mychat/exercises`

---

## Design System

### Design Modes
Three modes defined in `app/[slug]/types.ts` as `DesignMode = 'craft' | 'editorial' | 'product'`:
- **craft** — baker, chef, salon, trainer, storefront personas. Warm feel: 4.5rem headline, 5rem section spacing, 1.5rem card radius, pill buttons
- **editorial** — photographer, doctor, musician, tutor, distributor/agency personas. Magazine feel: 6rem headline, 6.5rem spacing, 1rem card radius, 0.75rem buttons
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

---

## My Chat (Member Dashboard)

Accessed at `/{slug}/mychat` (e.g. `priya.kryla.work/mychat`). Auth-gated — middleware protects `/mychat` and `/{slug}/mychat`. `/mychat` slug-resolver: looks up signed-in member's slug and redirects.

**Single implementation:** `app/mychat/SpaceClient.tsx` — panel component. `app/[slug]/mychat/page.tsx` — server route that auth-checks, fetches all data, renders split layout.

**Layout:** Live public page on the left (desktop only, read-only), My Chat panel on the right (400px). Mobile shows panel full-width. `router.refresh()` re-renders server page so changes appear live.

**Tab structure:**
- **Main tabs:** Chat | Design | Messages | Schedule | Plan
- **Design sub-tabs:** Services | Sections | Layouts | Ads | Media | Language | Letterhead
- **Messages sub-tabs:** Inbox | Consultations | Clients | Email
- **Plan sub-tabs:** Plan | Reviews | Suggestions | Stats | Refer

**PersonaTab** (`app/mychat/PersonaTab.tsx`) — rendered inside Chat tab; persona-specific workspace (students for tutor, client matters for advocate, clinical records for doctor/physio, etc.)

**Studio overlays** (buttons appear in Chat tab when applicable):
- "Drafting Studio" — advocate only; slides in `DraftingStudio` component
- "Practitioner Studio" — any persona with `studioArchetype` set; slides in `PractitionerStudio`

Services tab (`app/mychat/ServicesTab.tsx`):
- `ServiceItem` type: name, description, price, duration_or_unit, image_url?, badge?

Section builder (`app/mychat/SectionsTab.tsx`):
- Reorder, swap variant, add/remove sections
- Save → POST `/api/mychat/sections`

---

## Database Tables

### Core

**providers**
| Column | Notes |
|---|---|
| id uuid PK | |
| slug text unique | |
| first_name, last_name, persona, location, tagline | |
| whatsapp_number | formatted as `{countryCode}{digits}` |
| email | optional, NOT unique |
| plan | seed/sprout/grow/thrive/elevate |
| plan_status | active / pending_payment |
| region | usa / india |
| page_live boolean | set true by Inngest after build |
| verified boolean | |
| custom_persona_name | set when persona='other' |
| avatar_url | Supabase Storage, profile-media bucket |
| custom_domain | vanity name for Thrive+ |
| display_name | shown on public page |

**pages**
| Column | Notes |
|---|---|
| provider_id uuid FK | |
| headline, subheadline, bio, cta_primary, cta_secondary | |
| services jsonb | [{name, description, duration_or_unit, price, badge?, image_url?}] |
| highlights jsonb | [{icon, title, body}] |
| faq jsonb | [{question, answer}] |
| seo_title, seo_description, schema_type | |
| template | focus/portfolio/storefront/clinic |
| palette | professional/fresh/warm/minimal/creative/calm |
| font | default: inter |
| gallery jsonb | array of image URLs |
| sections jsonb | [{sectionKey, variant, order}] — drives LayoutRenderer; null = legacy |
| design_mode | craft \| editorial \| product |
| draft_data jsonb | pending AI edits (pages + providers sub-keys) |

**onboarding_answers** — provider_id, persona, name, tagline, location, slug, whatsapp, email, plan, region, claude_prompt, claude_response

**bookings** — id, provider_id, customer_name, customer_phone, service, preferred_date, message, status (pending/accepted/rejected/cancelled), notification_sent, confirmation_sent. Legacy columns (`client_*`, `service_requested`, `requested_slot`) — unused, do not write to them.

**ads** — id, provider_id, title (100), description (500), image_url, link_url, status (pending/approved/rejected)

**build_failures** — id, provider_id, slug, failed_at

### Persona Catalog

**personas** — DB registry of all personas. Key columns: id, label, emoji, template, palette, font, enabled (bool), sort_order, studio_archetype (FK → studio_archetypes.id), studio_guidance (text), studio_config (jsonb — vocab overrides: patient_noun, studio_label, content_noun, etc.). `getEnabledPersonas()` reads this table.

### Plans & Gating

**plans** — id (matches providers.plan), name, emoji, tagline, usa_price, india_price, is_quote, popular, sort_order, active

**plan_features** — plan_id, label, description, feature_key (nullable — null = display only), sort_order. Gating: `getPlanGate()` builds `Map<featureKey → minSortOrder>`; `gate.allows(key, plan)` returns true when member's plan sort_order ≥ min. **Admin UI:** `/admin/plans`. No hardcoded tier comparisons in source.

### Studio Tables

**studio_archetypes** — id, label, base_guidance, disclaimer, has_library (bool), library_label (NOT NULL — use '' not NULL), feature_key. Current: 11 archetypes.

**studio_modes** — archetype_id FK, key, label, sort_order, form_schema jsonb (drives dynamic form UI), prompt_instructions, output_format (html|json|redline), streaming bool. Current: 62 modes. Adding a mode = one row, no code change.

**studio_documents** — saved generated documents per member.

**studio_templates** — reusable template library. Current: 21 templates.

**studio_library** — studio content library items. Current: 72 items.

**studio_usage** — AI generation usage tracking per member.

### Drafting Studio (Advocate)

**drafts** — saved advocate drafts  
**draft_templates** — 10 templates  
**clause_library** — 10 legal clauses  
**drafting_usage** — usage tracking

### Clinical Tables (Doctor / Physio / Allied Health)

**clinical_doc_templates** (5) | **clinical_notes** | **treatment_plans**  
**exercise_library** (38 exercises) | **hep_programs** | **outcome_measures**  
**working_usage** — working documents usage tracking

### Communication

**whatsapp_connections** — connected WhatsApp numbers per provider  
**whatsapp_messages** — message log  
**provider_email** — email accounts per provider  
**emails** — email log  
**notifications** — in-app notifications  

### Members / Activity

**students** — tutor persona student records  
**student_sessions** — session logs  
**reviews** — member reviews  
**page_events** — page view events (40 rows)  
**page_reactions** — emoji reactions on public pages (4 rows)  
**availability** — availability slots  
**suggestions** — member-submitted suggestions  

### Layout & Section Registry

**layout_presets** (77) — layout preset data  
**section_types** (7) — registry of valid section keys and their variants  
**persona_templates** — persona-specific page templates  

### Payments (infrastructure only — UI not built)

**payment_events** — append-only audit ledger (Stripe/Razorpay webhooks)  
**webhook_events** — idempotency table for gateway webhooks. On 23505 → already processed.

### Config & Research

**research_usage** (5) — AI research usage tracking  
**system_config** (3) — key-value system config  
**consent_events** — GDPR consent tracking  
**legal_news** (238) — legal news feed for advocate persona  

**RLS note:** Core tables (`providers`, `pages`, `onboarding_answers`) have RLS disabled — service role key used for all writes. Studio tables also have RLS disabled. Clinical tables have RLS disabled. All others use RLS.

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
ADMIN_EMAIL=            # Comma-separated. Controls /admin/* access. assertAdmin() checks session email.
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
REVALIDATE_SECRET=      # Random string — authorizes ISR revalidation from Inngest
```

---

## Landing Page

`app/page.tsx` — thin async server component; calls `getPlans()` and renders `<HomeClient plans={plans} />`

`app/HomeClient.tsx` — full v2 landing, 'use client', ~1050 lines; accepts `plans: PlanDef[]` prop; pricing section DB-driven.

**Hero:** Two `.hf-cluster left/right` div blocks, each with 6 floating photo cards (12 total). Cards are `hf-wrap` divs gated by `isEnabled('<persona>')`, with `--rotation` CSS var, `animationDelay`, `hf-photo` img + `hf-label` span. Mobile rule `.hf-wrap:nth-child(n+5){display:none}` hides 5th+ cards per cluster. Left cluster: Tutor, Baker, Chef, Retailer, Distributor, Travel Agency. Right cluster: Music Teacher, Salon, Advocate, Doctor, Real Estate, Agency.

**Photos:** `/images/<Name>.jpg` from `public/images/` (local). Distributor, Travel, Real Estate, Agency cards still use Unsplash placeholder URLs — replace when local photos are supplied.

**Sections:** hero → HorizontalSlider (4 slides) → community ticker → pricing (region toggle, 4 plans) → testimonials → CTA → footer

**Slider:** pixel-based `translateX(-${current * width}px)` using `outerRef.current.offsetWidth` — NOT percentage (breaks iOS Safari). Touch swipe (40px threshold). Auto-advance 4s.

**Logo system:** inline SVG K mark everywhere — never image files.

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
- **studio_archetypes.library_label NOT NULL** — production column has NOT NULL constraint; always use `''` not `NULL`

---

## What's Built

- ✅ Public member pages at `[slug].kryla.work` — LayoutRenderer with section engine
- ✅ Design system — 3 design modes, CSS custom properties, Tailwind token extensions
- ✅ Section builder — all 7 section types, multiple variants, scroll/hover animations
- ✅ Persona-smart defaults — PERSONA_SECTIONS + DESIGN_MODE_MAP in Inngest, auto variant in hero
- ✅ Auth / login — Supabase email OTP at `/login`, session via `@supabase/ssr`
- ✅ My Chat dashboard — AI chat editor, Design tab (services, sections, layouts, ads, media, language, letterhead), Messages tab, Schedule tab, Plan tab
- ✅ Bookings — form on public page → DB → viewable in My Chat
- ✅ Draft data — AI edits saved to draft_data, applied on preview
- ✅ Plans + features — DB-backed; managed at `/admin/plans`; gating data-driven via `feature_key`
- ✅ Custom links (Thrive+) — vanity name at `{name}.kryla.work`, self-serve via My Chat
- ✅ Persona catalog — 46 personas across classic, storefront, distributor, agency, and specialist families
- ✅ Business Documents Studio — `business_docs` archetype, 7 modes (quotation, agreement, price_list, appointment, proposal, purchase_order, refine), plan-gated via `studio_business`
- ✅ Drafting Studio — advocate persona; drafts, clause library, proofread, citations, import/export
- ✅ Clinical Studio — doctor/physio/allied health personas; clinical notes, treatment plans, HEP, outcome measures
- ✅ WhatsApp connect + reply — providers link their number; reply to messages from My Chat inbox
- ✅ Research feature — AI research tab per persona with `researchGuidance`
- ✅ Reviews system — members collect reviews, visible on My Chat Plan tab
- ✅ Page analytics — `page_events` and `page_reactions` (view counts, emoji reactions)
- ✅ Landing page hero — 12-card layout (6+6), local images, distributor/agency cards added

## What's NOT Built Yet

- Payment UI — Stripe (USA) / Razorpay (India) UI; DB infrastructure and webhook tables exist
- Avatar/gallery upload UI in My Chat — upload endpoint exists (`/api/mychat/upload`), UI not built
- All 6 AI agents (Phase 3)
- SEO tooling beyond basic meta tags
- Local hero images for Distributor, Travel, Real Estate, Agency (Unsplash placeholders in use)
- Community ticker update for distributor/agency members (Task 3 of landing-page-showcase plan — optional)
