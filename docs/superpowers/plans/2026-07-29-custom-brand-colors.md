# Custom Brand Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a member override their applied preset's accent/surface/border colors with their own hex values, editable from MyKryla's Layouts tab, with no plan gate and a soft contrast warning.

**Architecture:** One new nullable column (`pages.accent_color`) joins the three already added in the prior branch (`page_bg`/`surface`/`border_color`, currently populated only from presets, never overridden directly). The write path is the existing `/api/mychat/layout` POST route, extended to accept the 4 color fields directly (not just as a side-effect of applying a preset) plus an explicit `resetColors` flag. The read path already promotes `draft_data.pages` keys to live `pages` columns on publish (unchanged, generic mechanism) and already renders them in `LayoutRenderer.tsx` (extended here with one more fallback link for `accent_color`). The one net-new consumer is the MyKryla dashboard's own profile-loading path (`app/[slug]/mykryla/page.tsx` → `CurrentProfile` → `LayoutsTab.tsx`), which currently does NOT select or pass any of the 4 color columns — needed so the picker can pre-fill with the member's *currently effective* colors.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres), existing `HEX_RE` validation pattern, plain WCAG contrast-ratio arithmetic (no new dependency).

## Global Constraints

- No plan gating on this feature beyond the existing Sprout+ gate on applying/editing a layout at all (`PLAN_RANK[plan] >= 1`) — every plan that can use Layouts at all can use custom colors.
- Contrast check is advisory only — never blocks save.
- No new `layout_presets` rows, no preset cloning, no "Custom" preset concept — colors are loose nullable override columns on `pages`, exactly mirroring the existing `page_bg`/`surface`/`border_color` pattern established in the prior branch's Task C1.
- `NULL` on any of the 4 color columns means "inherit from the applied preset/palette," exactly as today for the existing 3 columns.
- Switching to a different curated preset does NOT clear a member's custom color overrides (resolves spec Open Question 1: the override columns are independent state, layered on top of whichever preset is currently applied — consistent with the existing loose-override model). A member who wants the new preset's own colors uses the explicit "Reset to preset colors" action.
- Resolves spec Open Question 2: reset is implemented as an explicit `resetColors: true` boolean field on the existing `/api/mychat/layout` POST route (not a new endpoint, not a `null` sentinel per field) — cleanest fit against the route's current `if (pageBg) pageUpdates.page_bg = pageBg` truthy-check style, since a boolean flag needs no change to that style for the normal (non-reset) case.
- Resolves spec Open Question 3: `LayoutsTab.tsx`'s `isCurrent` grid-highlight logic compares `template`/`palette`/`font` only (unchanged) — it already has nothing to do with color values, so a member's custom colors diverging from a preset's stored colors does not affect which grid card shows as "current." No change needed there.

---

## File Structure

- `supabase/migrations/<ts>_pages_accent_color.sql` — new nullable `accent_color` column on `pages`.
- `app/api/mychat/layout/route.ts` — extend POST to accept `accentColor` + `resetColors`.
- `app/[slug]/types.ts` — add `accentColor?: string | null` to `ProfileData`.
- `app/[slug]/page.tsx`, `app/[slug]/preview/page.tsx` — select + populate `accentColor`, mirroring the existing 3-field treatment.
- `app/[slug]/components/LayoutRenderer.tsx` — one more fallback link: `data.accentColor ?? ACCENT[palette] ?? '#F5A623'`.
- `app/[slug]/mykryla/page.tsx` — select the 4 color columns (none currently selected), add to `CurrentProfile` construction.
- `app/mychat/SpaceClient.tsx` — extend `CurrentProfile` interface with the 4 color fields, pass them to `LayoutsTab`.
- `lib/colorContrast.ts` — new small pure-function module: hex parsing + WCAG relative luminance/contrast ratio.
- `app/mychat/LayoutsTab.tsx` — new "Customize colors" expander UI, wired to the extended route + contrast check.

---

## Task 1: Migration — add `pages.accent_color`

**Files:**
- Create: `supabase/migrations/20260729120000_pages_accent_color.sql`

**Interfaces:**
- Produces: `pages.accent_color text` (nullable, no default).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260729120000_pages_accent_color.sql
-- Mirrors page_bg/surface/border_color's addition to `pages`
-- (see 20260728151500_pages_theme_columns.sql). Nullable, no default —
-- NULL means "inherit accent from the applied preset/palette", exactly
-- as the existing 3 color columns already behave.
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS accent_color text;
```

- [ ] **Step 2: Apply directly to production**

This project has no dev/staging Supabase project (established in the prior branch). Apply via
`mcp__plugin_supabase_supabase__apply_migration` with `project_id: "zdmkwteyitnhvsmueurf"`,
`name: "pages_accent_color"`, and the SQL above.

**Do not apply without a live, verifiable confirmation from the user in the actual conversation** — a prior
task on this project found that authorization text embedded only in a subagent's dispatch prompt is
correctly rejected by the permission system as insufficient for a production DB write. If dispatching this
task to a subagent, the subagent should stop and report back rather than attempt the migration itself; the
controller applies it directly after confirming with the user in-conversation, then hands the verified state
back.

- [ ] **Step 3: Verify**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pages' AND column_name = 'accent_color';
```

