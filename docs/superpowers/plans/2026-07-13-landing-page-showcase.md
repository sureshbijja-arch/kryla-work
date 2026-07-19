# Landing Page Hero Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 existing hero photo cards to use local images and add 4 distributor/agency cards, growing from 4+4 to 6+6 clusters.

**Architecture:** All changes are in `app/HomeClient.tsx`. The hero section renders two floating card clusters (`.hf-cluster.left/.right`), each holding `hf-wrap` divs gated by `isEnabled('<persona>')`. Cards use local `/images/*.jpg` files (served as static assets from `public/images/`). New distributor/agency cards use Unsplash placeholder URLs until local photos are supplied.

**Tech Stack:** Next.js, React, inline JSX (no component extraction needed), existing CSS classes.

## Global Constraints

- Do NOT change class names, CSS variables, or any CSS rules outside the specific mobile rule updated in Task 2.
- Do NOT remove the `isEnabled()` gate from any card — new cards stay hidden until those personas are enabled in DB.
- Local image paths: `/images/<Filename>.jpg` (served from `public/images/`).
- Available local files: `Tutor1.jpg`, `Baker1.jpg`, `HomeChef1.jpg`, `Retailer1.jpg`, `MusicTeacher1.jpg`, `Salon1.jpg`, `Advocate1.jpg`, `Doctor1.jpg`.
- All 8 existing card **labels and emojis stay unchanged**; only the `src` attribute changes.
- New cards must carry an `animationDelay` and `--rotation` CSS var following the existing pattern.
- Do NOT change `R1_ALL`/`R2_ALL` in Task 1 or 2 — Task 3 covers those optionally.

---

### Task 1: Repoint 8 existing hero cards to local images

**Files:**
- Modify: `app/HomeClient.tsx:844,851,856,862,871,877,883,889`

No new files. No CSS changes.

- [ ] **Step 1: Verify local image files exist**

Confirm these files exist in `public/images/`:
- `Tutor1.jpg` ✓
- `Baker1.jpg` ✓
- `HomeChef1.jpg` ✓
- `Retailer1.jpg` ✓
- `MusicTeacher1.jpg` ✓
- `Salon1.jpg` ✓
- `Advocate1.jpg` ✓
- `Doctor1.jpg` ✓

If any are missing, stop and report before proceeding.

- [ ] **Step 2: Replace the 8 Unsplash `src` values with local paths**

In `app/HomeClient.tsx`, replace the entire left cluster block (lines ~841–866) with:

```tsx
          {/* Left cluster — Tutor, Baker, Chef, Retailer */}
          <div className="hf-cluster left">
            {isEnabled('tutor') && (
              <div className="hf-wrap" style={{ '--rotation':'-5deg', animationDelay:'0s' } as React.CSSProperties}>
                <img className="hf-photo" src="/images/Tutor1.jpg" alt="Tutor" />
                <span className="hf-label">📚 Tutor</span>
              </div>
            )}
            {isEnabled('baker') && (
              <div className="hf-wrap" style={{ '--rotation':'4deg', animationDelay:'0.5s' } as React.CSSProperties}>
                <img className="hf-photo" src="/images/Baker1.jpg" alt="Baker" />
                <span className="hf-label">🎂 Baker</span>
              </div>
            )}
            {isEnabled('chef') && (
              <div className="hf-wrap" style={{ '--rotation':'3deg', animationDelay:'1s' } as React.CSSProperties}>
                <img className="hf-photo" src="/images/HomeChef1.jpg" alt="Chef" />
                <span className="hf-label">🍱 Chef</span>
              </div>
            )}
            {isEnabled('retailer') && (
              <div className="hf-wrap" style={{ '--rotation':'-4deg', animationDelay:'1.5s' } as React.CSSProperties}>
                <img className="hf-photo" src="/images/Retailer1.jpg" alt="Retailer" />
                <span className="hf-label">🛍️ Retailer</span>
              </div>
            )}
          </div>
```

