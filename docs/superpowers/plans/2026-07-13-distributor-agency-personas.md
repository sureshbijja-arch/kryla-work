# Distributor & Agency Personas + Business Docs Studio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 16 distributor/agency personas (each with tailored onboarding, AI guidance, and a page layout) plus one shared `business_docs` Studio archetype with 7 document generator modes (quotation, agreement, price list, appointment letter, proposal, purchase order, refine).

**Architecture:** All additions follow the existing config-driven pattern. One Supabase migration seeds the DB (archetype, modes, personas, plan gating). Additive code entries in `config/verticals/index.ts`, `inngest/build-page.ts`, and `app/[slug]/personaConfig.ts` provide the UI/AI config. Zero changes to the Studio engine, persona routing, LayoutRenderer, or PractitionerStudio.tsx.

**Tech Stack:** Supabase (Postgres migrations), TypeScript (Next.js 14 App Router), Anthropic `claude-sonnet-4-6` via the existing Studio engine.

## Global Constraints

- Configurable data (personas, Studio modes, plan gating) lives in Supabase — not hardcoded.
- `personas.studio_archetype` is what activates the Studio tab in My Space — set it or the tab won't render.
- `VERTICALS` in `config/verticals/index.ts` and the `personas` table must stay in sync — missing from either breaks the feature (onboarding won't show the persona, or AI guidance will be absent).
- `workingGuidance` and `draftingGuidance` are intentionally absent from all new personas — they use the config-driven `PractitionerStudio` engine (not legacy hardcoded studios).
- All `studio_modes.output_format` values must be one of `html | json | redline` (DB CHECK constraint).
- Naming a mode key exactly `refine` with `output_format='redline'` reuses the built-in redline diff path in `PractitionerStudio.tsx`.
- `DESIGN_MODE_MAP` in `inngest/build-page.ts` is hardcoded — it does NOT auto-derive. Must be updated manually.
- `TEMPLATE_MAP` and `PALETTE_MAP` in `inngest/build-page.ts` DO auto-derive via `getAllVerticals()` — do NOT edit them.
- Verify TypeScript compiles with `npm run build` after each code task. There are no unit tests for persona config.

---

### Task 1: DB Migration — `business_docs` Studio archetype + 7 modes

**Files:**
- Create: `supabase/migrations/20260713220000_distributor_agency_personas.sql`

**Interfaces:**
- Produces: `studio_archetypes.id = 'business_docs'` and 7 rows in `studio_modes`; consumed by Tasks 2 & 3 (personas FK to archetype)

- [ ] **Step 1: Create the migration file with archetype + modes**

```sql
-- Distributor & Agency personas + Business Documents Studio.
-- Adds 16 personas (7 distributor + 9 agency) and the shared business_docs Studio archetype.
-- No UI or API code changes required — PractitionerStudio.tsx renders automatically
-- when personas.studio_archetype is set.

-- ── 1. Studio archetype ───────────────────────────────────────────────────────

INSERT INTO studio_archetypes (id, label, base_guidance, disclaimer, has_library, library_label, feature_key) VALUES

('business_docs', 'Business Documents',
'GUARDRAIL — BUSINESS DOCUMENT AID:
(a) You are a B2B document drafting tool helping distributors, agencies, and business intermediaries create professional business documents. All output is a draft for the provider''s review, customisation, and approval before sending.
(b) NEVER invent figures, prices, margins, legal terms, regulatory citations, or party details. Insert [ADD FIGURE] or [ADD DETAIL] wherever specific data is missing.
(c) Documents involving financial commitments or legal obligations (agreements, appointment letters, purchase orders) must carry a note: "This document is a draft — please review all terms and figures before signing or sending."
(d) Use clear, professional language appropriate for Indian or USA business contexts as indicated by the provider''s region. Indian documents: ₹ pricing, GST references, Indian business formalities. USA documents: USD pricing, applicable tax references, USA business norms.
(e) Numbered clauses for agreements; itemised tables for quotations and price lists; clear signature blocks for all formal documents.

OUTPUT FORMAT: Return valid HTML suitable for a rich-text editor. Use <h1>–<h3> for headings, <p> for paragraphs, <strong> for bold, <ul>/<li> and <ol>/<li> for lists, <table> for financial tables and clause lists. Include [DATE], [COMPANY NAME], [RECIPIENT NAME] placeholders where needed. No markdown — HTML only.',
'📋 AI-drafted document — review all figures, terms, and party details before signing or sending.',
false, NULL, 'studio_business')

ON CONFLICT (id) DO NOTHING;

-- ── 2. Studio modes (7 modes) ────────────────────────────────────────────────

INSERT INTO studio_modes (archetype_id, key, label, sort_order, form_schema, prompt_instructions, output_format) VALUES

('business_docs', 'quotation', 'Quotation', 1,
'[
  {"id":"buyer_company","label":"Buyer / Company Name","type":"text","placeholder":"e.g. Raj Traders, ABC Retail Pvt Ltd","required":true,"group":"main"},
  {"id":"items","label":"Products / Services & Quantities","type":"textarea","placeholder":"e.g.\nSunrise Refined Oil 5L – 100 cases @ ₹480\nAashirvaad Atta 10kg – 50 bags @ ₹320","required":true,"group":"main","rows":5},
  {"id":"pricing_notes","label":"Pricing Notes (optional)","type":"textarea","placeholder":"e.g. GST @ 18% extra; 5% discount on orders above 200 cases","required":false,"group":"main","rows":2},
  {"id":"validity","label":"Quote Validity","type":"text","placeholder":"e.g. Valid for 30 days from today","required":false,"group":"main"},
  {"id":"terms","label":"Delivery / Payment Terms (optional)","type":"textarea","placeholder":"e.g. Delivery within 5 working days; payment net 30 days","required":false,"group":"main","rows":2}
]',
'Generate a professional QUOTATION in HTML. Structure:
• Header: "QUOTATION" + date placeholder + quote number placeholder
• From: [your company name] — To: [buyer name / company]
• Itemised table: Description | Qty | Unit Price | Total
• Subtotal, taxes (GST for India / applicable taxes for USA), Grand Total
• Pricing notes, validity period, delivery and payment terms
• Polite closing and signature line
Use clear tables. Leave [ADD FIGURE] where amounts are not provided. No fabricated prices.',
'html'),

('business_docs', 'agreement', 'Agreement', 2,
'[
  {"id":"parties","label":"Parties (names & roles)","type":"textarea","placeholder":"e.g. Party A: Sunrise Foods Pvt Ltd (Distributor)\nParty B: Raj General Stores (Sub-Dealer)","required":true,"group":"main","rows":3},
  {"id":"scope","label":"Scope / Products / Services","type":"textarea","placeholder":"e.g. Distribution of Sunrise branded FMCG products within Bengaluru North zone","required":true,"group":"main","rows":3},
  {"id":"territory","label":"Territory / Exclusivity","type":"text","placeholder":"e.g. Exclusive for Bengaluru North; non-exclusive elsewhere","required":false,"group":"main"},
  {"id":"margins_fees","label":"Margins / Commission / Fees","type":"textarea","placeholder":"e.g. 8% margin on MRP; payment within 15 days of invoice","required":false,"group":"main","rows":2},
  {"id":"duration","label":"Duration & Renewal","type":"text","placeholder":"e.g. 1 year from signing; auto-renews annually unless terminated","required":false,"group":"main"},
  {"id":"termination","label":"Termination Clause (optional)","type":"textarea","placeholder":"e.g. Either party may terminate with 30 days written notice","required":false,"group":"main","rows":2}
]',
'Draft a professional DEALER / SERVICE AGREEMENT in HTML. Structure:
• Title: "DISTRIBUTOR / DEALER AGREEMENT" (adapt title to context)
• Parties: full names, roles, and address placeholders
• Recitals / Background (1–2 sentences)
• Numbered clauses: Scope, Obligations of each party, Commercial Terms (margins/fees/payment), Territory and Exclusivity, Duration and Renewal, Termination, Governing Law
• Signature block for both parties with date and witness lines
Plain professional language. No fabricated legal citations. Add "DRAFT — Subject to legal review" in the document header.',
'html'),

('business_docs', 'price_list', 'Price List', 3,
'[
  {"id":"effective_date","label":"Effective Date","type":"text","placeholder":"e.g. 1 August 2026","required":false,"group":"main"},
  {"id":"products","label":"Products / Services & Rates","type":"textarea","placeholder":"e.g.\nSunrise Refined Oil 5L – MRP ₹580 | Dealer ₹480 | Retailer ₹520\nAashirvaad Atta 10kg – MRP ₹410 | Dealer ₹330 | Retailer ₹365","required":true,"group":"main","rows":8},
  {"id":"gst_notes","label":"Tax / GST Notes","type":"text","placeholder":"e.g. All prices excl. GST @ 5%; or prices incl. GST","required":false,"group":"main"},
  {"id":"terms","label":"Payment & Credit Terms (optional)","type":"text","placeholder":"e.g. Net 30 days; 2% early payment discount within 7 days","required":false,"group":"main"},
  {"id":"validity","label":"Rate Card Validity","type":"text","placeholder":"e.g. Valid through 31 October 2026; subject to revision","required":false,"group":"main"}
]',
'Generate a professional PRICE LIST / RATE CARD in HTML. Structure:
• Header: [COMPANY NAME] placeholder + "PRICE LIST / RATE CARD" + Effective Date
• Well-formatted table with clear column headers (Product/Service | Unit | Price columns adapted from the data)
• Tax / GST notes below the table
• Payment and credit terms
• Validity and revision notice
• Footer: "Prices subject to change without notice"
Group products by category if multiple categories are apparent. Leave [COMPANY NAME] placeholder.',
'html'),

('business_docs', 'appointment', 'Appointment Letter', 4,
'[
  {"id":"type","label":"Appointment Type","type":"select","options":[{"value":"appoint_dealer","label":"Appoint a dealer / sub-agent"},{"value":"get_appointed","label":"Draft letter to get appointed by a brand"}],"required":true,"group":"main"},
  {"id":"appointing_party","label":"Appointing Party (company name)","type":"text","placeholder":"e.g. Sunrise Foods Pvt Ltd","required":true,"group":"main"},
  {"id":"appointed_party","label":"Appointed Party (name / company)","type":"text","placeholder":"e.g. Raj General Stores","required":true,"group":"main"},
  {"id":"scope","label":"Scope / Products / Territory","type":"textarea","placeholder":"e.g. Authorised sub-dealer for Sunrise FMCG range in Bengaluru North","required":true,"group":"main","rows":3},
  {"id":"effective_date","label":"Effective Date","type":"text","placeholder":"e.g. 1 August 2026","required":false,"group":"main"},
  {"id":"terms","label":"Key Terms (optional)","type":"textarea","placeholder":"e.g. Annual renewal; performance targets; margin structure","required":false,"group":"main","rows":2}
]',
'Generate a professional APPOINTMENT LETTER in HTML. Structure:
• Letterhead placeholder (company name, address)
• Date and reference number placeholder
• Salutation to the appointed party
• Opening: "We are pleased to appoint [Party] as our authorised [role] for [scope / territory]."
• Scope and products / services covered
• Territory and exclusivity (if provided)
• Effective date and duration
• Key obligations and commercial terms (if provided)
• Brand / quality standards paragraph
• Closing with signature block of appointing party
Formal, professional tone. No fabricated legal citations.',
'html'),

('business_docs', 'proposal', 'Partnership Proposal', 5,
'[
  {"id":"proposal_for","label":"Proposal For (recipient / company)","type":"text","placeholder":"e.g. ABC Consumer Goods Ltd","required":true,"group":"main"},
  {"id":"purpose","label":"Purpose of Proposal","type":"textarea","placeholder":"e.g. Partnership for distribution of ABC products across Bengaluru, Mysuru, and Tumkur districts","required":true,"group":"main","rows":2},
  {"id":"our_strength","label":"Our Strengths / Credentials","type":"textarea","placeholder":"e.g. 8 years in FMCG distribution, 450+ active retail accounts, refrigerated fleet, GST registered","required":true,"group":"main","rows":3},
  {"id":"coverage","label":"Coverage / Network","type":"textarea","placeholder":"e.g. 3 districts, 12 talukas, 450 retailers, 2 warehouses","required":false,"group":"main","rows":2},
  {"id":"what_we_offer","label":"What We Offer","type":"textarea","placeholder":"e.g. Dedicated sales team, monthly sell-through reports, 30-day credit cycle","required":false,"group":"main","rows":3},
  {"id":"ask","label":"Our Ask / Next Steps","type":"text","placeholder":"e.g. Exclusive distribution rights for Bengaluru division; meeting to discuss terms","required":false,"group":"main"}
]',
'Generate a professional BUSINESS / PARTNERSHIP PROPOSAL in HTML. Structure:
• Title: "Partnership Proposal" + date placeholder
• Executive Summary (2–3 sentences)
• About Us: credentials, years in operation, network size, key clients / brands
• Market Coverage: territory, accounts, infrastructure highlights
• Value Proposition: what we bring to the brand / client
• Our Ask: clear statement of what we are seeking (territory, products, engagement model)
• Our Commitment: volumes, reporting, compliance, service standards
• Next Steps
• Closing and contact / signature block
Persuasive and professional. Use data from inputs. Leave [ADD FIGURE] for missing numbers.',
'html'),

('business_docs', 'purchase_order', 'Purchase Order', 6,
'[
  {"id":"supplier","label":"Supplier / Vendor Name","type":"text","placeholder":"e.g. Sunrise Foods Pvt Ltd","required":true,"group":"main"},
  {"id":"po_date","label":"PO Date","type":"text","placeholder":"e.g. 15 July 2026","required":false,"group":"main"},
  {"id":"items","label":"Items / Products Ordered","type":"textarea","placeholder":"e.g.\nSunrise Refined Oil 5L – 200 cases @ ₹480 each\nAashirvaad Atta 10kg – 100 bags @ ₹320 each","required":true,"group":"main","rows":5},
  {"id":"delivery","label":"Delivery Address & Date","type":"textarea","placeholder":"e.g. Deliver to: Raj Traders Warehouse, Rajajinagar, Bengaluru – by 25 July 2026","required":false,"group":"main","rows":2},
  {"id":"payment","label":"Payment Terms","type":"text","placeholder":"e.g. Payment within 30 days of delivery","required":false,"group":"main"},
  {"id":"special","label":"Special Instructions (optional)","type":"textarea","placeholder":"e.g. All items within 6 months of expiry; temperature-controlled delivery required","required":false,"group":"main","rows":2}
]',
'Generate a professional PURCHASE ORDER in HTML. Structure:
• Header: "PURCHASE ORDER" + PO number placeholder + date
• From: [Buyer — your company name / address] | To: [Supplier name]
• PO table: Item / Description | Qty | Unit Price | Total Amount
• Subtotal + applicable taxes (GST for India / sales tax for USA) + Grand Total
• Delivery address and requested delivery date
• Payment terms
• Special instructions (if any)
• Authorised signature block with company stamp placeholder
Clear, formal format. Leave [ADD FIGURE] where amounts are not provided.',
'html'),

('business_docs', 'refine', 'Refine (Redline)', 7,
'[
  {"id":"instruction","label":"What to improve or change","type":"textarea","placeholder":"e.g. Make the tone more formal, update payment terms to net 15 days, add a confidentiality clause","required":true,"group":"main","rows":3}
]',
'Review the provided document and apply the requested changes. Return the COMPLETE revised document with all changes tracked using redline markup: wrap added text in <ins> tags and removed text in <del> tags. Preserve the original document structure and formatting. Only change what was specifically requested. If a change would require inventing figures or legal terms not already in the document, note it as [NEEDS PROVIDER INPUT] rather than fabricating content.',
'redline')

ON CONFLICT (archetype_id, key) DO NOTHING;
```

- [ ] **Step 2: Verify archetype and modes (after applying to a branch)**

```sql
SELECT id, label, feature_key FROM studio_archetypes WHERE id = 'business_docs';
SELECT key, label, output_format FROM studio_modes WHERE archetype_id = 'business_docs' ORDER BY sort_order;
```

Expected: 1 archetype row; 7 mode rows: `quotation, agreement, price_list, appointment, proposal, purchase_order, refine`.

- [ ] **Step 3: Do not commit yet — continue to Tasks 2 and 3 to complete the migration file first.**

---

### Task 2: DB Migration — distributor persona rows

**Files:**
- Modify: `supabase/migrations/20260713220000_distributor_agency_personas.sql` (append to Task 1 file)

**Interfaces:**
- Consumes: `studio_archetypes.id = 'business_docs'` (Task 1)
- Produces: 7 rows in `personas` where `studio_archetype = 'business_docs'` and `template = 'storefront'`

- [ ] **Step 1: Append distributor persona rows to the migration file**

```sql
-- ── 3. Distributor personas (7 rows) ─────────────────────────────────────────

INSERT INTO personas (id, label, emoji, enabled, sort_order, template, palette, font, needs_config, studio_archetype, studio_guidance, studio_config) VALUES

('fmcgdist', 'FMCG / Grocery Distributor', '🏪', true, 40, 'storefront', 'warm', 'inter', false, 'business_docs',
'DOMAIN: FMCG / GROCERY DISTRIBUTOR
You are assisting an FMCG or grocery distributor with their business content and trade communications.
CONTEXT: FMCG distributors supply retailers, kirana stores, and supermarkets with packaged goods — staples, personal care, beverages, snacks. Key language: "retailers", "stockists", "product lines", "brands", "territory", "beat plan", "MOQ", "credit terms", "sell-through rate". ₹ pricing, GST, and monthly credit cycles are standard. Peak demand: festive season (Diwali, Pongal, Eid), summer beverage season.
CONTENT FOCUS: Product line listings, dealer enquiry replies, trade promotions, and supply communications. Remind users they can generate quotations, dealer agreements, price lists, appointment letters, partnership proposals, and purchase orders from the Distribution Studio.',
'{"patient_noun":"account","patient_noun_plural":"accounts","studio_label":"Distribution Studio","content_noun":"product line","content_noun_plural":"product lines"}'),

('pharmadist', 'Pharma / Medical Distributor', '💊', true, 41, 'storefront', 'calm', 'inter', false, 'business_docs',
'DOMAIN: PHARMA / MEDICAL DISTRIBUTOR
You are assisting a pharmaceutical or medical products distributor with their business content and trade communications.
CONTEXT: Pharma distributors supply pharmacies, hospital pharmacies, clinics, and diagnostic labs with OTC/Rx medicines, medical devices, and healthcare consumables. Key language: "pharmacies", "chemists", "stockists", "product range", "cold chain", "drug license", "batch numbers", "expiry management", "Rx/OTC". Drug license compliance, FIFO stock management, and 15–30 day credit cycles are standard.
CONTENT FOCUS: Product category listings, supply enquiry replies, cold-chain capability highlights, and trade communications. Remind users they can generate supply quotations, distributor agreements, rate cards, appointment letters, and purchase orders from the Distribution Studio.',
'{"patient_noun":"account","patient_noun_plural":"accounts","studio_label":"Distribution Studio","content_noun":"product range","content_noun_plural":"product ranges"}'),

('electronicsdist', 'Electronics & Appliances Distributor', '📱', true, 42, 'storefront', 'professional', 'inter', false, 'business_docs',
'DOMAIN: ELECTRONICS & APPLIANCES DISTRIBUTOR
You are assisting an electronics and appliances distributor with their business content and dealer communications.
CONTEXT: Electronics distributors supply authorised dealers, large-format retail, and B2B buyers with smartphones, home appliances, AV products, and accessories. Key language: "authorised dealers", "brands", "SKUs", "warranty", "service support", "demo stock", "channel pricing", "credit terms". Factory-authorised warranty handling and 30-day credit cycles are standard.
CONTENT FOCUS: Brand and category listings, dealer enquiry replies, and trade communications. Remind users they can generate dealer quotations, distribution agreements, price lists, appointment letters, and purchase orders from the Distribution Studio.',
'{"patient_noun":"dealer","patient_noun_plural":"dealers","studio_label":"Distribution Studio","content_noun":"brand","content_noun_plural":"brands"}'),

('autopartsdist', 'Auto Parts / Spares Distributor', '🔧', true, 43, 'storefront', 'professional', 'inter', false, 'business_docs',
'DOMAIN: AUTO PARTS / SPARES DISTRIBUTOR
You are assisting an auto parts and spares distributor with their business content and workshop communications.
CONTEXT: Auto parts distributors supply authorised workshops, independent garages, and fleet operators with OEM and aftermarket parts — filters, batteries, clutch kits, auto-electricals, body parts. Key language: "workshops", "garages", "fleet operators", "OEM parts", "aftermarket", "fitment range", "part numbers", "credit terms". GST at 28% is standard for most auto parts.
CONTENT FOCUS: Parts category listings, workshop supply enquiry replies, and trade communications. Remind users they can generate supply quotations, workshop supply agreements, price lists by part category, and purchase orders from the Distribution Studio.',
'{"patient_noun":"workshop","patient_noun_plural":"workshops","studio_label":"Distribution Studio","content_noun":"parts category","content_noun_plural":"parts categories"}'),

('buildingdist', 'Building Materials / Hardware Distributor', '🏗️', true, 44, 'storefront', 'minimal', 'inter', false, 'business_docs',
'DOMAIN: BUILDING MATERIALS / HARDWARE DISTRIBUTOR
You are assisting a building materials and hardware distributor with their business content and contractor communications.
CONTEXT: Building materials distributors supply contractors, builders, developers, and retail hardware stores with cement, paint, sanitaryware, wiring, tiles, and hardware. Key language: "contractors", "builders", "project accounts", "material lines", "site delivery", "bulk pricing", "credit terms". Project-based bulk orders and 30-day credit cycles are standard.
CONTENT FOCUS: Material category listings, contractor enquiry replies, project supply communications. Remind users they can generate project quotations, supply agreements, material price lists, and purchase orders from the Distribution Studio.',
'{"patient_noun":"account","patient_noun_plural":"accounts","studio_label":"Distribution Studio","content_noun":"material line","content_noun_plural":"material lines"}'),

('agridist', 'Agri-Inputs Distributor', '🌾', true, 45, 'storefront', 'fresh', 'inter', false, 'business_docs',
'DOMAIN: AGRI-INPUTS DISTRIBUTOR
You are assisting an agricultural inputs distributor with their business content and dealer communications.
CONTEXT: Agri-inputs distributors supply agri-dealers, FPOs, and farmers with seeds, fertilisers, crop protection products, and farm equipment. Key language: "dealers", "FPOs", "farmers", "crop protection", "seed varieties", "fertiliser grades", "Kharif season", "Rabi season", "package of practices", "credit supply". Seasonal working capital and technical advisory are key differentiators.
CONTENT FOCUS: Product category listings, dealer supply communications, season-specific promotions. Remind users they can generate supply quotations, dealer agreements, season price lists, and appointment letters from the Distribution Studio.',
'{"patient_noun":"dealer","patient_noun_plural":"dealers","studio_label":"Distribution Studio","content_noun":"product","content_noun_plural":"products"}'),

('distributor', 'Distributor', '🚚', true, 46, 'storefront', 'professional', 'inter', false, 'business_docs',
'DOMAIN: DISTRIBUTOR
You are assisting a product distributor with their business content and trade communications.
CONTEXT: Distributors supply retailers, dealers, and business buyers with a range of products. Key language: "accounts", "retailers", "dealers", "stockists", "product lines", "brands", "territory", "credit terms", "MOQ". ₹ pricing, GST, and monthly credit cycles are standard.
CONTENT FOCUS: Product and brand listings, dealer enquiry replies, trade communications. Remind users they can generate quotations, dealer agreements, price lists, appointment letters, partnership proposals, and purchase orders from the Distribution Studio.',
'{"patient_noun":"account","patient_noun_plural":"accounts","studio_label":"Distribution Studio","content_noun":"product line","content_noun_plural":"product lines"}')

ON CONFLICT (id) DO NOTHING;
```

---

### Task 3: DB Migration — agency persona rows + plan gating

**Files:**
- Modify: `supabase/migrations/20260713220000_distributor_agency_personas.sql` (complete the migration)

**Interfaces:**
- Consumes: `studio_archetypes.id = 'business_docs'` (Task 1)
- Produces: 9 rows in `personas`; 1 plan_features entry gating `studio_business`

- [ ] **Step 1: Append agency rows + plan gating to the migration file**

```sql
-- ── 4. Agency personas (9 rows) ───────────────────────────────────────────────

INSERT INTO personas (id, label, emoji, enabled, sort_order, template, palette, font, needs_config, studio_archetype, studio_guidance, studio_config) VALUES

('travel', 'Travel Agency', '✈️', true, 47, 'portfolio', 'fresh', 'inter', false, 'business_docs',
'DOMAIN: TRAVEL AGENCY
You are assisting a travel agency with their business content and client communications.
CONTEXT: Travel agencies offer packages, itineraries, and visa assistance for leisure, corporate, pilgrimage, and educational travel. Key language: "travellers", "clients", "packages", "itinerary", "destination", "visa", "season", "inclusions", "booking confirmation". ₹ pricing, advance deposits, and peak season availability are standard.
CONTENT FOCUS: Package listings, client enquiry replies, seasonal promotion campaigns, and destination content. Remind users they can generate itinerary proposals, client agreements, package rate cards, supplier appointment letters, and group booking purchase orders from the Agency Studio.',
'{"patient_noun":"traveller","patient_noun_plural":"travellers","studio_label":"Agency Studio","content_noun":"package","content_noun_plural":"packages"}'),

('realestate', 'Real Estate Agency', '🏠', true, 48, 'portfolio', 'professional', 'inter', false, 'business_docs',
'DOMAIN: REAL ESTATE AGENCY
You are assisting a real estate agency with their business content and client communications.
CONTEXT: Real estate agencies buy, sell, and rent residential, commercial, and industrial properties. Key language: "buyers", "sellers", "tenants", "investors", "listings", "localities", "sqft", "possession date", "RERA", "commission". RERA registration and 1–2% commission on transactions are standard.
CONTENT FOCUS: Property type and service listings, buyer/investor enquiry replies, locality-specific content. Remind users they can generate property quotations, sale/rent agreements, property rate sheets, appointment letters, and client proposals from the Agency Studio.',
'{"patient_noun":"client","patient_noun_plural":"clients","studio_label":"Agency Studio","content_noun":"listing","content_noun_plural":"listings"}'),

('insurance', 'Insurance Agent / Agency', '🛡️', true, 49, 'focus', 'calm', 'inter', false, 'business_docs',
'DOMAIN: INSURANCE AGENT / AGENCY
You are assisting an insurance agent or agency with their business content and client communications.
CONTEXT: Insurance agents advise clients on life, health, motor, and commercial insurance, representing multiple insurers. Key language: "clients", "policyholders", "coverage", "premium", "claim", "sum assured", "renewal", "policy portfolio", "IRDAI". Needs-based advisory, claim support, and annual review are strong differentiators.
CONTENT FOCUS: Insurance product listings, client enquiry replies, policy review communications. Remind users they can generate coverage proposals, agency appointment letters, commission rate cards, and client agreements from the Agency Studio.',
'{"patient_noun":"client","patient_noun_plural":"clients","studio_label":"Agency Studio","content_noun":"insurance product","content_noun_plural":"insurance products"}'),

('staffing', 'Staffing & Recruitment', '👔', true, 50, 'focus', 'professional', 'inter', false, 'business_docs',
'DOMAIN: STAFFING & RECRUITMENT
You are assisting a staffing and recruitment agency with their business content and client communications.
CONTEXT: Staffing agencies place candidates in permanent, contract, and temporary roles. Key language: "clients", "candidates", "mandates", "placements", "JD", "shortlist", "replacement guarantee", "fee structure", "retainer". % of CTC for permanent and margins for contract staffing are standard fee models.
CONTENT FOCUS: Staffing service listings, client mandate replies, candidate and employer communications. Remind users they can generate client proposals, staffing agreements, fee structure letters, appointment confirmations, and purchase orders from the Agency Studio.',
'{"patient_noun":"client","patient_noun_plural":"clients","studio_label":"Agency Studio","content_noun":"service","content_noun_plural":"services"}'),

('marketing', 'Marketing & Digital Agency', '📣', true, 51, 'portfolio', 'creative', 'inter', false, 'business_docs',
'DOMAIN: MARKETING & DIGITAL AGENCY
You are assisting a marketing and digital agency with their business content and client communications.
CONTEXT: Marketing agencies provide SEO, social media, digital ads, branding, content, and web services. Key language: "clients", "campaigns", "retainer", "scope of work", "deliverables", "ROAS", "engagement rate", "brief", "account manager". Monthly retainer and project-based pricing are standard.
CONTENT FOCUS: Service and portfolio listings, client enquiry replies, campaign brief communications. Remind users they can generate service proposals, agency-client agreements, retainer rate cards, engagement letters, and campaign purchase orders from the Agency Studio.',
'{"patient_noun":"client","patient_noun_plural":"clients","studio_label":"Agency Studio","content_noun":"service","content_noun_plural":"services"}'),

('immigration', 'Immigration & Study-Abroad', '🌏', true, 52, 'focus', 'fresh', 'inter', false, 'business_docs',
'DOMAIN: IMMIGRATION & STUDY-ABROAD CONSULTANT
You are assisting an immigration and study-abroad consultant with their business content and client communications.
CONTEXT: Immigration consultants advise clients on visas, PR pathways, and overseas study. Key language: "clients", "applicants", "visa", "PR", "immigration pathway", "SOP", "eligibility", "profile assessment", "approval". Country-specific expertise and success rates are key differentiators.
CONTENT FOCUS: Country / pathway service listings, client enquiry replies, eligibility and process communications. Remind users they can generate client engagement proposals, service agreements, fee schedule letters, appointment letters, and partnership proposals from the Agency Studio.',
'{"patient_noun":"client","patient_noun_plural":"clients","studio_label":"Agency Studio","content_noun":"service","content_noun_plural":"services"}'),

('events', 'Event Management', '🎉', true, 53, 'portfolio', 'warm', 'inter', false, 'business_docs',
'DOMAIN: EVENT MANAGEMENT
You are assisting an event management company with their business content and client communications.
CONTEXT: Event managers plan weddings, corporate events, product launches, and social gatherings. Key language: "clients", "events", "venue", "decor", "AV / lighting", "logistics", "vendor coordination", "quote", "guest count", "deposit". 18% GST, advance deposits, and vendor margin management are standard.
CONTENT FOCUS: Event type and service listings, client enquiry and quote replies, event portfolio content. Remind users they can generate event proposals, event management agreements, vendor rate cards, vendor appointment letters, and purchase orders from the Agency Studio.',
'{"patient_noun":"client","patient_noun_plural":"clients","studio_label":"Agency Studio","content_noun":"event","content_noun_plural":"events"}'),

('logistics', 'Logistics & Freight Forwarding', '🚢', true, 54, 'focus', 'minimal', 'inter', false, 'business_docs',
'DOMAIN: LOGISTICS & FREIGHT FORWARDING
You are assisting a logistics and freight forwarding company with their business content and client communications.
CONTEXT: Logistics companies provide road freight, air cargo, sea freight, customs clearing, and warehousing. Key language: "shippers", "clients", "consignees", "freight", "cargo", "route", "transit time", "FCL/LCL", "customs", "SLA". 5% GST on transport services, IATA cargo agent accreditation, and on-time delivery SLA are key.
CONTENT FOCUS: Service and route listings, freight enquiry and quote replies, logistics capability content. Remind users they can generate freight quotations, logistics service agreements, route rate cards, partner appointment letters, and purchase orders from the Agency Studio.',
'{"patient_noun":"client","patient_noun_plural":"clients","studio_label":"Agency Studio","content_noun":"service","content_noun_plural":"services"}'),

('agency', 'Agency', '🏢', true, 55, 'focus', 'professional', 'inter', false, 'business_docs',
'DOMAIN: AGENCY
You are assisting a service agency with their business content and client communications.
CONTEXT: Service agencies act as intermediaries — providing consulting, sourcing, representation, or facilitation services to business clients. Key language: "clients", "mandates", "scope of work", "deliverables", "retainer", "project", "network". Retainer, project, and success-fee pricing are common.
CONTENT FOCUS: Service listings, client enquiry replies, capability and network content. Remind users they can generate service proposals, agency-client agreements, fee schedule letters, appointment letters, and partnership proposals from the Agency Studio.',
'{"patient_noun":"client","patient_noun_plural":"clients","studio_label":"Agency Studio","content_noun":"service","content_noun_plural":"services"}')

ON CONFLICT (id) DO NOTHING;

-- ── 5. Plan gating — studio_business ─────────────────────────────────────────
-- Copies studio_business to whichever plans already have studio_storefront.
-- If studio_storefront is not yet registered, use explicit plan_ids instead:
--   SELECT id, name, sort_order FROM plans WHERE active = true;

INSERT INTO plan_features (plan_id, label, description, feature_key, sort_order)
SELECT
  pf.plan_id,
  'Business Documents Studio',
  'AI-powered quotations, agreements, rate cards, and B2B document generator',
  'studio_business',
  (SELECT MAX(p2.sort_order) FROM plan_features p2 WHERE p2.plan_id = pf.plan_id) + 1
FROM plan_features pf
WHERE pf.feature_key = 'studio_storefront'
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Verify all 16 personas and plan gating**

```sql
SELECT id, label, template, studio_archetype FROM personas
WHERE studio_archetype = 'business_docs'
ORDER BY sort_order;
-- Expected: 16 rows

SELECT DISTINCT plan_id, feature_key FROM plan_features
WHERE feature_key IN ('studio_storefront', 'studio_business')
ORDER BY plan_id, feature_key;
-- Expected: studio_business has same plan_ids as studio_storefront
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260713220000_distributor_agency_personas.sql
git commit -m "feat: add 16 distributor/agency personas + business_docs studio archetype and 7 document modes"
```

---

### Task 4: VerticalConfig entries — distributor personas

**Files:**
- Modify: `config/verticals/index.ts`

**Interfaces:**
- Produces: 7 `VerticalConfig` objects; registered in `VERTICALS`; consumed by `getVertical(id)` in chat, research, onboarding API routes

- [ ] **Step 1: Add a new section comment and the 7 distributor constants**

Find the comment `// ── Commerce / storefront expansion` section. After all the existing commerce constants (before the `export const VERTICALS = {` line), add:

```typescript
// ── Distributor & Agency personas ─────────────────────────────────────────────
// Studio guidance lives in DB (studio_guidance + studio_config on personas table).
// workingGuidance and draftingGuidance intentionally absent — uses config-driven
// PractitionerStudio engine (business_docs archetype), not legacy studios.

const fmcgdist: VerticalConfig = {
  id: 'fmcgdist',
  label: 'FMCG / Grocery Distributor',
  emoji: '🏪',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'warm',
  defaultFont: 'inter',
  bookingLabel: 'Request a quote',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'brands',    question: 'Which FMCG brands and product lines do you distribute?',    placeholder: 'e.g. Hindustan Unilever, ITC, Nestlé — personal care, staples, snacks' },
    { id: 'territory', question: 'What territory or geography do you cover?',                 placeholder: 'e.g. Bengaluru urban — North and South zones, 450+ retail outlets' },
    { id: 'buyers',    question: 'Who are your primary buyers?',                              placeholder: 'e.g. Kirana stores, supermarkets, modern trade, restaurants, institutions' },
    { id: 'strengths', question: 'What makes you a reliable distribution partner?',           placeholder: 'e.g. 48-hour replenishment, ₹5L credit facility, cold-chain fleet' },
    { id: 'moq',       question: 'What are your minimum order and pricing terms? (optional)', placeholder: 'e.g. Minimum order ₹5,000; monthly credit terms for established accounts' },
  ],
  chatGuidance: `PERSONA: FMCG / GROCERY DISTRIBUTOR
Speak in distribution language: say "retailers", "stockists", "accounts", "product lines", "brands", "territory", "beat plan", "MOQ", "credit terms" — never "clients", "students", or "patients".
Help update the provider's page: brand/product line listings (as services), territory highlights, reliability callouts, dealer enquiry CTA, bio. Remind them they can generate quotations, dealer agreements, price lists, appointment letters, and purchase orders from the Distribution Studio.`,
  researchGuidance: `You are a business advisor for an FMCG / grocery distributor.
BUSINESS: FMCG distribution margins (primary vs secondary), working capital cycles, GST for distributors, FSSAI requirements for food distributors, modern trade vs kirana channel dynamics, beat optimisation, credit management, and how to onboard new brands as a distributor.`,
}

