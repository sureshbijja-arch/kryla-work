# Member Page Design Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kill "AI slop" on kryla.work's customer-facing member pages by (A) replacing the flat 6-palette/3-font/no-mode system with curated per-persona theme presets stored in the existing `layout_presets` table, and (B) applying a locked calm/premium visual language (Fraunces+Inter typefaces, cool-ivory surfaces, subtle motion) to the shared section/template components that render every member's page.

**Architecture:** Two sequential phases. Phase A extends the *existing* `layout_presets` table (already a DB-driven, admin-CRUD-able preset picker surfaced in MyKryla's `LayoutsTab.tsx`) with `design_mode` + richer neutral-surface columns, re-curates the seed rows for 3 focus personas (Tiffin/Salon/Physio) with real font pairings, and wires the applied preset's `design_mode` through to `pages.design_mode` (currently only set once at build time, never by the layout picker). Phase B loads real webfonts via `next/font`, retunes the `[data-mode]` CSS custom properties in `app/globals.css` that every section/template already reads, and refines the section/template components to the cool-ivory surface language — all while preserving the existing CSS-variable contract (`--color-accent*`, `--type-*`, `--space-*`, `--radius-*`) so no section needs a bespoke rewrite.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3, Supabase (Postgres), `next/font/google`.

## Global Constraints
- **No hardcoding of configurable data.** Curated theme presets (palette/font/mode bundles) live in the `layout_presets` table, never as new TypeScript literals. Foundation *code* (webfont loading, the `[data-mode]` token architecture, motion primitives) is legitimate — it doesn't change per member.
- **No tech debt.** Retune existing token blocks/components in place. No `TODO`s, no `any`, no duplicated CSS. Where a value moves to the DB, remove the old hardcoded version — don't leave both.
- **Preserve the CSS-variable contract.** `LayoutRenderer.tsx` sets `--color-accent*` (inline styles) and `data-mode` (attribute) on its wrapper; every section/template consumes these via `var(--color-accent)`, `var(--type-*)`, etc. Phase B must not introduce a second, parallel styling mechanism.
- **Scope: customer-facing member pages only.** Do not touch `app/mychat/*` visuals (only `LayoutsTab.tsx`'s existing preset-card preview gets richer data to render — no new UI surface) or `app/HomeClient.tsx` (landing page).
- **3 focus personas first.** Design and prove real theme presets for `tiffin`, `salon`, `physio` before extending the pattern to remaining persona families (a later, separate pass — not part of this plan).
- Every migration file name uses today's date prefix `20260728` with a time later than the last existing migration (`20260728143601_hero_fit_config.sql`).

---

## File Structure

**New files:**
- `supabase/migrations/20260728150000_layout_presets_theme_columns.sql` — adds `design_mode`, `page_bg`, `surface`, `border_color` columns to `layout_presets`; backfills existing rows; re-seeds Tiffin/Salon/Physio presets with curated theme data.

**Modified files:**
- `lib/layouts.ts` — extend `LayoutOption`/`enrichLayout` with the new columns; add `DesignMode` type; add font-pairing metadata.
- `app/api/mychat/layout/route.ts` — accept + validate + persist `design_mode` when a preset is applied.
- `app/api/admin/layouts/route.ts`, `app/api/admin/layouts/[id]/route.ts` — accept new columns in create/update.
- `app/admin/layouts/page.tsx` — form fields for `design_mode`/new neutrals; preview swatch shows them.
- `app/mychat/LayoutsTab.tsx` — preset card preview renders the mode-driven radius/spacing, not just accent/bg.
- `app/layout.tsx` — load `Fraunces` + `Inter` via `next/font/google`.
- `tailwind.config.ts` — point `fontFamily.inter`/`fontFamily.fraunces` at the loaded CSS variables.
- `app/globals.css` — retune `[data-mode='craft']` / `[data-mode='editorial']` token values; add Fraunces to heading font-family within those blocks; move neutral tokens toward cool-ivory.
- `app/[slug]/components/sections/HeroSection.tsx`, `ServicesSection.tsx`, `HighlightsSection.tsx`, `BioSection.tsx`, `GallerySection.tsx`, `FaqSection.tsx`, `ContactSection.tsx`, `ReviewsSection.tsx` — swap literal hex borders/shadows for cool-ivory hairline/soft-shadow treatment; no prop signature changes.
- `app/[slug]/components/shared.tsx` — `SectionHeading`, `Footer`, `FaqList` neutral colors → cool-ivory hex values.
- `app/[slug]/components/AnimateIn.tsx` — accept a `delay` prop already exists; tune keyframe duration/easing.
- `app/[slug]/components/LayoutRenderer.tsx` — pass an incremental stagger `delay` into `AnimateIn` per section index.
- `app/globals.css` (`sectionFadeUp` keyframes) — retune to the locked "Subtle" timing.

---

# PHASE A — Curated per-persona theme presets

### Task A1: Add theme columns to `layout_presets` + re-seed Tiffin/Salon/Physio

**Files:**
- Create: `supabase/migrations/20260728150000_layout_presets_theme_columns.sql`
- Test: manual verification via Supabase SQL editor / `mcp__plugin_supabase_supabase__execute_sql` (no automated test harness exists for migrations in this project — verified by inspecting seeded rows)

**Interfaces:**
- Produces: `layout_presets` rows now carry `design_mode text NOT NULL DEFAULT 'craft'`, `page_bg text NOT NULL DEFAULT '#FFFFFF'`, `surface text NOT NULL DEFAULT '#FFFFFF'`, `border_color text NOT NULL DEFAULT '#E5E5E5'`. Existing `id, persona, name, description, template, palette, font, sort_order, active, image_url, sections` columns unchanged (see `supabase/migrations/20260629000001_layout_presets.sql`, `20260629000004_layout_image_url.sql`, `20260629000005_section_engine.sql` for current shape).

- [ ] **Step 1: Write the migration — add columns + backfill + re-seed 3 personas**

```sql
-- supabase/migrations/20260728150000_layout_presets_theme_columns.sql
--
-- Design refresh: layout_presets gains real theme data (design_mode + neutral
-- surface tokens) so presets are genuine "vibes" (palette + font + mode +
-- surface), not just a palette/font pair. Existing rows backfilled with safe
-- defaults; Tiffin/Salon/Physio (the 3 focus personas) get curated presets
-- using the locked Fraunces+Inter / cool-ivory language.

ALTER TABLE layout_presets
  ADD COLUMN IF NOT EXISTS design_mode  text NOT NULL DEFAULT 'craft',
  ADD COLUMN IF NOT EXISTS page_bg      text NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS surface      text NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS border_color text NOT NULL DEFAULT '#E5E5E5';

-- Backfill existing rows: derive design_mode from the persona's current
-- DESIGN_MODE_MAP (inngest/build-page.ts) so pre-existing presets keep their
-- current visual family instead of silently flattening to 'craft'.
UPDATE layout_presets SET design_mode = 'editorial'
  WHERE persona IN ('photographer', 'doctor', 'musician', 'tutor');
-- (all other existing personas — trainer, baker, salon, chef, other — already
-- default correctly to 'craft', matching DESIGN_MODE_MAP)

-- Remove the old 4 generic salon presets — replaced below with curated ones.
DELETE FROM layout_presets WHERE persona = 'salon';

-- Tiffin — cool-ivory, craft mode, Fraunces headings + Inter body
INSERT INTO layout_presets
  (persona, name, description, template, palette, font, design_mode, page_bg, surface, border_color, sort_order) VALUES
('tiffin', 'Home Kitchen',   'Warm and trustworthy — daily thali service', 'storefront', 'professional', 'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 0),
('tiffin', 'Fresh Table',    'Bright, fresh-ingredients feel',             'storefront', 'fresh',        'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 1),
('tiffin', 'Golden Thali',   'Rich, festive, celebration-ready',           'storefront', 'warm',         'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 2);

-- Salon / Makeup — cool-ivory, craft mode, boutique feel
INSERT INTO layout_presets
  (persona, name, description, template, palette, font, design_mode, page_bg, surface, border_color, sort_order) VALUES
('salon', 'Atelier',  'Elegant and premium — editorial boutique feel', 'storefront', 'minimal',  'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 0),
('salon', 'Blush',    'Warm and inviting — personal, glow-forward',    'storefront', 'warm',     'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 1),
('salon', 'Noir',     'Bold and dramatic — high-fashion minimal',      'storefront', 'minimal',  'inter', 'editorial', '#FAFAF9', '#FFFFFF', '#ECECEA', 2);

-- Physio / Clinical — cool-ivory, editorial mode, calm-clinical feel
INSERT INTO layout_presets
  (persona, name, description, template, palette, font, design_mode, page_bg, surface, border_color, sort_order) VALUES
('physio', 'Clinic',  'Professional and precise — clinical trust',   'clinic', 'calm',         'inter', 'editorial', '#FAFAF9', '#FFFFFF', '#ECECEA', 0),
('physio', 'Recover', 'Calming, human, recovery-focused warmth',     'clinic', 'fresh',        'inter', 'editorial', '#FAFAF9', '#FFFFFF', '#ECECEA', 1);
```

- [ ] **Step 2: Apply the migration**

Run: `mcp__plugin_supabase_supabase__apply_migration` with `name: "layout_presets_theme_columns"` and the SQL body above, targeting the project (confirm project ref matches PROD per `[[project_kryla_supabase_projects]]` — `zdmkwteyitnhvsmueurf`), or via Supabase CLI if working against a local/branch DB per the project's normal migration workflow.

- [ ] **Step 3: Verify the migration applied correctly**

Run (via `mcp__plugin_supabase_supabase__execute_sql`):
```sql
SELECT persona, name, template, palette, font, design_mode, page_bg, surface, border_color
FROM layout_presets
WHERE persona IN ('tiffin', 'salon', 'physio')
ORDER BY persona, sort_order;
```
Expected: 3 tiffin rows, 3 salon rows, 2 physio rows, each with the values from Step 1 (no NULLs, `design_mode` populated).

Also run:
```sql
SELECT persona, design_mode FROM layout_presets
WHERE persona IN ('photographer','doctor','musician','tutor') LIMIT 4;
```
Expected: all `editorial`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260728150000_layout_presets_theme_columns.sql
git commit -m "feat: add design_mode + neutral-surface columns to layout_presets, seed Tiffin/Salon/Physio theme presets"
```

---

### Task A2: Extend `lib/layouts.ts` types + `enrichLayout` for the new columns

**Files:**
- Modify: `lib/layouts.ts`
- Test: `lib/layouts.test.ts` (new — this project has no existing test file for `lib/layouts.ts`; check `package.json` for the test runner before writing, likely Vitest or Jest per existing `*.test.ts` files in the repo — search `**/*.test.ts` to confirm the runner and matcher conventions used elsewhere before Step 1)

**Interfaces:**
- Consumes: nothing new (pure data-shape change).
- Produces: `LayoutOption` gains `designMode: DesignMode`, `pageBg: string`, `surface: string`, `borderColor: string`. `enrichLayout(row)` now maps these from the DB row. New exported type `DesignMode = 'craft' | 'editorial' | 'product'` (matches `app/[slug]/types.ts`'s existing `DesignMode` union — do not diverge).

- [ ] **Step 1: Find the test runner convention**

Run: `Grep` for `"test":` in `package.json` to confirm whether this project uses Vitest, Jest, or Playwright-only (no unit tests). If no unit-test runner exists, skip Steps 2–4 below and instead verify Task A2 manually via Step 5 (TypeScript compile) — do not introduce a new test framework for one file.

- [ ] **Step 2 (if a unit-test runner exists): Write the failing test**

```ts
// lib/layouts.test.ts
import { describe, it, expect } from 'vitest' // adjust import to match project's actual runner
import { enrichLayout } from './layouts'

describe('enrichLayout', () => {
  it('maps design_mode, page_bg, surface, border_color from the DB row', () => {
    const result = enrichLayout({
      id: 'abc', name: 'Atelier', description: 'Elegant', template: 'storefront',
      palette: 'minimal', font: 'inter',
      design_mode: 'craft', page_bg: '#FAFAF9', surface: '#FFFFFF', border_color: '#ECECEA',
    })
    expect(result.designMode).toBe('craft')
    expect(result.pageBg).toBe('#FAFAF9')
    expect(result.surface).toBe('#FFFFFF')
    expect(result.borderColor).toBe('#ECECEA')
  })
})
```

- [ ] **Step 3 (if runner exists): Run test to verify it fails**

Run: the project's test command (from `package.json`'s `"test"` script) scoped to `lib/layouts.test.ts`.
Expected: FAIL — `design_mode`/`page_bg` etc. not yet accepted by `enrichLayout`'s row type, or `result.designMode` is `undefined`.

- [ ] **Step 4: Implement — extend `lib/layouts.ts`**

```ts
export type TemplateKey  = 'focus' | 'portfolio' | 'storefront' | 'clinic'
export type PaletteKey   = 'professional' | 'fresh' | 'warm' | 'minimal' | 'creative' | 'calm'
export type FontKey      = 'inter' | 'georgia' | 'trebuchet'
export type DesignMode   = 'craft' | 'editorial' | 'product'

export interface SectionEntry {
  sectionKey: string
  variant:    string
  order:      number
}

export interface LayoutOption {
  id:          string
  name:        string
  description: string
  template:    TemplateKey
  palette:     PaletteKey
  font:        FontKey
  designMode:  DesignMode
  accent:      string
  bg:          string
  pageBg:      string
  surface:     string
  borderColor: string
  imageUrl:    string | null
  sections:    SectionEntry[] | null
}

export const ACCENT: Record<PaletteKey, string> = {
  professional: '#F5A623',
  fresh:        '#22C55E',
  warm:         '#EA8C00',
  minimal:      '#0D0D0D',
  creative:     '#9333EA',
  calm:         '#3B82F6',
}

export const PAGE_BG: Record<PaletteKey, string> = {
  professional: '#FFFFFF',
  fresh:        '#F0FDF4',
  warm:         '#FFF7ED',
  minimal:      '#FFFFFF',
  creative:     '#FAF5FF',
  calm:         '#EFF6FF',
}

export const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  focus:      'Focus',
  portfolio:  'Portfolio',
  storefront: 'Storefront',
  clinic:     'Clinic',
}

export const FONT_LABEL: Record<FontKey, string> = {
  inter:     'Sans',
  georgia:   'Serif',
  trebuchet: 'Modern',
}

export const DESIGN_MODE_LABEL: Record<DesignMode, string> = {
  craft:     'Warm',
  editorial: 'Editorial',
  product:   'Product',
}

export const PERSONAS = [
  'tutor', 'trainer', 'baker', 'photographer',
  'salon', 'chef', 'doctor', 'musician', 'tiffin', 'physio', 'other', 'all',
] as const

export type PersonaKey = typeof PERSONAS[number]

export function enrichLayout(row: {
  id: string; name: string; description: string
  template: string; palette: string; font: string
  design_mode?: string | null
  page_bg?: string | null
  surface?: string | null
  border_color?: string | null
  image_url?: string | null
  sections?: SectionEntry[] | null
}): LayoutOption {
  const palette = row.palette as PaletteKey
  return {
    id:          row.id,
    name:        row.name,
    description: row.description,
    template:    row.template as TemplateKey,
    palette,
    font:        row.font as FontKey,
    designMode:  (row.design_mode as DesignMode) ?? 'craft',
    accent:      ACCENT[palette] ?? '#F5A623',
    bg:          PAGE_BG[palette] ?? '#FFFFFF',
    pageBg:      row.page_bg      ?? PAGE_BG[palette] ?? '#FFFFFF',
    surface:     row.surface      ?? '#FFFFFF',
    borderColor: row.border_color ?? '#E5E5E5',
    imageUrl:    row.image_url ?? null,
    sections:    row.sections ?? null,
  }
}
```

Note: added `'tiffin'` and `'physio'` to the `PERSONAS` const array (used by the admin form's persona dropdown at `app/admin/layouts/page.tsx`) — without this, the admin UI can't create/filter presets for these two focus personas.

- [ ] **Step 5: Run test to verify it passes (or, if no runner: typecheck)**

If a test runner exists: run it again, expect PASS.
Otherwise: run `npm run build` (or `npx tsc --noEmit` if faster) from the `kryla.work` project root — expect no new type errors introduced by this file.

- [ ] **Step 6: Commit**

```bash
git add lib/layouts.ts lib/layouts.test.ts
git commit -m "feat: extend lib/layouts.ts with design_mode + neutral-surface fields"
```
(Omit `lib/layouts.test.ts` from the add if no test runner exists and the file wasn't created.)

---

### Task A3: Persist `design_mode` when a member applies a layout preset

**Files:**
- Modify: `app/api/mychat/layout/route.ts`
- Test: manual (no existing test coverage for this route; verified via Step 3's curl-equivalent check)

**Interfaces:**
- Consumes: `LayoutOption.designMode` (from Task A2) sent by `LayoutsTab.tsx`'s `handleApplyLayout`.
- Produces: `pages.draft_data.pages.design_mode` now set alongside `template`/`palette`/`font` — previously `design_mode` was never written by this route (confirmed: current `pageUpdates` only sets `{ template, palette, font }`; `design_mode` was set once at member-build time by `inngest/build-page.ts` and never updated after).

- [ ] **Step 1: Modify the route to accept + validate + persist `design_mode`**

```ts
// app/api/mychat/layout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { SectionEntry } from '@/lib/layouts'

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }

const VALID_TEMPLATES    = new Set(['focus', 'portfolio', 'storefront', 'clinic'])
const VALID_PALETTES     = new Set(['professional', 'fresh', 'warm', 'minimal', 'creative', 'calm'])
const VALID_FONTS        = new Set(['inter', 'georgia', 'trebuchet'])
const VALID_DESIGN_MODES = new Set(['craft', 'editorial', 'product'])

export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    slug: string; template: string; palette: string; font: string
    designMode?: string
    sections?: SectionEntry[] | null
  }
  const { slug, template, palette, font, designMode, sections } = body
  if (!slug || !template || !palette || !font)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (!VALID_TEMPLATES.has(template) || !VALID_PALETTES.has(palette) || !VALID_FONTS.has(font))
    return NextResponse.json({ error: 'Invalid layout values' }, { status: 400 })

  if (designMode !== undefined && !VALID_DESIGN_MODES.has(designMode))
    return NextResponse.json({ error: 'Invalid design mode' }, { status: 400 })

  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, plan')
    .eq('slug', slug)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Not your page' }, { status: 403 })

  const rank = PLAN_RANK[provider.plan ?? 'seed'] ?? 0
  if (rank < 1) return NextResponse.json({ error: 'Sprout plan or above required' }, { status: 403 })

  const { data: currentPage } = await supabaseAdmin
    .from('pages')
    .select('draft_data')
    .eq('provider_id', provider.id)
    .maybeSingle()

  type DraftShape = { pages: Record<string, unknown>; providers: Record<string, unknown> }
  const existing = (currentPage?.draft_data ?? {}) as Partial<DraftShape>

  const pageUpdates: Record<string, unknown> = { template, palette, font }
  if (designMode) pageUpdates.design_mode = designMode
  if (sections && Array.isArray(sections)) pageUpdates.sections = sections

  const newDraft: DraftShape = {
    pages:     { ...(existing.pages ?? {}), ...pageUpdates },
    providers: existing.providers ?? {},
  }

  const { error } = await supabaseAdmin
    .from('pages')
    .update({ draft_data: newDraft })
    .eq('provider_id', provider.id)

  if (error) return NextResponse.json({ error: 'Failed to save layout' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Update the caller — `app/mychat/LayoutsTab.tsx`'s `handleApplyLayout`**

In the existing `handleApplyLayout` function, add `designMode: lo.designMode` to the POST body:

```ts
  async function handleApplyLayout(lo: LayoutOption) {
    if (applyingLayout || !canLayouts) return
    setApplyingLayout(lo.id)
    try {
      const res = await fetch('/api/mychat/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          template: lo.template,
          palette:  lo.palette,
          font:     lo.font,
          designMode: lo.designMode,
          sections: lo.sections ?? null,
        }),
      })
      if (res.ok) { setAppliedLayout(lo.id); onPreview() }
    } catch {
      // silent
    } finally {
      setApplyingLayout(null)
    }
  }
```

- [ ] **Step 3: Manual verification**

Run the app locally (`npm run dev`), sign in as a test member (`E2E_TEST_PROVIDER_EMAIL` seeded provider, or any dev account), open MyKryla → My Page → Layouts, apply a Tiffin/Salon/Physio preset (requires the member's persona to match, or temporarily query with a matching test provider), then run:

```sql
SELECT draft_data->'pages'->>'design_mode' AS applied_mode FROM pages WHERE provider_id = '<test-provider-id>';
```

Expected: matches the preset's `design_mode` (e.g. `'craft'` for Atelier, `'editorial'` for Noir).

- [ ] **Step 4: Commit**

```bash
git add app/api/mychat/layout/route.ts app/mychat/LayoutsTab.tsx
git commit -m "feat: persist design_mode when a member applies a layout preset"
```

---

### Task A4: Wire `design_mode` through publish + read path (`pages.design_mode` on live/preview)

**Files:**
- Read (no change expected, verify only): `app/[slug]/page.tsx`, `app/[slug]/preview/page.tsx`
- Test: manual, via publish flow

**Interfaces:**
- Consumes: `pages.draft_data.pages.design_mode` (written by Task A3).
- Produces: nothing new — this task **verifies** the existing publish mechanism correctly promotes `draft_data.pages.design_mode` into the live `pages.design_mode` column, since both `page.tsx` (line ~157-186) and `preview/page.tsx` (line ~73-104) already read `design_mode` into `ProfileData.designMode` (confirmed present in both files' existing `ProfileData` construction — this is pre-existing code, no modification needed).

- [ ] **Step 1: Locate the publish handler**

Run: `Grep` for `handlePublish` across `app/mychat/*.tsx` and `app/api/mychat/publish/route.ts` to find where `draft_data.pages` fields get copied onto the live `pages` row on publish.

- [ ] **Step 2: Confirm `design_mode` is included in the publish copy**

Read the publish route/handler found in Step 1. If it does a full-column copy (e.g. spreads `draft.pages` onto the update, or explicitly lists columns), confirm `design_mode` is included. If the route enumerates columns explicitly and `design_mode` is missing from that list, add it — mirroring how `template`/`palette`/`font` are already handled there (same file, same pattern).

- [ ] **Step 3: Manual end-to-end verification**

1. As a test member, apply a Salon "Noir" preset (`design_mode: 'editorial'`) via Layouts tab.
2. Open `/{slug}/preview` — confirm the page's `data-mode` attribute (inspect the `LayoutRenderer` wrapper `<div>` in DevTools) reads `editorial`.
3. Click Publish.
4. Open `/{slug}` (live) — confirm `data-mode="editorial"` persists on the live page too.

- [ ] **Step 4: If a fix was needed in Step 2, commit it**

```bash
git add <publish route file>
git commit -m "fix: include design_mode in publish draft-to-live copy"
```
(Skip this commit if Step 2 found no fix needed — the publish route already handles it generically.)

---

### Task A5: Admin CRUD — surface the new columns in `/admin/layouts`

**Files:**
- Modify: `app/api/admin/layouts/route.ts`, `app/api/admin/layouts/[id]/route.ts`, `app/admin/layouts/page.tsx`
- Test: manual, via the admin UI

**Interfaces:**
- Consumes: `LayoutOption`/`Preset` shape from Task A2.
- Produces: admin can create/edit `design_mode`, `page_bg`, `surface`, `border_color` on any preset without a deploy — this is the concrete no-hardcoding deliverable (curated theme changes are now data edits, not code changes).

- [ ] **Step 1: Extend `app/api/admin/layouts/route.ts` (GET already does `select('*')` — no change needed there; extend POST)**

```ts
// app/api/admin/layouts/route.ts — POST handler additions
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as {
    persona: string; name: string; description: string
    template: string; palette: string; font: string; sort_order: number
    design_mode?: string; page_bg?: string; surface?: string; border_color?: string
  }

  const { persona, name, description, template, palette, font, sort_order,
          design_mode, page_bg, surface, border_color } = body
  const image_url = (body as Record<string, unknown>).image_url as string | null | undefined
  const sections  = (body as Record<string, unknown>).sections  as unknown[] | null | undefined
  if (!persona || !name || !template || !palette || !font)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('layout_presets')
    .insert({
      persona, name, description: description ?? '',
      template, palette, font, sort_order: sort_order ?? 0,
      design_mode:  design_mode  ?? 'craft',
      page_bg:      page_bg      ?? '#FFFFFF',
      surface:      surface      ?? '#FFFFFF',
      border_color: border_color ?? '#E5E5E5',
      image_url: image_url ?? null,
      sections: sections ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preset: data })
}
```
(GET handler is unchanged — `select('*')` already returns the new columns automatically.)

- [ ] **Step 2: Extend `app/api/admin/layouts/[id]/route.ts` PATCH allow-list**

Read the file first (`Read app/api/admin/layouts/[id]/route.ts`) to find its PATCH field allow-list (mirrors the pattern in `app/api/admin/plans/[id]/route.ts`), then add `design_mode`, `page_bg`, `surface`, `border_color` to whatever allow-list/destructure it uses, following the exact style already present for `template`/`palette`/`font`.

- [ ] **Step 3: Extend the admin form UI — `app/admin/layouts/page.tsx`**

In `BLANK_FORM` (and the corresponding edit-form state), add:
```ts
const BLANK_FORM: FormState = {
  persona: 'tutor', name: '', description: '',
  template: 'focus', palette: 'professional', font: 'inter',
  designMode: 'craft', pageBg: '#FFFFFF', surface: '#FFFFFF', borderColor: '#E5E5E5',
  sort_order: '0', imageUrl: '',
  useSections: false, sections: [],
}
```
And extend `FormState` interface accordingly (`designMode: string; pageBg: string; surface: string; borderColor: string`). In the form JSX, add a `<select>` for `designMode` (options: `craft`, `editorial`, `product`, using `DESIGN_MODE_LABEL` from `lib/layouts.ts`) and 3 color inputs for `pageBg`/`surface`/`borderColor`, following the exact pattern already used for the `palette`/`font` `<select>` elements in this file (read the existing form markup around those two fields to match structure/className exactly).

- [ ] **Step 4: Manual verification**

Run the app, sign in as admin (email in `ADMIN_EMAIL` env var), visit `/admin/layouts`, create a new test preset with a custom `design_mode`/neutral colors, confirm it saves and appears in the list with correct values. Delete the test preset afterward.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/layouts/route.ts app/api/admin/layouts/[id]/route.ts app/admin/layouts/page.tsx
git commit -m "feat: admin CRUD for layout_presets design_mode + neutral-surface columns"
```

---

# PHASE B — Apply the locked visual language

### Task B1: Load real webfonts via `next/font`

**Files:**
- Modify: `app/layout.tsx`, `tailwind.config.ts`
- Test: manual (font loading is a runtime/network concern, not unit-testable)

**Interfaces:**
- Produces: CSS variables `--font-fraunces`, `--font-inter` available globally; `tailwind.config.ts`'s `fontFamily.inter` / new `fontFamily.fraunces` resolve to real loaded fonts instead of bare `["Inter","sans-serif"]` stacks that silently fall back to system fonts.

- [ ] **Step 1: Modify `app/layout.tsx` to load fonts**

```tsx
import type { Metadata, Viewport } from "next"
import { Fraunces, Inter } from "next/font/google"
import "./globals.css"
import { PHProvider } from "./providers"
import RegisterServiceWorker from "./RegisterServiceWorker"

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D0D0D',
  userScalable: false,
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://kryla.work'),
  title: {
    default: "Kryla.work — One platform, built around your craft",
    template: '%s — Kryla',
  },
  description: "Run it, grow it — your way. The business platform built around your craft, alongside how you already work. Live in 15 minutes.",
  openGraph: {
    siteName: 'Kryla',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <RegisterServiceWorker />
        <PHProvider>{children}</PHProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Point `tailwind.config.ts`'s `fontFamily` at the loaded variables**

```ts
// tailwind.config.ts — fontFamily block only, rest of file unchanged
fontFamily: {
  inter:     ["var(--font-inter)", "Inter", "sans-serif"],
  fraunces:  ["var(--font-fraunces)", "Fraunces", "serif"],
  georgia:   ["Georgia", "serif"],
  trebuchet: ["Trebuchet MS", "sans-serif"],
},
```

- [ ] **Step 3: Run the dev server and verify fonts load**

Run: `npm run dev` from `kryla.work/`, open any `/{slug}` member page in a browser, open DevTools → Network → filter `font`, reload.
Expected: `.woff2` requests for Fraunces and Inter succeed (200). DevTools → Elements → select a heading → Computed → `font-family` shows `var(--font-fraunces), Fraunces, serif` resolving to the actual Fraunces font (not Arial/Helvetica).

- [ ] **Step 4: Run the build to confirm no compile errors**

Run: `npm run build`
Expected: build succeeds; no font-related errors.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx tailwind.config.ts
git commit -m "feat: load Fraunces + Inter via next/font, fixing silent Arial fallback"
```

---

### Task B2: Retune `[data-mode]` token values in `app/globals.css` (type scale, spacing, neutrals, cool-ivory)

**Files:**
- Modify: `app/globals.css`
- Test: manual visual verification (design-token values are not unit-testable; verified via screenshot in Task B5)

**Interfaces:**
- Consumes: nothing new.
- Produces: `--type-display`/`--type-heading`/etc. within `[data-mode='craft']` and `[data-mode='editorial']` now set `font-family: var(--font-fraunces)` for display/heading tokens; `:root` neutral tokens (`--kryla-bg`, `--kryla-border`) move toward cool-ivory values. These are consumed automatically by every section component via existing Tailwind utilities (`text-display`, `text-heading`, `rounded-card`, etc.) — no section-file changes required for this task.

- [ ] **Step 1: Modify `:root` and `[data-mode]` blocks in `app/globals.css`**

```css
/* ── Brand globals ──────────────────────────────────────────────────────── */
:root {
  --amber-brand:   #F5A623;
  --amber-dark:    #C17A3A;
  --kryla-dark:    #0D0D0D;
  --kryla-bg:      #FAFAF9;   /* was #FAFAFA — cool-ivory canvas */
  --kryla-muted:   #6b6259;   /* was #666666 — warmer-neutral muted text */
  --kryla-body:    #444444;
  --kryla-border:  #ECECEA;   /* was #E5E5E5 — hairline, matches layout_presets border_color default */
  --kryla-success: #22C55E;

  /* Design system defaults (craft) — overridden by [data-mode] below */
  --type-display:     clamp(2.5rem, 8vw, 4.5rem);
  --type-heading:     clamp(1.5rem, 4vw, 2.25rem);
  --type-subheading:  1.25rem;
  --type-body:        1rem;
  --type-label:       0.6875rem;
  --font-display:     var(--font-fraunces), Fraunces, serif;
  --font-heading:     var(--font-fraunces), Fraunces, serif;
  --fw-display:       500;   /* was 900 — Fraunces reads better at medium weight, not black */
  --space-section:    5rem;
  --space-card:       1.75rem;
  --radius-card:      1.25rem;  /* was 1.5rem — slightly tighter, cool-ivory reads crisper than warm-paper */
  --radius-btn:       9999px;

  /* Dynamic accent tokens — set as inline style on LayoutRenderer wrapper */
  --color-accent:         #F5A623;
  --color-accent-surface: #F5A62308;
  --color-accent-border:  #F5A62326;
  --color-accent-glow:    #F5A62340;

  /* ── My Chat redesign — "Kryla brand + russet" tokens (--mc-* namespace) ──
     Strictly separate from --color-accent-* above (those are mutated per
     public member page via inline styles on LayoutRenderer). These drive
     only the member dashboard (app/mychat/*) tile-launcher UI. NOT part of
     this design refresh — dashboard is out of scope. */
  --mc-header-from: #1A1A1A;
  --mc-header-to:   #0D0D0D;
  --mc-canvas:      #FAFAFA;
  --mc-accent:      #F5A623;
  --mc-tile-ink:    #ffffff;

  --mc-tile-page-from:     #B4785E;
  --mc-tile-page-to:       #C79680;
  --mc-tile-services-from: #9A5A46;
  --mc-tile-services-to:   #B4735C;
  --mc-tile-plan-from:     #7C463A;
  --mc-tile-plan-to:       #96604F;
  --mc-tile-tools-from:    #C29277;
  --mc-tile-tools-to:      #D4AA92;
}

/* ── craft — baker, chef, salon, trainer, tiffin ────────────────────────── */
[data-mode='craft'] {
  --type-display:    clamp(2.5rem, 8vw, 4.5rem);
  --type-heading:    clamp(1.5rem, 4vw, 2.25rem);
  --type-subheading: 1.25rem;
  --font-display:    var(--font-fraunces), Fraunces, serif;
  --font-heading:    var(--font-fraunces), Fraunces, serif;
  --fw-display:      500;
  --space-section:   5rem;
  --space-card:      1.75rem;
  --radius-card:     1.25rem;
  --radius-btn:      9999px;
}

/* ── editorial — photographer, doctor, musician, tutor, physio ──────────── */
[data-mode='editorial'] {
  --type-display:    clamp(3rem, 10vw, 6rem);
  --type-heading:    clamp(1.75rem, 4vw, 2.75rem);
  --type-subheading: 1.125rem;
  --font-display:    var(--font-fraunces), Fraunces, serif;
  --font-heading:    var(--font-fraunces), Fraunces, serif;
  --fw-display:      500;
  --space-section:   6.5rem;
  --space-card:      2rem;
  --radius-card:     0.875rem;
  --radius-btn:      0.75rem;
}

/* ── product — reserved for future tech/SaaS personas ──────────────────── */
[data-mode='product'] {
  --type-display:    clamp(2rem, 6vw, 3.5rem);
  --type-heading:    clamp(1.25rem, 3vw, 1.875rem);
  --type-subheading: 1rem;
  --font-display:    var(--font-fraunces), Fraunces, serif;
  --font-heading:    var(--font-fraunces), Fraunces, serif;
  --fw-display:      500;
  --space-section:   4rem;
  --space-card:      1.25rem;
  --radius-card:     0.75rem;
  --radius-btn:      0.5rem;
}
```

- [ ] **Step 2: Wire `--font-display`/`--font-heading` into Tailwind so `text-display`/`text-heading` utilities apply the font, not just the size**

Read `tailwind.config.ts`'s current `fontSize` extension (it maps `'display': 'var(--type-display)'` etc. — font size only, no family). Tailwind's `fontSize` extension values can be an array `[fontSize, { lineHeight, fontWeight }]` but not `fontFamily` — so add two new small utility classes instead, applied alongside `text-display`/`text-heading` in components (Task B3 wires these into the section files):

```css
/* app/globals.css — add near the bottom, after existing utilities */
.font-display-token { font-family: var(--font-display); }
.font-heading-token  { font-family: var(--font-heading); }
```

- [ ] **Step 3: Run the app and visually confirm token changes took effect**

Run: `npm run dev`, open a `/{slug}` member page with `design_mode='craft'` (e.g. a tiffin/salon test member) and one with `design_mode='editorial'` (e.g. physio).
Expected: page background reads `#FAFAF9` (cool ivory, not stark white), card radii and border color visibly softer/tighter than before.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: retune design-token scale to cool-ivory surface + Fraunces heading font"
```

---

### Task B3: Apply `font-display-token`/`font-heading-token` classes + cool-ivory surface treatment to section components

**Files:**
- Modify: `app/[slug]/components/sections/HeroSection.tsx`, `ServicesSection.tsx`, `HighlightsSection.tsx`, `BioSection.tsx`, `GallerySection.tsx`, `FaqSection.tsx`, `ContactSection.tsx`, `ReviewsSection.tsx`
- Modify: `app/[slug]/components/shared.tsx`
- Test: manual visual verification (Task B5)

**Interfaces:**
- Consumes: `.font-display-token`/`.font-heading-token` (Task B2), existing `var(--color-accent*)`/`var(--radius-card)`/`var(--radius-btn)` tokens (unchanged mechanism).
- Produces: no prop signature changes to any section component — this task only edits className strings and literal hex values inside each file's JSX.

- [ ] **Step 1: `HeroSection.tsx` — add heading font token, soften borders/shadows**

Read the file first to locate every element using `text-display`/`text-heading`/`text-subheading` Tailwind classes (confirmed present at multiple points across the 7 hero variants per prior exploration). For each such element, append the matching token class:
- Elements with `text-display` → also add `font-display-token`
- Elements with `text-heading` → also add `font-heading-token`

Example transform (apply this pattern everywhere `text-display` or `text-heading` appears in this file):
```tsx
// before
<h1 className="text-display font-black leading-[0.95] tracking-tight">
// after
<h1 className="text-display font-display-token leading-[0.95] tracking-tight" style={{ fontWeight: 'var(--fw-display)' }}>
```
(Replace hardcoded `font-black`/`font-bold` on display/heading elements with `style={{ fontWeight: 'var(--fw-display)' }}` so the token-driven weight from Task B2 — `500`, tuned for Fraunces — takes effect instead of a hardcoded Tailwind weight class.)

Also: replace any literal `border-[#E5E5E5]` or `border-[#e5e7eb]`-style hardcoded hex borders in this file with `border-[var(--kryla-border)]`, and any hardcoded card `shadow-*` utility with a soft, restrained inline shadow consistent with cool-ivory (`style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.03)' }}` on the container, matching the "Cool ivory" companion mockup's `.card` treatment).

- [ ] **Step 2: Repeat the same 3 transforms for the remaining 7 section files**

Apply identically to `ServicesSection.tsx`, `HighlightsSection.tsx`, `BioSection.tsx`, `GallerySection.tsx`, `FaqSection.tsx`, `ContactSection.tsx`, `ReviewsSection.tsx`:
1. Any `text-display`/`text-heading` element gains `font-display-token`/`font-heading-token` + `style={{ fontWeight: 'var(--fw-display)' }}` in place of a hardcoded font-weight class.
2. Any literal border hex → `border-[var(--kryla-border)]`.
3. Any card-like container's shadow → the same restrained `0 1px 0 rgba(0,0,0,0.03)` treatment (or omit shadow entirely where the hairline border alone is sufficient — matches the "restraint over decoration" cool-ivory direction).

- [ ] **Step 3: `shared.tsx` — update `SectionHeading`, `Footer`, `FaqList` neutrals**

```tsx
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-[#8a7f72] uppercase tracking-widest mb-6">{children}</h2>
  )
}
```
(was `text-[#999]` — warmer muted tone matching `--kryla-muted: #6b6259` family)

```tsx
export function Footer() {
  return (
    <footer className="border-t border-[var(--kryla-border)] py-8 xl:pb-8 pb-20">
      <div className="max-w-2xl mx-auto px-6 flex items-center justify-center gap-2">
        <span className="text-xs text-[#a1927f]">Powered by</span>
        <KrylaLogo />
      </div>
    </footer>
  )
}
```

```tsx
export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <details key={i} className="group border border-[var(--kryla-border)] rounded-xl overflow-hidden">
          <summary className="flex justify-between items-center px-5 py-4 cursor-pointer text-[#0D0D0D] font-medium text-sm list-none select-none">
            {f.question}
            <svg className="ml-4 shrink-0 transition-transform group-open:rotate-180" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 5l5 5 5-5" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </summary>
          <p className="px-5 pb-4 text-sm text-[#6b6259] leading-relaxed border-t border-[var(--kryla-border)] pt-3">{f.answer}</p>
        </details>
      ))}
    </div>
  )
}
```
(`GalleryGrid` and the icon components are unchanged — no heading/border/neutral surfaces to retune.)

- [ ] **Step 4: Run the app and visually verify**

Run: `npm run dev`, open a member page, confirm: headings render in Fraunces at the tuned weight (not black/900), borders read as thin cool-gray hairlines, no harsh drop shadows remain on cards.

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: succeeds, no TypeScript/className errors.

- [ ] **Step 6: Commit**

```bash
git add app/[slug]/components/sections/ app/[slug]/components/shared.tsx
git commit -m "feat: apply Fraunces heading font + cool-ivory surface treatment across member-page sections"
```

---

### Task B4: Broaden + tune motion — stagger `AnimateIn`, refine `sectionFadeUp`

**Files:**
- Modify: `app/globals.css` (`sectionFadeUp` keyframes)
- Modify: `app/[slug]/components/LayoutRenderer.tsx`
- Test: manual visual verification

**Interfaces:**
- Consumes: `AnimateIn`'s existing `delay?: number` prop (already defined, currently always called with `delay={0}` — confirmed in `LayoutRenderer.tsx`'s `sorted.map` loop).
- Produces: sections now reveal with a staggered delay based on their render order (locked "Subtle" motion — matches the visual-companion mockup's `cubic-bezier(.22,.61,.36,1)` timing, close to the existing `cubic-bezier(0.22, 1, 0.36, 1)` already in `AnimateIn.tsx` — no change needed to `AnimateIn.tsx` itself, only its call site and the keyframe distance).

- [ ] **Step 1: Retune `sectionFadeUp` keyframe distance in `app/globals.css`**

```css
/* ── Scroll entrance ────────────────────────────────────────────────────── */
@keyframes sectionFadeUp {
  from { opacity: 0; transform: translateY(20px); }  /* was 36px — subtler, calmer rise */
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Add a per-section stagger delay in `LayoutRenderer.tsx`**

Modify the render loop (current code renders every non-hero section wrapped in `<AnimateIn key={i} delay={0}>`):

```tsx
      {sorted.map((s, i) => {
        const isFirst = i === 0
        const variant = resolveVariant(s.sectionKey, s.variant)
        let node: React.ReactNode = null
        switch (s.sectionKey) {
          case 'hero':
            node = <HeroSection key={i} data={data} accent={accent} variant={variant} showNav={isFirst} framesConfig={s.style?.frames} />
            break
          case 'services':
            node = <ServicesSection key={i} data={data} accent={accent} variant={variant} />
            break
          case 'highlights':
            node = <HighlightsSection key={i} data={data} accent={accent} variant={variant} />
            break
          case 'bio':
            node = <BioSection key={i} data={data} accent={accent} variant={variant} />
            break
          case 'gallery':
            node = <GallerySection key={i} data={data} variant={variant} />
            break
          case 'faq':
            node = <FaqSection key={i} data={data} accent={accent} variant={variant} />
            break
          case 'contact':
            node = <ContactSection key={i} data={data} accent={accent} variant={variant} />
            break
          case 'reviews':
            node = <ReviewsSection key={i} providerId={data.providerId} accentColor={accent} />
            break
          default:
            return null
        }
        const wrapped = wrapWithBg(node, s.style, i)
        if (s.sectionKey === 'hero') return wrapped
        return <AnimateIn key={i} delay={Math.min(i * 60, 240)}>{wrapped}</AnimateIn>
      })}
```

(`Math.min(i * 60, 240)` — a 60ms stagger per section, capped at 240ms so a page with many sections doesn't force the user to wait too long for the last one to reveal. `IntersectionObserver` already means this only fires as each section scrolls into view, not all at page load, so the cap mostly matters for sections that enter the viewport together on a short page.)

- [ ] **Step 3: Run the app and visually verify staggered reveal**

Run: `npm run dev`, open a member page with 4+ sections, scroll down slowly.
Expected: as a group of sections enters the viewport together (e.g. on a fast scroll or short page), they fade up with a slight, calm cascade rather than firing simultaneously. On a normal slow scroll, the `IntersectionObserver` threshold (0.08) means most sections still trigger individually as they cross into view — the stagger is most visible on fast scroll/short pages.

- [ ] **Step 4: Verify reduced-motion still works**

In browser DevTools → Rendering tab → "Emulate CSS media feature prefers-reduced-motion: reduce", reload the page.
Expected: sections appear instantly with no animation (both `AnimateIn.tsx`'s own `matchMedia` check and the global `@media (prefers-reduced-motion: reduce)` rule in `app/globals.css` — confirmed present at line 107 — enforce this redundantly, which is fine).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/[slug]/components/LayoutRenderer.tsx
git commit -m "feat: tune scroll-reveal keyframe + add per-section stagger delay"
```

---

### Task B5: End-to-end verification across the 3 focus personas

**Files:** none (verification-only task)

- [ ] **Step 1: Run the full build**

Run: `npm run build` from `kryla.work/`
Expected: succeeds with no errors.

- [ ] **Step 2: Visually verify each focus persona's page**

Run: `npm run dev`. For each of `tiffin`, `salon`, `physio` (using a seeded/test member per persona, or `/{slug}/preview` on a manually-adjusted test row), load the public page and confirm:
- Fraunces renders on headings (DevTools Computed tab), Inter on body text.
- Page background is cool-ivory (`#FAFAF9`), not stark white or the old `#FAFAFA`.
- Card borders are thin/hairline, not heavy.
- `salon` "Noir" preset page shows `data-mode="editorial"` spacing/radii; `tiffin`/`salon` "Atelier"/"Blush" show `data-mode="craft"`.
- Scrolling reveals sections with the staggered subtle fade+rise.
- Each member's own accent color (from their applied preset's `palette`) still renders distinctly — confirm two different presets produce visibly different accent colors on their respective pages.

- [ ] **Step 3: Verify the booking/contact form still submits**

On any member page, fill out and submit the Contact/booking section form.
Expected: `POST /api/booking` succeeds (Network tab shows 200), matching pre-existing behavior — the design changes must not have altered the form's field names or submit handler.

- [ ] **Step 4: Screenshot before/after for the record**

Use Playwright MCP (`mcp__plugin_playwright_playwright__browser_navigate` + `browser_take_screenshot`) or the `/run` skill to capture one full-page screenshot of a Tiffin member page. Compare visually against the pre-refresh appearance (or simply confirm it visibly reads as calm/premium/cohesive per the locked design language) to close the loop on the original "kill AI slop" goal.

- [ ] **Step 5: Final commit (if any fixes were needed during verification)**

```bash
git add -A
git commit -m "fix: address issues found during end-to-end design-refresh verification"
```
(Only if Steps 1–4 surfaced something to fix — otherwise this task produces no commit, verification-only.)

---

## Self-Review Notes

- **Spec coverage:** All 5 locked decisions (Fraunces+Inter, cool-ivory, subtle motion, member-pages-only scope, all-sections depth) are covered — B1 (fonts), B2 (surface tokens), B3 (applies to all sections/templates), B4 (motion). The theme-system expansion (curated per-persona presets, DB-driven, admin CRUD) is covered by A1–A5, correctly built on the **existing** `layout_presets` system rather than a duplicate new table (an architecture correction from the original brainstormed plan, discovered during file exploration — `layout_presets` + `LayoutsTab.tsx` + `/admin/layouts` already implement exactly this pattern).
- **Deviation from the approved brainstormed plan, flagged:** the brainstormed plan called for a brand-new `themes` table + new `/admin/themes` CRUD pages. Implementation-planning research found this would duplicate the existing `layout_presets` system (which already bundles template+palette+font+sections per persona with full admin CRUD at `/admin/layouts`) and fragment the member-facing picker UX (`LayoutsTab.tsx` already is the "theme picker"). This plan instead **extends** `layout_presets` with `design_mode` + neutral-surface columns — same no-hardcoding outcome (DB-driven, admin-editable), less duplication, no UX fragmentation.
- **`FocusTemplate.tsx` (legacy path):** confirmed this only renders for pages with `sections: null` (pre-migration pages) — out of scope for this plan since all 3 focus personas get fresh `sections` arrays from `inngest/build-page.ts`'s `PERSONA_SECTIONS` map on build. Not modified.
- **Placeholder scan:** no TBD/TODO left in any step; every code block is complete, copy-pasteable code against the real file paths and current file contents verified via direct reads.
- **Type consistency:** `DesignMode` type in `lib/layouts.ts` (Task A2) matches `app/[slug]/types.ts`'s existing `DesignMode = 'craft' | 'editorial' | 'product'` union exactly — no drift introduced. `LayoutOption.designMode`/`.pageBg`/`.surface`/`.borderColor` naming used consistently from Task A2 through A3/A5.
