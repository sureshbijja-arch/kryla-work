-- Phase 1 advocate capabilities: Drafting Studio.
--
-- 1. draft_templates  — system-seeded and member-owned doc-type catalog.
-- 2. drafts           — saved legal documents attached to provider/matter.
-- 3. drafting_usage   — daily rate-limit counter (mirrors research_usage).

-- ── Template catalog ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS draft_templates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type     text        NOT NULL,                  -- machine key, e.g. 'legal_notice'
  label        text        NOT NULL,                  -- display name
  description  text,                                  -- one-line summary
  fields       jsonb       NOT NULL DEFAULT '[]',     -- array of { id, label, placeholder, required }
  body_scaffold text,                                 -- optional system starting structure
  persona      text        NOT NULL DEFAULT 'advocate',
  is_system    boolean     NOT NULL DEFAULT true,
  provider_id  uuid        REFERENCES providers(id) ON DELETE CASCADE,  -- null = system
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup: all system templates for a persona
CREATE INDEX IF NOT EXISTS idx_draft_templates_persona ON draft_templates(persona, is_system);
-- Fast lookup: a member's own saved templates
CREATE INDEX IF NOT EXISTS idx_draft_templates_provider ON draft_templates(provider_id) WHERE provider_id IS NOT NULL;

-- ── Seed: common Indian legal document types ──────────────────────────────────
INSERT INTO draft_templates (doc_type, label, description, fields, persona, is_system, provider_id) VALUES

('legal_notice',
 'Legal Notice',
 'Formal notice under Section 80 CPC or general statutory notice',
 '[
   {"id":"sender_name","label":"Sender full name & address","placeholder":"e.g. Ramesh Kumar, 12 MG Road, Chennai 600001","required":true},
   {"id":"recipient_name","label":"Recipient full name & address","placeholder":"e.g. ABC Ltd, registered office address","required":true},
   {"id":"subject_matter","label":"Subject / cause of action","placeholder":"e.g. Failure to repay ₹2,50,000 loan taken on 01-Jan-2025","required":true},
   {"id":"relief_sought","label":"Relief / demand sought","placeholder":"e.g. Repay ₹2,50,000 with 18% interest within 15 days","required":true},
   {"id":"jurisdiction","label":"Jurisdiction / governing law","placeholder":"e.g. Chennai courts; Indian Contract Act 1872","required":false},
   {"id":"additional_facts","label":"Additional relevant facts (optional)","placeholder":"Any prior communications, agreements, or events","required":false}
 ]',
 'advocate', true, null),

('demand_letter',
 'Demand Letter',
 'Demand for payment or performance (pre-litigation, less formal)',
 '[
   {"id":"client_name","label":"Your client''s name","placeholder":"e.g. Priya Sharma","required":true},
   {"id":"opponent_name","label":"Opposite party name & contact","placeholder":"e.g. XYZ Pvt Ltd, abc@example.com","required":true},
   {"id":"amount_or_obligation","label":"Amount owed / obligation to perform","placeholder":"e.g. ₹5,00,000 outstanding invoice No. INV-2025-042","required":true},
   {"id":"deadline","label":"Deadline for compliance","placeholder":"e.g. Within 7 days of receipt","required":true},
   {"id":"background","label":"Background facts","placeholder":"Brief history of the dispute or transaction","required":false}
 ]',
 'advocate', true, null),

('affidavit',
 'Affidavit',
 'Sworn written statement for court or statutory purposes',
 '[
   {"id":"deponent_name","label":"Deponent''s full name, age & address","placeholder":"e.g. Anil Verma, 45 years, 5 Park Street, Kolkata","required":true},
   {"id":"court_or_authority","label":"Court / authority before which sworn","placeholder":"e.g. Hon''ble High Court of Bombay","required":true},
   {"id":"matter_reference","label":"Case / matter reference (if any)","placeholder":"e.g. Writ Petition No. 1234/2025","required":false},
   {"id":"facts","label":"Facts to be affirmed","placeholder":"State the facts clearly in numbered paragraphs","required":true}
 ]',
 'advocate', true, null),