const pharmadist: VerticalConfig = {
  id: 'pharmadist',
  label: 'Pharma / Medical Distributor',
  emoji: '💊',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Enquire for supply',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'companies',   question: 'Which pharma companies or medical brands do you stock?',   placeholder: 'e.g. Sun Pharma, Cipla, Abbott, 3M Healthcare — OTC, Rx, medical devices' },
    { id: 'territory',   question: 'What territory do you cover?',                            placeholder: 'e.g. Bengaluru city — all zones, licensed for Karnataka' },
    { id: 'clients',     question: 'Who are your primary customers?',                         placeholder: 'e.g. Retail pharmacies, hospital pharmacies, diagnostic labs, clinics' },
    { id: 'credentials', question: 'What licenses and capabilities do you have?',             placeholder: 'e.g. Drug license, GST, cold-chain storage, same-day delivery' },
    { id: 'moq',         question: 'What are your minimum order and payment terms? (optional)', placeholder: 'e.g. Minimum order ₹3,000; 15-day credit for registered pharmacies' },
  ],
  chatGuidance: `PERSONA: PHARMA / MEDICAL DISTRIBUTOR
Speak in pharma distribution language: say "pharmacies", "chemists", "stockists", "product range", "cold chain", "drug license", "Rx/OTC", "batch numbers", "expiry management" — never "students" or "patients" in a clinical context.
Help update the provider's page: product category/brand listings, licensing credentials, territory, reliability highlights, supply enquiry CTA. Remind them they can generate supply quotations, distributor agreements, rate cards, appointment letters, and purchase orders from the Distribution Studio.`,
  researchGuidance: `You are a business advisor for a pharma / medical distributor.
BUSINESS: Drug license requirements (Schedule H, H1, X), CDSCO compliance, GST rates on pharma products, cold-chain storage norms, hospital vs retail pharmacy procurement, C&F agent vs distributor distinction, FIFO/FEFO stock management, and working capital for pharma distribution.`,
}