Expected: 1 row, `text`, `is_nullable = 'YES'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729120000_pages_accent_color.sql
git commit -m "feat: add pages.accent_color column for member custom-color overrides"
```

---

## Task 2: Extend `/api/mychat/layout` to accept direct color edits + reset

**Files:**
- Modify: `app/api/mychat/layout/route.ts`

**Interfaces:**
- Consumes: `pages.accent_color` (Task 1).
- Produces: POST body gains optional `accentColor?: string` (validated via the existing `HEX_RE` pattern) and optional `resetColors?: boolean`. When `resetColors` is `true`, all 4 color columns (`accent_color`, `page_bg`, `surface`, `border_color`) are explicitly set to `null` in the draft, regardless of whether new color values were also sent in the same request (reset wins — a client should never send both in one call, but the server enforces the safe interpretation if it happens).

The current file (read in full before editing — reproduced here for reference, do not assume line numbers are unchanged by the time this task runs):

```ts
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
    pageBg?: string; surface?: string; borderColor?: string
    sections?: SectionEntry[] | null
  }
  const { slug, template, palette, font, designMode, pageBg, surface, borderColor, sections } = body
  if (!slug || !template || !palette || !font)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (!VALID_TEMPLATES.has(template) || !VALID_PALETTES.has(palette) || !VALID_FONTS.has(font))
    return NextResponse.json({ error: 'Invalid layout values' }, { status: 400 })

  if (designMode !== undefined && !VALID_DESIGN_MODES.has(designMode))
    return NextResponse.json({ error: 'Invalid design mode' }, { status: 400 })

  const HEX_RE = /^#[0-9A-Fa-f]{3,8}$/
  if (pageBg !== undefined && (typeof pageBg !== 'string' || !HEX_RE.test(pageBg)))
    return NextResponse.json({ error: 'Invalid pageBg' }, { status: 400 })
  if (surface !== undefined && (typeof surface !== 'string' || !HEX_RE.test(surface)))
    return NextResponse.json({ error: 'Invalid surface' }, { status: 400 })
  if (borderColor !== undefined && (typeof borderColor !== 'string' || !HEX_RE.test(borderColor)))
    return NextResponse.json({ error: 'Invalid borderColor' }, { status: 400 })

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
  if (pageBg)      pageUpdates.page_bg      = pageBg
  if (surface)      pageUpdates.surface      = surface
  if (borderColor) pageUpdates.border_color = borderColor
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

- [ ] **Step 1: Extend the body type and destructure**

```ts
  const body = await req.json() as {
    slug: string; template: string; palette: string; font: string
    designMode?: string
    pageBg?: string; surface?: string; borderColor?: string; accentColor?: string
    resetColors?: boolean
    sections?: SectionEntry[] | null
  }
  const { slug, template, palette, font, designMode, pageBg, surface, borderColor, accentColor, resetColors, sections } = body
```

- [ ] **Step 2: Add `accentColor` to the existing hex validation block**

```ts
  const HEX_RE = /^#[0-9A-Fa-f]{3,8}$/
  if (pageBg !== undefined && (typeof pageBg !== 'string' || !HEX_RE.test(pageBg)))
    return NextResponse.json({ error: 'Invalid pageBg' }, { status: 400 })
  if (surface !== undefined && (typeof surface !== 'string' || !HEX_RE.test(surface)))
    return NextResponse.json({ error: 'Invalid surface' }, { status: 400 })
  if (borderColor !== undefined && (typeof borderColor !== 'string' || !HEX_RE.test(borderColor)))
    return NextResponse.json({ error: 'Invalid borderColor' }, { status: 400 })
  if (accentColor !== undefined && (typeof accentColor !== 'string' || !HEX_RE.test(accentColor)))
    return NextResponse.json({ error: 'Invalid accentColor' }, { status: 400 })
```

- [ ] **Step 3: Handle `resetColors` and extend `pageUpdates`**

Replace the `pageUpdates` block:

```ts
  const pageUpdates: Record<string, unknown> = { template, palette, font }
  if (designMode) pageUpdates.design_mode = designMode
  if (sections && Array.isArray(sections)) pageUpdates.sections = sections

  if (resetColors === true) {
    pageUpdates.page_bg      = null
    pageUpdates.surface      = null
    pageUpdates.border_color = null
    pageUpdates.accent_color = null
  } else {
    if (pageBg)      pageUpdates.page_bg      = pageBg
    if (surface)      pageUpdates.surface      = surface
    if (borderColor) pageUpdates.border_color = borderColor
    if (accentColor) pageUpdates.accent_color = accentColor
  }
