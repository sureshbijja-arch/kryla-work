# Kryla.work — AI Agents

> Agents are Phase 3 (not MVP). Do not build agent code until there is revenue to justify it.
> MVP uses direct Claude API calls via Inngest only for page generation.

## Agent Overview

| Agent | Trigger | Monthly cost/member |
|---|---|---|
| 🧠 Orchestrator | Every system event | $0.05 |
| 🏗️ Builder | Once at join, re-fires on rebuild | $0.15 |
| 📅 Booking | Every booking submission | $0.40 |
| 🔍 Monitor | Every 15 min + webhook | $0.10 |
| ✏️ Content | Member WhatsApps an update | $0.08 |
| 🔍 SEO | At page creation + monthly | $0.05 |
| 💬 Support | Member contacts support | $0.20 |

**Total: $1.03/member/month** (fully automated, all agents running)

## Plan → Agent Access

| Plan | Agents available |
|---|---|
| Seed | Builder only (once) |
| Sprout | Builder + Booking |
| Grow | + Monitor + SEO |
| Thrive | All 6 agents |
| Elevate | All 6 + payment processing |

## 🧠 Orchestrator Agent

**Trigger:** Every system event (booking received, WhatsApp message, page event threshold)
**Purpose:** Routes events to the right agent. Decides urgency. Prevents duplicate agent firing.
**Cost basis:** ~50 events/member/month × $0.001 = $0.05

## 🏗️ Builder Agent

**Trigger:** Member completes onboarding (once). Re-fires when member requests full rebuild.
**Input:** 5 onboarding answers + persona config
**Output:** Structured JSON → saved to `pages` table
**Steps:**
1. Load persona config (vertical JSON)
2. Build Claude prompt with answers + persona context
3. Call Claude API (via Inngest — never synchronous)
4. Parse response into services, highlights, palette, template, copy
5. Save to `pages` table
6. Set `providers.page_live = true`
7. Send WhatsApp: "You're live! → [link]"

**Prompt structure:**
```
You are building a professional profile for a [persona] named [name] based in [city].
They answered 5 questions:
Q1: [answer]
...
Return JSON with: headline, bio, services[], highlights[], palette, template, seo_title, seo_description
```

## 📅 Booking Agent

**Trigger:** New booking form submission
**Steps:**
1. Validate booking data
2. Check provider availability (if calendar connected)
3. Send provider WhatsApp: "New booking from [name] for [service] on [date]"
4. Wait for accept/reject (24hr timeout → auto-reject with apology)
5. On accept: send customer confirmation with details
6. On reject: send customer polite decline
7. Log to `notifications` table

## 🔍 Monitor Agent

**Trigger:** Every 15 minutes (Inngest cron) + Uptime Robot webhook
**Purpose:** Checks if member pages are loading correctly. Alerts on errors.
**Steps:**
1. Fetch member page URL
2. Check HTTP status, load time, key elements present
3. If issue detected: alert via Slack + WhatsApp to member
4. Log result

## ✏️ Content Agent

**Trigger:** Member WhatsApps an update request
**Examples:** "Change my price to ₹600/hr", "Add yoga for beginners to my services", "Update my timings to 6am-8pm"
**Steps:**
1. Parse intent from WhatsApp message
2. Identify which field(s) to update
3. Make targeted update to `pages` table
4. Confirm via WhatsApp: "Done! Your [field] is now updated → [link]"

## 🔍 SEO Agent

**Trigger:** Page creation + monthly refresh
**Steps:**
1. Analyze page content
2. Generate/update seo_title, seo_description, schema markup
3. Identify local keywords for the member's city + persona
4. Update `pages` table

## 💬 Support Agent

**Trigger:** Member contacts support (WhatsApp or email)
**Goal:** Resolve 80% without human escalation
**Steps:**
1. Classify issue (billing, technical, how-to, complaint)
2. Attempt resolution using knowledge base
3. If resolved: confirm and close ticket
4. If not: escalate to human via Slack with full context
**Escalate for:** refunds, billing disputes, account deletion, complaints about other members
