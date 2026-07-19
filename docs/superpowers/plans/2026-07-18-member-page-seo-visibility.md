# Member-Page SEO Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each member's public page at `{slug}.kryla.work` gets crawled, indexed, and surfaces in
search as its own independent site (eligible for name sitelinks), with rich-result-eligible
structured data, plus a `kryla.work/directory` hub that helps discovery without subordinating the
member subdomains.

**Architecture:** Five independently-shippable slices layered onto the existing Next.js 14 App
Router + Supabase stack: (1) per-member `/sitemap.xml` + `/robots.txt` route handlers riding the
existing subdomain rewrite, (2) a self-referencing entity JSON-LD block plus richer structured data
(ratings/hours/FAQ) extracted into pure, reusable builder functions, (3) an apex→subdomain 301 in
`middleware.ts`, (4) a persona-grouped directory hub on the apex, (5) an apex sitemap/robots and
metadata cleanup. No new dependencies, no new test framework — the repo has Playwright e2e only
(`tests/e2e/smoke.spec.ts`), so new logic is verified via that pattern plus manual `curl`/Rich
Results Test checks (Task 8).

**Tech Stack:** Next.js 14 App Router (Route Handlers, `MetadataRoute.Sitemap`/`Robots`), Supabase
(`supabaseAdmin` service-role client), TypeScript, Playwright.

## Global Constraints

- No hardcoded configurable data — persona lists come from the `personas` table via
  `getEnabledPersonas()` (`lib/personas.ts`), never a hardcoded array.
- No tech debt — no TODOs, no dead code, no `any`. Delete/replace rather than leave old paths.
- Reuse `lib/links.ts` (`memberUrl`, `APP_DOMAIN`, `SITE_URL`) for every URL constructed — never
  inline a `https://${slug}.kryla.work` string.
- Reuse the `findProvider<T>` lookup pattern (slug OR `custom_domain`, `page_live=true`) already in
  `app/[slug]/page.tsx:26-44` — do not reimplement provider lookup.
- All new Supabase reads use `supabaseAdmin` (`lib/supabase/admin.ts`), matching existing routes.
- TypeScript strict — every new file must pass `npm run typecheck` with no `any`.

---

## Task 1: `lib/seo/structuredData.ts` — pure JSON-LD builders

**Files:**
- Create: `lib/seo/structuredData.ts`
- Test: `tests/e2e/smoke.spec.ts` (append a request-level check — see Step 5)

**Interfaces:**
- Consumes: `BusinessHours`, `FaqItem` from `app/[slug]/types.ts` (already defined:
  `BusinessHours = {timezone, enabled, mon..sun: DayHours|null, exceptions?}`,
  `FaqItem = {question, answer}`).
- Produces (used by Task 2):
  - `buildEntityJsonLd(input: EntityInput): Record<string, unknown>`
  - `buildAggregateRating(reviews: ReviewInput[]): Record<string, unknown> | null`
  - `buildOpeningHours(hours: BusinessHours | null): Record<string, unknown>[] | null`
  - `buildFaqJsonLd(faq: FaqItem[]): Record<string, unknown> | null`
  - Types: `EntityInput`, `ReviewInput` (exported for Task 2 to import)

This is a pure, dependency-free module (no Supabase, no Next imports) so it can be reasoned about
and tested in isolation.

- [ ] **Step 1: Write the module with full JSDoc and types**

