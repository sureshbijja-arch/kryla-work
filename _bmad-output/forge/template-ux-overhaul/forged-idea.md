# Kryla Design System & Template UX Overhaul

## The locked idea

Make every Kryla member page feel custom-made at a glance — not by adding more visual effects, but by building a design system that makes average content look intentional. The system does the heavy lifting; the member doesn't need to.

---

## What's locked

**Direction**
The richness is restraint, not decoration. A system so well designed that a member with 3 photos and 2 services looks like they hired an agency. Instagram's model: one consistent system that makes any content feel curated.

**Design modes — `design_mode` column on `pages`**
Three modes, one token structure:
- `craft` — warm spacing, 1.333 type ratio, rounded, approachable. Default for baker, chef, salon, trainer.
- `editorial` — generous whitespace, 1.414 ratio, photography-forward, sparse text. For photographer, doctor, musician.
- `product` — tight, geometric, crisp. Reserved for future personas (SaaS, tech).

Set automatically at onboarding from persona. Member can override. Palette (color) stays independent.

**Token implementation**
CSS custom properties as the source: `[data-mode='craft'] { --type-display: 3.5rem; --space-section: 5rem; --radius-card: 1.5rem; }`. Tailwind config extension reads the same scale. Both — not either. `data-mode` attribute on the LayoutRenderer wrapper div.

**Retrofit**
All section components rewritten on the token system before any production `sections` data exists in the DB. No migration debt.

**`auto` variant — resolved at render time in LayoutRenderer**
Content signals, in order:
1. `gallery.length > 0` → `photo` (full-bleed image hero)
2. `avatarUrl` exists, no gallery → `split` or `centered`
3. No photos → `dark` (typographic, text carries everything)

Admin can override to a specific variant. `auto` is the default for all new section entries.

**Build sequence**
1. W1: CSS tokens + `design_mode` column + `data-mode` on wrapper. Invisible — nothing looks different yet. Non-negotiable.
2. W2: HeroSection rewrite + `auto` variant logic. First visible win. Most members get a better hero automatically.
3. W3: All remaining sections (Services, Highlights, Bio, Gallery, FAQ, Contact) rewritten on tokens. Consistent rhythm.
4. W4: Persona default `sections` arrays. New member's page looks custom-made on day one without touching admin.

---

## What was killed

- **Decoration as richness** — floating orbs, gradient borders, glow pulses. These are 2019 agency portfolio moves. Killed in favor of confident negative space and typography.
- **Encoding design_mode in palette** — palette is color only. Spatial grammar is a separate concern.
- **Extending `template` to carry design mode** — too coupled. New column.
- **Temporary bridge** — derive design_mode from existing template value at render time. Killed. Proper column from the start.
- **Writing `auto` variant back to DB** — render time resolution only. DB stays clean.