const electronicsdist: VerticalConfig = {
  id: 'electronicsdist',
  label: 'Electronics & Appliances Distributor',
  emoji: '📱',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Request a quote',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'brands',    question: 'Which electronics or appliance brands do you distribute?',  placeholder: 'e.g. Samsung, LG, Bosch, OnePlus — smartphones, home appliances, AV' },
    { id: 'territory', question: 'What territory or region do you cover?',                   placeholder: 'e.g. Hyderabad metro and Telangana — 300+ authorised retailers' },
    { id: 'buyers',    question: 'Who are your primary buyers?',                             placeholder: 'e.g. Authorised retail stores, large-format retail, B2B corporate buyers' },
    { id: 'strengths', question: 'What makes you a strong distribution partner?',            placeholder: 'e.g. Factory-authorised warranty support, demo units, quick restocking' },
    { id: 'moq',       question: 'What are your minimum order or credit terms? (optional)',  placeholder: 'e.g. Minimum order ₹25,000; 30-day credit for authorised dealers' },
  ],
  chatGuidance: `PERSONA: ELECTRONICS & APPLIANCES DISTRIBUTOR
Speak in electronics distribution language: say "authorised dealers", "retailers", "brands", "SKUs", "warranty", "service support", "demo stock", "channel pricing" — never "patients" or "students".
Help update the provider's page: brand/category listings, territory coverage, dealer support highlights, enquiry CTA, bio. Remind them they can generate dealer quotations, distribution agreements, price lists, appointment letters, and purchase orders from the Distribution Studio.`,
  researchGuidance: `You are a business advisor for an electronics & appliances distributor.
BUSINESS: Electronics distribution margins by category (smartphones vs appliances), authorised dealer agreement structures, warranty management as a differentiator, modern trade vs independent retail channels, credit risk for high-value goods, BIS compliance, import regulations, and how to become an authorised brand distributor in India.`,
}