```typescript
// lib/seo/structuredData.ts
/**
 * Pure builders for schema.org JSON-LD blocks used on member public pages.
 * No I/O — callers fetch data (Supabase) and pass plain values in.
 * Every builder omits fields/returns null when the underlying data is absent,
 * so callers can spread the result straight into a <script> tag without
 * emitting empty/misleading structured data.
 */
import type { BusinessHours, DayKey, FaqItem } from '@/app/[slug]/types'

export interface EntityInput {
  /** 'Person' | 'Organization' | 'LocalBusiness' or any other stored schema_type */
  type: string
  name: string
  /** Canonical, self-referencing URL — e.g. https://priya.kryla.work */
  url: string
  /** Share-card or avatar image URL, if available */
  image?: string | null
  description?: string | null
  telephone?: string | null
  addressLocality?: string | null
  /** External profile URLs (Instagram, Nextdoor, etc.) */
  sameAs?: string[]
}

export interface ReviewInput {
  rating: number
  status: string
}

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_TO_SCHEMA: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

/**
 * Self-referencing entity block — tells search engines this subdomain is its
 * own independent site/entity (Person, Organization, or LocalBusiness),
 * distinct from the page-specific schema_type block already on the page.
 */
export function buildEntityJsonLd(input: EntityInput): Record<string, unknown> {
  const sameAs = (input.sameAs ?? []).filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': input.type,
    name: input.name,
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.addressLocality
      ? { address: { '@type': 'PostalAddress', addressLocality: input.addressLocality } }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

/**
 * AggregateRating from published reviews. Returns null when there are no
 * published reviews — an aggregateRating with ratingCount 0 is invalid schema
 * and can trigger a Search Console manual-action warning, so we omit it
 * entirely rather than emit a zero.
 */
export function buildAggregateRating(reviews: ReviewInput[]): Record<string, unknown> | null {
  const published = reviews.filter((r) => r.status === 'published')
  if (published.length === 0) return null

  const sum = published.reduce((acc, r) => acc + r.rating, 0)
  const average = sum / published.length

  return {
    '@type': 'AggregateRating',
    ratingValue: Number(average.toFixed(1)),
    reviewCount: published.length,
    bestRating: 5,
    worstRating: 1,
  }
}

/**
 * openingHoursSpecification array from BusinessHours. Returns null when hours
 * are disabled or absent. Per-date `exceptions` have no clean recurring-schema
 * equivalent and are intentionally not represented — the weekly pattern is
 * the useful signal for rich results.
 */
export function buildOpeningHours(hours: BusinessHours | null): Record<string, unknown>[] | null {
  if (!hours || !hours.enabled) return null

  const specs = DAY_ORDER
    .map((day) => ({ day, hours: hours[day] }))
    .filter((d): d is { day: DayKey; hours: { open: string; close: string } } => d.hours !== null)
    .map(({ day, hours: h }) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_TO_SCHEMA[day],
      opens: h.open,
      closes: h.close,
    }))

  return specs.length ? specs : null
}

/**
 * FAQPage JSON-LD — schema.org requires FAQPage to be a distinct top-level
 * entity (not nested inside another @type), so callers render this as a
 * SECOND <script> tag alongside the entity/profile block, never merged in.
 */
export function buildFaqJsonLd(faq: FaqItem[]): Record<string, unknown> | null {
  const valid = faq.filter((f) => f.question && f.answer)
  if (valid.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: valid.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
}
```

- [ ] **Step 2: Typecheck the new file in isolation**

Run: `npx tsc --noEmit lib/seo/structuredData.ts`
Expected: no errors (path aliases resolve via the repo's `tsconfig.json`; if the standalone
invocation complains about missing `@/*` resolution, instead run the full project typecheck in
Step 2 of Task 6 — this step is a fast sanity check, not the gate).

- [ ] **Step 3: Manually verify builder behavior via a scratch script**

Create a throwaway file to sanity-check edge cases before wiring into the page (deleted in Step 4):

```typescript
// scratchpad-verify.ts (temporary — delete after running)
import {
  buildAggregateRating, buildOpeningHours, buildFaqJsonLd, buildEntityJsonLd,
} from './lib/seo/structuredData'

console.log('empty reviews →', buildAggregateRating([]))
console.log('mixed status →', buildAggregateRating([
  { rating: 5, status: 'published' }, { rating: 3, status: 'published' },
  { rating: 1, status: 'hidden' },
]))
console.log('disabled hours →', buildOpeningHours({ timezone: 'UTC', enabled: false, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null }))
console.log('empty faq →', buildFaqJsonLd([]))
console.log('entity minimal →', buildEntityJsonLd({ type: 'Person', name: 'Priya', url: 'https://priya.kryla.work' }))
```

Run: `npx tsx scratchpad-verify.ts`
Expected output: `empty reviews → null`, `mixed status → { '@type': 'AggregateRating', ratingValue: 4, reviewCount: 2, ... }` (average of 5 and 3, hidden excluded), `disabled hours → null`, `empty faq → null`, `entity minimal →` an object with `@type: Person`, `name`, `url` only (no `image`/`sameAs` keys present).

- [ ] **Step 4: Delete the scratch script**

```bash
rm scratchpad-verify.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/seo/structuredData.ts
git commit -m "feat: add pure JSON-LD builders for member-page structured data"
```

---

## Task 2: Wire entity + rich-result JSON-LD into the member page

**Files:**
- Modify: `app/[slug]/page.tsx:92-220` (provider query, new reviews query, jsonLd construction, render)

**Interfaces:**
- Consumes from Task 1: `buildEntityJsonLd`, `buildAggregateRating`, `buildOpeningHours`,
  `buildFaqJsonLd`, `EntityInput`, `ReviewInput` from `lib/seo/structuredData.ts`.
- Consumes existing: `findProvider<T>` (page.tsx:26), `memberUrl`, `memberShareCardUrl`
  (`lib/links.ts`), `supabaseAdmin` (`lib/supabase/admin.ts`), `BusinessHours`/`FaqItem`
  (`app/[slug]/types.ts`).
