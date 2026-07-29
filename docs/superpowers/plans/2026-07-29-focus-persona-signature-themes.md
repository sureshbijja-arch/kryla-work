# Focus-Persona Signature Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 3 focus personas (Salon/Atelier, Tiffin/Home Kitchen, Physio/Clinic) real, distinct
color identity — grounded in each persona's own materials, not the shared flat 6-color enum every preset
uses today — and ship it to the hero + services sections members actually load first.

**Architecture:** One new `palette_tokens` jsonb column on `layout_presets` and `pages`, threaded through
the exact same client-fetch → apply → render pipeline the existing `page_bg`/`surface`/`border_color`
columns already use (`/api/mychat/layouts` → `lib/layouts.ts#enrichLayout` → `LayoutsTab.tsx` →
`/api/mychat/layout` → `pages` table → `app/[slug]/page.tsx` → `LayoutRenderer.tsx` → CSS custom
properties). Two new hero variants (`sweep` for Salon, `dabba` for Tiffin) render from real
`data.services[]`/gallery data, never placeholder content. A pre-existing bug is fixed as a hard
prerequisite: today, applying a preset never actually writes any curated color onto a member's page.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres), Tailwind, TypeScript — no new dependencies.

## Global Constraints

- No hardcoding: curated persona colors are Supabase data (migration), never literals in `app/[slug]` source.
- No lorem/placeholder content: the Tiffin dabba hero renders only from real `data.services[]`; if fewer
  than 3 exist, render fewer compartments — never invent copy.
- All new animation gated behind `prefers-reduced-motion: reduce` (removed, not slowed).
- Every color pair introduced must pass WCAG AA (4.5:1 normal text, 3:1 large text/UI) — verified in Task 8,
  hex values adjusted if they fail.
- Additive only: pages/presets with no `palette_tokens` must render byte-identical to current output.
- Physio recovery-arc is explicitly out of scope — ship palette only, existing hero/services variants.

---

## File Structure

| File | Change |
|---|---|
| `supabase/migrations/<ts>_palette_tokens_columns.sql` | New — adds `palette_tokens` jsonb to `layout_presets` + `pages`, `signature_color` text to `pages` |
| `supabase/migrations/<ts>_focus_persona_palette_tokens_seed.sql` | New — populates `palette_tokens` for the 6 existing focus-persona preset rows |
| `lib/layouts.ts` | Modify — `LayoutOption`/`enrichLayout` gain `paletteTokens`/`signature` |
| `app/api/mychat/layouts/route.ts` | Modify — fix SELECT to actually fetch `page_bg,surface,border_color,design_mode,palette_tokens` (pre-existing bug) |
| `app/api/mychat/layout/route.ts` | Modify — accept `paletteTokens`/`signatureColor` on apply + customize + reset |
| `app/mychat/LayoutsTab.tsx` | Modify — `handleApplyLayout` sends the preset's full color set (fixes the apply-writes-nothing bug); customize expander gains a Signature picker |
| `app/[slug]/types.ts` | Modify — `ProfileData` gains `paletteTokens`/`signatureColor`; new `PaletteTokens` type |
| `app/[slug]/page.tsx` | Modify — select + map the 2 new columns |
| `app/[slug]/preview/page.tsx` | Modify — same mapping, draft-merge path |
| `app/[slug]/components/LayoutRenderer.tsx` | Modify — derive `--color-signature`, extend accent chain |
| `app/[slug]/components/sections/HeroSection.tsx` | Modify — new `sweep` and `dabba` variants |
| `app/[slug]/components/sections/ServicesSection.tsx` | Modify — new `menu` variant (Salon) |
| `app/[slug]/personaConfig.ts` or wherever variant defaults live | Modify — Atelier/Home Kitchen presets reference new variants (confirmed in Task 2 exploration) |
| `app/admin/layouts/page.tsx` | Modify — read-only `palette_tokens` JSON preview + swatch in the existing form |
| `vitest.config.ts` | New — test runner config (Task 0 prerequisite) |
| `vitest.setup.ts` | New — jsdom + testing-library matchers setup (Task 0 prerequisite) |
| `package.json` | Modify — add `vitest`/`@testing-library/*`/`jsdom` devDependencies + a `"test"` script (Task 0 prerequisite) |

---

### Task 0: Install test infrastructure (prerequisite for every later task's TDD steps)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `vitest.setup.ts`

**Context:** The project has no test framework installed anywhere (confirmed by inspecting `package.json`
scripts/dependencies and the filesystem — no `vitest`, `jest`, `@testing-library/*`, no `tests/` directory).
Every later task in this plan writes a `*.test.ts`/`*.test.tsx` file and runs it with `npx vitest run` as its
TDD red/green cycle — none of that is executable without this task landing first. This is not scope creep;
it is the literal precondition for every other task's Step 1/2.

**Interfaces:**
- Produces: `npx vitest run <path>` becomes a working command; `render`/`screen` from
  `@testing-library/react` become importable in any `*.test.tsx` file.

- [ ] **Step 1: Install dependencies**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work\.claude\worktrees\focus-persona-signature-themes" && npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`
Expected: exits 0, `package.json` devDependencies gains all 5 packages.

- [ ] **Step 2: Write `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Write `vitest.setup.ts`**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add the `test` script**

In `package.json`'s `"scripts"` block, add:

```json
    "test": "vitest run"