const autopartsdist: VerticalConfig = {
  id: 'autopartsdist',
  label: 'Auto Parts / Spares Distributor',
  emoji: '🔧',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Request a quote',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'parts',     question: 'What auto parts categories and brands do you stock?',      placeholder: 'e.g. Bosch filters/batteries, TVS Lucas auto-electricals, Valeo clutch kits' },
    { id: 'vehicle',   question: 'Which vehicle types do you cover?',                       placeholder: 'e.g. Passenger cars, SUVs, 2-wheelers, light commercial vehicles' },
    { id: 'clients',   question: 'Who are your primary customers?',                         placeholder: 'e.g. Authorised workshops, independent garages, fleet operators' },
    { id: 'territory', question: 'What territory do you cover?',                           placeholder: 'e.g. Pune city and Pune district — 200+ workshops on account' },
    { id: 'moq',       question: 'What are your minimum order or credit terms? (optional)', placeholder: 'e.g. No minimum for registered workshops; 30-day credit for fleet accounts' },
  ],
  chatGuidance: `PERSONA: AUTO PARTS / SPARES DISTRIBUTOR
Speak in auto-parts language: say "workshops", "garages", "fleet operators", "OEM parts", "aftermarket", "fitment range", "part numbers", "credit terms" — never "patients" or "students".
Help update the provider's page: parts category listings, brands carried, vehicle coverage, workshop enquiry CTA, bio. Remind them they can generate supply quotations, workshop supply agreements, price lists, appointment letters, and purchase orders from the Distribution Studio.`,
  researchGuidance: `You are a business advisor for an auto parts / spares distributor.
BUSINESS: OEM vs aftermarket parts market in India, auto-parts distribution margins, workshop credit management, fleet operator procurement patterns, GST on auto parts (28%), counterfeit parts risk, and becoming an authorised OEM supplier distributor.`,
}