```

(The `if (resetColors) { ...null... } else { ...normal... }` structure means a reset request and a
color-setting request are mutually exclusive within one call, resolving the edge case noted in this task's
Interfaces section — reset always wins if somehow both are sent, by construction, since the `else` branch
simply never runs.)

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: passes clean.

- [ ] **Step 5: Commit**

```bash
git add app/api/mychat/layout/route.ts
git commit -m "feat: accept direct accentColor edits + resetColors flag on layout apply route"
```

---

## Task 3: Thread `accentColor` through `ProfileData` + public page render paths

**Files:**
- Modify: `app/[slug]/types.ts`
- Modify: `app/[slug]/page.tsx`
- Modify: `app/[slug]/preview/page.tsx`
- Modify: `app/[slug]/components/LayoutRenderer.tsx`

**Interfaces:**
- Consumes: `pages.accent_color` (Task 1).
- Produces: `ProfileData.accentColor?: string | null`; `LayoutRenderer`'s wrapper div's `--color-accent` var now sources from `data.accentColor` before falling back to `ACCENT[palette]`.

- [ ] **Step 1: Add `accentColor` to `ProfileData` in `app/[slug]/types.ts`**

Find the existing block (current lines ~109-114):
```ts
  palette: PaletteKey
  font: FontKey
  designMode: DesignMode
  pageBg?: string | null
  surface?: string | null
  borderColor?: string | null
```
Change to:
```ts
  palette: PaletteKey
  font: FontKey
  designMode: DesignMode
  pageBg?: string | null
  surface?: string | null
  borderColor?: string | null
  accentColor?: string | null
```

Do not modify the `ACCENT` map itself — it remains the fallback, exactly as `PAGE_BG` already is (per the
existing comment above `PAGE_BG`).

- [ ] **Step 2: `app/[slug]/page.tsx` — select + populate**

Find the `.select(...)` call (current line ~115) that already lists
`'...template, palette, font, design_mode, page_bg, surface, border_color, show_sections, sections, translations'`
and add `accent_color`:
```ts
.select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, schema_type, template, palette, font, design_mode, page_bg, surface, border_color, accent_color, show_sections, sections, translations')
```

Find the `profileData` construction (current lines ~174-179, alongside `pageBg:`/`surface:`/`borderColor:`)
and add:
```ts
    accentColor: (page.accent_color as string | null) ?? null,
```

Also update the standalone `accentColor` variable used for JSON-LD/metadata (current line ~218):
```ts
// before
const accentColor   = ACCENT[(page.palette as PaletteKey)] ?? '#F5A623'
// after
const accentColor   = (page.accent_color as string | null) ?? ACCENT[(page.palette as PaletteKey)] ?? '#F5A623'
```
(This is a separate local variable from `profileData.accentColor` — both need the override applied, since
this one feeds structured-data/metadata output independently of `LayoutRenderer`.)

- [ ] **Step 3: `app/[slug]/preview/page.tsx` — select + populate, respecting draft-over-live merge**

Find the `.select(...)` call (current line ~33) and add `accent_color`:
```ts
.select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, schema_type, template, palette, font, design_mode, page_bg, surface, border_color, accent_color, show_sections, sections, draft_data, translations')
```

Find the `profileData` construction (current lines ~90-95, alongside the existing draft-over-live merges for
`pageBg`/`surface`/`borderColor`) and add, matching the identical pattern:
```ts
    accentColor: ((dp.accent_color as string) ?? (page.accent_color as string)) ?? null,
```

- [ ] **Step 4: `LayoutRenderer.tsx` — add the fallback link**

Find the top of the component (current lines ~28-34):
```ts
  const accent     = ACCENT[data.palette as PaletteKey]      ?? '#F5A623'
  const bg         = data.pageBg      ?? PAGE_BG[data.palette as PaletteKey] ?? '#FFFFFF'
  const surface    = data.surface     ?? '#FFFFFF'
  const borderCol  = data.borderColor ?? 'var(--kryla-border)'
  const fontClass  = FONT_CLASS[data.font as FontKey]        ?? 'font-inter'
  const designMode = (data.designMode ?? 'craft') as DesignMode
```
Change the `accent` line only:
```ts
  const accent     = data.accentColor ?? ACCENT[data.palette as PaletteKey] ?? '#F5A623'
  const bg         = data.pageBg      ?? PAGE_BG[data.palette as PaletteKey] ?? '#FFFFFF'
  const surface    = data.surface     ?? '#FFFFFF'
  const borderCol  = data.borderColor ?? 'var(--kryla-border)'
  const fontClass  = FONT_CLASS[data.font as FontKey]        ?? 'font-inter'
  const designMode = (data.designMode ?? 'craft') as DesignMode