- Produces: the rendered `<script type="application/ld+json">` blocks — no other task depends on
  this file's internals beyond the route existing.

- [ ] **Step 1: Add a reviews query alongside the existing `Promise.allSettled` batch**

In `app/[slug]/page.tsx`, the batch at lines 115-120 currently fetches avatar/gallery/menu/hours.
Add a fifth settled query for reviews:

```typescript
  const [avatarRes, galleryRes, menuFilesRes, hoursRes, reviewsRes] = await Promise.allSettled([
    supabaseAdmin.from('providers').select('avatar_url, instagram_handle, nextdoor_url').eq('id', provider.id).single(),
    supabaseAdmin.from('pages').select('gallery').eq('provider_id', provider.id).single(),
    supabaseAdmin.from('pages').select('menu_files').eq('provider_id', provider.id).single(),
    supabaseAdmin.from('providers').select('business_hours').eq('id', provider.id).single(),
    supabaseAdmin.from('reviews').select('rating, status').eq('provider_id', provider.id),
  ])
```

Then add the derived value near the other derived values (after `businessHours` at line 132):

```typescript
  const reviews = reviewsRes.status === 'fulfilled' && Array.isArray(reviewsRes.value.data)
    ? (reviewsRes.value.data as { rating: number; status: string }[])
    : []
```

- [ ] **Step 2: Replace the existing `jsonLd` block with entity + profile + rating/hours, and add a separate FAQ block**

Replace lines 197-220 (the current `jsonLd` construction and its render) with:

```typescript
  const entityType = page.schema_type || 'Person'

  const entityJsonLd = buildEntityJsonLd({
    type: entityType,
    name: `${provider.first_name} ${provider.last_name}`,
    url: memberUrl(params.slug),
    image: avatarUrl ?? memberShareCardUrl(params.slug),
    description: page.subheadline,
    telephone: provider.whatsapp_number
      ? `+${provider.whatsapp_number.replace(/\D/g, '')}`
      : null,
    addressLocality: provider.location || null,
    sameAs: [
      instagramHandle ? `https://www.instagram.com/${instagramHandle.replace(/^@/, '')}/` : '',
      nextdoorUrl ?? '',
    ].filter(Boolean),
  })

  const aggregateRating = buildAggregateRating(reviews)
  const openingHours = buildOpeningHours(businessHours)

  if (aggregateRating) entityJsonLd.aggregateRating = aggregateRating
  if (openingHours) entityJsonLd.openingHoursSpecification = openingHours

  const faqJsonLd = buildFaqJsonLd(page.faq ?? [])
```

Add the import at the top of the file (near the other `@/lib` imports):

```typescript
import {
  buildEntityJsonLd, buildAggregateRating, buildOpeningHours, buildFaqJsonLd,
} from '@/lib/seo/structuredData'
```

Update the render block (previously `{jsonLd && (...)}`) to:

```tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(entityJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
```

Note: `entityJsonLd` always renders now (previously it was conditional on `page.schema_type`) —
every live member page is itself a `Person` by default when no `schema_type` is set, which is the
correct minimum entity signal per the visibility goal. `APP_DOMAIN`/manual `https://${slug}.${APP_DOMAIN}`
string building (old line 203) is removed in favor of `memberUrl()`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `page.faq` types as `unknown` from the Supabase select, confirm it already
casts via `Array.isArray(page.faq) ? page.faq : []` at line 160 into `profileData.faq: FaqItem[]` —
use `profileData.faq` (already typed) instead of raw `page.faq` in the `buildFaqJsonLd` call:

```typescript
  const faqJsonLd = buildFaqJsonLd(profileData.faq)
```

(Move this line to after `profileData` is constructed, i.e. after line 172, and move the
`entityJsonLd`/`aggregateRating`/`openingHours` block there too, since `avatarUrl`, `instagramHandle`,
`nextdoorUrl` are already in scope from the earlier `Promise.allSettled` destructure — no need to
wait for `profileData` for those three, only for `faq`.)

- [ ] **Step 4: Manual verification against a real live provider**

Run: `npm run dev`, then in another terminal, using a known live member slug from the dev DB (ask
in chat if unsure which slug is `page_live=true`):

```bash
curl -s http://localhost:3000/api/... # not applicable; instead:
```

Open `http://localhost:3000/{slug}` in a browser with that slug's subdomain simulated (or visit the
deployed staging subdomain directly), View Source, and confirm:
- One `<script type="application/ld+json">` with `@type` = `Person` (or the stored `schema_type`),
  `url` = `https://{slug}.kryla.work`.