const buildingdist: VerticalConfig = {
  id: 'buildingdist',
  label: 'Building Materials / Hardware Distributor',
  emoji: '🏗️',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'minimal',
  defaultFont: 'inter',
  bookingLabel: 'Request a quote',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'materials', question: 'What building material lines or brands do you stock?',      placeholder: 'e.g. Ultratech / ACC cement, Asian Paints, Hindware sanitaryware, Havells' },
    { id: 'territory', question: 'What area or project types do you serve?',                 placeholder: 'e.g. Chennai metro — residential, commercial construction, government projects' },
    { id: 'buyers',    question: 'Who are your primary customers?',                          placeholder: 'e.g. Contractors, builders, developers, retail hardware stores' },
    { id: 'strengths', question: 'What makes you a strong supply partner?',                  placeholder: 'e.g. Same-day site delivery, credit facility, bulk pricing, technical advice' },
    { id: 'moq',       question: 'What are your minimum order or credit terms? (optional)',  placeholder: 'e.g. Minimum ₹10,000 per order; 30-day credit for registered contractors' },
  ],
  chatGuidance: `PERSONA: BUILDING MATERIALS / HARDWARE DISTRIBUTOR
Speak in construction supply language: say "contractors", "builders", "project accounts", "material lines", "site delivery", "bulk pricing", "credit terms" — never "patients" or "students".
Help update the provider's page: material category listings, brands carried, project supply capability, enquiry CTA, bio. Remind them they can generate project quotations, supply agreements, material price lists, appointment letters, and purchase orders from the Distribution Studio.`,
  researchGuidance: `You are a business advisor for a building materials / hardware distributor.
BUSINESS: Construction materials distribution in India, cement and paint distribution margins, project procurement vs retail supply, credit risk in construction supply chains, GST on building materials, government project procurement norms, developing contractor accounts, and tender supply opportunities.`,
}

const agridist: VerticalConfig = {
  id: 'agridist',
  label: 'Agri-Inputs Distributor',
  emoji: '🌾',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'fresh',
  defaultFont: 'inter',
  bookingLabel: 'Request supply',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'inputs',    question: 'What agri-input categories and brands do you stock?',      placeholder: 'e.g. Mahyco seeds, Coromandel fertilisers, Bayer crop protection' },
    { id: 'territory', question: 'What area or districts do you cover?',                    placeholder: 'e.g. Nashik and surrounding districts — 150+ dealers and FPOs supplied' },
    { id: 'buyers',    question: 'Who are your primary customers?',                         placeholder: 'e.g. Agri-dealers, FPOs, agricultural cooperatives, progressive farmers' },
    { id: 'services',  question: 'What additional services do you offer beyond supply?',    placeholder: 'e.g. Field demonstration, technical advisory, crop-specific recommendations' },
    { id: 'moq',       question: 'What are your minimum order or credit terms? (optional)', placeholder: 'e.g. Minimum order ₹5,000; seasonal credit during Kharif and Rabi' },
  ],
  chatGuidance: `PERSONA: AGRI-INPUTS DISTRIBUTOR
Speak in agri-distribution language: say "dealers", "FPOs", "farmers", "crop protection", "seed varieties", "fertiliser grades", "Kharif season", "Rabi season", "package of practices" — never "patients" or "students".
Help update the provider's page: product category listings, companies/brands carried, technical services, territory, dealer enquiry CTA. Remind them they can generate supply quotations, dealer agreements, season price lists, appointment letters, and purchase orders from the Distribution Studio.`,
  researchGuidance: `You are a business advisor for an agri-inputs distributor.
BUSINESS: Agri-input distribution structure in India (company → distributor → dealer → farmer), government subsidy schemes on fertilisers and seeds, CIB&RC registration for pesticides, Kharif and Rabi season demand cycles, FPO procurement and credit models, crop-specific recommendations, and seasonal working capital management.`,
}

const distributor: VerticalConfig = {
  id: 'distributor',
  label: 'Distributor',
  emoji: '🚚',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Request a quote',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'products',  question: 'What products or categories do you distribute?',           placeholder: 'e.g. Packaged foods, industrial supplies, consumer goods, FMCG' },
    { id: 'brands',    question: 'Which companies or brands do you represent?',             placeholder: 'e.g. 3 national brands + 5 regional brands across two categories' },
    { id: 'territory', question: 'What territory or geography do you cover?',               placeholder: 'e.g. Bengaluru city and surrounding districts — 200+ active accounts' },
    { id: 'buyers',    question: 'Who are your primary buyers?',                            placeholder: 'e.g. Retail shops, supermarkets, institutions, B2B buyers' },
    { id: 'moq',       question: 'What are your minimum order or credit terms? (optional)', placeholder: 'e.g. Minimum order ₹5,000; 30-day credit for registered accounts' },
  ],
  chatGuidance: `PERSONA: DISTRIBUTOR
Speak in distribution language: say "accounts", "retailers", "dealers", "stockists", "product lines", "brands", "territory", "credit terms", "MOQ" — never "students" or "patients".
Help update the provider's page: product category listings, brands carried, territory, reliability highlights, dealer/account enquiry CTA, bio. Remind them they can generate quotations, dealer agreements, price lists, appointment letters, and purchase orders from the Distribution Studio.`,
  researchGuidance: `You are a business advisor for a product distributor.
BUSINESS: Distribution margins by product category, working capital management for distributors, GST implications for trading/distribution, credit risk and account management, channel conflict with direct sales, how to add new brands as a distributor, and freight and logistics optimisation.`,
}
```

- [ ] **Step 2: Register distributor personas in `VERTICALS`**

Find `export const VERTICALS: Record<string, VerticalConfig> = {` and add before `other`:

```typescript
  // Distributor personas
  fmcgdist, pharmadist, electronicsdist, autopartsdist, buildingdist, agridist, distributor,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "C:\Users\prath\OneDrive\Desktop\Kryla.work\kryla.work"
npm run build 2>&1 | grep -iE "error TS|Type error"
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add config/verticals/index.ts
git commit -m "feat: add 7 distributor VerticalConfig entries (fmcgdist, pharmadist, electronicsdist, autopartsdist, buildingdist, agridist, distributor)"
```

---

### Task 5: VerticalConfig entries — agency personas

**Files:**
- Modify: `config/verticals/index.ts`

**Interfaces:**
- Produces: 9 `VerticalConfig` objects; registered in `VERTICALS`

- [ ] **Step 1: Append 9 agency constants after the distributor constants**

```typescript
const travel: VerticalConfig = {
  id: 'travel',
  label: 'Travel Agency',
  emoji: '✈️',
  phase: 1,
  defaultTemplate: 'portfolio',
  defaultPalette: 'fresh',
  defaultFont: 'inter',
  bookingLabel: 'Book a trip',
  ctaLabel: 'WhatsApp to plan',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'travel_types', question: 'What types of travel do you specialise in?',            placeholder: 'e.g. Leisure holidays, honeymoon packages, pilgrimage, corporate travel' },
    { id: 'destinations', question: 'Which destinations or regions are you known for?',      placeholder: 'e.g. Southeast Asia, Europe, Rajasthan circuits, Char Dham, Bali' },
    { id: 'services',     question: 'What services are included in your packages?',          placeholder: 'e.g. Flights, hotels, visa assistance, guided tours, travel insurance' },
    { id: 'traveller',    question: 'Who is your typical traveller?',                        placeholder: 'e.g. Families, couples, solo travellers, senior citizen groups' },
    { id: 'pricing',      question: 'What is your typical package price range? (optional)',  placeholder: 'e.g. Domestic from ₹15,000, international from ₹60,000 per person' },
  ],
  chatGuidance: `PERSONA: TRAVEL AGENCY
Speak in travel language: say "travellers", "clients", "packages", "itinerary", "visa", "destination", "season", "booking" — never "students", "patients", or "retailers".
Help update the provider's page: package/destination listings (as services), services overview, gallery, highlights (visa support, custom tours), booking CTA. Remind them they can generate itinerary proposals, booking agreements, package rate cards, supplier appointment letters, and group booking purchase orders from the Agency Studio.`,
  researchGuidance: `You are a business advisor for a travel agency.
BUSINESS: IATA vs non-IATA agent economics, OTA competition, niche travel positioning (pilgrimage, honeymoon, educational), peak season demand (summer, Diwali, December), visa facilitation as a revenue stream, travel insurance partnerships, group vs FIT package pricing, and GST on tour packages.`,
}