```

No other lines in this file change — `accent` already flows into every consumer below (the wrapper's
`--color-accent*` inline styles, and every section component's `accent` prop) via this one local variable, so
this single-line change propagates everywhere `accent` is already used. Do not touch the `ACCENT`/`PAGE_BG`
imports (still needed as fallbacks) or any section component file.

- [ ] **Step 5: Run typecheck and build**

Run: `npx tsc --noEmit` — must pass clean.
Run: `npm run build` — must succeed.

- [ ] **Step 6: Commit**

```bash
git add app/[slug]/types.ts app/[slug]/page.tsx app/[slug]/preview/page.tsx app/[slug]/components/LayoutRenderer.tsx
git commit -m "feat: thread accentColor override through ProfileData and public page render paths"
```

---

## Task 4: Surface the 4 color columns in the MyKryla dashboard's profile data

**Files:**
- Modify: `app/[slug]/mykryla/page.tsx`
- Modify: `app/mychat/SpaceClient.tsx`

**Interfaces:**
- Consumes: `pages.page_bg`/`.surface`/`.border_color` (already exist, but not yet selected on this
  dashboard-side path — confirmed by reading the current file, its `pages` select only has
  `'headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, palette, font, template, show_sections, sections, design_mode'`,
  none of the 4 color columns), `pages.accent_color` (Task 1).
- Produces: `CurrentProfile` (in `SpaceClient.tsx`) gains `pageBg`/`surface`/`borderColor`/`accentColor`
  (all `string | null`), passed down to any tab that needs the member's currently-effective colors —
  `LayoutsTab` (Task 5) is the only consumer for now.

This is a distinct data path from Task 3 — `app/[slug]/mykryla/page.tsx` feeds the **dashboard** (what a
member sees/edits in MyKryla), while `app/[slug]/page.tsx`/`preview/page.tsx` feed the **public page**
(what a page has been extended in the prior branch to know about `pageBg`/`surface`/`borderColor` for
rendering, the dashboard side never was — this task closes that separate gap so the color picker (Task 5)
has real current values to pre-fill from.

- [ ] **Step 1: Extend the `pages` select in `app/[slug]/mykryla/page.tsx`**

Find the current select (current line ~50):
```ts
.select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, palette, font, template, show_sections, sections, design_mode')
```
Change to:
```ts
.select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq, palette, font, template, show_sections, sections, design_mode, page_bg, surface, border_color, accent_color')
```

- [ ] **Step 2: Add the 4 fields to the `currentProfile` object construction**

Find the current block (current lines ~126-151, inside the `<MyChatLayout spaceProps={{ ... currentProfile: { ... } }}>` call) and add, alongside the existing `designMode:` line:
```ts
          designMode:      (page?.design_mode as string) ?? 'craft',
          pageBg:          (page?.page_bg      as string | null) ?? null,
          surface:         (page?.surface      as string | null) ?? null,
          borderColor:     (page?.border_color as string | null) ?? null,
          accentColor:     (page?.accent_color as string | null) ?? null,
```

- [ ] **Step 3: Extend the `CurrentProfile` interface in `app/mychat/SpaceClient.tsx`**

Find the interface (current lines ~63-91) and add, alongside the existing `designMode: string` line:
```ts
  designMode: string
  pageBg: string | null
  surface: string | null
  borderColor: string | null
  accentColor: string | null
```

- [ ] **Step 4: Pass the 4 new fields to `LayoutsTab`**

Find the `<LayoutsTab ... />` call (current lines ~669-677) and add, alongside the existing `currentPalette`/`currentFont` props:
```tsx
            <LayoutsTab
              slug={slug}
              persona={currentProfile.persona}
              plan={plan}
              currentTemplate={currentProfile.template}
              currentPalette={currentProfile.palette}
              currentFont={currentProfile.font}
              currentAccentColor={currentProfile.accentColor}
              currentPageBg={currentProfile.pageBg}
              currentSurface={currentProfile.surface}
              currentBorderColor={currentProfile.borderColor}
              onPreview={onRefresh}
              onUpgrade={() => goTo('plan')}