And replace the entire right cluster block (lines ~867–894) with:

```tsx
          {/* Right cluster — Music Teacher, Salon / Stylist, Advocate, Doctor */}
          <div className="hf-cluster right">
            {isEnabled('musician') && (
              <div className="hf-wrap" style={{ '--rotation':'5deg', animationDelay:'0.3s' } as React.CSSProperties}>
                <img className="hf-photo" src="/images/MusicTeacher1.jpg" alt="Music Teacher" />
                <span className="hf-label">🎵 Music Teacher</span>
              </div>
            )}
            {isEnabled('salon') && (
              <div className="hf-wrap" style={{ '--rotation':'-3deg', animationDelay:'0.8s' } as React.CSSProperties}>
                <img className="hf-photo" src="/images/Salon1.jpg" alt="Salon / Stylist" />
                <span className="hf-label">✂️ Salon / Stylist</span>
              </div>
            )}
            {isEnabled('advocate') && (
              <div className="hf-wrap" style={{ '--rotation':'-5deg', animationDelay:'1.3s' } as React.CSSProperties}>
                <img className="hf-photo" src="/images/Advocate1.jpg" alt="Advocate" />
                <span className="hf-label">⚖️ Advocate</span>
              </div>
            )}
            {isEnabled('doctor') && (
              <div className="hf-wrap" style={{ '--rotation':'4deg', animationDelay:'1.8s' } as React.CSSProperties}>
                <img className="hf-photo" src="/images/Doctor1.jpg" alt="Doctor" />
                <span className="hf-label">🩺 Doctor</span>
              </div>
            )}
          </div>
```

- [ ] **Step 3: Verify no Unsplash URLs remain in the hero block**

Search `app/HomeClient.tsx` for `images.unsplash.com` inside the `{/* Flanking 2×2 */}` hero block. Should return zero matches.

- [ ] **Step 4: Load `/` in browser — spot-check each card**

Start `npm run dev` and open `http://localhost:3000`. All 8 cards must show:
- Tutor: a person tutoring (not a random Unsplash person)
- Baker: baked goods / baker (not a kitchen appliance)
- Chef: home chef scene
- Retailer: shop / retail scene
- Musician: music teacher / instrument
- Salon: salon / hair styling scene
- Advocate: lawyer / advocate scene
- Doctor: doctor scene (was previously mismatched — verify it now shows the correct curated photo)

If any card shows a broken image (`alt` text visible), check the file path case (`Doctor1.jpg` not `doctor1.jpg`).

- [ ] **Step 5: Commit**

```bash
git add app/HomeClient.tsx
git commit -m "fix: repoint hero photo cards to local curated images"
```

---

### Task 2: Add 4 distributor/agency cards and rebalance clusters to 6+6

**Files:**
- Modify: `app/HomeClient.tsx` (cluster JSX + zero CSS changes — existing mobile rule already works correctly for 6-card clusters)

**Why no CSS change is needed:** The existing mobile rule `.hf-wrap:nth-child(n+5){display:none}` at line 472 targets the 5th+ child *within each `.hf-cluster`*. Adding a 5th and 6th card to each cluster means those extra cards are automatically hidden on mobile — which is the desired behaviour. No rule update needed.

**New cards (4 total):**
| Persona | Label | Emoji | Cluster | `isEnabled()` key | Placeholder image |
|---|---|---|---|---|---|
| Distributor | Distributor | 🚚 | Left (5th) | `distributor` | Unsplash (see below) |
| Travel Agency | Travel Agency | ✈️ | Left (6th) | `travel` | Unsplash (see below) |
| Real Estate | Real Estate | 🏠 | Right (5th) | `realestate` | Unsplash (see below) |
| Agency | Agency | 💼 | Right (6th) | `agency` | Unsplash (see below) |