const realestate: VerticalConfig = {
  id: 'realestate',
  label: 'Real Estate Agency',
  emoji: '🏠',
  phase: 1,
  defaultTemplate: 'portfolio',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Book a site visit',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'property_types', question: 'What types of properties do you deal in?',            placeholder: 'e.g. Residential flats, villas, plots, commercial office space, retail shops' },
    { id: 'locations',      question: 'Which localities or areas do you cover?',             placeholder: 'e.g. Whitefield, Sarjapur Road, Electronic City — Bengaluru East corridor' },
    { id: 'services',       question: 'What real estate services do you offer?',             placeholder: 'e.g. Buy, sell, rent, investment advisory, NRI property management' },
    { id: 'clients',        question: 'Who are your typical clients?',                       placeholder: 'e.g. First-time homebuyers, investors, NRIs, corporate tenants' },
    { id: 'credentials',    question: 'Do you have RERA registration or credentials? (optional)', placeholder: 'e.g. RERA registered agent: KA-REA-00123456, 12 years in Bengaluru market' },
  ],
  chatGuidance: `PERSONA: REAL ESTATE AGENCY
Speak in real estate language: say "buyers", "sellers", "tenants", "investors", "listings", "localities", "sqft", "possession date", "RERA", "commission" — never "students" or "patients".
Help update the provider's page: property type/service listings, locality coverage, credentials, buyer/investor enquiry CTA, bio. Remind them they can generate property quotations, sale/rent agreements, property rate sheets, appointment letters, and client proposals from the Agency Studio.`,
  researchGuidance: `You are a business advisor for a real estate agency.
BUSINESS: RERA agent registration requirements, commission structures (1–2% of transaction value), buyer vs seller representation, lead generation on portals (MagicBricks, 99acres, Housing), NRI client service model, co-brokerage norms, rental vs sales income mix, and growing referral networks with builders and home loan advisors.`,
}

const insurance: VerticalConfig = {
  id: 'insurance',
  label: 'Insurance Agent / Agency',
  emoji: '🛡️',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Request a policy review',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'insurance_types', question: 'What types of insurance do you advise on?',          placeholder: 'e.g. Term life, health, motor, home, business / commercial, group health' },
    { id: 'insurers',        question: 'Which insurance companies do you represent?',        placeholder: 'e.g. LIC, HDFC Life, Star Health, ICICI Lombard, New India Assurance' },
    { id: 'clients',         question: 'Who are your typical clients?',                     placeholder: 'e.g. Salaried families, business owners, MSMEs, NRIs, retired individuals' },
    { id: 'services',        question: 'What do you offer beyond policy selection?',         placeholder: 'e.g. Claim support, annual policy review, portfolio planning, tax benefit advisory' },
    { id: 'approach',        question: 'What makes your advisory different?',                placeholder: 'e.g. Needs-based approach, no pushy selling, advice across 10+ insurers' },
  ],
  chatGuidance: `PERSONA: INSURANCE AGENT / AGENCY
Speak in insurance language: say "clients", "policyholders", "coverage", "premium", "claim", "sum assured", "renewal", "policy portfolio" — never "students", "patients", or "retailers".
Help update the provider's page: insurance type/service listings, insurer partnerships, advisory differentiators, policy review CTA, FAQ. Remind them they can generate coverage proposals, agency appointment letters, commission rate cards, and client agreements from the Agency Studio.`,
  researchGuidance: `You are a business advisor for an insurance agent or agency.
BUSINESS: IRDAI agent licensing, POSPAgent vs general agent distinction, commission structures across life/health/general insurance, how to build referral networks (with CAs, doctors, real estate agents), claim servicing as retention strategy, GST on insurance premium, and group health insurance for MSMEs as a growth segment.`,
}

const staffing: VerticalConfig = {
  id: 'staffing',
  label: 'Staffing & Recruitment',
  emoji: '👔',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Discuss a requirement',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'sectors',       question: 'Which industries or sectors do you recruit for?',      placeholder: 'e.g. IT / Tech, BFSI, manufacturing, healthcare, retail, logistics' },
    { id: 'staffing_type', question: 'What type of staffing do you offer?',                 placeholder: 'e.g. Permanent placement, contract staffing, RPO, executive search, temp staffing' },
    { id: 'candidates',    question: 'What level of candidates do you place?',              placeholder: 'e.g. Blue-collar to mid-management; or niche senior tech leaders' },
    { id: 'clients',       question: 'Who are your typical client companies?',              placeholder: 'e.g. Startups to mid-size firms, MNCs, manufacturing plants, hospital groups' },
    { id: 'sla',           question: 'What is your typical turnaround or success rate? (optional)', placeholder: 'e.g. CV submission within 48 hours; 90-day replacement guarantee' },
  ],
  chatGuidance: `PERSONA: STAFFING & RECRUITMENT
Speak in recruitment language: say "clients", "candidates", "mandates", "placements", "JD", "shortlist", "replacement guarantee" — never "students", "patients", or "subscribers".
Help update the provider's page: staffing service listings, sector expertise, SLA highlights, client enquiry CTA, FAQ. Remind them they can generate client proposals, staffing/recruitment agreements, fee structure letters, and appointment letters from the Agency Studio.`,
  researchGuidance: `You are a business advisor for a staffing and recruitment agency.
BUSINESS: Recruitment fee structures (% of CTC for permanent, margins for contract), RPO vs traditional staffing economics, retainer vs contingency mandates, labour law compliance for contract staffing (PF/ESI), background verification partnerships, niche sector specialisation as a differentiator, and digital sourcing (LinkedIn Recruiter, job portals).`,
}

const marketing: VerticalConfig = {
  id: 'marketing',
  label: 'Marketing & Digital Agency',
  emoji: '📣',
  phase: 1,
  defaultTemplate: 'portfolio',
  defaultPalette: 'creative',
  defaultFont: 'inter',
  bookingLabel: 'Request a proposal',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'services',  question: 'What marketing services do you offer?',                   placeholder: 'e.g. SEO, social media management, Google / Meta Ads, branding, web design' },
    { id: 'clients',   question: 'What types of businesses do you work with?',              placeholder: 'e.g. D2C brands, local businesses, startups, real estate, healthcare, education' },
    { id: 'approach',  question: 'What makes your agency different?',                       placeholder: 'e.g. Data-driven results, dedicated account manager, monthly reporting' },
    { id: 'portfolio', question: 'Any notable campaigns or client results you can share?',  placeholder: 'e.g. 3× ROAS for e-commerce client, 10K followers in 60 days for F&B brand' },
    { id: 'pricing',   question: 'What are your engagement models or starting prices? (optional)', placeholder: 'e.g. Project-based from ₹25,000; monthly retainer from ₹15,000 / month' },
  ],
  chatGuidance: `PERSONA: MARKETING & DIGITAL AGENCY
Speak in agency language: say "clients", "campaigns", "retainer", "scope of work", "deliverables", "ROAS", "engagement rate", "brief" — never "students", "patients", or "subscribers".
Help update the provider's page: service listings, portfolio/case study highlights, expertise callouts, proposal request CTA, FAQ. Remind them they can generate service proposals, agency-client agreements, retainer rate cards, engagement letters, and campaign purchase orders from the Agency Studio.`,
  researchGuidance: `You are a business advisor for a marketing and digital agency.
BUSINESS: Agency pricing models (retainer vs project vs performance), client acquisition for agencies, how to pitch to SMBs vs enterprise clients, Meta/Google Ads reseller partnerships, white-labelling opportunities, managing scope creep with contracts, building a case study portfolio, and growing from a niche specialty to full-service.`,
}

const immigration: VerticalConfig = {
  id: 'immigration',
  label: 'Immigration & Study-Abroad',
  emoji: '🌏',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'fresh',
  defaultFont: 'inter',
  bookingLabel: 'Book a consultation',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'countries',    question: 'Which countries do you specialise in?',                placeholder: 'e.g. Canada (PR / study), UK, Australia, Germany, USA, UAE' },
    { id: 'visa_types',   question: 'What visa types or immigration pathways do you handle?', placeholder: 'e.g. Student visas, work permits, skilled migration, investor visa, PR' },
    { id: 'services',     question: 'What services do you provide?',                       placeholder: 'e.g. Profile assessment, application filing, SOP writing, interview prep, admissions' },
    { id: 'track_record', question: 'How many clients have you helped? Any highlights? (optional)', placeholder: 'e.g. 500+ successful student visas, 98% Canada PR approval rate over 3 years' },
    { id: 'fees',         question: 'What are your fees or process? (optional)',            placeholder: 'e.g. Consultation ₹1,000; full PR package ₹60,000; university admissions from ₹25,000' },
  ],
  chatGuidance: `PERSONA: IMMIGRATION & STUDY-ABROAD CONSULTANT
Speak in immigration language: say "clients", "applicants", "visa", "PR", "immigration pathway", "SOP", "eligibility", "profile assessment" — never "patients" or "retailers".
Help update the provider's page: service listings by country/pathway, eligibility highlights, process steps, consultation CTA, FAQ. Remind them they can generate client proposals, service agreements, fee schedule letters, and engagement letters from the Agency Studio.`,
  researchGuidance: `You are a business advisor for an immigration and study-abroad consultant.
BUSINESS: ICCRC / MARN registration (Canada / Australia), OISC regulation (UK), STEM OPT and F-1 visa nuances, Germany job seeker visa growth, IELTS / PTE score thresholds, how to partner with universities for commission income, document fraud risks, digital marketing to study-abroad aspirants, and refund / service guarantee norms.`,
}