('vakalatnama',
 'Vakalatnama',
 'Power of attorney authorising advocate to appear and act',
 '[
   {"id":"client_name","label":"Client full name & address","placeholder":"e.g. Sunita Reddy, 8 Jubilee Hills, Hyderabad","required":true},
   {"id":"advocate_name","label":"Advocate''s full name & enrolment number","placeholder":"e.g. Adv. Rajiv Nair, Bar Council No. KER/2015/1234","required":true},
   {"id":"court","label":"Court name","placeholder":"e.g. District & Sessions Court, Ernakulam","required":true},
   {"id":"case_reference","label":"Case / matter reference","placeholder":"e.g. OS No. 456/2024 or new filing","required":true}
 ]',
 'advocate', true, null),

('rental_agreement',
 'Rental / Lease Agreement',
 'Residential or commercial property rental agreement',
 '[
   {"id":"landlord_name","label":"Landlord full name & address","placeholder":"e.g. Geeta Singh, 22 Civil Lines, Allahabad","required":true},
   {"id":"tenant_name","label":"Tenant full name & address","placeholder":"e.g. Ravi Mehta, current address","required":true},
   {"id":"property_description","label":"Property description & address","placeholder":"e.g. 2 BHK flat at 7B Lake View Apartments, Pune 411001","required":true},
   {"id":"rent_amount","label":"Monthly rent & security deposit","placeholder":"e.g. ₹25,000/month; deposit ₹75,000","required":true},
   {"id":"lease_period","label":"Lease period & commencement date","placeholder":"e.g. 11 months from 01-Aug-2026","required":true},
   {"id":"special_terms","label":"Special terms / restrictions (optional)","placeholder":"e.g. No subletting, pets not allowed, maintenance by tenant","required":false}
 ]',
 'advocate', true, null),

('employment_agreement',
 'Employment Agreement',
 'Offer letter / employment contract for a new hire',
 '[
   {"id":"employer_name","label":"Employer entity name & address","placeholder":"e.g. TechStart Pvt Ltd, 12th Floor, DLF Cyber City, Gurugram","required":true},
   {"id":"employee_name","label":"Employee full name","placeholder":"e.g. Kiran Patel","required":true},
   {"id":"designation","label":"Designation & department","placeholder":"e.g. Senior Software Engineer, Product Team","required":true},
   {"id":"compensation","label":"Compensation & benefits","placeholder":"e.g. ₹12 LPA CTC; gratuity, PF as per law","required":true},
   {"id":"start_date","label":"Start date & probation period","placeholder":"e.g. 15-Aug-2026; 6 months probation","required":true},
   {"id":"notice_period","label":"Notice period","placeholder":"e.g. 2 months on either side post-confirmation","required":true},
   {"id":"special_clauses","label":"Special clauses (optional)","placeholder":"e.g. Non-compete 12 months post-exit; ESOP details","required":false}
 ]',
 'advocate', true, null),

('cheque_bounce_notice',
 'Cheque Bounce Notice (§138 NI Act)',
 'Statutory demand notice after dishonour of cheque',
 '[
   {"id":"payee_name","label":"Payee (complainant) name & address","placeholder":"e.g. Dinesh Gupta, 45 MG Road, Bengaluru 560001","required":true},
   {"id":"drawer_name","label":"Drawer (accused) name & address","placeholder":"e.g. Mohan Traders, registered address","required":true},
   {"id":"cheque_details","label":"Cheque details","placeholder":"e.g. Cheque No. 004532, dated 10-Jun-2026, ₹3,50,000, Bank ABC","required":true},
   {"id":"dishonour_date","label":"Date of dishonour & reason","placeholder":"e.g. 15-Jun-2026; reason: insufficient funds","required":true},
   {"id":"underlying_transaction","label":"Underlying transaction / debt","placeholder":"e.g. Towards repayment of business loan dated 01-Jan-2025","required":true}
 ]',
 'advocate', true, null),