**Placeholder Unsplash URLs** (replace with local files when `public/images/Distributor1.jpg` etc. are supplied):
- Distributor: `https://images.unsplash.com/photo-1553413077-190dd305871c?w=300&q=80`
- Travel: `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=300&q=80`
- Real Estate: `https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&q=80`
- Agency: `https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=300&q=80`

Note: Unsplash image domains are already whitelisted in `next.config.js` — placeholder URLs work as-is.

- [ ] **Step 1: Add 5th and 6th cards to the left cluster**

In `app/HomeClient.tsx`, append two cards inside `<div className="hf-cluster left">` immediately after the `retailer` card block (before the closing `</div>`):

```tsx
            {isEnabled('distributor') && (
              <div className="hf-wrap" style={{ '--rotation':'2deg', animationDelay:'2s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=300&q=80" alt="Distributor" />
                <span className="hf-label">🚚 Distributor</span>
              </div>
            )}
            {isEnabled('travel') && (
              <div className="hf-wrap" style={{ '--rotation':'-3deg', animationDelay:'2.5s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=300&q=80" alt="Travel Agency" />
                <span className="hf-label">✈️ Travel Agency</span>
              </div>
            )}
```

- [ ] **Step 2: Add 5th and 6th cards to the right cluster**

In `app/HomeClient.tsx`, append two cards inside `<div className="hf-cluster right">` immediately after the `doctor` card block (before the closing `</div>`):

```tsx
            {isEnabled('realestate') && (
              <div className="hf-wrap" style={{ '--rotation':'3deg', animationDelay:'2.3s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&q=80" alt="Real Estate" />
                <span className="hf-label">🏠 Real Estate</span>
              </div>
            )}
            {isEnabled('agency') && (
              <div className="hf-wrap" style={{ '--rotation':'-2deg', animationDelay:'2.8s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=300&q=80" alt="Agency" />
                <span className="hf-label">💼 Agency</span>
              </div>
            )}
```

- [ ] **Step 3: Verify card count**

Count `isEnabled(` occurrences inside the `<div className="hero-bg">` block. Must be exactly 12.

- [ ] **Step 4: Load `/` in browser — verify desktop layout**

Open `http://localhost:3000`. Desktop view must show all 12 cards (6 left, 6 right) with the bobbing animation. New cards for `distributor`, `travel`, `realestate`, and `agency` will be invisible (personas not yet enabled) — that is correct and expected. Enable one temporarily in the personas table to spot-check a new card visually if desired.

- [ ] **Step 5: Verify mobile layout**

Resize browser to 375px wide (or use DevTools device mode). Each cluster should show 4 cards and hide the 5th/6th. Confirm no layout breakage.

- [ ] **Step 6: Commit**

```bash
git add app/HomeClient.tsx
git commit -m "feat: add distributor/agency hero cards (6+6 cluster layout)"
```

---

### Task 3 (optional): Add distributor and agency members to community ticker

**Files:**
- Modify: `app/HomeClient.tsx:9-24` (`R1_ALL` and `R2_ALL` arrays)

This task is **cosmetic and optional** — the ticker still works correctly without it. Complete only if you want the community ticker to include distributor/agency examples.

- [ ] **Step 1: Add two distributor/agency entries to R1_ALL**

Replace `R1_ALL` (lines 9–16) with:

