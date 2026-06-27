---
name: kryla
description: Master context skill for building Kryla.work — the platform that gives underserved professionals (tutors, bakers, trainers, salons, photographers, doctors, home chefs) a professional page online in under 15 minutes, powered by Claude AI. Use this skill for ANY task related to Kryla: writing code, making product decisions, designing features, writing copy, planning sprints, debugging, reviewing architecture, pricing decisions, go-to-market, database design, agent logic, or anything else touching Kryla.work. This skill must be consulted before any Kryla-related work begins. Never make assumptions about Kryla's architecture, pricing, tech stack, or philosophy without reading this first.
---

# Kryla.work — Master Context

## The One-Sentence Mission
Give the world's underserved professionals — the tutor in Pune, the baker in Celina, the tailor in Lagos — a professional online presence in under 15 minutes, for free to start.

## The Problem We Solve
Skilled professionals worldwide are invisible online. They operate on WhatsApp, referrals, and phone calls. Not because they lack skills — because every existing solution is too expensive, too complex, or not built for them. Squarespace, Wix, and WordPress were designed for people who have time, money, and technical ability. Our members have none of these — and they shouldn't need to.

## The Core Promise
Answer 5 questions → AI builds your page → you're live in 15 minutes. No tech skills. No design skills. No login to remember. Manage everything from WhatsApp.

---

## Language System — How Kryla Speaks

This is not a style guide. It is a philosophy. Every word on Kryla.work — every notification, every button, every error message — must feel like it came from a person who knows you, not a company that manages you.

### Who is who

| Word | Who it means | Never say |
|---|---|---|
| **Member** | The professional on Kryla — tutor, baker, trainer, salon, photographer | User, Provider, Customer |
| **Customer** | The person who does business with a Member. Belongs to the Member, not to Kryla. Kryla never speaks to them directly. | End user, Client, Consumer |
| **Business** | The generic word for what happens between a Member and their Customer — a booking, a session, an order, a job, a hire | Transaction, Engagement, Conversion |
| **Membership** | What a Member has with Kryla | Subscription, Plan, Tier |
| **Join** | How someone becomes a Member | Sign up, Register, Create account |
| **Your space** | Where a Member manages their business on Kryla | Dashboard, Portal, Admin |
| **Getting you started** | The onboarding experience | Onboarding, Setup wizard |
| **Ask us** | How a Member contacts support | Submit a ticket, Open a support case |
| **Grow your membership** | Moving to a higher tier | Upgrade, Upsell |

### Kryla's voice — the rules

1. **Speak like a friend who knows your name.** Always use the Member's first name. "Priya, 3 people looked you up today" not "Your page received 3 views."

2. **No tech jargon. Ever.** If a word needs explaining, replace it. Not "Enable booking notifications" — "Get a WhatsApp when new business comes in."

3. **Daily conversation words only.** If you wouldn't say it to a neighbor over chai or coffee, don't write it on Kryla.

4. **Make numbers mean something.** Not "12 page views this week" — "12 people looked you up this week." Not "3 pending bookings" — "3 people are waiting to hear from you."

5. **Celebrate the small things.** First page view, first booking, first business. These are big moments for a Member. Treat them that way.

6. **When something goes wrong, own it.** Not "An error occurred" — "Something went wrong on our end — we're fixing it now."

7. **Membership upgrades are invitations, not pressure.** Not "Upgrade to unlock custom domain" — "Ready for your own address on the internet? Move up to Grow."

### Before / After examples

| ❌ Never write this | ✅ Write this instead |
|---|---|
| Your trial expires in 3 days | Priya, your free start wraps up in 3 days — ready to keep going? |
| Enable booking notifications | Get a WhatsApp the moment new business comes in |
| Your page has received 12 visits | 12 people looked you up this week |
| Upgrade to Grow plan to unlock custom domain | Ready for your own address on the internet? |
| User not found | We couldn't find that — want to try again? |
| Subscription cancelled | Sorry to see you go, Priya. Your page stays live until end of month. |
| Payment failed | Something went wrong with your payment — tap here and we'll sort it in 2 minutes |
| Onboarding complete | You're live! Share this with your first customer → |
| Submit a support ticket | Ask us anything — we're on WhatsApp |
| No bookings yet | Your page is live — share it and your first business will come |

### The community layer

Kryla is not a tool Members use. It is a community Members belong to.

