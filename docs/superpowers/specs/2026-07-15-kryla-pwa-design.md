# Kryla PWA Design — Two Installable Progressive Web Apps

**Date:** 2026-07-15  
**Status:** Approved for implementation

---

## Problem

Kryla.work has two live member-facing surfaces — the public customer page
(`<slug>.kryla.work`) and the My Chat operations dashboard
(`<slug>.kryla.work/mychat`) — but neither is installable as a mobile app.
Members currently receive a plain URL after onboarding. There is no PWA
manifest, no service worker, no app icon, and My Chat was never designed
mobile-first. The goal is to turn both surfaces into polished, installable
apps that feel like products from an app store, delivered to members as
install links the moment their space goes live.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Deployment type | PWA only (no native store) | One codebase, instant deploys, no review cycle |
| App scope | Both apps (customer + My Chat) | Both surfaces benefit; infra is shared |
| Sequencing | Both in parallel (5 workstreams) | Foundation unblocks all; workstreams are independent |
| Auth channels for My Chat | Email OTP **or** WhatsApp OTP (user picks one) | Keep existing email path; add WhatsApp for mobile convenience |
| Branding | Kryla identity throughout | K-mark, saffron #F5A623, ink #0D0D0D — not per-member theming |
| iOS install | Guided "Share → Add to Home Screen" | `beforeinstallprompt` not supported on iOS Safari; this is not fixable |
| SW tooling | `@serwist/next` | Actively maintained Next 14 successor to `next-pwa` |

---

## Architecture Overview

```
<slug>.kryla.work
├── /                         ← Customer App PWA (scope "/")
│   ├── manifest: /customer.webmanifest  (dynamic — member name in JSON)
│   └── SW: scope "/", precaches shell + member page, stale-while-revalidate
└── /mychat                   ← My Chat App PWA (scope "/mychat")
    ├── manifest: /mychat.webmanifest    (dynamic — "My Chat")
    └── SW: scope "/mychat", precaches shell only (no PII cached)

Shared:
  /get-app?app=customer|mychat  ← Install page (platform-detects iOS vs Android)
  /api/auth/whatsapp/start      ← WhatsApp OTP: find member, send code
  /api/auth/whatsapp/verify     ← WhatsApp OTP: verify code, mint Supabase session
```

Both manifests are Next.js Route Handlers, not static files, so they can
read the member's `display_name` / `first_name` from the DB via the subdomain
slug in the request host header.

---

## W1 — Shared PWA Foundation

### Service Worker (`app/sw.ts`)
- Serwist app-shell precache (JS chunks, CSS, fonts)
- `/api/*` → NetworkFirst (never served stale)
- `/<slug>` customer page → StaleWhileRevalidate (offline-capable)
- `/mychat*` → NetworkFirst shell, no data caching (session security)

### App Icons (new raster assets in `public/icons/`)
Generated from `public/kryla-icon-saffron.svg` + `public/kryla-icon-dark.svg`:
- `icon-192.png`, `icon-512.png` — standard
- `icon-maskable-192.png`, `icon-maskable-512.png` — safe-zone K-mark on ink fill
- `apple-touch-icon.png` — 180×180
- iOS splash screens: 1170×2532 (14 Pro), 1125×2436 (X/11), 828×1792 (XR)
- My Chat variant: same icon with a small saffron badge dot (bottom-right corner)
  so members can visually distinguish the two installed apps

### Dynamic Manifest Route Handlers
`app/customer.webmanifest/route.ts`:
```json
{
  "name": "<member display_name or first_name + 'by Kryla'>",
  "short_name": "<first_name>",
  "start_url": "/?src=pwa",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#0D0D0D",
  "background_color": "#0D0D0D",
  "icons": [192, 512 + maskable variants]
}
```
Reads slug from `Host` header; looks up `providers.display_name / first_name` via `supabaseAdmin`.

`app/mychat.webmanifest/route.ts`:
```json
{
  "name": "My Chat",
  "short_name": "My Chat",
  "start_url": "/mychat?src=pwa",
  "scope": "/mychat",
  ...same icons but My Chat badge variant...
}
```

### Meta Tags & Viewport
New per-surface layouts:
- `app/[slug]/layout.tsx` — adds customer manifest link, `apple-mobile-web-app-*`
- `app/[slug]/mychat/layout.tsx` (new) — adds My Chat manifest link

Root `app/layout.tsx` gets the shared `viewport` export:
`{ width: 'device-width', initialScale: 1, viewportFit: 'cover' }`

### Safe-Area + Standalone CSS (additions to `globals.css`)
```css
@media (display-mode: standalone) {
  .pwa-header { padding-top: env(safe-area-inset-top); }
  .pwa-bottom { padding-bottom: env(safe-area-inset-bottom); }
}
```
Tailwind utilities `pt-safe`, `pb-safe`, `px-safe` via `tailwind.config.ts` additions.