- If the member has published reviews, `aggregateRating` is present with correct `ratingValue`.
- If `business_hours.enabled` is true, `openingHoursSpecification` is present.
- If the member has FAQ entries, a **second** `<script type="application/ld+json">` with
  `@type: FAQPage` is present.

Paste both blocks into https://search.google.com/test/rich-results → expect "Page is eligible" with
no errors (warnings for optional fields are acceptable).

- [ ] **Step 5: Commit**

```bash
git add app/[slug]/page.tsx
git commit -m "feat: emit self-referencing entity JSON-LD + aggregateRating/hours/FAQPage on member pages"
```

---

## Task 3: Per-member `/sitemap.xml` route handler

**Files:**
- Create: `app/[slug]/sitemap.xml/route.ts`

**Interfaces:**
- Consumes: `supabaseAdmin`, `memberUrl(slug)` (`lib/links.ts`), the `findProvider`-style lookup
  (slug OR `custom_domain`, `page_live=true`).
- Produces: `GET` handler returning `Content-Type: application/xml` — no other task depends on this.

- [ ] **Step 1: Write the route handler**

```typescript
// app/[slug]/sitemap.xml/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { memberUrl } from '@/lib/links'

interface Props {
  params: { slug: string }
}

/**
 * Per-member sitemap — served at https://{slug}.kryla.work/sitemap.xml
 * (middleware rewrites the subdomain request to /{slug}/sitemap.xml).
 * Lists only that member's own public URL so each subdomain presents as a
 * self-contained site to crawlers, independent of the apex sitemap.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { data: bySlug } = await supabaseAdmin
    .from('providers')
    .select('slug, updated_at')
    .eq('slug', params.slug)
    .eq('page_live', true)
    .single()

  const provider = bySlug ?? (
    await supabaseAdmin
      .from('providers')
      .select('slug, updated_at')
      .eq('custom_domain', params.slug)
      .eq('page_live', true)
      .single()
  ).data

  if (!provider) {
    return new NextResponse('Not found', { status: 404 })
  }

  const url = memberUrl(params.slug)
  const lastmod = provider.updated_at
    ? new Date(provider.updated_at as string).toISOString()
    : new Date().toISOString()

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
```

**Note:** if `providers.updated_at` does not exist in the schema, drop the `lastmod` field and
`updated_at` selects entirely (check first — Step 2 covers this).

- [ ] **Step 2: Verify `providers.updated_at` exists before relying on it**

Run: `grep -rn "updated_at" "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work\supabase\migrations" | grep -i providers`
Expected: either a migration adding `updated_at` to `providers`, or no result. If no result, edit
the Step 1 code to remove `updated_at` from both `.select()` calls and the `lastmod` computation,
replacing the `<lastmod>` line with a literal `new Date().toISOString()` computed once at request
time (no DB dependency):

```typescript
  const lastmod = new Date().toISOString()
```

(and drop `, updated_at` from both `.select('slug, updated_at')` calls, and delete the
`provider.updated_at` line above).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, then simulate the subdomain locally (Next.js dev serves via the `Host` header,
so use `curl` with an explicit header against localhost, matching how `middleware.ts` reads
`req.headers.get('host')`):

```bash
curl -s -H "Host: {live-slug}.kryla.work" http://localhost:3000/sitemap.xml
```

Expected: valid XML with exactly one `<url>` entry, `<loc>https://{live-slug}.kryla.work</loc>`.

```bash
curl -s -H "Host: nonexistent-slug-xyz.kryla.work" http://localhost:3000/sitemap.xml -o /dev/null -w "%{http_code}\n"
```

Expected: `404`.

- [ ] **Step 5: Commit**

```bash
git add "app/[slug]/sitemap.xml/route.ts"
git commit -m "feat: serve per-member sitemap.xml on each subdomain"
```

---

## Task 4: Per-member `/robots.txt` route handler

**Files:**
- Create: `app/[slug]/robots.txt/route.ts`

**Interfaces:**
- Consumes: same provider-lookup pattern as Task 3, `memberUrl(slug)` (`lib/links.ts`).
- Produces: `GET` handler returning `Content-Type: text/plain` — no other task depends on this.

- [ ] **Step 1: Write the route handler**

```typescript
// app/[slug]/robots.txt/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { memberUrl } from '@/lib/links'

interface Props {
  params: { slug: string }
}

/**
 * Per-member robots.txt — served at https://{slug}.kryla.work/robots.txt.
 * Makes each subdomain read as its own self-describing site: allows the
 * public page, disallows the member's private surfaces, and points at this
 * member's own sitemap (not the apex sitemap).
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { data: bySlug } = await supabaseAdmin
    .from('providers')
    .select('slug')
    .eq('slug', params.slug)
    .eq('page_live', true)
    .single()

  const provider = bySlug ?? (
    await supabaseAdmin
      .from('providers')
      .select('slug')
      .eq('custom_domain', params.slug)
      .eq('page_live', true)
      .single()
  ).data

  if (!provider) {
    return new NextResponse('Not found', { status: 404 })
  }

  const body = `User-agent: *