- **Members see each other** — a directory of makers in your city. Priya the tutor sees Meena the baker. They refer each other's business.
- **Members back each other** — a "vouch", not a review. "I know this person. Their work is real."
- **Members shape Kryla** — a monthly "what should we build next?" vote. Most-wanted feature ships the following month.
- **New member welcome** — not a system email. A WhatsApp from a real Member in their city: "Hey, welcome to Kryla — I'm a baker in Celina too. Let me know if you need anything."

### What Kryla owns vs what Members own

Kryla owns: the platform, the infrastructure, the AI, the tools.
Members own: their page, their customers, their business, their reputation.

Kryla's job is to make Members look good — and then get out of the way.

---

## Architecture Overview

Read `references/architecture.md` for full system details. Key points:

**5-layer platform:**
- Public Layer — the Member's page that their Customers see. Profile, business inquiry, confirmation.
- Member Layer — where Members manage their business. Bookings, notifications, page editor, how their business is doing.
- Platform Core — vertical config engine, booking engine, notification service, AI page generator, domain manager, billing
- Infrastructure — Supabase (Postgres), Vercel + Cloudflare, Supabase Auth (OTP), file storage, Inngest job queue
- Operations Layer — onboarding flow, AI support chatbot, admin panel, monitoring

**The Vertical Config Engine is the key architectural insight:** One codebase. A JSON config per persona activates the right features, sections, templates, and onboarding questions. Never maintain separate codebases per vertical.

---

## Tech Stack (Non-Negotiable)

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) | ISR for fast per-user pages |
| Database | Supabase (Postgres) | Auth + DB + Storage + Realtime in one |
| AI | Claude API — `claude-sonnet-4-6` | Page generation + support chatbot |
| Hosting | Vercel | Zero-config Next.js + CDN |
| DNS/CDN | Cloudflare | Wildcard DNS + SSL + caching |
| Queue | Inngest | Background jobs — never block the user |
| Notifications | Meta WhatsApp API | Provider alerts + support intake |
| Email | Resend | Transactional email |
| Payments | Stripe (USA) + Razorpay (India) | Dual market |

**Rules that never break:**
1. Never call Claude API synchronously on a user request. Always queue via Inngest. User waits max 200ms.
2. Never store sensitive data client-side. Plan, billing, account data always from Supabase server-side.
3. Every API route handles failures gracefully. If WhatsApp fails, log and retry. Never crash the user's flow.
4. `middleware.ts` is the most important file — reads subdomain, routes `priya.kryla.work` → `/priya` internally.

---

## Database Schema (7 Tables)

Read `references/database.md` for full column specs. Table purposes:

- **providers** — one row per person. Has `slug`, `plan`, `plan_status`, `stripe_customer_id`, `razorpay_customer_id`, `custom_domain`, `verified`, `page_live`.
- **pages** — Claude-generated content. Has `services` (jsonb), `highlights` (jsonb), `palette`, `font`, `template`, `seo_title`, `show_sections`, `custom_css`, `build_version`.
- **onboarding_answers** — 5 answers + raw Claude prompt + raw Claude response for debugging.
- **bookings** — status: `pending → accepted | rejected | cancelled`. Tracks `notification_sent` and `confirmation_sent` separately.
- **notifications** — log of every WhatsApp/email/SMS with delivery status.
- **support_tickets** — conversation history (jsonb), status: `open → ai_resolved | escalated | closed`.
- **page_events** — lightweight analytics: `page_view`, `booking_click`, `whatsapp_click`.

---

## The 7 AI Agents

Read `references/agents.md` for full step-by-step flows. Agent summary:

| Agent | When it fires | Cost/customer/mo |
|---|---|---|
| 🧠 Orchestrator | Every system event | $0.05 |
| 🏗️ Builder | Once at signup, re-fires on full rebuild | $0.15 |
| 📅 Booking | Every booking submission | $0.40 |
| 🔍 Monitor | Every 15 min + Uptime Robot webhook | $0.10 |
| ✏️ Content | Provider WhatsApps an update request | $0.08 |
| 🔍 SEO | At page creation + monthly | $0.05 |
| 💬 Support | Provider contacts support | $0.20 |

**Total AI agent cost: $1.03/customer/month.** This is what makes the unit economics work.

**The support agent rule:** 80% of issues resolved by AI without human intervention. Escalate to human via Slack for: refund requests, billing disputes, account deletion, complaints about other users.