```

- [ ] **Step 5: Verify the toolchain works end-to-end with a throwaway smoke test**

Create a temporary file `lib/__smoke__.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('vitest smoke test', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npx vitest run lib/__smoke__.test.ts`
Expected: PASS, 1 test.

Delete the smoke test file — it is not part of the plan's real coverage:

```bash
rm lib/__smoke__.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "chore: install vitest + testing-library for TDD on the theming feature"
```

---

### Task 1: Schema — `palette_tokens` + `signature_color` columns

**Files:**
- Create: `supabase/migrations/20260729160000_palette_tokens_columns.sql`

**Interfaces:**
- Produces: `layout_presets.palette_tokens jsonb`, `pages.palette_tokens jsonb`, `pages.signature_color text`
  — consumed by every later task.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260729160000_palette_tokens_columns.sql
--
-- Adds real multi-color identity for curated layout_presets, replacing the
-- flat 6-value ACCENT enum every preset currently shares. palette_tokens
-- carries accent + pre-computed tints + one signature color; pages gets the
-- same column (member's resolved copy, written at apply-time) plus a
-- standalone signature_color override column mirroring the existing
-- accent_color/page_bg/surface/border_color override pattern.

ALTER TABLE layout_presets ADD COLUMN IF NOT EXISTS palette_tokens jsonb;
ALTER TABLE pages          ADD COLUMN IF NOT EXISTS palette_tokens jsonb;
ALTER TABLE pages          ADD COLUMN IF NOT EXISTS signature_color text;
```

- [ ] **Step 2: Apply the migration**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && supabase db push`
Expected: migration applies with no errors; `supabase migration list` shows it as applied.

- [ ] **Step 3: Verify columns exist**

Run: `supabase db execute --sql "select column_name from information_schema.columns where table_name in ('layout_presets','pages') and column_name in ('palette_tokens','signature_color') order by 1"`
Expected: 3 rows — `layout_presets.palette_tokens`, `pages.palette_tokens`, `pages.signature_color`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260729160000_palette_tokens_columns.sql
git commit -m "feat: add palette_tokens + signature_color columns for focus-persona themes"
```

---

### Task 2: `lib/layouts.ts` — type + `enrichLayout` support for palette_tokens

**Files:**
- Modify: `lib/layouts.ts:12-27` (`LayoutOption` interface), `lib/layouts.ts:73-100` (`enrichLayout`)
- Test: `lib/layouts.test.ts` (new)

**Interfaces:**
- Consumes: nothing new (pure data-shape change).
- Produces: `PaletteTokens` type `{ accent: string; accentSurface: string; accentBorder: string;
  accentGlow: string; signature: string }`, `LayoutOption.paletteTokens: PaletteTokens | null`. Every later
  task that reads a `LayoutOption` (`LayoutsTab.tsx`) relies on this exact field name and shape.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/layouts.test.ts
import { describe, it, expect } from 'vitest'
import { enrichLayout } from './layouts'

describe('enrichLayout', () => {
  it('passes through a real palette_tokens object unchanged', () => {
    const result = enrichLayout({
      id: '1', name: 'Atelier', description: 'Elegant',
      template: 'storefront', palette: 'minimal', font: 'inter',
      palette_tokens: {
        accent: '#7B4B3A', accentSurface: '#7B4B3A0d',
        accentBorder: '#7B4B3A26', accentGlow: '#7B4B3A40',
        signature: '#C9A56A',
      },
    })
    expect(result.paletteTokens).toEqual({
      accent: '#7B4B3A', accentSurface: '#7B4B3A0d',
      accentBorder: '#7B4B3A26', accentGlow: '#7B4B3A40',
      signature: '#C9A56A',
    })
  })

  it('returns null paletteTokens when the row has none', () => {
    const result = enrichLayout({
      id: '2', name: 'Generic', description: 'Default',
      template: 'storefront', palette: 'professional', font: 'inter',
    })
    expect(result.paletteTokens).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run lib/layouts.test.ts`
Expected: FAIL — `result.paletteTokens` is `undefined`, property doesn't exist on the returned type.

- [ ] **Step 3: Implement**

In `lib/layouts.ts`, add after the `DesignMode` type (line 4):

```typescript
export interface PaletteTokens {
  accent:        string
  accentSurface: string
  accentBorder:  string
  accentGlow:    string
  signature:     string
}
```

Extend `LayoutOption` (after `borderColor: string` at line 24):

```typescript
  paletteTokens: PaletteTokens | null
```

Extend `enrichLayout`'s param type (after `border_color?: string | null` at line 79):

```typescript
  palette_tokens?: PaletteTokens | null
```

Add to the returned object (after `borderColor: row.border_color ?? '#E5E5E5',` at line 96):

```typescript
    paletteTokens: row.palette_tokens ?? null,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run lib/layouts.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/layouts.ts lib/layouts.test.ts
git commit -m "feat: add PaletteTokens type and enrichLayout support"
```

---

### Task 3: Fix `/api/mychat/layouts` — SELECT never fetched curated columns (pre-existing bug)

**Files:**
- Modify: `app/api/mychat/layouts/route.ts:12`
- Test: `app/api/mychat/layouts/route.test.ts` (new)

**Interfaces:**
- Consumes: `PaletteTokens`, `enrichLayout` from Task 2.
- Produces: `GET /api/mychat/layouts` response `.layouts[].paletteTokens` now reflects real DB data instead
  of always being `null`. Also fixes `pageBg`/`surface`/`borderColor`/`designMode` being silently ignored —
  this was already broken before this plan; fixing it is a prerequisite for `palette_tokens` to work at all,
  since it goes through the identical `enrichLayout` path.

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/mychat/layouts/route.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: (cols: string) => {
        (globalThis as any).__lastSelect = cols
        return {
          in: () => ({ eq: () => ({ order: () => ({ order: () =>
            Promise.resolve({ data: [], error: null }) }) }) }),
        }
      },
    }),
  },
}))

import { GET } from './route'
import { NextRequest } from 'next/server'

describe('GET /api/mychat/layouts', () => {
  it('selects palette_tokens and the curated color columns', async () => {
    await GET(new NextRequest('http://localhost/api/mychat/layouts?persona=salon'))
    const cols = (globalThis as any).__lastSelect as string
    expect(cols).toContain('palette_tokens')
    expect(cols).toContain('page_bg')
    expect(cols).toContain('surface')
    expect(cols).toContain('border_color')
    expect(cols).toContain('design_mode')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/api/mychat/layouts/route.test.ts`
Expected: FAIL — current SELECT string is
`'id, name, description, template, palette, font, sort_order, image_url, sections'`, missing all 5 checked columns.

- [ ] **Step 3: Implement**

In `app/api/mychat/layouts/route.ts`, replace line 12:

```typescript
    .select('id, name, description, template, palette, font, sort_order, image_url, sections')
```

with:

```typescript
    .select('id, name, description, template, palette, font, design_mode, page_bg, surface, border_color, palette_tokens, sort_order, image_url, sections')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/api/mychat/layouts/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/mychat/layouts/route.ts app/api/mychat/layouts/route.test.ts
git commit -m "fix: select curated color columns in layouts list (were silently dropped)"
```

---

### Task 4: `/api/mychat/layout` — accept `paletteTokens` + `signatureColor` on apply/customize/reset

**Files:**
- Modify: `app/api/mychat/layout/route.ts`
- Test: `app/api/mychat/layout/route.test.ts` (new)

**Interfaces:**
- Consumes: `PaletteTokens` from Task 2.
- Produces: POST body accepts `paletteTokens?: PaletteTokens`, `signatureColor?: string`; writes
  `pages.palette_tokens` and `pages.signature_color`; both cleared by `resetColors: true`. Later tasks
  (`LayoutsTab.tsx`) rely on these exact field names.

- [ ] **Step 1: Write the failing test**

```typescript
// app/api/mychat/layout/route.test.ts
import { describe, it, expect, vi } from 'vitest'

const updateCalls: any[] = []
vi.mock('@/lib/supabase/server', () => ({
  createRouteClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { email: 'owner@example.com' } } }) },
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: () =>
        Promise.resolve({ data: { id: 'p1', plan: 'sprout' }, error: null }) }),
        maybeSingle: () => Promise.resolve({ data: { draft_data: {} }, error: null }) }) }),
      update: (payload: any) => { updateCalls.push({ table, payload }); return { eq: () => Promise.resolve({ error: null }) } },
    }),
  },
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

function req(body: object) {
  return new NextRequest('http://localhost/api/mychat/layout', {
    method: 'POST', body: JSON.stringify(body),
  })
}

describe('POST /api/mychat/layout — palette_tokens + signature_color', () => {
  it('writes paletteTokens and signatureColor onto draft_data.pages', async () => {
    updateCalls.length = 0
    const tokens = { accent: '#7B4B3A', accentSurface: '#7B4B3A0d', accentBorder: '#7B4B3A26', accentGlow: '#7B4B3A40', signature: '#C9A56A' }
    const res = await POST(req({
      slug: 'aanya', template: 'storefront', palette: 'minimal', font: 'inter',
      paletteTokens: tokens, signatureColor: '#C9A56A',
    }))
    expect(res.status).toBe(200)
    const draft = updateCalls[0].payload.draft_data
    expect(draft.pages.palette_tokens).toEqual(tokens)
    expect(draft.pages.signature_color).toBe('#C9A56A')
  })

  it('clears both fields on resetColors', async () => {
    updateCalls.length = 0
    const res = await POST(req({
      slug: 'aanya', template: 'storefront', palette: 'minimal', font: 'inter',
      resetColors: true,
    }))
    expect(res.status).toBe(200)
    const draft = updateCalls[0].payload.draft_data
    expect(draft.pages.palette_tokens).toBeNull()
    expect(draft.pages.signature_color).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/api/mychat/layout/route.test.ts`
Expected: FAIL — `draft.pages.palette_tokens` is `undefined` (field not read from body, not written).

- [ ] **Step 3: Implement**

In `app/api/mychat/layout/route.ts`, extend the body type (line 18-24):

```typescript
  const body = await req.json() as {
    slug: string; template: string; palette: string; font: string
    designMode?: string
    pageBg?: string; surface?: string; borderColor?: string; accentColor?: string
    paletteTokens?: { accent: string; accentSurface: string; accentBorder: string; accentGlow: string; signature: string }
    signatureColor?: string
    resetColors?: boolean
    sections?: SectionEntry[] | null
  }
```

Extend the destructure (line 25):

```typescript
  const { slug, template, palette, font, designMode, pageBg, surface, borderColor, accentColor, paletteTokens, signatureColor, resetColors, sections } = body
```

Add validation after the existing `accentColor` hex check (after line 43):

```typescript
  if (signatureColor !== undefined && (typeof signatureColor !== 'string' || !HEX_RE.test(signatureColor)))
    return NextResponse.json({ error: 'Invalid signatureColor' }, { status: 400 })
  if (paletteTokens !== undefined) {
    const keys = ['accent', 'accentSurface', 'accentBorder', 'accentGlow', 'signature'] as const
    const valid = paletteTokens && typeof paletteTokens === 'object'
      && keys.every(k => typeof (paletteTokens as any)[k] === 'string')
    if (!valid) return NextResponse.json({ error: 'Invalid paletteTokens' }, { status: 400 })
  }
```

Update the `resetColors` branch (line 70-74) to also clear the two new fields:

```typescript
  if (resetColors === true) {
    pageUpdates.page_bg        = null
    pageUpdates.surface        = null
    pageUpdates.border_color   = null
    pageUpdates.accent_color   = null
    pageUpdates.palette_tokens = null
    pageUpdates.signature_color = null
  } else {
    if (pageBg)         pageUpdates.page_bg         = pageBg
    if (surface)         pageUpdates.surface         = surface
    if (borderColor)     pageUpdates.border_color    = borderColor
    if (accentColor)     pageUpdates.accent_color    = accentColor
    if (paletteTokens)   pageUpdates.palette_tokens  = paletteTokens
    if (signatureColor)  pageUpdates.signature_color = signatureColor
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/api/mychat/layout/route.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add app/api/mychat/layout/route.ts app/api/mychat/layout/route.test.ts
git commit -m "feat: accept paletteTokens + signatureColor in layout apply/customize/reset"
```

---

### Task 5: `LayoutsTab.tsx` — apply preset's full color set + Signature picker

**Files:**
- Modify: `app/mychat/LayoutsTab.tsx`

**Interfaces:**
- Consumes: `LayoutOption.paletteTokens` (Task 2), `/api/mychat/layout` accepting `paletteTokens`/
  `signatureColor` (Task 4).
- Produces: fixes the bug where `handleApplyLayout` never sent any curated color to the server; adds a
  4th "Signature" picker to the customize expander, matching the existing `{ label, value, set }` pattern.

- [ ] **Step 1: Manual verification setup (no automated test — this is a client component; verified via Task 9's playwright pass)**

Confirm current behavior first: `handleApplyLayout` (lines 71-93) sends only
`{ slug, template, palette, font, designMode, sections }` — no color fields. This is the bug this task fixes.

- [ ] **Step 2: Implement — fix `handleApplyLayout` to send the preset's colors**

In `app/mychat/LayoutsTab.tsx`, replace the `handleApplyLayout` body (lines 78-86):

```typescript
        body: JSON.stringify({
          slug,
          template: lo.template,
          palette:  lo.palette,
          font:     lo.font,
          designMode: lo.designMode,
          sections: lo.sections ?? null,
          pageBg: lo.pageBg, surface: lo.surface, borderColor: lo.borderColor,
          paletteTokens: lo.paletteTokens ?? undefined,
        }),
```

- [ ] **Step 3: Implement — add Signature to state + props**

Extend `Props` (after `currentBorderColor: string | null` at line 17):

```typescript
  currentSignatureColor: string | null
```

Extend the function signature destructure (line 27):

```typescript
  currentAccentColor, currentPageBg, currentSurface, currentBorderColor, currentSignatureColor,
```

Add signature state (after line 48):

```typescript
  const [signatureColor, setSignatureColor] = useState(currentSignatureColor ?? appliedPreset?.paletteTokens?.signature ?? accentColor)
```

- [ ] **Step 4: Implement — thread signature through save/reset**

In `handleSaveColors` (line 107), add `signatureColor` to the body:

```typescript
          accentColor, pageBg, surface, borderColor, signatureColor,
```

In `handleResetColors`'s success branch (lines 135-143), add:

```typescript
        if (appliedPreset) {
          setAccentColor(appliedPreset.accent)
          setPageBg(appliedPreset.bg)
          setSurfaceColor(appliedPreset.surface)
          setBorderColor(appliedPreset.borderColor)
          setSignatureColor(appliedPreset.paletteTokens?.signature ?? appliedPreset.accent)
        } else {
          setSurfaceColor('#FFFFFF')
          setBorderColor('#E5E5E5')
          setSignatureColor('#F5A623')
        }
```

- [ ] **Step 5: Implement — add the picker row**

In the customize-expander array (lines 250-255), add a 4th entry:

```typescript
                { label: 'Accent',      value: accentColor,    set: setAccentColor },
                { label: 'Background',  value: pageBg,         set: setPageBg },
                { label: 'Surface',     value: surface,        set: setSurfaceColor },
                { label: 'Border',      value: borderColor,    set: setBorderColor },
                { label: 'Signature',   value: signatureColor, set: setSignatureColor },
```

- [ ] **Step 6: Update the two real call sites — `app/[slug]/mykryla/page.tsx` and `app/mychat/SpaceClient.tsx`**

Confirmed by reading the actual source (not guessed): `<LayoutsTab>` is rendered in
`app/mychat/SpaceClient.tsx:680-683`:

```typescript
              currentAccentColor={currentProfile.accentColor}
              currentPageBg={currentProfile.pageBg}
              currentSurface={currentProfile.surface}
              currentBorderColor={currentProfile.borderColor}
```

Add a 5th line:

```typescript
              currentSignatureColor={currentProfile.signatureColor}
```

`currentProfile` is built in `app/[slug]/mykryla/page.tsx:148-151`, which selects `page_bg`/`border_color`/
`accent_color` directly off the `pages` row into that shape. Add the missing source data there — extend
whatever `.select(...)` feeds this block to include `palette_tokens, signature_color`, and add:

```typescript
          signatureColor:  (page?.signature_color as string | null) ?? null,
```

Without this step, `LayoutsTab.tsx`'s new Signature picker would always show the preset default and never
the member's actual saved override — the picker would silently disconnect from real state, which is exactly
the kind of half-wired gap the no-tech-debt rule rules out.

The full chain, confirmed by reading all three files (not guessed): `app/[slug]/mykryla/page.tsx` builds an
inline `currentProfile` object (lines 130-155, no separate type there) → passed into
`<MyChatLayout currentProfile={{ ... }}>` → `MyChatLayout`'s `Props['currentProfile']` **is** a named inline
type, at `app/[slug]/components/MyChatLayout.tsx:28-57`, which already lists `pageBg`/`surface`/
`borderColor`/`accentColor` as `string | null` fields (lines 50-53) → `MyChatLayout` passes `currentProfile`
through to `SpaceClient`, which is where `<LayoutsTab currentAccentColor={currentProfile.accentColor} .../>`
actually reads it (confirmed at `app/mychat/SpaceClient.tsx:680-683`).

Three edits, in this order:
1. `app/[slug]/components/MyChatLayout.tsx:53` — add `signatureColor: string | null` immediately after
   `accentColor: string | null`.
2. `app/[slug]/mykryla/page.tsx:151` — add `signatureColor: (page?.signature_color as string | null) ?? null,`
   immediately after the `accentColor:` line.
3. `app/mychat/SpaceClient.tsx:683` — add `currentSignatureColor={currentProfile.signatureColor}`
   immediately after the `currentBorderColor={...}` line.

Skipping any one of these three breaks the chain silently (TypeScript will catch #1/#2 mismatches, but #3
being skipped fails silently at runtime — the prop is simply `undefined`, not a type error, since
`LayoutsTab`'s `Props` already requires it as of Task 5 Step 3).

- [ ] **Step 7: Manual check**

Run the dev server (`npm run dev`), open MyKryla → My Page → Layouts for a salon test account, apply the
"Atelier" preset, and confirm (via browser devtools computed styles) that `--color-accent` and
`--color-signature` on the `LayoutRenderer` wrapper div now differ from the old flat black/orange defaults.
(Full visual + Lighthouse verification happens in Task 9, after Task 6's migration seeds real Atelier data —
this step just confirms the wiring, not the final look.)

- [ ] **Step 8: Commit**

```bash
git add app/mychat/LayoutsTab.tsx app/[slug]/mykryla/page.tsx
git commit -m "fix: apply preset colors on layout apply; add Signature customize picker"
```

---

### Task 6: `ProfileData` + page render paths — thread `paletteTokens`/`signatureColor`

**Files:**
- Modify: `app/[slug]/types.ts`, `app/[slug]/page.tsx`, `app/[slug]/preview/page.tsx`,
  `app/[slug]/components/LayoutRenderer.tsx`
- Test: `app/[slug]/components/LayoutRenderer.test.tsx` (new)

**Interfaces:**
- Consumes: `PaletteTokens` (Task 2).
- Produces: `ProfileData.paletteTokens`/`signatureColor`; `LayoutRenderer` emits `--color-signature` CSS
  var alongside the existing 4. Consumed by Task 7's hero/services variants.

- [ ] **Step 1: Write the failing test**

```typescript
// app/[slug]/components/LayoutRenderer.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import LayoutRenderer from './LayoutRenderer'
import type { ProfileData } from '../types'

const baseData = {
  firstName: 'Aanya', lastName: 'Mehra', persona: 'salon',
  palette: 'minimal', font: 'inter', designMode: 'craft',
  services: [], highlights: [], faq: [], sections: null,
  showSections: { booking: true, contact: true } as any,
} as unknown as ProfileData

describe('LayoutRenderer — signature token', () => {
  it('emits --color-signature from paletteTokens when present', () => {
    const { container } = render(
      <LayoutRenderer data={{ ...baseData, paletteTokens: {
        accent: '#7B4B3A', accentSurface: '#7B4B3A0d', accentBorder: '#7B4B3A26',
        accentGlow: '#7B4B3A40', signature: '#C9A56A',
      } } as ProfileData} providerId="p1" />
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.getPropertyValue('--color-signature')).toBe('#C9A56A')
    expect(wrapper.style.getPropertyValue('--color-accent')).toBe('#7B4B3A')
  })

  it('falls back to accent when no paletteTokens or signatureColor set (byte-identical regression case)', () => {
    const { container } = render(
      <LayoutRenderer data={{ ...baseData, paletteTokens: null, signatureColor: null } as ProfileData} providerId="p1" />
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.getPropertyValue('--color-accent')).toBe('#0D0D0D') // ACCENT['minimal']
    expect(wrapper.style.getPropertyValue('--color-signature')).toBe('#0D0D0D') // reuses accent, never invents
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/[slug]/components/LayoutRenderer.test.tsx`
Expected: FAIL — `--color-signature` not set at all (property doesn't exist yet).

- [ ] **Step 3: Implement — types**

In `app/[slug]/types.ts`, import `PaletteTokens` from `lib/layouts` and add to `ProfileData` (after
`accentColor?: string | null` at line 119):

```typescript
  paletteTokens?: PaletteTokens | null
  signatureColor?: string | null
```

(Add `import type { PaletteTokens } from '@/lib/layouts'` near the top of the file.)

- [ ] **Step 4: Implement — `app/[slug]/page.tsx`**

Extend the `.select(...)` string at line 115 to include `palette_tokens, signature_color`.
Extend the mapping object (after `accentColor: (page.accent_color as string | null) ?? null,` at line 180):

```typescript
    paletteTokens: (page.palette_tokens as PaletteTokens | null) ?? null,
    signatureColor: (page.signature_color as string | null) ?? null,
```

- [ ] **Step 5: Implement — `app/[slug]/preview/page.tsx`**

Apply the identical select + mapping change, respecting this file's existing live/draft-merge pattern
(read the file first to match its exact merge shape before editing — do not assume it's identical to
`page.tsx`'s structure).

- [ ] **Step 6: Implement — `LayoutRenderer.tsx`**

Replace line 29:

```typescript
  const accent     = data.accentColor ?? ACCENT[data.palette as PaletteKey] ?? '#F5A623'
```

with:

```typescript
  const tokens     = data.paletteTokens
  const accent     = data.accentColor ?? tokens?.accent ?? ACCENT[data.palette as PaletteKey] ?? '#F5A623'
  const signature  = data.signatureColor ?? tokens?.signature ?? accent
```

Update the CSS var block (lines 93-96) to use pre-computed tokens when available, falling back to
opacity-derivation:

```typescript
        ['--color-accent' as string]:         accent,
        ['--color-accent-surface' as string]: data.accentColor ? `${accent}0d` : (tokens?.accentSurface ?? `${accent}0d`),
        ['--color-accent-border' as string]:  data.accentColor ? `${accent}26` : (tokens?.accentBorder  ?? `${accent}26`),
        ['--color-accent-glow' as string]:    data.accentColor ? `${accent}40` : (tokens?.accentGlow    ?? `${accent}40`),
        ['--color-signature' as string]:      signature,
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/[slug]/components/LayoutRenderer.test.tsx`
Expected: PASS — both tests green.

- [ ] **Step 8: Commit**

```bash
git add app/[slug]/types.ts app/[slug]/page.tsx app/[slug]/preview/page.tsx app/[slug]/components/LayoutRenderer.tsx app/[slug]/components/LayoutRenderer.test.tsx
git commit -m "feat: thread paletteTokens/signatureColor through render path, emit --color-signature"
```

---

### Task 7: Hero variants — `sweep` (Salon) and `dabba` (Tiffin)

**Files:**
- Modify: `app/[slug]/components/sections/HeroSection.tsx`
- Test: `app/[slug]/components/sections/HeroSection.test.tsx` (new)

**Interfaces:**
- Consumes: `--color-signature` CSS var (Task 6), `data.services[]`, `data.gallery`/`avatarUrl` (existing
  `ProfileData` fields).
- Produces: `HeroSection` accepts `variant="sweep"` and `variant="dabba"` in addition to existing variants.

- [ ] **Step 1: Write the failing test**

```typescript
// app/[slug]/components/sections/HeroSection.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HeroSection from './HeroSection'
import type { ProfileData } from '../../types'

const base = {
  firstName: 'Aanya', lastName: 'Mehra', persona: 'salon', location: 'Bandra',
  headline: 'Hair that catches the light', subheadline: 'Balayage and cuts.',
  ctaPrimary: 'Book', ctaSecondary: 'Ask',
  showSections: { booking: true, contact: true },
  services: [], avatarUrl: null, gallery: ['/img/a.jpg'],
} as unknown as ProfileData

describe('HeroSection — sweep variant', () => {
  it('renders the headline over a photo ground with a sweep element', () => {
    const { container } = render(<HeroSection data={base} accent="#7B4B3A" variant="sweep" />)
    expect(screen.getByText('Hair that catches the light')).toBeTruthy()
    expect(container.querySelector('.hero-sweep')).toBeTruthy()
  })
})

describe('HeroSection — dabba variant', () => {
  const tiffinData = {
    ...base, persona: 'other', headline: 'A dabba that tastes like home',
    services: [
      { name: 'Roti + Rice', description: '4 rotis', price: '', duration_or_unit: '' },
      { name: 'Dal Tadka', description: '', price: '', duration_or_unit: '' },
      { name: 'Bhindi Masala', description: '', price: '', duration_or_unit: '' },
    ],
  } as unknown as ProfileData

  it('renders one compartment per real service, no placeholders', () => {
    render(<HeroSection data={tiffinData} accent="#D68A2E" variant="dabba" />)
    expect(screen.getByText('Roti + Rice')).toBeTruthy()
    expect(screen.getByText('Dal Tadka')).toBeTruthy()
    expect(screen.getByText('Bhindi Masala')).toBeTruthy()
  })

  it('renders fewer compartments when fewer services exist — never invents content', () => {
    render(<HeroSection data={{ ...tiffinData, services: [
      { name: 'Roti + Rice', description: '', price: '', duration_or_unit: '' },
    ] }} accent="#D68A2E" variant="dabba" />)
    expect(screen.getByText('Roti + Rice')).toBeTruthy()
    expect(screen.queryByText('Dal Tadka')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/[slug]/components/sections/HeroSection.test.tsx`
Expected: FAIL — `variant="sweep"`/`"dabba"` fall through to `HeroMinimal` (the `else` branch at line 918),
none of the asserted elements/classes exist.

- [ ] **Step 3: Implement — `HeroSweep` (extends `HeroPhoto`)**

Add after the existing `HeroPhoto` function (after line 373) in `HeroSection.tsx`:

```typescript
/* ── SWEEP ────────────────────────────────────────────────────────────────
   Salon signature: HeroPhoto's portrait ground + a one-shot brass light-sweep,
   gated behind prefers-reduced-motion.
──────────────────────────────────────────────────────────────────────────── */
const SWEEP_STYLES = `
@keyframes heroSweep {
  0%   { left:-45%; opacity:0; }
  12%  { opacity:1; }
  38%  { left:110%; opacity:0; }
  100% { left:110%; opacity:0; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-sweep { animation: none !important; display: none; }
}
`

function HeroSweep({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  return (
    <div className="relative">
      <style>{SWEEP_STYLES}</style>
      <div className="hero-sweep absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: '-40%', width: '40%', zIndex: 5,
          background: 'linear-gradient(105deg, transparent, rgba(247,243,238,.28) 45%, var(--color-signature) 52%, transparent)',
          opacity: 0.35,
          transform: 'skewX(-14deg)',
          animation: 'heroSweep 5.5s cubic-bezier(.4,0,.1,1) .6s infinite',
        }} />
      <HeroPhoto data={data} heroHeight={heroHeight} />
    </div>
  )
}
```

- [ ] **Step 4: Implement — `HeroDabba`**

Add after `HeroSweep`:

```typescript
/* ── DABBA ────────────────────────────────────────────────────────────────
   Tiffin signature: today's top services rendered as real dabba compartments.
   Renders only what exists — never placeholder content.
──────────────────────────────────────────────────────────────────────────── */
function HeroDabba({ data, heroHeight }: { data: ProfileData; heroHeight?: number }) {
  const { firstName, lastName, location, whatsappNumber, headline, subheadline,
    ctaPrimary, ctaSecondary, showSections, persona } = data
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const wa = whatsappNumber ? waUrl(whatsappNumber, firstName) : null
  const pcfg = getPersonaConfig(persona)
  const items = (data.services ?? []).slice(0, 3)

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--sec-custom-bg, white)', minHeight: heroMinHeight(heroHeight) }}>
      <style>{STYLES}</style>
      <nav className="max-w-2xl mx-auto px-6 pt-6 flex justify-between items-center">
        {location ? <LocationLink location={location} /> : <span />}
        <KLogo />
      </nav>
      <div className="max-w-2xl mx-auto px-6" style={{ paddingTop: 'calc(var(--space-section) * .7)', paddingBottom: 'var(--space-section)' }}>
        <div className="h-up h-up-1 flex items-center gap-2 flex-wrap mb-4">
          <p className="font-black uppercase tracking-[.22em]" style={{ fontSize: 'var(--type-label)', color: 'var(--color-accent)' }}>{fullName}</p>
        </div>
        <h1 className="h-up h-up-2 font-display-token italic text-[#241f1a] leading-[1.08] tracking-tight mb-4"
          style={{ fontSize: 'var(--type-display)', fontWeight: 'var(--fw-display)' }}>
          {headline}
        </h1>
        <p className="h-up h-up-3 text-[#5f574d] leading-relaxed mb-6 max-w-md" style={{ fontSize: 'var(--type-subheading)' }}>
          {subheadline}
        </p>

        {items.length > 0 && (
          <div className="h-up h-up-4 mb-8">
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>Today&rsquo;s Dabba</span>
            </div>
            <div className="rounded-2xl p-3.5" style={{ background: 'linear-gradient(155deg,#DADFDD,#B9C2BF 55%,#9BA6A2)' }}>
              <div className="grid grid-cols-2 gap-2" style={{ gridTemplateRows: '1fr 1fr', height: 168 }}>
                <div className="rounded-xl p-2.5 flex flex-col justify-end" style={{ gridRow: items.length > 1 ? '1 / 3' : '1 / 3', background: 'var(--color-signature)' }}>
                  <span className="text-[11px] font-extrabold uppercase" style={{ color: 'rgba(0,0,0,.55)' }}>{items[0].name}</span>
                </div>
                {items.slice(1).map((it, i) => (
                  <div key={it.name} className="rounded-xl p-2.5 flex flex-col justify-end" style={{ background: 'var(--color-accent)' }}>
                    <span className="text-[10.5px] font-extrabold uppercase" style={{ color: 'rgba(0,0,0,.55)' }}>{it.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="h-up h-up-4">
          <CTAs wa={wa} showBooking={showSections.booking} showContact={showSections.contact}
            ctaPrimary={ctaPrimary} ctaSecondary={ctaSecondary} ctaTarget={pcfg.heroCtaTarget} />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Wire both into the entry point**

In the `HeroSection` entry function (around line 911), add before the final `return <HeroMinimal ...>`:

```typescript
  if (variant === 'sweep') return <HeroSweep data={data} heroHeight={heroHeight} />
  if (variant === 'dabba') return <HeroDabba data={data} heroHeight={heroHeight} />
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/[slug]/components/sections/HeroSection.test.tsx`
Expected: PASS — all 4 assertions across both describe blocks green.

- [ ] **Step 7: Commit**

```bash
git add app/[slug]/components/sections/HeroSection.tsx app/[slug]/components/sections/HeroSection.test.tsx
git commit -m "feat: add sweep (Salon) and dabba (Tiffin) hero variants"
```

---

### Task 8: Services `menu` variant (Salon)

**Files:**
- Modify: `app/[slug]/components/sections/ServicesSection.tsx`
- Test: `app/[slug]/components/sections/ServicesSection.test.tsx` (new)

**Interfaces:**
- Consumes: `data.services[]` (existing), `--color-accent`/`--color-signature` (Task 6).
- Produces: `ServicesSection` accepts `variant="menu"`.

- [ ] **Step 1: Read the current `ServicesSection.tsx` variant-switch shape**

Before writing code, read the full file to confirm its exact prop signature and existing variant names
(e.g. `'cards' | 'list' | ...`) — do not assume it matches `HeroSection`'s pattern; confirm from source.

- [ ] **Step 2: Write the failing test**

```typescript
// app/[slug]/components/sections/ServicesSection.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ServicesSection from './ServicesSection'

const services = [
  { name: 'Balayage', description: 'Hand-painted colour', price: '₹4,500', duration_or_unit: '2.5 hrs' },
  { name: 'Signature cut', description: 'Wash + style', price: '₹1,200', duration_or_unit: '45 min' },
]

describe('ServicesSection — menu variant', () => {
  it('renders each service as a dotted-leader price row', () => {
    const { container } = render(
      <ServicesSection services={services} variant="menu" label="The Menu" action="book" />
    )
    expect(screen.getByText('Balayage')).toBeTruthy()
    expect(screen.getByText('₹4,500')).toBeTruthy()
    expect(container.querySelectorAll('.menu-item-leader').length).toBe(2)
  })
})
```

(Adjust the exact prop names in this test to match whatever `ServicesSection`'s real signature is, confirmed
in Step 1 — the test above assumes `services`/`variant`/`label`/`action` based on the naming convention seen
elsewhere in the codebase; update to match reality before running.)

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/[slug]/components/sections/ServicesSection.test.tsx`
Expected: FAIL — `variant="menu"` not handled, no `.menu-item-leader` elements rendered.

- [ ] **Step 4: Implement the `menu` variant**

Add a new render branch (following whatever pattern the existing variants use, confirmed in Step 1) that
maps `services` to rows shaped like:

```tsx
<div className="flex items-baseline gap-2 py-3 border-b" style={{ borderColor: 'var(--color-accent-border)' }}>
  <div>
    <div className="font-semibold text-sm">{item.name}</div>
    {item.description && <div className="text-xs opacity-60 mt-0.5">{item.description}{item.duration_or_unit ? ` · ${item.duration_or_unit}` : ''}</div>}
  </div>
  <div className="menu-item-leader flex-1 border-b border-dotted" style={{ borderColor: 'var(--color-accent-border)', transform: 'translateY(-3px)' }} />
  <div className="font-display-token text-base" style={{ color: 'var(--color-accent)' }}>{item.price}</div>
</div>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && npx vitest run app/[slug]/components/sections/ServicesSection.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/[slug]/components/sections/ServicesSection.tsx app/[slug]/components/sections/ServicesSection.test.tsx
git commit -m "feat: add menu variant to ServicesSection for Salon"
```

---

### Task 9: Data migration — seed real `palette_tokens` for the 6 existing focus-persona presets

**Files:**
- Create: `supabase/migrations/20260729161500_focus_persona_palette_tokens_seed.sql`

**Interfaces:**
- Consumes: `layout_presets` rows already seeded by `20260728150000_layout_presets_theme_columns.sql`
  (Atelier/Blush/Noir, 3 Tiffin presets, Clinic/Recover).
- Produces: real `palette_tokens` jsonb on those 6 rows + hero/services `sections` variant wiring for
  Atelier (sweep + menu) and Home Kitchen (dabba).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260729161500_focus_persona_palette_tokens_seed.sql
--
-- Real per-persona color identity for the 3 focus-persona curated presets,
-- replacing their shared flat ACCENT-enum-derived look. Grounded per
-- docs/superpowers/specs/2026-07-29-focus-persona-signature-themes-design.md.

UPDATE layout_presets SET palette_tokens = '{
  "accent": "#7B4B3A", "accentSurface": "#7B4B3A0d", "accentBorder": "#7B4B3A26",
  "accentGlow": "#7B4B3A40", "signature": "#C9A56A"
}'::jsonb
WHERE persona = 'salon' AND name = 'Atelier';

UPDATE layout_presets SET palette_tokens = '{
  "accent": "#D68A2E", "accentSurface": "#D68A2E0d", "accentBorder": "#D68A2E26",
  "accentGlow": "#D68A2E40", "signature": "#B5472F"
}'::jsonb
WHERE persona = 'tiffin' AND name = 'Home Kitchen';

UPDATE layout_presets SET palette_tokens = '{
  "accent": "#2F6E64", "accentSurface": "#2F6E640d", "accentBorder": "#2F6E6426",
  "accentGlow": "#2F6E6440", "signature": "#8E6E5C"
}'::jsonb
WHERE persona = 'physio' AND name = 'Clinic';
```

- [ ] **Step 2: Wire Atelier's `sections` to the new hero/services variants**

Confirm the exact `sections` jsonb shape by reading one existing row (`SELECT sections FROM layout_presets
WHERE name = 'Atelier'`), then add to the same migration file an `UPDATE` that sets the `hero` entry's
`variant` to `'sweep'` and the `services` entry's `variant` to `'menu'` within that jsonb array, and for
Home Kitchen sets the `hero` entry's `variant` to `'dabba'` — using `jsonb_set` with the correct array index
found from the SELECT above (index depends on real data; do not guess it without checking).

- [ ] **Step 3: Apply the migration**

Run: `cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work" && supabase db push`
Expected: applies cleanly.

- [ ] **Step 4: Verify**

Run: `supabase db execute --sql "select name, palette_tokens->>'accent' as accent, palette_tokens->>'signature' as signature from layout_presets where name in ('Atelier','Home Kitchen','Clinic')"`
Expected: 3 rows with the hex values from Step 1, not null.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260729161500_focus_persona_palette_tokens_seed.sql
git commit -m "feat: seed real palette_tokens + hero variants for Atelier/Home Kitchen/Clinic"
```

---

### Task 10: Admin visibility — `/admin/layouts` shows `palette_tokens`

**Files:**
- Modify: `app/admin/layouts/page.tsx`

**Interfaces:**
- Consumes: `layout_presets.palette_tokens` (Task 1/9).
- Produces: read-only swatch + raw JSON display in the existing preset form; no new CRUD.

- [ ] **Step 1: Read the existing swatch-preview section**

Read `app/admin/layouts/page.tsx` around line 265 (`{/* Thumbnail or colour swatch */}`) to match its exact
current markup pattern before extending it.

- [ ] **Step 2: Implement**

Add a small swatch row (using the same inline-style-background pattern already used for `page_bg`/`surface`/
`border_color` elsewhere in this file) showing `palette_tokens.accent` and `palette_tokens.signature` as two
adjacent color chips when `palette_tokens` is non-null on the row being displayed, with a `<pre>` fallback
showing the raw JSON for now (no dedicated editor — matches the "no new admin UI" scope decision).

- [ ] **Step 3: Manual check**

Run the dev server, open `/admin/layouts`, filter to salon persona, confirm the Atelier row shows a
rosewood + brass swatch pair distinct from Blush/Noir.

- [ ] **Step 4: Commit**

```bash
git add app/admin/layouts/page.tsx
git commit -m "feat: show palette_tokens swatch preview in admin layouts list"
```

---

### Task 11: Verification — Lighthouse, WCAG, visual proof, regression check

**Files:** none (verification only, per CLAUDE.md's UI work workflow)

**Interfaces:**
- Consumes: everything from Tasks 1-10, deployed to a preview environment or run locally against
  `/{slug}/preview`.

- [ ] **Step 1: Seed a test page per focus persona**

Using the existing `scripts/seed-e2e-provider.mjs` pattern (or an equivalent manual DB insert against a
local/branch Supabase instance), create or reuse one test provider each for salon, tiffin ('other' persona
with tiffin-shaped services), and physio, and apply the Atelier / Home Kitchen / Clinic presets to each via
the running `LayoutsTab.tsx` UI.

- [ ] **Step 2: Lighthouse audit**

For each of the 3 test slugs, run the `chrome-devtools` MCP `lighthouse_audit` tool against
`http://localhost:3000/{slug}/preview`.
Expected: accessibility score ≥ 95 for all 3; no Core Web Vitals regression attributable to the sweep
animation (check CLS specifically, since the sweep is `position: absolute` and should not shift layout).

- [ ] **Step 3: Targeted WCAG contrast check**

Compute contrast ratios for: rosewood `#7B4B3A` text/accent on porcelain `#F7F3EE` background, and turmeric
`#D68A2E` text/accent on cream `#FBF6EC` background (the spec's flagged mid-tone pairs). Use the existing
`lib/colorContrast.ts` (`meetsWcagAA`) utility already in the codebase to check programmatically rather than
eyeballing.
Expected: both pairs pass 4.5:1 for body text usage, 3:1 for large-text/UI-component usage (the accent is
used as a CTA background with white text, which is a different, generally more forgiving check — verify that
pairing too: white on `#7B4B3A` and white on `#D68A2E`).
If any pair fails: adjust the failing hex in Task 9's migration (do not ship a failing pair), re-run Task 9
Step 3-4, and re-check here.

- [ ] **Step 4: Visual proof via playwright**

For each of the 3 test slugs, use the `playwright` MCP to navigate to `/{slug}/preview`, set viewport to
390×844 (mobile), and screenshot: (a) with default motion settings, (b) with
`prefers-reduced-motion: reduce` emulated. For the salon page specifically, confirm via
`browser_evaluate` that `.hero-sweep` has `display: none` under reduced-motion and is present/animating
otherwise.

- [ ] **Step 5: Regression check — no `palette_tokens` renders byte-identical**

Pick one existing non-focus-persona test page (or a focus-persona page that has never had a preset applied),
screenshot it via playwright before and after this branch's changes are deployed. Expected: pixel-identical
(or, if a visual diff tool isn't available, confirm via `browser_evaluate` that
`getComputedStyle(wrapper).getPropertyValue('--color-signature')` equals `getComputedStyle(wrapper)
.getPropertyValue('--color-accent')` — the documented fallback behavior from Task 6 Step 6).

- [ ] **Step 6: Record results**

Summarize pass/fail for Steps 2-5 in the PR description (or a comment on this plan file) before considering
the feature ready to ship. Any failure routes back to the relevant task, not a new task.

---

## Self-Review

**Spec coverage:**
- Data model (`palette_tokens`, `signature_color`, precedence chain) → Tasks 1, 4, 6. ✓
- Read path / `LayoutRenderer` derivation → Task 6. ✓
- Component changes (sweep, dabba, menu) → Tasks 7, 8. ✓
- Rollout (preset apply writes real colors; signature picker in customize UI) → Tasks 3, 4, 5. ✓
- Verification (Lighthouse, WCAG, playwright, regression) → Task 11. ✓
- Out of scope (physio arc, other sections, admin CRUD) → correctly absent from all tasks. ✓
- Open Question 1 (denormalization mechanics) → resolved during planning: client-side copy at apply-time via
  `LayoutsTab.handleApplyLayout`, confirmed against real code, documented in Task 5. ✓
- Open Question 2 (admin display) → Task 10, read-only swatch, no new CRUD. ✓
- **Gap found and added:** the spec didn't anticipate that `enrichLayout`'s curated-column fields were
  already dead due to a missing SELECT (Task 3) and that `handleApplyLayout` never sent any color data at
  all (Task 5 Step 2) — both are real pre-existing bugs discovered while reading the actual code during
  planning, not scope creep; without fixing them, `palette_tokens` would be equally inert. Documented as
  prerequisites, not silently folded in.

**Placeholder scan:** no TBD/TODO. Task 8's test uses inferred prop names with an explicit instruction to
confirm against real source first (Step 1) — this is a deliberate, flagged uncertainty about a file not yet
read in full, not a placeholder for logic. Task 9 Step 2 and Task 5 Step 6 similarly flag "confirm exact
shape from real data/file before editing" rather than guessing — both are pointing at genuine unknowns
(jsonb array index; a prop-drilling site not yet located) rather than deferring designed logic.

**Type consistency:** `PaletteTokens` (accent/accentSurface/accentBorder/accentGlow/signature) defined once
in Task 2, used identically in Tasks 4, 6, 7, 9 test fixtures. `paletteTokens`/`signatureColor` field names
consistent across `LayoutOption`, `ProfileData`, and both API route bodies.

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-29-focus-persona-signature-themes.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