Allow: /
Disallow: /mykryla
Disallow: /mychat
Disallow: /preview
Disallow: /print

Sitemap: ${memberUrl(params.slug)}/sitemap.xml
`

  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Manual verification**

```bash
curl -s -H "Host: {live-slug}.kryla.work" http://localhost:3000/robots.txt
```

Expected: plain text with `Allow: /`, the four `Disallow` lines, and
`Sitemap: https://{live-slug}.kryla.work/sitemap.xml`.

```bash
curl -s -H "Host: nonexistent-slug-xyz.kryla.work" http://localhost:3000/robots.txt -o /dev/null -w "%{http_code}\n"
```

Expected: `404`.

- [ ] **Step 4: Commit**

```bash
git add "app/[slug]/robots.txt/route.ts"
git commit -m "feat: serve per-member robots.txt on each subdomain"
```

---

## Task 5: Apex→subdomain 301 redirect in middleware

**Files:**
- Modify: `middleware.ts:1-59` (apex/www/localhost branch)
- Modify: `lib/slug.ts:23-29` (`RESERVED_SLUGS` — add `directory`)

**Interfaces:**
- Consumes: `RESERVED_SLUGS` (`lib/slug.ts`), `supabaseAdmin` (for the slug-exists check — must be
  usable inside Edge middleware; see Step 1 note on `createServerClient` vs a lightweight REST
  check), `APP_DOMAIN` (already defined locally in `middleware.ts:4`).
- Produces: a 308 redirect for apex paths whose first segment is a live member slug. No other task
  depends on this file's internals.

- [ ] **Step 1: Add `directory` to `RESERVED_SLUGS`**

In `lib/slug.ts`, the set at lines 23-29 currently omits several real top-level routes
(`directory`, `mykryla`, `mychat`, `print`, `consent`, `welcome`, `get-app`). Add `directory` here
(it's the one truly *reservable* new route — a slug a member could otherwise pick at onboarding and
collide with):

```typescript
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'auth', 'billing', 'blog', 'checkout',
  'community', 'contact', 'dashboard', 'directory', 'docs', 'help', 'home',
  'join', 'kryla', 'login', 'logout', 'me', 'new', 'onboarding',
  'pricing', 'privacy', 'settings', 'signup', 'static', 'support',
  'terms', 'v1', 'v2', 'www',
])
```

- [ ] **Step 2: Add the apex-path redirect to `middleware.ts`**

The current apex/www/localhost branch (lines 13-59) only guards `/mychat`, `/mykryla`, `/print`.
Insert a new check **before** that guard: if the first path segment isn't a reserved/real app route
and matches a live provider's slug, 308-redirect to the subdomain. This needs a DB check — reuse the
lightweight two-query pattern already used elsewhere (`findProvider`), via `supabaseAdmin` (Edge
middleware can call Supabase over `fetch`, which `supabaseAdmin`'s client uses under the hood — no
Node-only APIs required).

Add this list and function near the top of `middleware.ts`, after the `APP_DOMAIN` constant:

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin'
import { RESERVED_SLUGS } from '@/lib/slug'

// Top-level app routes that are NOT member slugs — never redirect these,
// even though some (e.g. 'onboarding') aren't in RESERVED_SLUGS (that set is
// for slug-picking at signup, this one is for routing).
const APP_ROUTES = new Set([
  ...RESERVED_SLUGS,
  'mykryla', 'mychat', 'print', 'consent', 'welcome', 'get-app',
  'onboarding', 'login', 'join', 'directory', 'auth',
])