```typescript
const R1_ALL = [
  { icon: '📚', name: 'Priya Sharma',    role: 'Tutor',                 loc: 'Celina, TX',       url: 'kryla.work/priyasharma',   persona: 'tutor' },
  { icon: '🎂', name: 'Meena Krishnan',  role: 'Home Baker',            loc: 'Pune, India',      url: 'kryla.work/meenabakes',    persona: 'baker' },
  { icon: '💪', name: 'Raj Patel',       role: 'Fitness Trainer',       loc: 'Prosper, TX',      url: 'kryla.work/rajfitness',    persona: 'trainer' },
  { icon: '📷', name: 'Alex Chen',       role: 'Photographer',          loc: 'Frisco, TX',       url: 'kryla.work/alexchenphoto', persona: 'photographer' },
  { icon: '🎵', name: 'Ananya Iyer',     role: 'Music Teacher',         loc: 'Chennai, India',   url: 'kryla.work/ananyaiyer',    persona: 'musician' },
  { icon: '🚚', name: 'Vikram Distributors', role: 'FMCG Distributor',  loc: 'Surat, India',     url: 'kryla.work/vikramdist',    persona: 'fmcgdist' },
  { icon: '✈️', name: 'Dreamways Travel', role: 'Travel Agency',        loc: 'Hyderabad, India', url: 'kryla.work/dreamwaystravel', persona: 'travel' },
];
```

Note: Removed `sofia` (pastry chef duplicate of baker) to keep R1 at 7 entries. Add her back if preferred.

- [ ] **Step 2: Add two distributor/agency entries to R2_ALL**

Replace `R2_ALL` (lines 17–24) with:

```typescript
const R2_ALL = [
  { icon: '🧘', name: 'Lakshmi Nair',    role: 'Yoga Instructor',       loc: 'Bengaluru, India', url: 'kryla.work/lakshmiyoga',      persona: 'trainer' },
  { icon: '✂️', name: 'Carlos Mendes',   role: 'Hair Stylist',          loc: 'Dallas, TX',       url: 'kryla.work/carlosstyle',      persona: 'salon' },
  { icon: '🧑‍🍳', name: 'David Okonkwo',  role: 'Private Chef',          loc: 'Houston, TX',      url: 'kryla.work/davidchef',        persona: 'chef' },
  { icon: '📐', name: 'Sunita Verma',    role: 'Interior Consultant',   loc: 'Mumbai, India',    url: 'kryla.work/sunitadesign',     persona: null },
  { icon: '🎤', name: 'Ravi Menon',      role: 'Voice Coach',           loc: 'Kochi, India',     url: 'kryla.work/ravivoice',        persona: 'musician' },
  { icon: '🏠', name: 'PropNest Realty', role: 'Real Estate Agency',    loc: 'Bengaluru, India', url: 'kryla.work/propnest',         persona: 'realestate' },
  { icon: '🛡️', name: 'SecureLife Ins',  role: 'Insurance Agency',      loc: 'Pune, India',      url: 'kryla.work/securelife',       persona: 'insurance' },
];
```

Note: Removed `preethi` (art teacher, persona 'tutor' duplicate) and replaced with real estate + insurance. Restore if preferred.

- [ ] **Step 3: Verify ticker renders**

Open `http://localhost:3000`. The scrolling ticker at the bottom of the page should scroll smoothly and include the new distributor/agency entries. No JS errors in console.

- [ ] **Step 4: Commit**

```bash
git add app/HomeClient.tsx
git commit -m "feat: add distributor and agency members to community ticker"
```

---

## Verification

**After Task 1:**
- [ ] All 8 hero cards show the correct curated local photos (doctor is a doctor, not a random person)
- [ ] No `images.unsplash.com` URLs remain in the hero block
- [ ] No broken image icons in DevTools Network tab

**After Task 2:**
- [ ] Desktop: 6 cards visible left + 6 visible right (new personas gated/hidden until enabled in DB)
- [ ] Mobile (375px): 4 cards visible per cluster, no layout breakage
- [ ] Animation/bobbing works on all existing + new card slots

**After Task 3 (if done):**
- [ ] Ticker scrolls without error, distributor/agency entries appear

## Follow-up (not in scope)

When `public/images/Distributor1.jpg`, `Travel1.jpg`, `RealEstate1.jpg`, and `Agency1.jpg` are supplied, replace the four Unsplash placeholder URLs in Task 2's new cards with the corresponding local paths (`/images/Distributor1.jpg` etc.). This is a 4-line `src` swap.