('mou',
 'Memorandum of Understanding (MoU)',
 'Non-binding or binding MoU between parties',
 '[
   {"id":"party_a","label":"Party A — full name / entity & address","placeholder":"e.g. Alpha Ventures LLP, 5 Connaught Place, Delhi","required":true},
   {"id":"party_b","label":"Party B — full name / entity & address","placeholder":"e.g. Beta Solutions Pvt Ltd, registered address","required":true},
   {"id":"purpose","label":"Purpose of MoU","placeholder":"e.g. Joint development of a mobile app for healthcare sector","required":true},
   {"id":"obligations","label":"Key obligations / understandings","placeholder":"e.g. Party A to provide technology; Party B to provide funding","required":true},
   {"id":"duration","label":"Duration & termination","placeholder":"e.g. 12 months; either party may terminate on 30 days notice","required":true},
   {"id":"binding","label":"Binding / non-binding clause","placeholder":"e.g. Non-binding (except confidentiality & dispute clauses)","required":false}
 ]',
 'advocate', true, null),

('power_of_attorney',
 'Power of Attorney (PoA)',
 'General or specific PoA authorising another to act on one''s behalf',
 '[
   {"id":"principal_name","label":"Principal name, age & address","placeholder":"e.g. Leela Iyer, 62 years, 8 Amar Colony, Chennai","required":true},
   {"id":"attorney_name","label":"Attorney name, age & address","placeholder":"e.g. Vijay Iyer, 35 years, 12 Nungambakkam High Road, Chennai","required":true},
   {"id":"scope","label":"Scope of authority","placeholder":"e.g. Manage and sell property at Plot 22, Velachery, Chennai","required":true},
   {"id":"duration","label":"Duration (if limited)","placeholder":"e.g. Valid for 2 years from date of execution","required":false},
   {"id":"revocation","label":"Revocation clause (optional)","placeholder":"e.g. This PoA may be revoked by the Principal at any time by written notice","required":false}
 ]',
 'advocate', true, null),

('reply_notice',
 'Reply to Legal Notice',
 'Formal reply disputing or acknowledging a legal notice received',
 '[
   {"id":"sender_name","label":"Replying party name & address","placeholder":"e.g. Rajesh Patel, 10 MG Road, Vadodara","required":true},
   {"id":"original_notice_details","label":"Original notice reference","placeholder":"e.g. Notice dated 01-Jul-2026 by Adv. Sharma on behalf of XYZ Ltd","required":true},
   {"id":"stance","label":"Stance (admit / deny / dispute)","placeholder":"e.g. Deny all allegations; ₹1,50,000 already repaid on 15-May-2026","required":true},
   {"id":"rebuttal_facts","label":"Rebuttal / counter-facts","placeholder":"Key facts your client wants placed on record","required":true},
   {"id":"counter_demand","label":"Counter-demand or relief sought (optional)","placeholder":"e.g. Withdraw the notice or face defamation proceedings","required":false}
 ]',
 'advocate', true, null);

-- ── Saved drafts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drafts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid        NOT NULL REFERENCES providers(id)  ON DELETE CASCADE,
  student_id   uuid                 REFERENCES students(id)   ON DELETE SET NULL,  -- attach to matter
  doc_type     text        NOT NULL,
  title        text        NOT NULL,
  body         text        NOT NULL DEFAULT '',
  status       text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  share_token  uuid        UNIQUE,                -- set to gen_random_uuid() to enable sharing
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_drafts_provider     ON drafts(provider_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_student      ON drafts(student_id)  WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drafts_share_token  ON drafts(share_token) WHERE share_token IS NOT NULL;

-- ── Rate-limit counter ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drafting_usage (
  provider_id  uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_key      date        NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (provider_id, day_key)
);