async function findLiveSlug(firstSegment: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('slug')
    .or(`slug.eq.${firstSegment},custom_domain.eq.${firstSegment}`)
    .eq('page_live', true)
    .maybeSingle()
  return (data?.slug as string | undefined) ?? null
}
```

Then, inside the apex/www/localhost branch (right after the `if (hostname === APP_DOMAIN || ...)`
opening brace, i.e. right after line 17's `) {`), insert the redirect check before the existing
`/mychat`/`/mykryla`/`/print` guard:

```typescript
    const segments = url.pathname.split('/').filter(Boolean)
    const firstSegment = segments[0]

    if (firstSegment && !APP_ROUTES.has(firstSegment) && !url.pathname.startsWith('/api')) {
      const liveSlug = await findLiveSlug(firstSegment)
      if (liveSlug) {
        const rest = '/' + segments.slice(1).join('/')
        const redirectUrl = new URL(
          `https://${liveSlug}.${APP_DOMAIN}${rest === '/' ? '' : rest}`
        )
        return NextResponse.redirect(redirectUrl, 308)
      }
    }
```

This runs a DB lookup only for non-reserved first segments (cheap — most requests hit `/api`,
`/_next`, or known routes and short-circuit before ever reaching this branch, since the matcher
already excludes `_next/static`/`_next/image`/`favicon.ico`, and `/api` is excluded explicitly
here). `maybeSingle()` (not `.single()`) avoids throwing when no row matches.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `supabaseAdmin` import fails inside `middleware.ts` due to Edge runtime
constraints (Node-only APIs in the admin client), check `lib/supabase/admin.ts`'s runtime
compatibility — the lazy Proxy pattern documented in CLAUDE.md was built to defer env-var access,
not necessarily to guarantee Edge compatibility. If typecheck or `npm run build` reports an Edge
runtime incompatibility, add `export const runtime = 'nodejs'` is not valid for middleware (Next
requires Edge for `middleware.ts`); in that case fall back to a direct `fetch()` call against the
Supabase REST endpoint instead of the `supabaseAdmin` client:

```typescript
async function findLiveSlug(firstSegment: string): Promise<string | null> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/providers?select=slug&or=(slug.eq.${firstSegment},custom_domain.eq.${firstSegment})&page_live=eq.true&limit=1`
  const res = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) return null
  const rows = (await res.json()) as { slug: string }[]
  return rows[0]?.slug ?? null
}
```

Only make this switch if the `supabaseAdmin` import genuinely fails the build — try the simpler
import first.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, then:

```bash
curl -sI http://localhost:3000/{live-slug} -H "Host: localhost:3000"
```

Expected: `308` with `Location: https://{live-slug}.kryla.work`.

```bash
curl -sI http://localhost:3000/onboarding -H "Host: localhost:3000"
curl -sI http://localhost:3000/login -H "Host: localhost:3000"
curl -sI http://localhost:3000/directory -H "Host: localhost:3000"
curl -sI http://localhost:3000/nonexistent-random-slug-abc123 -H "Host: localhost:3000"
```

Expected: all `200` (or the app's normal response for `/directory` once Task 6 exists — `404` is
acceptable for `/directory` *before* Task 6 lands, but must NOT be a `308` redirect in either case).
`/nonexistent-random-slug-abc123` must be `200`/`404` from the normal app routing, never a redirect.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts lib/slug.ts
git commit -m "feat: 301 apex member paths to their canonical subdomain"
```

---

## Task 6: Directory hub — `/directory` and `/directory/[persona]`

**Files:**
- Create: `app/directory/page.tsx`
- Create: `app/directory/[persona]/page.tsx`

**Interfaces:**
- Consumes: `getEnabledPersonas()` (`lib/personas.ts`, returns `PersonaRow[]` with
  `{id, label, emoji, ...}`), `supabaseAdmin`, `memberUrl(slug)` (`lib/links.ts`).
- Produces: two indexable pages — no other task depends on their internals.

- [ ] **Step 1: Write the directory index page**

```tsx
// app/directory/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { getEnabledPersonas } from '@/lib/personas'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { SITE_URL } from '@/lib/links'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Browse professionals — Kryla',
  description: 'Find tutors, bakers, advocates, and other independent professionals on Kryla.',
  alternates: { canonical: `${SITE_URL}/directory` },
}

async function getPersonaCounts(): Promise<Record<string, number>> {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('persona')
    .eq('page_live', true)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const persona = (row as { persona: string }).persona
    counts[persona] = (counts[persona] ?? 0) + 1
  }
  return counts
}