### Install Page (`app/get-app/page.tsx`)
- Accepts `?app=customer|mychat&slug=<slug>`
- Android/Chrome: captures `beforeinstallprompt`, shows Kryla-branded "Add to phone" button
- iOS: animated step-by-step Share → A2HS instructions with screenshots
- Desktop: QR code linking to the same page (for sharing from a computer)
- After install or dismiss: redirects to `/?src=pwa` or `/mychat?src=pwa`

### Shared `useInstallPrompt()` hook + Install Banner
- `hooks/useInstallPrompt.ts` — wraps `beforeinstallprompt` event capture
- `components/InstallBanner.tsx` — dismissible bottom strip (saffron accent, K-mark)
  shown to non-installed repeat visitors (after 2nd visit, via localStorage counter)

---

## W2 — Install-Link Delivery

### On page-live (existing Inngest `build-page.ts` step 5)
After `mark-page-live`, fire a new Inngest step (or extend the existing notification):
```
Member receives via WhatsApp + email:
  🎉 Your Kryla space is live!
  Install your My Chat app: https://<slug>.kryla.work/get-app?app=mychat
  Share with customers: https://<slug>.kryla.work/get-app?app=customer
```
Reuses `sendWhatsAppMessage()` (`lib/whatsapp.ts`) and `buildPageLiveMessage()` patterns.
Reuses Resend email for the email delivery.

### "Share your app" in My Chat (Plan tab → Refer area)
New `ShareAppCard` component in `app/mychat/ReferTab.tsx`:
- Customer app install link + copy button + WhatsApp share button
- Shows a QR code (generated client-side via a tiny SVG lib) for in-person sharing

---

## W3 — WhatsApp OTP Sign-In