---

## Pricing

Read `references/pricing.md` for full plan details and margin math.

| Plan | India | USA | Key unlock | Agents |
|---|---|---|---|---|
| 🌱 Seed | Free | Free | Page + contact form | Builder only |
| 🌿 Sprout | ₹299/mo | $5/mo | Booking + WhatsApp alerts | Builder + Booking |
| 🌳 Grow | ₹799/mo | $12/mo | Custom domain + analytics | + Monitor + SEO |
| 🚀 Thrive | ₹1,999/mo | $25/mo | All 6 agents, WhatsApp updates | All 6 |
| ⭐ Elevate | ₹3,999/mo | $45/mo | Payments + team + branded email | All 6 + payment |

**Margins (Fully Automated):** Sprout ~74%, Grow ~76%, Thrive ~83%, Elevate ~88%.

**The upgrade hooks:**
- Seed → Sprout: hits 10 inquiry limit, wants proper booking
- Sprout → Grow: wants `priya.com` instead of `priya.kryla.work`
- Grow → Thrive: wants to update page via WhatsApp, wants reviews
- Thrive → Elevate: wants online payments, needs team access

**WhatsApp API is the #1 cost at scale.** Gate it to paid plans only. Free (Seed) users get email only.

---

## URL Architecture

Three-phase approach (like Shopify):

- **Now (MVP):** `user.kryla.work` via wildcard DNS. 2 days of engineering. Covers free + Sprout.
- **Month 3:** Add `kryla.work/user` path routing as silent SEO layer. Builds platform domain authority.
- **Month 4–6:** Custom domain (`priya.com`) via CNAME + Let's Encrypt automation. Unlocks Grow plan. The single most powerful upgrade motivator.

**Never use Let's Encrypt directly for custom domains at scale** — rate limit is 50 certs/domain/week. Use Cloudflare as SSL proxy instead.

---

## Template System

**3 fonts:** Clean & Modern (Inter), Classic & Trustworthy (Georgia), Friendly & Warm (Trebuchet MS)

**6 color palettes:** Professional (violet), Fresh (emerald), Warm (amber), Minimal (slate), Creative (rose), Calm/Medical (cyan)

**5 templates:**
- **Focus** — text-first. Tutors, coaches, consultants. Available from Grow.
- **Portfolio** — gallery-first. Photographers, bakers, designers. Grow+.
- **Clinic** — trust/credentials-first. Doctors, physios, CAs. Grow+.
- **Storefront** — product/menu-first. Home chefs, salons. Thrive+.
- **Premium** — cinematic, large imagery. Wedding photographers. Thrive+.

**AI decides:** best template, all page copy, SEO title, default palette, schema markup type.
**Provider can change via WhatsApp:** palette, font, profile photo, services, timings, bio, CTA text, section visibility.

**Photo tiers:** Auto stock (Seed) → Choose stock set (Sprout) → Own photo + gallery (Grow) → Full image control + AI accent images (Thrive) → Brand kit + logo (Elevate).

**Never use AI for the main profile photo** — it destroys trust.

---

## Target Personas (Priority Order)

Read `references/personas.md` for full 35-persona analysis.

**Phase 1 — Validate (start here):**
- Home Tuition Teacher — pain 9/10, 92% no website, works in both markets
- Independent Fitness Trainer — pain 8/10, post-COVID boom
- Home Baker — pain 9/10, Instagram DM chaos is their daily life
- Freelance Photographer — pain 9/10, Instagram is not a website

**Phase 2 — Scale:**
Salon, Music Teacher, Wedding Videographer, Home Chef/Tiffin

**Phase 3 — Expand (higher ARPU):**
Doctor, CA, Interior Designer, Dietitian

**Phase 4 — Volume play (lower price tolerance):**
Restaurant, Repair Shop, Electrician, Auto Workshop

**The persona to start with:** Home Tuition Teacher. Works in both Celina TX and India. Highest readiness. Kryla.studio (the founder's kid's site) is living proof of the persona.

---

## Geographic Strategy

**Celina, TX (primary USA market):**
- #1 fastest-growing city in America (6K → 64K residents since 2010, +24.6%/yr)
- 3,000 new homes/year. Avg home value $500K+.
- City's stated goal: "city of small business."
- Celina ISD building 1 new elementary school/year.
- 22 of 35 personas are Celina-ready.
- Founder lives here. This is the unfair advantage.