const events: VerticalConfig = {
  id: 'events',
  label: 'Event Management',
  emoji: '🎉',
  phase: 1,
  defaultTemplate: 'portfolio',
  defaultPalette: 'warm',
  defaultFont: 'inter',
  bookingLabel: 'Request a quote',
  ctaLabel: 'WhatsApp to discuss',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'event_types', question: 'What types of events do you manage?',                   placeholder: 'e.g. Weddings, corporate events, product launches, conferences, birthday parties' },
    { id: 'scale',       question: 'What scale of events do you handle?',                   placeholder: 'e.g. Intimate 50-person gatherings to 2,000-person corporate summits' },
    { id: 'services',    question: 'What services are included in your event management?',  placeholder: 'e.g. Venue sourcing, decor, catering coordination, AV / lighting, entertainment' },
    { id: 'locations',   question: 'Which cities or venues do you operate in?',             placeholder: 'e.g. Delhi NCR — Gurugram, Noida — and destination weddings across Rajasthan' },
    { id: 'portfolio',   question: 'Any notable events or clients you can mention? (optional)', placeholder: 'e.g. 200+ weddings, annual conference for a 500-person IT company' },
  ],
  chatGuidance: `PERSONA: EVENT MANAGEMENT
Speak in event language: say "clients", "events", "venue", "decor", "AV / lighting", "logistics", "vendor coordination", "quote", "guest count" — never "patients", "retailers", or "subscribers".
Help update the provider's page: event type listings, capability highlights, portfolio callouts, quote request CTA. Remind them they can generate event proposals, event management agreements, vendor rate cards, vendor appointment letters, and purchase orders from the Agency Studio.`,
  researchGuidance: `You are a business advisor for an event management company.
BUSINESS: Event management pricing (% of event budget vs flat fee), vendor margin management, wedding vs corporate event economics, corporate retainer mandates, GST on event services (18%), entertainment tax, liability and cancellation clauses, social media portfolio building for weddings, and B2B corporate event sourcing.`,
}

const logistics: VerticalConfig = {
  id: 'logistics',
  label: 'Logistics & Freight Forwarding',
  emoji: '🚢',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'minimal',
  defaultFont: 'inter',
  bookingLabel: 'Request a freight quote',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'services',       question: 'What logistics and freight services do you offer?',   placeholder: 'e.g. Domestic road freight, air cargo, sea FCL / LCL, customs clearing, warehousing' },
    { id: 'routes',         question: 'Which routes or corridors do you specialise in?',    placeholder: 'e.g. India–UAE air freight; Chennai–Mumbai–Delhi road express; pan-India FTL / LTL' },
    { id: 'cargo',          question: 'What types of cargo or industries do you handle?',   placeholder: 'e.g. Garments, pharma cold chain, auto parts, perishables, B2B e-commerce' },
    { id: 'clients',        question: 'Who are your typical clients?',                      placeholder: 'e.g. Exporters, importers, manufacturers, e-commerce brands, trading companies' },
    { id: 'differentiator', question: 'What makes your logistics service stand out? (optional)', placeholder: 'e.g. Real-time tracking, dedicated account manager, IATA cargo certified' },
  ],
  chatGuidance: `PERSONA: LOGISTICS & FREIGHT FORWARDING
Speak in logistics language: say "shippers", "clients", "consignees", "freight", "cargo", "route", "transit time", "FCL / LCL", "customs", "SLA" — never "students" or "patients".
Help update the provider's page: service/route listings, cargo specialisations, reliability highlights, freight enquiry CTA, FAQ. Remind them they can generate freight quotations, logistics service agreements, route rate cards, partner appointment letters, and purchase orders from the Agency Studio.`,
  researchGuidance: `You are a business advisor for a logistics and freight forwarding company.
BUSINESS: IATA cargo agent accreditation, customs broker (CHA) licensing in India, ocean freight dynamics (FCL vs LCL), air cargo pricing, FTL vs LTL road freight economics, GST on logistics (5%), e-commerce logistics growth, and building anchor client relationships.`,
}