export default async function DirectoryPage() {
  const [personas, counts] = await Promise.all([getEnabledPersonas(), getPersonaCounts()])
  const listed = personas.filter((p) => (counts[p.id] ?? 0) > 0)

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: listed.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/directory/${p.id}`,
      name: p.label,
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kryla', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: `${SITE_URL}/directory` },
    ],
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1 className="text-3xl font-bold mb-8">Browse professionals</h1>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {listed.map((p) => (
          <li key={p.id}>
            <Link
              href={`/directory/${p.id}`}
              className="block rounded-lg border p-4 hover:border-black transition-colors"
            >
              <span className="text-2xl">{p.emoji}</span>
              <div className="font-medium">{p.label}</div>
              <div className="text-sm text-gray-500">{counts[p.id]} listed</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Write the per-persona directory page**

```tsx
// app/directory/[persona]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getEnabledPersonas } from '@/lib/personas'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { memberUrl, SITE_URL } from '@/lib/links'

export const revalidate = 3600

interface Props {
  params: { persona: string }
}

interface MemberRow {
  slug: string
  first_name: string
  last_name: string
  location: string
  avatar_url: string | null
}

async function getPersonaLabel(personaId: string): Promise<string | null> {
  const personas = await getEnabledPersonas()
  return personas.find((p) => p.id === personaId)?.label ?? null
}

export async function generateStaticParams() {
  const personas = await getEnabledPersonas()
  return personas.map((p) => ({ persona: p.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const label = await getPersonaLabel(params.persona)
  if (!label) return { title: 'Not found' }

  return {
    title: `${label}s on Kryla`,
    description: `Browse independent ${label.toLowerCase()}s with a live presence on Kryla.`,
    alternates: { canonical: `${SITE_URL}/directory/${params.persona}` },
  }
}

async function getMembers(personaId: string): Promise<MemberRow[]> {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('slug, first_name, last_name, location, avatar_url')
    .eq('persona', personaId)
    .eq('page_live', true)
    .order('created_at', { ascending: false })

  return (data ?? []) as MemberRow[]
}

export default async function DirectoryPersonaPage({ params }: Props) {
  const label = await getPersonaLabel(params.persona)
  if (!label) return notFound()

  const members = await getMembers(params.persona)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kryla', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: `${SITE_URL}/directory` },
      { '@type': 'ListItem', position: 3, name: `${label}s`, item: `${SITE_URL}/directory/${params.persona}` },
    ],
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1 className="text-3xl font-bold mb-8">{label}s on Kryla</h1>
      {members.length === 0 ? (
        <p className="text-gray-500">No {label.toLowerCase()}s are live yet.</p>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.slug}>
              <a
                href={memberUrl(m.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-4 hover:border-black transition-colors"
              >
                {m.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                )}
                <div>
                  <div className="font-medium">{m.first_name} {m.last_name}</div>
                  {m.location && <div className="text-sm text-gray-500">{m.location}</div>}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, visit `http://localhost:3000/directory` → confirm one `<h1>`, a grid of enabled
personas with non-zero counts, each linking to `/directory/{id}`. Visit
`http://localhost:3000/directory/{a-persona-with-live-members}` → confirm member cards link out to
`https://{slug}.kryla.work` (external links, `target="_blank"`). Visit
`http://localhost:3000/directory/not-a-real-persona` → expect Next's 404 page.

- [ ] **Step 5: Commit**

```bash
git add app/directory
git commit -m "feat: add persona-grouped directory hub at /directory"
```

---

## Task 7: Apex sitemap, robots, and noindex/metadata cleanup

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Modify: `app/admin/layout.tsx` (add `metadata.robots`)
- Modify: `app/print/[kind]/[id]/page.tsx`, `app/print/hearings/page.tsx` (add `metadata.robots`)
- Modify: `app/consent/[token]/page.tsx` (add `metadata.robots`)
- Modify: `app/page.tsx` (add page-level `metadata`)
- Modify: `app/layout.tsx` (add title template)

**Interfaces:**
- Consumes: `getEnabledPersonas()` (`lib/personas.ts`), `supabaseAdmin`, `memberUrl`, `SITE_URL`
  (`lib/links.ts`).
- Produces: `/sitemap.xml` and `/robots.txt` on the apex — terminal task, nothing depends on it.

- [ ] **Step 1: Write the apex sitemap**

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getEnabledPersonas } from '@/lib/personas'
import { memberUrl, SITE_URL } from '@/lib/links'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [personas, membersRes] = await Promise.all([
    getEnabledPersonas(),
    supabaseAdmin.from('providers').select('slug, persona').eq('page_live', true),
  ])

  const members = (membersRes.data ?? []) as { slug: string; persona: string }[]
  const personaIds = new Set(personas.map((p) => p.id))
  const listedPersonas = new Set(members.map((m) => m.persona).filter((p) => personaIds.has(p)))

  const marketing: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/directory`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const directoryEntries: MetadataRoute.Sitemap = [...listedPersonas].map((persona) => ({
    url: `${SITE_URL}/directory/${persona}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const memberEntries: MetadataRoute.Sitemap = members.map((m) => ({
    url: memberUrl(m.slug),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...marketing, ...directoryEntries, ...memberEntries]
}
```

- [ ] **Step 2: Write the apex robots**

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/links'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/mykryla', '/mychat', '/admin', '/print', '/consent', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 3: Add `noindex` to admin, print, and consent routes**

Read `app/admin/layout.tsx` first to find its existing exports, then add a `metadata` export
alongside them (if the file is `'use client'`, metadata must move to a wrapping server
`layout.tsx` or the nearest server-rendered ancestor — check the file before editing):

```typescript
export const metadata = {
  robots: { index: false, follow: false },
}
```

Apply the same `metadata` export (merging with any existing `metadata` object rather than
duplicating the key) to:
- `app/print/[kind]/[id]/page.tsx`
- `app/print/hearings/page.tsx`
- `app/consent/[token]/page.tsx`

For any of these that are `'use client'` components without an existing server wrapper, create a
minimal server-only `layout.tsx` in the same directory that exports just the `metadata` and
renders `{children}`, following the same pattern already used by `app/[slug]/layout.tsx`.

- [ ] **Step 4: Add landing-page metadata and root title template**

In `app/page.tsx`, add (it's currently a thin async server component with no metadata export):

```typescript
export const metadata: Metadata = {
  title: 'Kryla.work — One platform, built around your craft',
  description: 'Run it, grow it — your way. The business platform built around your craft, alongside how you already work. Live in 15 minutes.',
  alternates: { canonical: SITE_URL },
}
```

(Import `Metadata` from `next` and `SITE_URL` from `@/lib/links` at the top of the file.)

In `app/layout.tsx`, change the root `metadata.title` from a plain string to a template so child
pages compose rather than fully replace it:

```typescript
  title: {
    default: "Kryla.work — One platform, built around your craft",
    template: '%s — Kryla',
  },
```

(Replace the existing `title: "Kryla.work — One platform, built around your craft",` line with the
above object.)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Manual verification**

```bash
curl -s http://localhost:3000/sitemap.xml | head -30
curl -s http://localhost:3000/robots.txt
```

Expected: sitemap XML includes the apex URL, `/directory`, at least one `/directory/{persona}` (for
a persona with live members), and member subdomain URLs. Robots includes the five `Disallow` paths
and a `Sitemap:` line pointing at `https://kryla.work/sitemap.xml`.

Visit `/admin`, `/print/...`, `/consent/{any-token}` and View Source → confirm
`<meta name="robots" content="noindex,nofollow">` is present in each `<head>`.

- [ ] **Step 7: Commit**

```bash
git add app/sitemap.ts app/robots.ts app/admin/layout.tsx app/print app/consent app/page.tsx app/layout.tsx
git commit -m "feat: add apex sitemap/robots, noindex private routes, landing metadata"
```

---

## Task 8: Full-flow verification and Search Console launch checklist

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds; `app/directory`, `app/directory/[persona]`, `app/[slug]/sitemap.xml`,
`app/[slug]/robots.txt`, `app/sitemap.ts`, `app/robots.ts` all appear in the build output route list
with no errors.

- [ ] **Step 2: Run the existing e2e smoke suite to confirm no regressions**

Run: `npm run test:e2e`
Expected: all existing tests in `tests/e2e/smoke.spec.ts` still pass (home page, join page, login
page, onboarding — none of this plan's changes touch those flows, so this is a regression check).

- [ ] **Step 3: End-to-end manual checklist against a staging/live deployment**

- [ ] `https://{live-slug}.kryla.work/robots.txt` → member-specific robots, `Sitemap:` line points
  to that member's own sitemap.
- [ ] `https://{live-slug}.kryla.work/sitemap.xml` → one `<url>` entry for that member only.
- [ ] View Source on `https://{live-slug}.kryla.work` → self-referencing entity JSON-LD present
  with `url` matching the subdomain; `aggregateRating`/`openingHoursSpecification` present if the
  member has published reviews / enabled hours; a separate `FAQPage` block present if the member
  has FAQ entries. All three validate at https://search.google.com/test/rich-results.
- [ ] `curl -sI https://kryla.work/{live-slug}` → `308` to `https://{live-slug}.kryla.work`.
- [ ] `curl -sI https://kryla.work/directory`, `/onboarding`, `/login`, `/join` → all `200`, none
  redirected.
- [ ] `https://kryla.work/sitemap.xml` and `/robots.txt` → apex versions, include `/directory` and
  member subdomain URLs.
- [ ] `https://kryla.work/directory` and `/directory/{persona}` → render correctly, links to member
  subdomains work.

- [ ] **Step 4: Document the manual Search Console launch step**

This step has no code — it's an operational task for whoever has Search Console access. Confirm the
following is either already done or explicitly handed off (not silently skipped):
- Verify domain ownership for `kryla.work` (covers all subdomains via DNS verification) in Google
  Search Console.
- Submit `https://kryla.work/sitemap.xml`.
- Spot-check 2-3 live member subdomains via the URL Inspection tool to confirm they're crawlable
  post-redirect.

- [ ] **Step 5: Final commit (if any cleanup was needed)**

If Steps 1-4 surfaced any fixes, commit them individually with descriptive messages following the
pattern of prior tasks. If no fixes were needed, this task ends with no commit — verification-only
tasks don't require one.