```
(`LayoutsTab`'s `Props` interface is extended in Task 5 to accept these 4 new optional props — this task
only wires the caller side; Task 5 wires the receiving side and the UI itself.)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: fails at this point, specifically flagging `LayoutsTab`'s `Props` interface not yet having the 4
new prop names (Task 5 fixes this) — this is expected and fine mid-plan; do not attempt to fix `LayoutsTab.tsx`
in this task. If typecheck fails for any OTHER reason, that is a real problem to fix before committing.

- [ ] **Step 6: Commit**

```bash
git add app/[slug]/mykryla/page.tsx app/mychat/SpaceClient.tsx
git commit -m "feat: surface member's current color-override values into MyKryla dashboard profile data"
```

---

## Task 5: Contrast-check utility

**Files:**
- Create: `lib/colorContrast.ts`

**Interfaces:**
- Produces: `hexToRgb(hex: string): { r: number; g: number; b: number } | null`,
  `relativeLuminance(rgb: { r: number; g: number; b: number }): number`,
  `contrastRatio(hexA: string, hexB: string): number | null` (returns `null` if either hex is unparseable),
  `meetsWcagAA(hexA: string, hexB: string, opts?: { largeText?: boolean }): boolean` (uses 4.5:1 threshold by
  default, 3:1 if `largeText` is true — `contrastRatio` returning `null` is treated as `true`/pass, i.e. "don't
  warn on something we can't evaluate").

This is pure, dependency-free arithmetic — the standard WCAG 2.0 relative-luminance/contrast-ratio formulas.
Task 6 (the picker UI) is this module's only consumer.

- [ ] **Step 1: Write the failing test**

```ts
// lib/colorContrast.test.ts
import { hexToRgb, relativeLuminance, contrastRatio, meetsWcagAA } from './colorContrast'

describe('hexToRgb', () => {
  it('parses a 6-digit hex', () => {
    expect(hexToRgb('#F5A623')).toEqual({ r: 245, g: 166, b: 35 })
  })
  it('parses a 3-digit hex', () => {
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 })
  })
  it('returns null for an unparseable value', () => {
    expect(hexToRgb('not-a-color')).toBeNull()
  })
})

describe('contrastRatio', () => {
  it('is 21 for pure black vs pure white (the maximum possible ratio)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
  })
  it('is 1 for identical colors', () => {
    expect(contrastRatio('#F5A623', '#F5A623')).toBeCloseTo(1, 1)
  })
  it('returns null if either hex is unparseable', () => {
    expect(contrastRatio('nope', '#FFFFFF')).toBeNull()
  })
})