const agency: VerticalConfig = {
  id: 'agency',
  label: 'Agency',
  emoji: '🏢',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Request a quote',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'services',  question: 'What services does your agency provide?',                 placeholder: 'e.g. Consulting, procurement, sourcing, representation, channel management' },
    { id: 'sectors',   question: 'Which industries or sectors do you serve?',               placeholder: 'e.g. Healthcare, education, manufacturing, retail, government, real estate' },
    { id: 'clients',   question: 'Who are your typical clients?',                          placeholder: 'e.g. Corporates, MSMEs, government bodies, international companies entering India' },
    { id: 'geography', question: 'What is your geographic coverage?',                      placeholder: 'e.g. Pan-India, Maharashtra focus, South India, or cross-border India–Middle East' },
    { id: 'approach',  question: 'What makes your agency the right partner? (optional)',    placeholder: 'e.g. 15 years in sector, established network, end-to-end project management' },
  ],
  chatGuidance: `PERSONA: AGENCY
Speak in agency language: say "clients", "mandates", "scope of work", "deliverables", "retainer", "project", "network", "representation" — never "students" or "patients".
Help update the provider's page: service listings, sector expertise, coverage highlights, enquiry CTA, FAQ. Remind them they can generate service proposals, agency-client agreements, fee schedules, and appointment letters from the Agency Studio.`,
  researchGuidance: `You are a business advisor for a service agency.
BUSINESS: Agency service pricing models (retainer, project, success fee), how to structure scope-of-work agreements, client acquisition for intermediary businesses, GST on agency services, principal-agent contract structures, how to grow from sole proprietorship to registered firm, and building referral and partnership networks.`,
}
```

- [ ] **Step 2: Register agency personas in `VERTICALS`**

Add before `other` in the `VERTICALS` map:

```typescript
  // Agency personas
  travel, realestate, insurance, staffing, marketing, immigration, events, logistics, agency,
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -iE "error TS|Type error"
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add config/verticals/index.ts
git commit -m "feat: add 9 agency VerticalConfig entries (travel, realestate, insurance, staffing, marketing, immigration, events, logistics, agency)"
```

---

### Task 6: Page section layouts, design modes, and gallery defaults

**Files:**
- Modify: `inngest/build-page.ts`

**Interfaces:**
- Consumes: All 16 new persona IDs
- Produces: 16 `PERSONA_SECTIONS` entries; 16 `DESIGN_MODE_MAP` entries

- [ ] **Step 1: Add `PERSONA_SECTIONS` entries**

Find `const PERSONA_SECTIONS: Record<string, Section[]> = {` and append before the closing `}`:

```typescript
  // ── Distributor personas — storefront layout
  // hero(auto) → services(menu) → gallery(grid) → bio(callout) → highlights(icons) → faq → contact
  fmcgdist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  pharmadist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  electronicsdist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 7 },
  ],
  autopartsdist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 6 },
  ],
  buildingdist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 6 },
  ],
  agridist: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 6 },
  ],
  distributor: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'menu',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'contact',    variant: 'enquiry',   order: 6 },
  ],
  // ── Agency personas — portfolio style (gallery-forward)
  travel: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  realestate: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  marketing: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'gallery',    variant: 'masonry',   order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  events: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'gallery',    variant: 'grid',      order: 2 },
    { sectionKey: 'services',   variant: 'grid',      order: 3 },
    { sectionKey: 'bio',        variant: 'callout',   order: 4 },
    { sectionKey: 'highlights', variant: 'icons',     order: 5 },
    { sectionKey: 'faq',        variant: 'accordion', order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  // ── Agency personas — focus style (services-first)
  insurance: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  staffing: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  immigration: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  logistics: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
  agency: [
    { sectionKey: 'hero',       variant: 'auto',      order: 1 },
    { sectionKey: 'services',   variant: 'list',      order: 2 },
    { sectionKey: 'highlights', variant: 'icons',     order: 3 },
    { sectionKey: 'bio',        variant: 'paragraph', order: 4 },
    { sectionKey: 'faq',        variant: 'accordion', order: 5 },
    { sectionKey: 'booking',    variant: 'minimal',   order: 6 },
    { sectionKey: 'contact',    variant: 'both',      order: 7 },
  ],
```

- [ ] **Step 2: Add `DESIGN_MODE_MAP` entries**

In `DESIGN_MODE_MAP` (around line 18), append after the existing commerce entries:

```typescript
  // Distributor personas — editorial (professional B2B feel)
  fmcgdist: 'editorial', pharmadist: 'editorial', electronicsdist: 'editorial',
  autopartsdist: 'editorial', buildingdist: 'editorial', agridist: 'editorial',
  distributor: 'editorial',
  // Agency personas — editorial (professional / portfolio)
  travel: 'editorial', realestate: 'editorial', insurance: 'editorial',
  staffing: 'editorial', marketing: 'editorial', immigration: 'editorial',
  events: 'editorial', logistics: 'editorial', agency: 'editorial',
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -iE "error TS|Type error"
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add inngest/build-page.ts
git commit -m "feat: add PERSONA_SECTIONS and DESIGN_MODE_MAP for 16 distributor/agency personas"
```

---

### Task 7: Public-page copy + roster presets

**Files:**
- Modify: `app/[slug]/personaConfig.ts`

**Interfaces:**
- Produces: `PERSONA_CONFIG` entries for all 16 personas; `DISTRIBUTOR_ROSTER` and `AGENCY_ROSTER` presets; updated `ROSTER_COPY` registry

- [ ] **Step 1: Add `PERSONA_CONFIG` entries**

Find the closing `}` of `PERSONA_CONFIG` (search for the last `},` before `export function getPersonaConfig`) and add before it:

```typescript
  // ── Distributor personas ───────────────────────────────────────────────────
  fmcgdist: {
    tabLabel: 'Supply', heroCtaTarget: '#products', servicesLabel: 'Product Lines',
    bioLabel: 'About Us', highlightsLabel: 'Why Deal With Us', contactLabel: 'Trade Enquiries',
    contactVariant: 'enquiry' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  pharmadist: {
    tabLabel: 'Supply', heroCtaTarget: '#products', servicesLabel: 'Product Range',
    bioLabel: 'About Us', highlightsLabel: 'Why Supply With Us', contactLabel: 'Supply Enquiries',
    contactVariant: 'enquiry' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  electronicsdist: {
    tabLabel: 'Supply', heroCtaTarget: '#brands', servicesLabel: 'Brands & Categories',
    bioLabel: 'About Us', highlightsLabel: 'Why Deal With Us', contactLabel: 'Dealer Enquiries',
    contactVariant: 'enquiry' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  autopartsdist: {
    tabLabel: 'Supply', heroCtaTarget: '#parts', servicesLabel: 'Parts Categories',
    bioLabel: 'About Us', highlightsLabel: 'Why Supply With Us', contactLabel: 'Workshop Enquiries',
    contactVariant: 'enquiry' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  buildingdist: {
    tabLabel: 'Supply', heroCtaTarget: '#materials', servicesLabel: 'Material Lines',
    bioLabel: 'About Us', highlightsLabel: 'Why Supply With Us', contactLabel: 'Trade Enquiries',
    contactVariant: 'enquiry' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  agridist: {
    tabLabel: 'Supply', heroCtaTarget: '#products', servicesLabel: 'Product Categories',
    bioLabel: 'About Us', highlightsLabel: 'Why Deal With Us', contactLabel: 'Dealer Enquiries',
    contactVariant: 'enquiry' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  distributor: {
    tabLabel: 'Supply', heroCtaTarget: '#products', servicesLabel: 'Product Lines',
    bioLabel: 'About Us', highlightsLabel: 'Why Deal With Us', contactLabel: 'Trade Enquiries',
    contactVariant: 'enquiry' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  // ── Agency personas ────────────────────────────────────────────────────────
  travel: {
    tabLabel: 'Bookings', heroCtaTarget: '#packages', servicesLabel: 'Tour Packages',
    bioLabel: 'About Us', highlightsLabel: 'Why Travel With Us', contactLabel: 'Enquire / Book',
    contactVariant: 'both' as const, serviceCardAction: 'book' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: true, hasCustomOrder: false, leadTimeNotice: null,
  },
  realestate: {
    tabLabel: 'Enquiries', heroCtaTarget: '#properties', servicesLabel: 'Properties & Services',
    bioLabel: 'About Us', highlightsLabel: 'Why Work With Us', contactLabel: 'Enquire About a Property',
    contactVariant: 'both' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: true, hasCustomOrder: false, leadTimeNotice: null,
  },
  insurance: {
    tabLabel: 'Enquiries', heroCtaTarget: '#services', servicesLabel: 'Insurance Products',
    bioLabel: 'About Me', highlightsLabel: 'Why Choose Us', contactLabel: 'Get in Touch',
    contactVariant: 'both' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  staffing: {
    tabLabel: 'Mandates', heroCtaTarget: '#services', servicesLabel: 'Staffing Services',
    bioLabel: 'About Us', highlightsLabel: 'Why Partner With Us', contactLabel: 'Discuss a Requirement',
    contactVariant: 'both' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  marketing: {
    tabLabel: 'Enquiries', heroCtaTarget: '#services', servicesLabel: 'Services & Packages',
    bioLabel: 'About Us', highlightsLabel: 'Why Work With Us', contactLabel: 'Request a Proposal',
    contactVariant: 'both' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  immigration: {
    tabLabel: 'Consultations', heroCtaTarget: '#services', servicesLabel: 'Services & Pathways',
    bioLabel: 'About Us', highlightsLabel: 'Why Choose Us', contactLabel: 'Book a Consultation',
    contactVariant: 'both' as const, serviceCardAction: 'book' as const,
    orderLabel: 'Book', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
  events: {
    tabLabel: 'Enquiries', heroCtaTarget: '#events', servicesLabel: 'Events & Services',
    bioLabel: 'About Us', highlightsLabel: 'Why Choose Us', contactLabel: 'Request a Quote',
    contactVariant: 'both' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: true, hasCustomOrder: false, leadTimeNotice: null,
  },
  logistics: {
    tabLabel: 'Enquiries', heroCtaTarget: '#services', servicesLabel: 'Freight Services',
    bioLabel: 'About Us', highlightsLabel: 'Why Ship With Us', contactLabel: 'Request a Freight Quote',
    contactVariant: 'both' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: true, hasCustomOrder: false, leadTimeNotice: null,
  },
  agency: {
    tabLabel: 'Enquiries', heroCtaTarget: '#services', servicesLabel: 'Services',
    bioLabel: 'About Us', highlightsLabel: 'Why Choose Us', contactLabel: 'Get in Touch',
    contactVariant: 'both' as const, serviceCardAction: 'enquire' as const,
    orderLabel: 'Enquire', hasQuantity: false, hasNotes: false, hasCustomOrder: false, leadTimeNotice: null,
  },
```

- [ ] **Step 2: Add roster presets**

After the last existing preset (e.g. `POSTNATAL_ROSTER`) and before `const ROSTER_COPY`, add:

```typescript
const DISTRIBUTOR_ROSTER: RosterCopy = {
  singular:            'account',
  plural:              'accounts',
  tabLabel:            'Accounts',
  emoji:               '🏪',
  emptyHeading:        'No accounts yet',
  emptySubtext:        'Add dealer and retailer accounts to track your relationships.',
  addLabel:            '+ Add account',
  lessonsBtnLabel:     '📋 Orders',
  logTitle:            'Log an interaction',
  topicLabel:          'Topic / Purpose',
  topicPlaceholder:    'e.g. Monthly order, product demo, credit review',
  homeworkLabel:       'Follow-up',
  homeworkPlaceholder: 'Follow-up action (e.g. Send price list, confirm delivery date)',
  notesPlaceholder:    'Private notes (not shared with account)',
  nextLabel:           'Next follow-up',
  nextPlaceholder:     'e.g. Call on Monday, visit next week',
  historyLabel:        'History',
  sessionNoun:         'interaction',
  contactSectionLabel: 'Key contact at account (optional)',
  contactRowLabel:     'Contact',
  quickLogLabel:       '✓ Quick log',
  removeConfirm:       'Remove this account?',
}

const AGENCY_ROSTER: RosterCopy = {
  singular:            'client',
  plural:              'clients',
  tabLabel:            'Clients',
  emoji:               '🏢',
  emptyHeading:        'No clients yet',
  emptySubtext:        'Add clients to track engagements and follow-ups.',
  addLabel:            '+ Add client',
  lessonsBtnLabel:     '📋 Engagements',
  logTitle:            'Log an engagement',
  topicLabel:          'Topic / Service',
  topicPlaceholder:    'e.g. Initial consultation, proposal review, site visit',
  homeworkLabel:       'Follow-up',
  homeworkPlaceholder: 'Next step (e.g. Send proposal, share documents, confirm meeting)',
  notesPlaceholder:    'Private notes (not shared with client)',
  nextLabel:           'Next meeting / call',
  nextPlaceholder:     'e.g. Thursday 3 PM, call next week',
  historyLabel:        'History',
  sessionNoun:         'engagement',
  contactSectionLabel: 'Key contact (optional)',
  contactRowLabel:     'Contact',
  quickLogLabel:       '✓ Quick log',
  removeConfirm:       'Remove this client?',
}
```

- [ ] **Step 3: Register all 16 in `ROSTER_COPY`**

Find `const ROSTER_COPY: Record<string, RosterCopy> = {` and add before the closing `}`:

```typescript
  // Distributor personas
  fmcgdist: DISTRIBUTOR_ROSTER, pharmadist: DISTRIBUTOR_ROSTER,
  electronicsdist: DISTRIBUTOR_ROSTER, autopartsdist: DISTRIBUTOR_ROSTER,
  buildingdist: DISTRIBUTOR_ROSTER, agridist: DISTRIBUTOR_ROSTER,
  distributor: DISTRIBUTOR_ROSTER,
  // Agency personas
  travel: AGENCY_ROSTER, realestate: AGENCY_ROSTER, insurance: AGENCY_ROSTER,
  staffing: AGENCY_ROSTER, marketing: AGENCY_ROSTER, immigration: AGENCY_ROSTER,
  events: AGENCY_ROSTER, logistics: AGENCY_ROSTER, agency: AGENCY_ROSTER,
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -iE "error TS|Type error"
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add "app/[slug]/personaConfig.ts"
git commit -m "feat: add PERSONA_CONFIG + DISTRIBUTOR_ROSTER + AGENCY_ROSTER for 16 distributor/agency personas"
```

---

## Verification (end-to-end)

1. **Migration** — apply `20260713220000_distributor_agency_personas.sql` to a Supabase branch. Confirm: `SELECT count(*) FROM personas WHERE studio_archetype='business_docs';` returns 16. `SELECT count(*) FROM studio_modes WHERE archetype_id='business_docs';` returns 7.

2. **Onboarding** — load `/onboarding`. Both `distributor` and `agency` (and at least one named sub-type) appear in the persona grid. Completing onboarding with `fmcgdist` builds a page with `template='storefront'`, `sections` populated from `PERSONA_SECTIONS.fmcgdist`. Completing with `travel` builds a `portfolio` page.

3. **Public page** — visit a distributor's `{slug}.kryla.work`: shows product-lines catalog (`services` section with `menu` variant) + dealer enquiry CTA; copy reads "Product Lines" / "Trade Enquiries" (not generic "other" labels). Visit a `travel` page: gallery of destinations + package listings. Visit an `insurance` page: focus layout with services list + policy review CTA.

4. **Studio** — open My Space for a provider with `fmcgdist` persona: "Distribution Studio" tab is visible. All 7 mode pills render (Quotation, Agreement, Price List, Appointment Letter, Partnership Proposal, Purchase Order, Refine). Fill in a quotation form and generate: a properly structured HTML quotation is produced. Refine with an instruction produces tracked `<ins>`/`<del>` markup. Saving a doc writes to `studio_documents`.

5. **Plan gate** — a provider on a plan without `studio_business` in `plan_features` gets a "not available on your plan" response from `POST /api/mychat/studio`. An unlocked provider succeeds.

6. **Roster tab** — My Space roster tab for a `fmcgdist` provider reads "Accounts" / "account" (not "students"). For `travel` it reads "Clients" / "client".