### DB: `wa_auth_otps` table
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
phone       text NOT NULL          -- normalized +CC format
code_hash   text NOT NULL          -- SHA-256(code + salt)
expires_at  timestamptz NOT NULL   -- now() + 10 minutes
attempts    int NOT NULL DEFAULT 0
consumed    bool NOT NULL DEFAULT false
created_at  timestamptz DEFAULT now()
```
RLS disabled; service role only. Index on `(phone, consumed, expires_at)`.

### API: `POST /api/auth/whatsapp/start`
1. Normalize phone input to E.164
2. Look up `providers` by `whatsapp_number` (most recent, same rule as dashboard)
3. If not found → 404 "No Kryla account found for this number"
4. Rate-limit: reject if active OTP for this phone sent < 60s ago
5. Generate 6-digit code, hash with salt, insert `wa_auth_otps` row (expire old ones)
6. Send via `sendWhatsAppMessage()` with the Meta auth template
7. Return `{ ok: true }` (never reveal member email or existence beyond 404)

### API: `POST /api/auth/whatsapp/verify`
1. Look up latest unconsumed, unexpired row for phone
2. Increment `attempts`; if attempts ≥ 5 → mark consumed (lockout) → 429
3. Compare `hash(code + salt)` → if mismatch → 401
4. Mark consumed; look up provider email
5. `supabaseAdmin.auth.admin.generateLink({ type:'magiclink', email })` → get token
6. `supabase.auth.verifyOtp({ email, token, type:'email' })` to mint session + set cookies
7. Return redirect to `/mychat`

### Updated `app/login/page.tsx`
Two-panel segmented control at top: **Email** | **WhatsApp**
- Email path: unchanged (email input → OTP input → verify)
- WhatsApp path: phone input with country-code picker → OTP input → verify
  (calls `/api/auth/whatsapp/start` and `/api/auth/whatsapp/verify`)
- Shared OTP input component (6-digit, centered, large font, auto-submit on 6th digit)
- Kryla-branded: ink background, saffron accent, K-mark header, same visual quality as current login

### Edge cases
- Provider with no email: `generateLink` will fail — create a synthetic stable email
  `<phone_normalized>@wa.kryla.work` on first WhatsApp login (stored in `providers.email`)
- Multiple providers same phone: pick `ORDER BY created_at DESC LIMIT 1` (matches dashboard)
- Meta auth template approval: must be pre-approved; use category `AUTHENTICATION`,
  include expiry copy per Meta policy. Lead time ~1–3 days for approval.

---

## W4 — Customer App: Mobile + PWA Polish

### Bottom Action Bar (standalone mode only)
`components/PwaActionBar.tsx` — rendered by `LayoutRenderer` inside
`app/[slug]/components/LayoutRenderer.tsx` when `display-mode: standalone`:
```
[ Book Now ]  [ Call ]  [ WhatsApp ]  [ Directions ]
```
Data sources: `pages.cta_primary` for Book text, `providers.whatsapp_number` via `waLink()`,
`providers.location` for Google Maps link. Hidden on desktop / non-standalone.

### Install Banner
`InstallBanner` (from W1) mounted in `app/[slug]/page.tsx` client shell;
appears on 2nd visit, links to `/get-app?app=customer&slug=<slug>`.

### Audit
- Verify `HeroTicker`, `AdsScroller`, section slider all work at 375px in standalone mode
- The `offsetWidth`-based slider fix in `HomeClient.tsx` is already present; verify it applies
  in the member page slider if one exists

---

## W5 — My Chat: Native Mobile Redesign

### Shell Strategy
- Desktop (≥768px): **unchanged** — split view (public page left, SpaceClient panel right)
- Mobile (<768px): **new app shell** — no split, full-screen tabs with bottom nav

The switch is purely CSS/JS at viewport — no routing change, no component duplication.
Add a `useMobileShell()` hook that reads `window.innerWidth < 768`.

### Bottom Tab Bar (`components/MyChatTabBar.tsx`)
5 primary tabs mapping to existing SpaceClient tabs:
```
[ Chat ]  [ Design ]  [ Messages ]  [ Schedule ]  [ Plan ]
```
Each tab icon: a simple SVG (lucide-style); active = saffron fill. Fixed at bottom;
`padding-bottom: env(safe-area-inset-bottom)`.

### Per-Tab Views
- Full-screen content area between header and tab bar
- `overflow-y: auto`, no parent scroll (prevents iOS rubber-band on outer container)
- Tab transitions: fade (no heavy animation; keeps bundle small)

### Sub-Tab Pattern
Design (7 sub-tabs) and Messages (4 sub-tabs) use a horizontally-scrollable
**segmented pill row** pinned below the per-tab sticky header:
```
[Services] [Sections] [Layouts] [Ads] [Media] [Language] [Letterhead]
```
Scrollable, no wrap. Active pill: saffron background, ink text.

### Studio Overlays (mobile)
`PractitionerStudio` and `DraftingStudio` — already slide-in overlays (400px panel).
On mobile: change to `position:fixed; inset:0` with a slide-up animation (transform Y)
so they cover the full screen. Close button stays top-right. No logic change.

### Sticky Per-Tab Headers
Each tab gets a `<header>` with:
- `position: sticky; top: 0; z-index: 10`
- `padding-top: env(safe-area-inset-top)` (in standalone mode)
- Title + contextual action (e.g., "Publish" for Chat, "Add Service" for Design/Services)
- Ink background, saffron accent on active elements

### SpaceClient.tsx changes
- Add `isMobile` prop (derived from `useMobileShell()`) 
- When `isMobile`: render tab content area + `<MyChatTabBar>` instead of top-tab strip
- When desktop: render existing top-tab layout unchanged
- The live-page split panel (`MyChatLayout`) is only rendered when not mobile

### `MySpacePanel` (per memory: must stay in sync)
Check if `MySpacePanel` still exists (file search during execution). If yes: consolidate to
`SpaceClient` first before applying the mobile redesign, rather than mirroring changes twice.

---

## Kryla Branding Reference

| Token | Value | Usage |
|---|---|---|
| Ink | `#0D0D0D` | Backgrounds, text, icons |
| Saffron | `#F5A623` | Active states, accents, CTAs |
| Saffron hover | `#EA8C00` | Button hover |
| Surface warm | `#FFF7ED` | Card surfaces, banners |
| K-mark SVG | `public/kryla-icon-dark.svg` | Inline in headers, splash |
| Wordmark | inline SVG (`kryla<span saffron>.work</span>`) | Login, install page headers |

All new components use these tokens. No per-member palette bleeds into the PWA chrome.

---

## Verification Checklist

- [ ] Chrome DevTools → Application → Manifest shows correct data for `/` and `/mychat`
- [ ] Service worker registers for both scopes without scope collision
- [ ] Lighthouse PWA audit: both surfaces pass installability check
- [ ] Android Chrome: install prompt fires; app installs; opens standalone; shows splash
- [ ] iOS Safari: `get-app` page shows A2HS instructions; app installs; opens standalone
- [ ] Two separate home-screen icons (customer vs My Chat) after installing both
- [ ] Airplane mode: customer page loads from cache; My Chat shows shell + offline state
- [ ] Email OTP sign-in: unchanged behavior
- [ ] WhatsApp OTP: real number receives code; 6-digit entry; lands in My Chat authenticated
- [ ] WhatsApp OTP lockout: 5 wrong codes → locked; new code request allowed after expiry
- [ ] Install link arrives in WhatsApp + email at page-live moment
- [ ] "Share app" in My Chat → copy/WhatsApp share links work
- [ ] My Chat bottom tab bar appears on mobile; desktop unchanged
- [ ] Studio overlays full-screen on mobile
- [ ] Customer app bottom action bar visible in standalone, hidden in browser
- [ ] Safe-area insets correct on notched iPhone (bottom bar not obscured)
- [ ] Installed icon and splash follow Kryla branding on both apps