**India (parallel market):**
- 38M+ target professionals in India alone
- Same platform, lower price point (₹299–₹3,999)
- WhatsApp-first approach matches existing behavior
- Tier 2/3 cities are massively underserved and have virtually no competition

---

## Go-To-Market Sequence

Read `references/gtm.md` for full channel playbook and scripts.

**Week 1–2:** Walk into 20 Celina businesses. Build 10 free pages. In India: join WhatsApp groups, observe only.
**Week 3–4:** Post on Nextdoor + Celina FB groups. Share user pages, not ads. India: share first pages in groups.
**Month 2:** Launch referral program (1 month free per referral). India: seed colony ambassadors in 3 cities.
**Month 3:** Celina ISD newsletter + Chamber of Commerce. India: first MSME partnership + Hindi YouTube.
**Month 4–6:** Double down on top 2 channels. India: Tier 2 city visits.
**Month 7–12:** SEO + referral flywheel self-sustaining.

**The most important GTM rule:** First 10 customers cannot be acquired by platform marketing. They require a human who believes in the product. Walk in. Sit with them. Build the page in front of them.

**Conversion funnel drop points:**
- 60% who hear about Kryla never visit → fix: show them a real peer page, not an ad
- Key unlock: the first booking. Everything should be designed to get to that moment fast.

---

## Sustainability Model

The founder has a full-time job. This is the plan:

| Phase | Months | MRR | Platform cost | Time/week |
|---|---|---|---|---|
| Build | 1–3 | $0 | $35 | 10–15 hrs |
| Validate | 4–6 | $850 | $180 | 15–20 hrs |
| Grow | 7–12 | $5,100 | $800 | 20–25 hrs |
| Scale | 13–18 | $17,000 | $2,500 | Decision point |

**The job is the co-founder.** It funds the runway, removes survival pressure, gives 18 months to build something real.

**The only High severity risk:** Burnout. Schedule build time like a meeting. One full day off per week. This is an 18-month build.

---

## MVP Build Sequence (6 Weeks)

Read `references/mvp-build.md` for full task list with file names and time estimates.

| Week | Focus | End goal |
|---|---|---|
| 1 | Foundation | Next.js + Supabase + Cloudflare DNS + middleware + landing page |
| 2 | Onboarding | Persona picker → 5 questions → slug claim → plan picker |
| 3 | AI Generation | Claude builds page → Inngest async → Focus template live |
| 4 | Booking | Booking form → WhatsApp notification → accept/reject → client confirmed |
| 5 | Support + Payments | AI support chatbot + Stripe + Razorpay + plan gating |
| 6 | Beta Launch | Error handling + SEO + mobile + monitoring + first 5 real users |

**MVP is just:** Claude API + Supabase + wildcard subdomain + WhatsApp notification. No agents yet. Agents come in Phase 3 when there's revenue to justify the complexity.

---

## Design Philosophy

**No drag-and-drop editor.** Our users are a tutor in Pune, a baker in Celina. They don't want Webflow. Drag-and-drop is complexity we push onto them. WhatsApp-based updates are complexity we absorb for them. This is the entire value proposition.

**Only 3 templates (not 10).** More templates = more decisions = more abandonment. Wix has 900 templates and it paralyzes users. AI picks the right one automatically.

**WhatsApp-first.** No dashboards to learn. No logins to remember. Like talking to a friend.

**Customization as upgrade hook.** Seed users can't change fonts or sections — keeps page quality-controlled and makes Grow plan features tangible.

**Free plan users cost ~$0.25/mo in infra.** This is customer acquisition cost. Far cheaper than ads. Expected free-to-paid conversion: 15–25%.

---

## What Kryla Is NOT