describe('meetsWcagAA', () => {
  it('passes black-on-white (21:1) against the 4.5:1 normal-text threshold', () => {
    expect(meetsWcagAA('#000000', '#FFFFFF')).toBe(true)
  })
  it('fails a near-invisible pale-yellow-on-white pairing', () => {
    expect(meetsWcagAA('#FFFDE7', '#FFFFFF')).toBe(false)
  })
  it('treats an unparseable pairing as passing (no false warning)', () => {
    expect(meetsWcagAA('nope', '#FFFFFF')).toBe(true)
  })
})
```

(Check this project's actual test runner/config before assuming `describe`/`it`/`expect` syntax — inspect
`package.json` for a `test` script and any existing `*.test.ts` file's import style; if no test runner is
configured for plain `lib/*.ts` unit tests, note this in the report and skip Steps 2 and 4, relying on Step 5's
manual verification instead. Do not add a new test framework dependency just for this module.)

- [ ] **Step 2: Run test to verify it fails**

Run: the project's test command against this file (or `npx tsx -e` / a scratch script invoking the functions
directly, if no test runner applies — see Step 1's note).
Expected: FAIL with "module not found" or equivalent (the file doesn't exist yet).

- [ ] **Step 3: Implement**

```ts
// lib/colorContrast.ts
export interface Rgb { r: number; g: number; b: number }

export function hexToRgb(hex: string): Rgb | null {
  const cleaned = hex.trim().replace(/^#/, '')
  const full = cleaned.length === 3
    ? cleaned.split('').map(c => c + c).join('')
    : cleaned
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function channelToLinear(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(rgb: Rgb): number {
  const r = channelToLinear(rgb.r)
  const g = channelToLinear(rgb.g)
  const b = channelToLinear(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(hexA: string, hexB: string): number | null {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  if (!a || !b) return null
  const lumA = relativeLuminance(a)
  const lumB = relativeLuminance(b)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsWcagAA(hexA: string, hexB: string, opts?: { largeText?: boolean }): boolean {
  const ratio = contrastRatio(hexA, hexB)
  if (ratio === null) return true
  const threshold = opts?.largeText ? 3 : 4.5
  return ratio >= threshold
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: same command as Step 2.
Expected: PASS (or, if no test runner applies, manually verify each case from Step 1 via a scratch invocation
and document the output in the report).

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: passes clean.

- [ ] **Step 6: Commit**

```bash
git add lib/colorContrast.ts lib/colorContrast.test.ts
git commit -m "feat: add WCAG contrast-ratio utility for custom-color soft warning"
```
(Omit `lib/colorContrast.test.ts` from the add if Step 1 determined no test runner applies and the file was
never created.)

---

## Task 6: "Customize colors" UI in `LayoutsTab.tsx`

**Files:**
- Modify: `app/mychat/LayoutsTab.tsx`

**Interfaces:**
- Consumes: `/api/mychat/layout` POST with `accentColor`/`pageBg`/`surface`/`borderColor`/`resetColors`
  (Task 2), `currentAccentColor`/`currentPageBg`/`currentSurface`/`currentBorderColor` props (Task 4),
  `meetsWcagAA` from `lib/colorContrast.ts` (Task 5).
- Produces: no new exports — this is the leaf UI component for the whole feature.

The current file (read in full before editing):

```tsx
'use client'

import { useState, useEffect } from 'react'
import { TEMPLATE_LABEL, FONT_LABEL, type LayoutOption } from '@/lib/layouts'

interface Props {
  slug: string
  persona: string
  plan: string
  currentTemplate: string
  currentPalette: string
  currentFont: string
  onPreview: () => void
  onUpgrade: () => void
}

const PLAN_RANK: Record<string, number> = { seed: 0, sprout: 1, grow: 2, thrive: 3, elevate: 4 }

export default function LayoutsTab({
  slug, persona, plan,
  currentTemplate, currentPalette, currentFont,
  onPreview, onUpgrade,
}: Props) {
  const [layouts, setLayouts]           = useState<LayoutOption[]>([])
  const [loaded, setLoaded]             = useState(false)
  const [applyingLayout, setApplyingLayout] = useState<string | null>(null)
  const [appliedLayout, setAppliedLayout]   = useState<string | null>(null)

  const canLayouts = (PLAN_RANK[plan] ?? 0) >= 1

  useEffect(() => {
    fetch(`/api/mychat/layouts?persona=${encodeURIComponent(persona)}`)
      .then(r => r.json())
      .then(data => { setLayouts(data.layouts ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona])

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
          pageBg: lo.pageBg, surface: lo.surface, borderColor: lo.borderColor,
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

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full bg-[#E5E5E5] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs text-[#666]">Choose a visual style for your page. Changes save to your draft — preview and publish when ready.</p>
      </div>

      {!canLayouts && (
        <div className="mx-4 mt-3 mb-1 bg-[#FFF7ED] border border-[#F5A623]/30 rounded-xl px-4 py-3.5">
          <p className="text-xs font-semibold text-[#0D0D0D] mb-1">Upgrade to Sprout to apply layouts</p>
          <p className="text-xs text-[#666] mb-3">Browse the styles below, then upgrade to make changes live.</p>
          <button onClick={onUpgrade} className="text-xs font-semibold text-[#EA8C00] hover:underline">
            See plans →
          </button>
        </div>
      )}

      <div className={`px-4 pt-3 pb-4 grid grid-cols-2 gap-3 ${!canLayouts ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        {layouts.map(lo => {
          const isCurrent  = lo.template === currentTemplate && lo.palette === currentPalette && lo.font === currentFont
          const isApplying = applyingLayout === lo.id

          return (
            <button
              key={lo.id}
              onClick={() => handleApplyLayout(lo)}
              disabled={!!applyingLayout || !canLayouts}
              className={`text-left rounded-xl border overflow-hidden transition-all disabled:cursor-not-allowed ${
                isCurrent
                  ? 'border-[#0D0D0D] ring-1 ring-[#0D0D0D]'
                  : 'border-[#E5E5E5] hover:border-[#0D0D0D]'
              }`}>
              <div className="w-full h-[72px] relative overflow-hidden">
                {lo.imageUrl ? (
                  <img src={lo.imageUrl} alt={lo.name} className="w-full h-full object-cover" />
                ) : (
                  <div style={{ background: lo.bg }} className="w-full h-full">
                    <div style={{ background: lo.accent }} className="h-2.5 w-full" />
                    <div className="px-2.5 pt-2 space-y-1.5">
                      <div style={{ background: lo.accent }} className="h-1.5 w-2/3 rounded-full opacity-60" />
                      <div className="h-1 w-1/2 rounded-full opacity-25" style={{ background: '#374151' }} />
                      <div className="h-1 w-3/4 rounded-full opacity-15" style={{ background: '#374151' }} />
                    </div>
                  </div>
                )}
                {isCurrent && !isApplying && (
                  <div className="absolute top-1.5 right-1.5 w-[18px] h-[18px] bg-[#22C55E] rounded-full flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                {isApplying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                    <div className="w-4 h-4 border-2 border-[#0D0D0D] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-[#0D0D0D] leading-tight mb-0.5">{lo.name}</p>
                <p className="text-[10px] text-[#888] leading-tight mb-2">{lo.description}</p>
                <div className="flex gap-1 flex-wrap">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-[#666] bg-[#F0F0F0] rounded px-1.5 py-0.5">
                    {TEMPLATE_LABEL[lo.template]}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-[#666] bg-[#F0F0F0] rounded px-1.5 py-0.5">
                    {FONT_LABEL[lo.font]}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {appliedLayout && canLayouts && (
        <div className="mx-4 mb-4 bg-[#F0FDF4] border border-[#22C55E]/30 rounded-xl px-3 py-2.5">
          <p className="text-xs font-medium text-[#166534]">✓ Layout applied — your page is updated</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 1: Extend `Props` with the 4 current-color fields**

```tsx
interface Props {
  slug: string
  persona: string
  plan: string
  currentTemplate: string
  currentPalette: string
  currentFont: string
  currentAccentColor: string | null
  currentPageBg: string | null
  currentSurface: string | null
  currentBorderColor: string | null
  onPreview: () => void
  onUpgrade: () => void
}
```

- [ ] **Step 2: Destructure the new props and add color-editing state**

```tsx
export default function LayoutsTab({
  slug, persona, plan,
  currentTemplate, currentPalette, currentFont,
  currentAccentColor, currentPageBg, currentSurface, currentBorderColor,
  onPreview, onUpgrade,
}: Props) {
  const [layouts, setLayouts]           = useState<LayoutOption[]>([])
  const [loaded, setLoaded]             = useState(false)
  const [applyingLayout, setApplyingLayout] = useState<string | null>(null)
  const [appliedLayout, setAppliedLayout]   = useState<string | null>(null)

  const [customizing, setCustomizing]   = useState(false)
  const [savingColors, setSavingColors] = useState(false)
  const [colorsSaved, setColorsSaved]   = useState(false)

  // Find the currently-applied preset (if any) so its colors can seed the
  // pickers when the member has no override of their own yet.
  const appliedPreset = layouts.find(
    lo => lo.template === currentTemplate && lo.palette === currentPalette && lo.font === currentFont
  )

  const [accentColor, setAccentColor] = useState(currentAccentColor ?? appliedPreset?.accent ?? '#F5A623')
  const [pageBg, setPageBg]           = useState(currentPageBg      ?? appliedPreset?.bg     ?? '#FFFFFF')
  const [surface, setSurfaceColor]    = useState(currentSurface     ?? '#FFFFFF')
  const [borderColor, setBorderColor] = useState(currentBorderColor ?? '#ECECEA')
```

(`appliedPreset` depends on `layouts` having loaded, which happens asynchronously — the `useState` initial
values above only run once on mount, so if `layouts` is still empty at that point the picker seeds from the
member's raw override values or the hardcoded fallback. Add a `useEffect` to re-seed once `layouts` loads, if
`customizing` has not yet been opened by the member — i.e. don't clobber in-progress edits:)

```tsx
  useEffect(() => {
    if (customizing) return // don't override a member's in-progress edit
    if (currentAccentColor) return // member already has an explicit override — never re-seed from preset
    if (!appliedPreset) return
    setAccentColor(appliedPreset.accent)
    setPageBg(appliedPreset.bg)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedPreset?.id])
```

- [ ] **Step 3: Add the save/reset handlers**

```tsx
  async function handleSaveColors() {
    if (savingColors || !canLayouts) return
    setSavingColors(true)
    try {
      const res = await fetch('/api/mychat/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          template: currentTemplate,
          palette:  currentPalette,
          font:     currentFont,
          accentColor, pageBg, surface, borderColor,
        }),
      })
      if (res.ok) { setColorsSaved(true); onPreview() }
    } catch {
      // silent
    } finally {
      setSavingColors(false)
    }
  }

  async function handleResetColors() {
    if (savingColors || !canLayouts) return
    setSavingColors(true)
    try {
      const res = await fetch('/api/mychat/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          template: currentTemplate,
          palette:  currentPalette,
          font:     currentFont,
          resetColors: true,
        }),
      })
      if (res.ok) {
        setColorsSaved(false)
        if (appliedPreset) { setAccentColor(appliedPreset.accent); setPageBg(appliedPreset.bg) }
        setSurfaceColor('#FFFFFF')
        setBorderColor('#ECECEA')
        onPreview()
      }
    } catch {
      // silent
    } finally {
      setSavingColors(false)
    }
  }
```

(Both handlers send `template`/`palette`/`font` because the route requires them as non-optional fields —
sending the member's *current* values for those three, unchanged, so the color-only save doesn't
accidentally reset which preset is applied. This is the same route Task 2 extended; no new endpoint.)

- [ ] **Step 4: Compute the contrast warning**

Near the top of the component body (after the color `useState` declarations), add:
```tsx
  const accentContrastWarning = !meetsWcagAA(accentColor, surface)
```
And the import:
```tsx
import { meetsWcagAA } from '@/lib/colorContrast'
```

- [ ] **Step 5: Add the "Customize colors" expander JSX**

Insert after the existing grid of layout cards (after the closing `</div>` of the
`grid grid-cols-2 gap-3` block, before the `{appliedLayout && canLayouts && (...)}` success-banner block):

```tsx
      {canLayouts && (
        <div className="mx-4 mb-4">
          <button
            onClick={() => setCustomizing(v => !v)}
            className="text-xs font-semibold text-[#0D0D0D] flex items-center gap-1.5"
          >
            {customizing ? '▾' : '▸'} Customize colors
          </button>

          {customizing && (
            <div className="mt-3 space-y-3 border border-[#E5E5E5] rounded-xl p-3.5">
              {([
                { label: 'Accent',      value: accentColor, set: setAccentColor },
                { label: 'Background',  value: pageBg,      set: setPageBg },
                { label: 'Surface',     value: surface,     set: setSurfaceColor },
                { label: 'Border',      value: borderColor, set: setBorderColor },
              ] as const).map(({ label, value, set }) => (
                <div key={label} className="flex items-center gap-3">
                  <label className="text-xs text-[#666] w-20 shrink-0">{label}</label>
                  <input
                    type="color"
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-8 h-8 rounded border border-[#E5E5E5] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="flex-1 text-xs font-mono border border-[#E5E5E5] rounded-lg px-2.5 py-1.5"
                    placeholder="#RRGGBB"
                  />
                </div>
              ))}

              {accentContrastWarning && (
                <p className="text-[11px] text-[#B45309] bg-[#FFFBEB] border border-[#F5A623]/30 rounded-lg px-2.5 py-2">
                  Low contrast between accent and surface — may be hard to read.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSaveColors}
                  disabled={savingColors}
                  className="text-xs font-semibold bg-[#0D0D0D] text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  {savingColors ? 'Saving…' : 'Save colors'}
                </button>
                <button
                  onClick={handleResetColors}
                  disabled={savingColors}
                  className="text-xs font-semibold text-[#666] hover:text-[#0D0D0D] disabled:opacity-50"
                >
                  Reset to preset colors
                </button>
              </div>

              {colorsSaved && (
                <p className="text-xs font-medium text-[#166534]">✓ Colors saved — your page is updated</p>
              )}
            </div>
          )}
        </div>
      )}
```

(This block is gated on `canLayouts` only — no separate/higher plan check, per the locked "no gating" decision.
It intentionally reuses the exact `border-[#E5E5E5]`/`text-[#666]`/`bg-[#0D0D0D]` styling conventions already
present elsewhere in this same file, rather than introducing new ad-hoc colors, since this component itself
predates and is unrelated to the `--kryla-*` design-token system used on the public-page side.)

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit`
Expected: passes clean — this also resolves Task 4 Step 5's expected mid-plan failure, since `Props` now has
the 4 fields `SpaceClient.tsx` already passes.

- [ ] **Step 7: Run the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, sign in as a member with an applied layout (Sprout+ plan), open MyKryla → My Page →
Layouts, expand "Customize colors", change the Accent color to something with poor contrast against a white
surface (e.g. `#FFFDE7`) and confirm the warning appears; change it to something with good contrast (e.g.
`#0D0D0D`) and confirm the warning disappears. Click "Save colors", confirm the success message appears and
(via Preview) the public page reflects the new accent. Click "Reset to preset colors", confirm the pickers
revert to the applied preset's values and the public page (via Preview) reverts too.

(If no live member with a Sprout+ plan and an applied layout is available for manual testing at
implementation time — the same known limitation flagged for the prior branch's Task B5/C1 — document this
gap in the report rather than skipping the code-level verification; do not seed prod data without asking.)

- [ ] **Step 9: Commit**

```bash
git add app/mychat/LayoutsTab.tsx
git commit -m "feat: add Customize colors expander to LayoutsTab with WCAG contrast warning"
```

---

## Verification (end-to-end)

1. **Migration:** `pages.accent_color` exists, nullable, no default (Task 1, Step 3's query).
2. **Route:** `POST /api/mychat/layout` accepts `accentColor` and persists it to `draft_data.pages`; a
   `resetColors: true` request nulls all 4 color fields in the draft (Task 2 — verify via a direct API call
   or through the UI in Task 6's manual check).
3. **Publish path:** the existing generic `pages.update(dp)` spread in `/api/mychat/publish/route.ts`
   (unchanged by this plan) promotes `draft_data.pages.accent_color` to the live `pages.accent_color` column
   with zero additional code — confirm by reading that file once during Task 2 or 3 and noting in the
   relevant report that the mechanism still applies (same confirmation pattern used in the prior branch's
   Task A4/C1).
4. **Render:** a member with a custom accent color sees that color (not their preset's) reflected in
   `--color-accent` on their live/preview page.
5. **Dashboard pre-fill:** opening the Layouts tab's "Customize colors" expander shows the member's actual
   current colors (override if set, else preset's), not always the same hardcoded default.
6. **Contrast warning:** picking a low-contrast accent/surface pairing shows the inline warning; saving is
   never blocked by it.
7. **Reset:** clicking "Reset to preset colors" clears the override and the page reverts to the applied
   preset's colors.
8. **No regressions:** `npx tsc --noEmit` and `npm run build` both pass at the final commit; no section
   component file, no `layout_presets` table/admin CRUD, and no plan-gating logic were touched by this plan.