- Not a website builder for technical users (that's Webflow)
- Not a marketplace (we don't take booking commission)
- Not a directory (providers own their page)
- Not trying to compete with Squarespace/Wix on features
- Not targeting businesses that can already afford $20+/mo tools

## Competitors

- **Durable.co** — AI site builder, but $15/mo minimum, English only, no WhatsApp, no India market
- **Urban Company** — aggregator that takes commission, providers don't own their presence
- **Wix/Squarespace** — too complex, too expensive for our personas
- **Instagram/WhatsApp** — where our users currently "exist" but it's not a website

**Our moat:** Competitors charge $0 and do nothing automatically. We charge $25 and deploy a 6-agent AI team that never sleeps — for $1.03 in operating cost per customer per month.

---

## Reference Files

- `references/architecture.md` — Full platform architecture, data flows, tech stack details
- `references/database.md` — Complete database schema, all 7 tables, all columns
- `references/agents.md` — All 7 agents, step-by-step flows, cost model
- `references/pricing.md` — Full pricing plans, margin calculations, unit economics
- `references/personas.md` — 35 personas, scoring, market sizing, launch sequence
- `references/gtm.md` — Community channels, scripts, 90-day sequence, conversion funnel
- `references/mvp-build.md` — 6-week build schedule, API routes, file structure, env vars

---

## Member Groups — Vision (Phase 2, not MVP)

**What it is:** A Member can create one or more groups. Their Customers join from the Member's page — one tap, phone number, done. The Member broadcasts messages to the whole group. Customers reply privately back to the Member. Not a group chat — a managed broadcast. One Member talking to many Customers.

**Why it matters:**
- Priya has 40 students across 40 individual WhatsApp chats today. This is chaos.
- WhatsApp broadcast lists require Customers to have saved Priya's number first — friction.
- WhatsApp groups become noisy — 40 parents talking over each other.
- Kryla Groups connect directly to Priya's page, her bookings, her business. WhatsApp can't do that.

**How it works on the Member's page:**
- "Stay in the loop" button sits alongside "Book" and "WhatsApp me"
- Customer taps → enters name + phone → they're in. No app. No account.
- Member sends a message from their space → all group members get it via WhatsApp
- Customers reply privately back to the Member — not to the group
- Member can have multiple groups: "Grade 5 Morning Batch", "Grade 8 Evening", "Parents"

**Language on the page button (pick one per persona):**
- "Stay in the loop"
- "Join Priya's circle"
- "Get updates from Priya"
- "Be the first to know"

**Why deferred to Phase 2:** No new infrastructure cost. Uses the existing WhatsApp API already in the stack. Needs only a `groups` table in Supabase and a broadcast Inngest job — both already planned. Deferred to keep MVP focused, not because it's hard or expensive.

**Version B (Members + Customers mixing across groups):** Separate, bigger idea. Needs dedicated thinking before any design or build. Do not design or build until explicitly discussed and documented here.

---

## Self-Validation Checklist — Run Before Every Response

This checklist applies to ALL output: code, copy, API routes, database fields, notifications, button labels, error messages, comments in code, variable names, and anything else produced for Kryla.work.

Before completing any task, Claude Code must silently run through every item below and fix violations before responding. Do not report the checklist to the user — just apply it.

### 🔤 Language Check
- [ ] No use of "User" or "Users" — must be "Member" or "Members"
- [ ] No use of "Provider" — must be "Member"
- [ ] No use of "Customer" to refer to Kryla's Members — Customers are who Members serve
- [ ] No use of "Subscription" — must be "Membership"
- [ ] No use of "Sign up" — must be "Join"
- [ ] No use of "Dashboard" facing Members — must be "Your space"
- [ ] No use of "Transaction" or "Engagement" — must be "Business"
- [ ] No use of "Upgrade" as a verb alone — must be "Grow your membership" or "Move up to [plan]"
- [ ] No use of "Submit a ticket" — must be "Ask us"
- [ ] No tech jargon in any Member-facing copy — if a word needs explaining, replace it

### 🏗️ Architecture Check
- [ ] Claude API never called synchronously — always queued via Inngest
- [ ] No sensitive data stored in localStorage or client state
- [ ] Every API route has error handling — no silent failures
- [ ] Subdomain routing goes through middleware.ts only
- [ ] WhatsApp API calls go through lib/whatsapp.ts wrapper
- [ ] Database calls use Supabase — no other database
- [ ] Background jobs use Inngest — no other queue

### 🗄️ Database Check
- [ ] Column names match references/database.md exactly
- [ ] No new tables added without checking references/database.md first
- [ ] `provider_id` used as FK consistently (not `user_id` or `member_id`)
- [ ] Status fields use correct enums: `pending | accepted | rejected | cancelled` for bookings, `open | ai_resolved | escalated | closed` for support tickets
- [ ] Plan field uses correct values: `seed | sprout | grow | thrive | elevate`

### 💰 Pricing & Plan Check
- [ ] Free plan called "Seed" — never "Free plan" or "Trial"
- [ ] Plan names: Seed, Sprout, Grow, Thrive, Elevate — exact capitalisation
- [ ] WhatsApp notifications only available on Sprout and above — never on Seed
- [ ] Custom domain only available on Grow and above
- [ ] All 6 agents only available on Thrive and above

### 🎨 Copy & Tone Check
- [ ] Every Member-facing message uses first name where available
- [ ] Numbers mean something: not "12 views" — "12 people looked you up"
- [ ] Errors are human: not "An error occurred" — "Something went wrong on our end"
- [ ] No corporate language — read every sentence aloud as if saying it to a neighbor
- [ ] CTAs are invitations not commands: "Join Kryla — it's free" not "Register now"

### 🚫 MVP Scope Check
- [ ] No agent code in MVP (agents are Phase 3)
- [ ] No custom domain logic in MVP (Phase 2)
- [ ] No Member Groups feature (Phase 2)
- [ ] No Version B community features (future — not designed yet)
- [ ] No Razorpay in MVP Week 1-4 (Week 5 only)
- [ ] No advanced SEO tooling in MVP (basic meta tags only)

### ✅ Done means
A task is only done when:
1. It works
2. It passes every check above
3. The language sounds like a friend talking to Priya — not a SaaS platform talking to a user

---

## How to use this checklist in practice

When Claude Code finishes a task, it must re-read what it just wrote, run every item above, fix any violations, then deliver the final output. This is not optional. The checklist is the last step of every task — not an afterthought.

If a violation is found after delivery, fix it immediately without being asked.

---

## Word Map — Never Say "Page"

"Page" is a developer word. Members don't think in pages — they think in presence, identity, place, home.

Use different words based on the moment:

| Moment | Use this |
|---|---|
| Hero headline | "your place online" |
| CTA buttons | "Claim your spot" |
| Onboarding start | "Let's build your presence" |
| After generation | "You're live" or "Your profile is live" |
| Sharing context | "your Kryla link" |
| Features | "your online home" |
| Pricing | "your presence online" |
| Nav CTA | "Get your spot →" |
| Member to member | "Are you on Kryla?" |
| WhatsApp messages | "your Kryla profile" |
| Membership cards | "your place on Kryla" |

**Never use:** page, website, site, web page, landing page, profile page, webpage

**Why:** A tutor doesn't think "I need a page." They think "I need people to find me." The words we use should match how they already think — not introduce new concepts they have to learn.

**The self-check:** Before any copy goes live, read it aloud as if you're saying it to a neighbor. If it sounds like a developer wrote it, rewrite it.

---

## Landing Page Decisions (v1 and v2)

### v1 — lives at kryla.work/v1
Original landing page. Clean, structured, good for reference.
Headline: "Are you on Kryla.work?"

### v2 — the main landing (kryla.work)
Cinematic, warm, Canva-style alternating sections.
Built with: Next.js, Tailwind, Unsplash photos, inline CSS.

**Hero section:**
- Background: white #FFFFFF
- Floating real photos from Unsplash (6 professions)
- Photos have profession labels as white pills
- K brand mark visible in hero
- Three headline lines:
  1. "Your craft deserves" — dark #0D0D0D
  2. "a name online." — amber #F5A623
  3. "Give your business its own identity." — #444444

**Location toggle (top bar):**
- Dark bar #0D0D0D at very top
- Pill toggle: 🇮🇳 India | 🇺🇸 USA
- Active: amber background, dark text
- Inactive: transparent, white text
- Switches prices between INR and USD across entire page
- Default: USA (geo-detected via ipapi.co)

**Nav:**
- White background
- Logo: kryla-wordmark-light.svg, height 36px
- Right: "Join free →" dark button

**Horizontal slider (replaces 4 alternating sections):**
- Uses pixel-based `translateX(current * outerRef.current.offsetWidth)` — NOT percentage. Percentage breaks on iOS Safari.
- Touch swipe enabled (40px threshold).
- All 4 slides: text left, card right layout.
- Auto-advances every 4s. Arrow buttons on desktop, dot nav below. Timer resets on manual nav.
- Slides: 1 Priya (Identity), 2 Meena (One Link), 3 Raj (15 Minutes), 4 Alex (WhatsApp).

**Community section:** Dark background, two-row scrolling ticker

**Pricing section:** White background, 4 plan cards + Elevate mention
Plan names visible: 🌱 Seed, 🌿 Sprout, 🌳 Grow, 🚀 Thrive, ⭐ Elevate

**Testimonials:** Dark background, 3 cards
- India detected → Meena first, then Priya, then Raj
- USA detected → Priya first, then Meena, then Raj

**Final CTA:** Amber #F5A623 background, dark button

---

## Logo System

**K mark:** The Kryla brand icon — dark K with amber diagonal slash.
Files in public/:
- `kryla-wordmark-light.svg` — K mark + "kryla.work" for **light/white** backgrounds (kryla dark, .work amber)
- `kryla-wordmark-dark.svg` — K mark + "kryla.work" for **dark** backgrounds (kryla white, .work amber)
- `kryla-icon-dark.svg` — K mark only, dark version
- `kryla-icon-saffron.svg` — K mark only, amber/saffron version
- `kryla-favicon.svg` — browser tab icon (dark square background)

**Usage rules:**
- Nav: inline SVG wordmark (K mark + "kryla.work" text) — never use image files
- Favicon: `kryla-favicon.svg`
- Watermark/accent: inline SVG, never `kryla-icon-saffron.svg`

**K mark inline SVG (two-colored — use everywhere, never single-color SVG or image files):**
```svg
<path d="M20 10 L20 90" stroke="#0D0D0D" strokeWidth="12/14" strokeLinecap="round"/>
<path d="M20 50 L70 10" stroke="#0D0D0D" strokeWidth="12/14" strokeLinecap="round"/>
<path d="M20 50 L70 90" stroke="#F5A623" strokeWidth="12/14" strokeLinecap="round"/>
```
- Vertical stroke + top diagonal: `stroke="#0D0D0D"`
- Bottom diagonal: `stroke="#F5A623"`
- On amber/dark backgrounds, bottom diagonal can use `stroke="rgba(0,0,0,0.4)"` for subtlety
- Footer and nav both use inline SVG wordmark, not image files
- Copyright year: 2026

**Critical:** `kryla-wordmark-dark.svg` has WHITE "kryla" text — invisible on white/light backgrounds. Prefer inline SVG over any image file.

**Never:** Use K icon alone in nav without wordmark text. Never use `kryla-icon-saffron.svg` for the K mark anywhere.

---

## Design Tokens

```
Brand amber:     #F5A623
Dark:            #0D0D0D
Light bg:        #FAFAFA
White:           #FFFFFF
Text muted:      #666666
Text body:       #444444
Border light:    #E5E5E5
Success green:   #22C55E (Live indicator)
```

**Hero background:** white #FFFFFF (decided — cleanest, most professional)

---

## File Structure (current)

```
kryla.work/
├── app/
│   ├── page.tsx          ← main landing (copy of v2)
│   ├── layout.tsx        ← favicon + page title
│   ├── v2/page.tsx       ← v2 landing (source of truth)
│   ├── onboarding/       ← 5-step onboarding flow
│   └── api/
│       └── onboarding/   ← page generation API
├── public/
│   ├── kryla-wordmark-light.svg
│   ├── kryla-wordmark-dark.svg
│   ├── kryla-icon-dark.svg
│   ├── kryla-icon-saffron.svg
│   └── kryla-favicon.svg
├── references/
│   ├── architecture.md
│   ├── agents.md
│   ├── database.md
│   ├── pricing.md
│   ├── gtm.md
│   ├── personas.md
│   └── mvp-build.md
└── CLAUDE.md             ← this file
```

---

## What's Built vs What's Next

### ✅ Built
- kryla.work live on Vercel
- v2 landing page — hero, alternating sections, pricing, testimonials, CTA, footer
- Location auto-detection via ipapi.co (India/USA)
- Onboarding flow — 5 steps (persona → details → URL → membership → build)
- Logo system — wordmark SVGs, icon SVGs, favicon
- CLAUDE.md in repo root with full context

### 🔨 Next (in order)
1. Connect Supabase — save onboarding data to DB
2. Wire Claude API — generate real profile from 5 answers
3. Test full loop — complete onboarding, see generated profile
4. Add Anthropic API key to Vercel env vars
5. WhatsApp integration — booking notifications
6. Stripe + Razorpay — payment processing
7. Member space — booking management
8. Public member profiles at [slug].kryla.work

### ❌ Not in MVP (Phase 2+)
- Member Groups (WhatsApp broadcast)
- Custom domains
- AI agents (Phase 3)
- Razorpay (India payments — Month 4–5)
- Advanced SEO tooling
