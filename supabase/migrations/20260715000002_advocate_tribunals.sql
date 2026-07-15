-- ============================================================
-- Advocate Court Tools — India Tribunal directory
-- ============================================================
-- Covers all 16 major quasi-judicial bodies requested:
-- NCLT, NCLAT, ITAT, CESTAT, NGT, AFT, SAT, CAT,
-- DRT, DRAT, TDSAT, APTEL, Consumer (e-Jagriti), CCI, RCT, GSTAT
--
-- Rich cards: portal + case-status/cause-list/orders URLs (where they exist)
-- + physical bench locations (jsonb array) with Maps links.
-- All URLs are DB-editable — no redeploy needed to fix/extend.
-- ============================================================

CREATE TABLE IF NOT EXISTS tribunal_directory (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text        UNIQUE NOT NULL,
  short_name       text        NOT NULL,
  full_name        text        NOT NULL,
  category         text        NOT NULL CHECK (category IN (
                     'company', 'tax', 'customs', 'environment',
                     'armed_forces', 'securities', 'service', 'debt',
                     'telecom', 'electricity', 'consumer', 'competition',
                     'railway', 'gst'
                   )),
  portal_url       text        NOT NULL,
  case_status_url  text,                  -- direct link to case-status page (if exists)
  cause_list_url   text,                  -- direct link to cause-list page (if exists)
  orders_url       text,                  -- direct link to orders/judgments page (if exists)
  benches          jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- [{name, city, address, map_url}]
  notes            text,                  -- visible helper text for the advocate
  search_text      text,                  -- lowercase bag of aliases for full-text search
  sort_order       int         NOT NULL DEFAULT 100,
  active           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tribunal_directory_search   ON tribunal_directory USING gin(to_tsvector('simple', coalesce(search_text,'')));
CREATE INDEX IF NOT EXISTS idx_tribunal_directory_category ON tribunal_directory (category);
CREATE INDEX IF NOT EXISTS idx_tribunal_directory_sort     ON tribunal_directory (sort_order, short_name);

-- ── Seed ───────────────────────────────────────────────────────────────────────

INSERT INTO tribunal_directory
  (slug, short_name, full_name, category, portal_url, case_status_url, cause_list_url, orders_url, benches, notes, search_text, sort_order)
VALUES

-- ── Company / Insolvency ──────────────────────────────────────────────────────
(
  'nclt', 'NCLT', 'National Company Law Tribunal', 'company',
  'https://nclt.gov.in',
  'https://nclt.gov.in/case-status',
  'https://nclt.gov.in/cause-list',
  'https://nclt.gov.in/orders',
  '[
    {"name":"NCLT — Principal Bench, New Delhi","city":"New Delhi","address":"3rd Floor, National Highway Authority of India Building, Plot No. 118, Sector 44, Gurugram — 122003 (Principal Bench sits in Delhi)","map_url":"https://maps.google.com/maps/search/?api=1&query=NCLT+Principal+Bench+New+Delhi"},
    {"name":"NCLT — Mumbai Bench","city":"Mumbai","address":"3rd Floor, MTNL Building, GM Bhosale Marg, Worli, Mumbai — 400 018","map_url":"https://maps.google.com/maps/search/?api=1&query=NCLT+Mumbai+Bench+Worli"},
    {"name":"NCLT — Chennai Bench","city":"Chennai","address":"Ground Floor, SIDCO Industrial Estate, Guindy, Chennai — 600 032","map_url":"https://maps.google.com/maps/search/?api=1&query=NCLT+Chennai+Bench+Guindy"},
    {"name":"NCLT — Bengaluru Bench","city":"Bengaluru","address":"NCLT Bengaluru Bench, UB City, Bengaluru","map_url":"https://maps.google.com/maps/search/?api=1&query=NCLT+Bengaluru+Bench"},
    {"name":"NCLT — Kolkata Bench","city":"Kolkata","address":"NCLT Kolkata Bench, CGO Complex, Salt Lake, Kolkata","map_url":"https://maps.google.com/maps/search/?api=1&query=NCLT+Kolkata+Bench"},
    {"name":"NCLT — Hyderabad Bench","city":"Hyderabad","address":"NCLT Hyderabad Bench, Parishrama Bhavanam, Himayathnagar, Hyderabad","map_url":"https://maps.google.com/maps/search/?api=1&query=NCLT+Hyderabad+Bench"},
    {"name":"NCLT — Ahmedabad Bench","city":"Ahmedabad","address":"NCLT Ahmedabad Bench, Income Tax Office, Ashram Road, Ahmedabad","map_url":"https://maps.google.com/maps/search/?api=1&query=NCLT+Ahmedabad+Bench"}
  ]'::jsonb,
  'Handles company law matters under the Companies Act 2013 and insolvency proceedings under IBC 2016. Case status and cause list available on the portal. Copy your case number and open the portal to check.',
  'nclt national company law tribunal insolvency ibc iba companies act liquidation winding up mergers amalgamation corporate',
  10
),
(
  'nclat', 'NCLAT', 'National Company Law Appellate Tribunal', 'company',
  'https://nclat.nic.in',
  'https://nclat.nic.in/case-status',
  'https://nclat.nic.in/cause-list',
  'https://nclat.nic.in/orders',
  '[
    {"name":"NCLAT — Principal Bench, New Delhi","city":"New Delhi","address":"3rd Floor, IP Estate, New Delhi — 110 002","map_url":"https://maps.google.com/maps/search/?api=1&query=NCLAT+New+Delhi+IP+Estate"},
    {"name":"NCLAT — Chennai Bench","city":"Chennai","address":"NCLAT Chennai Bench, Tower 1, Shastri Bhawan, No. 26, Haddows Road, Chennai — 600 006","map_url":"https://maps.google.com/maps/search/?api=1&query=NCLAT+Chennai+Bench"}
  ]'::jsonb,
  'Appellate body for NCLT orders. Also hears appeals from CCI and IBBI orders.',
  'nclat national company law appellate tribunal appeal insolvency ibc corporate',
  11
),

-- ── Tax ───────────────────────────────────────────────────────────────────────
(
  'itat', 'ITAT', 'Income Tax Appellate Tribunal', 'tax',
  'https://itat.gov.in',
  'https://itatjip.gov.in/',
  'https://itat.gov.in/cause-list',
  'https://itat.gov.in/orders',
  '[
    {"name":"ITAT — Delhi Benches","city":"New Delhi","address":"ITAT, Jawaharlal Nehru Stadium, Gate No. 3, New Delhi — 110 003","map_url":"https://maps.google.com/maps/search/?api=1&query=ITAT+Delhi+Jawaharlal+Nehru+Stadium"},
    {"name":"ITAT — Mumbai Benches","city":"Mumbai","address":"National Judicial Academy Building, Bandra Kurla Complex, Mumbai — 400 051","map_url":"https://maps.google.com/maps/search/?api=1&query=ITAT+Mumbai+BKC"},
    {"name":"ITAT — Chennai Benches","city":"Chennai","address":"ITAT Chennai Bench, Shastri Bhawan, Chennai — 600 006","map_url":"https://maps.google.com/maps/search/?api=1&query=ITAT+Chennai+Bench"},
    {"name":"ITAT — Bengaluru Benches","city":"Bengaluru","address":"ITAT Bengaluru, ITO Campus, Queens Road, Bengaluru — 560 001","map_url":"https://maps.google.com/maps/search/?api=1&query=ITAT+Bengaluru+Queens+Road"},
    {"name":"ITAT — Ahmedabad Benches","city":"Ahmedabad","address":"ITAT Ahmedabad, Income Tax Office, Ashram Road, Ahmedabad","map_url":"https://maps.google.com/maps/search/?api=1&query=ITAT+Ahmedabad"},
    {"name":"ITAT — Kolkata Benches","city":"Kolkata","address":"ITAT Kolkata, 3A, Esplanade Row (East), Kolkata — 700 069","map_url":"https://maps.google.com/maps/search/?api=1&query=ITAT+Kolkata+Esplanade"}
  ]'::jsonb,
  'Hears appeals against orders of income-tax authorities (CIT(A), etc.). Case status available via ITAT-JIP portal. Use your ITA number to track.',
  'itat income tax appellate tribunal ita appeal income tax cit assessment order',
  20
),

-- ── Customs / Excise / Service Tax ───────────────────────────────────────────
(
  'cestat', 'CESTAT', 'Customs, Excise and Service Tax Appellate Tribunal', 'customs',
  'https://cestat.gov.in',
  'https://cestat.gov.in/case-status.aspx',
  'https://cestat.gov.in/cause-list.aspx',
  'https://cestat.gov.in/orders.aspx',
  '[
    {"name":"CESTAT — Delhi Principal Bench","city":"New Delhi","address":"West Block 2, Wing 2, R.K. Puram, New Delhi — 110 066","map_url":"https://maps.google.com/maps/search/?api=1&query=CESTAT+Delhi+RK+Puram"},
    {"name":"CESTAT — Mumbai Bench","city":"Mumbai","address":"CESTAT Mumbai, Ballard Estate, Mumbai — 400 001","map_url":"https://maps.google.com/maps/search/?api=1&query=CESTAT+Mumbai+Ballard+Estate"},
    {"name":"CESTAT — Chennai Bench","city":"Chennai","address":"CESTAT Chennai, Tower I, Shastri Bhawan, Chennai — 600 006","map_url":"https://maps.google.com/maps/search/?api=1&query=CESTAT+Chennai+Shastri+Bhawan"},
    {"name":"CESTAT — Kolkata Bench","city":"Kolkata","address":"CESTAT Kolkata, Customs House, 15/1, Strand Road, Kolkata — 700 001","map_url":"https://maps.google.com/maps/search/?api=1&query=CESTAT+Kolkata+Strand+Road"},
    {"name":"CESTAT — Ahmedabad Bench","city":"Ahmedabad","address":"CESTAT Ahmedabad, Income Tax Building, Ashram Road, Ahmedabad","map_url":"https://maps.google.com/maps/search/?api=1&query=CESTAT+Ahmedabad"},
    {"name":"CESTAT — Bengaluru Bench","city":"Bengaluru","address":"CESTAT Bengaluru, Queens Road, Bengaluru","map_url":"https://maps.google.com/maps/search/?api=1&query=CESTAT+Bengaluru+Queens+Road"},
    {"name":"CESTAT — Hyderabad Bench","city":"Hyderabad","address":"CESTAT Hyderabad, CGO Towers, Bengaluru-Hyderabad Highway, Hyderabad","map_url":"https://maps.google.com/maps/search/?api=1&query=CESTAT+Hyderabad"},
    {"name":"CESTAT — Chandigarh Bench","city":"Chandigarh","address":"CESTAT Chandigarh, Sector 17, Chandigarh","map_url":"https://maps.google.com/maps/search/?api=1&query=CESTAT+Chandigarh+Sector+17"}
  ]'::jsonb,
  'Hears appeals on customs duty, central excise, and service tax disputes. Now also covers some GST matters. Case status and orders available on cestat.gov.in.',
  'cestat customs excise service tax appellate tribunal indirect tax gst cenvat',
  30
),

-- ── Environment ───────────────────────────────────────────────────────────────
(
  'ngt', 'NGT', 'National Green Tribunal', 'environment',
  'https://greentribunal.gov.in',
  'https://greentribunal.gov.in/case_status.php',
  'https://greentribunal.gov.in/cause_list.php',
  'https://greentribunal.gov.in/orders.php',
  '[
    {"name":"NGT — Principal Bench, New Delhi","city":"New Delhi","address":"Faridkot House, Copernicus Marg, New Delhi — 110 001","map_url":"https://maps.google.com/maps/search/?api=1&query=National+Green+Tribunal+New+Delhi+Faridkot+House"},
    {"name":"NGT — Bhopal Bench","city":"Bhopal","address":"NGT Bhopal Bench, 28-A, Arera Hills, Bhopal — 462 011","map_url":"https://maps.google.com/maps/search/?api=1&query=NGT+Bhopal+Bench+Arera+Hills"},
    {"name":"NGT — Kolkata Bench","city":"Kolkata","address":"NGT Kolkata Bench, 5, Old Post Office Street, Kolkata — 700 001","map_url":"https://maps.google.com/maps/search/?api=1&query=NGT+Kolkata+Bench"},
    {"name":"NGT — Pune Bench","city":"Pune","address":"NGT Pune Bench, 26, Pune Income Tax Office, Pune — 411 001","map_url":"https://maps.google.com/maps/search/?api=1&query=NGT+Pune+Bench"},
    {"name":"NGT — Chennai Bench","city":"Chennai","address":"NGT Chennai Bench, Shastri Bhawan, Chennai — 600 006","map_url":"https://maps.google.com/maps/search/?api=1&query=NGT+Chennai+Bench"}
  ]'::jsonb,
  'Handles environmental disputes: pollution, forest, wildlife, EIA violations. Petitions can be filed online. Case status and orders are available on greentribunal.gov.in.',
  'ngt national green tribunal environment pollution forest wildlife eia environmental',
  40
),

-- ── Armed Forces ──────────────────────────────────────────────────────────────
(
  'aft', 'AFT', 'Armed Forces Tribunal', 'armed_forces',
  'https://aftdelhi.nic.in',
  'https://aftdelhi.nic.in/case_status.aspx',
  'https://aftdelhi.nic.in/cause_list.aspx',
  'https://aftdelhi.nic.in/orders.aspx',
  '[
    {"name":"AFT — Principal Bench, New Delhi","city":"New Delhi","address":"Rao Tula Ram Marg, New Delhi — 110 010","map_url":"https://maps.google.com/maps/search/?api=1&query=Armed+Forces+Tribunal+New+Delhi"},
    {"name":"AFT — Lucknow Bench","city":"Lucknow","address":"AFT Regional Bench, Lucknow — 226 001","map_url":"https://maps.google.com/maps/search/?api=1&query=AFT+Lucknow+Regional+Bench"},
    {"name":"AFT — Chandigarh Bench","city":"Chandigarh","address":"AFT Regional Bench, Chandigarh — 160 001","map_url":"https://maps.google.com/maps/search/?api=1&query=AFT+Chandigarh+Regional+Bench"},
    {"name":"AFT — Kolkata Bench","city":"Kolkata","address":"AFT Regional Bench, Fort William, Kolkata — 700 021","map_url":"https://maps.google.com/maps/search/?api=1&query=AFT+Kolkata+Regional+Bench"},
    {"name":"AFT — Kochi Bench","city":"Kochi","address":"AFT Regional Bench, Kochi — 682 020","map_url":"https://maps.google.com/maps/search/?api=1&query=AFT+Kochi+Regional+Bench"},
    {"name":"AFT — Chennai Bench","city":"Chennai","address":"AFT Regional Bench, Rajaji Bhawan, Besant Nagar, Chennai — 600 090","map_url":"https://maps.google.com/maps/search/?api=1&query=AFT+Chennai+Regional+Bench"},
    {"name":"AFT — Jaipur Bench","city":"Jaipur","address":"AFT Regional Bench, Jaipur — 302 015","map_url":"https://maps.google.com/maps/search/?api=1&query=AFT+Jaipur+Regional+Bench"}
  ]'::jsonb,
  'Resolves disputes relating to service matters, pension, and conditions of service of armed forces personnel.',
  'aft armed forces tribunal army navy air force service pension military court martial',
  50
),

-- ── Securities ────────────────────────────────────────────────────────────────
(
  'sat', 'SAT', 'Securities Appellate Tribunal', 'securities',
  'https://sat.sebi.gov.in',
  'https://sat.sebi.gov.in/case-status',
  'https://sat.sebi.gov.in/cause-list',
  'https://sat.sebi.gov.in/orders',
  '[
    {"name":"SAT — Mumbai","city":"Mumbai","address":"4th Floor, SEBI Bhavan, Bandra Kurla Complex, Bandra (East), Mumbai — 400 051","map_url":"https://maps.google.com/maps/search/?api=1&query=Securities+Appellate+Tribunal+SEBI+BKC+Mumbai"}
  ]'::jsonb,
  'Only appellate body for SEBI, PFRDA, and IRDAI orders. Sits only in Mumbai. Appeals filed within 45 days of the impugned order.',
  'sat sebi securities appellate tribunal irdai pfrda capital markets securities exchange board',
  60
),

-- ── Service / Administrative ──────────────────────────────────────────────────
(
  'cat', 'CAT', 'Central Administrative Tribunal', 'service',
  'https://ecat.nic.in',
  'https://ecat.nic.in/case_status.php',
  'https://ecat.nic.in/cause_list.php',
  'https://ecat.nic.in/orders.php',
  '[
    {"name":"CAT — Principal Bench, New Delhi","city":"New Delhi","address":"61-B, Copernicus Marg, New Delhi — 110 001","map_url":"https://maps.google.com/maps/search/?api=1&query=Central+Administrative+Tribunal+New+Delhi+Copernicus+Marg"},
    {"name":"CAT — Mumbai Bench","city":"Mumbai","address":"CAT Mumbai Bench, CGO Complex, Maharashtra — 400 020","map_url":"https://maps.google.com/maps/search/?api=1&query=CAT+Mumbai+Bench"},
    {"name":"CAT — Chennai Bench","city":"Chennai","address":"CAT Chennai Bench, Shastri Bhawan, Chennai","map_url":"https://maps.google.com/maps/search/?api=1&query=CAT+Chennai+Bench"},
    {"name":"CAT — Kolkata Bench","city":"Kolkata","address":"CAT Kolkata Bench, CGO Complex, Salt Lake, Kolkata","map_url":"https://maps.google.com/maps/search/?api=1&query=CAT+Kolkata+Bench+Salt+Lake"},
    {"name":"CAT — Bengaluru Bench","city":"Bengaluru","address":"CAT Bengaluru Bench, Queens Road, Bengaluru","map_url":"https://maps.google.com/maps/search/?api=1&query=CAT+Bengaluru+Bench"},
    {"name":"CAT — Allahabad Bench","city":"Prayagraj","address":"CAT Allahabad Bench, Prayagraj — 211 001","map_url":"https://maps.google.com/maps/search/?api=1&query=CAT+Allahabad+Bench"},
    {"name":"CAT — Chandigarh Bench","city":"Chandigarh","address":"CAT Chandigarh Bench, Sector 9, Chandigarh","map_url":"https://maps.google.com/maps/search/?api=1&query=CAT+Chandigarh+Bench"}
  ]'::jsonb,
  'Service disputes of Central Government employees. Online filing available at ecat.nic.in. Case status and cause list searchable by OA/MA number.',
  'cat central administrative tribunal service matter government employee civil servant oa original application',
  70
),

-- ── Debt Recovery ─────────────────────────────────────────────────────────────
(
  'drt', 'DRT', 'Debt Recovery Tribunal', 'debt',
  'https://drt.gov.in',
  'https://drt.gov.in/case-status',
  'https://drt.gov.in/cause-list',
  'https://drt.gov.in/orders',
  '[
    {"name":"DRT — Delhi — I","city":"New Delhi","address":"DRT-I New Delhi, CGO Complex, Lodhi Road, New Delhi — 110 003","map_url":"https://maps.google.com/maps/search/?api=1&query=DRT+Delhi+CGO+Complex+Lodhi+Road"},
    {"name":"DRT — Mumbai — I","city":"Mumbai","address":"DRT-I Mumbai, Cuffe Parade, Mumbai — 400 005","map_url":"https://maps.google.com/maps/search/?api=1&query=DRT+Mumbai+Cuffe+Parade"},
    {"name":"DRT — Chennai","city":"Chennai","address":"DRT Chennai, SBOA School Building, 19th Street, Chennai — 600 083","map_url":"https://maps.google.com/maps/search/?api=1&query=DRT+Chennai"},
    {"name":"DRT — Kolkata","city":"Kolkata","address":"DRT Kolkata, 3A, Esplanade Row (East), Kolkata — 700 069","map_url":"https://maps.google.com/maps/search/?api=1&query=DRT+Kolkata+Esplanade"},
    {"name":"DRT — Bengaluru","city":"Bengaluru","address":"DRT Bengaluru, Queens Road, Bengaluru — 560 001","map_url":"https://maps.google.com/maps/search/?api=1&query=DRT+Bengaluru"},
    {"name":"DRT — Ahmedabad","city":"Ahmedabad","address":"DRT Ahmedabad, Income Tax Office, Ashram Road, Ahmedabad","map_url":"https://maps.google.com/maps/search/?api=1&query=DRT+Ahmedabad"},
    {"name":"DRT — Hyderabad","city":"Hyderabad","address":"DRT Hyderabad, Himayathnagar, Hyderabad","map_url":"https://maps.google.com/maps/search/?api=1&query=DRT+Hyderabad"},
    {"name":"DRT — Jaipur","city":"Jaipur","address":"DRT Jaipur, Bani Park, Jaipur","map_url":"https://maps.google.com/maps/search/?api=1&query=DRT+Jaipur"},
    {"name":"DRT — Pune","city":"Pune","address":"DRT Pune, Shankarsheth Road, Pune","map_url":"https://maps.google.com/maps/search/?api=1&query=DRT+Pune"}
  ]'::jsonb,
  'Handles bank NPA recovery proceedings above ₹20 lakh (SARFAESI, DRT Act). OA/SA/MA matter tracking available on portal.',
  'drt debt recovery tribunal bank npa sarfaesi oa original application debt recovery',
  80
),
(
  'drat', 'DRAT', 'Debt Recovery Appellate Tribunal', 'debt',
  'https://drt.gov.in/drat',
  'https://drt.gov.in/drat/case-status',
  'https://drt.gov.in/drat/cause-list',
  'https://drt.gov.in/drat/orders',
  '[
    {"name":"DRAT — Delhi","city":"New Delhi","address":"DRAT Delhi, CGO Complex, Lodhi Road, New Delhi — 110 003","map_url":"https://maps.google.com/maps/search/?api=1&query=DRAT+Delhi+CGO+Complex"},
    {"name":"DRAT — Mumbai","city":"Mumbai","address":"DRAT Mumbai, Cuffe Parade, Mumbai — 400 005","map_url":"https://maps.google.com/maps/search/?api=1&query=DRAT+Mumbai+Cuffe+Parade"},
    {"name":"DRAT — Chennai","city":"Chennai","address":"DRAT Chennai, Chennai — 600 083","map_url":"https://maps.google.com/maps/search/?api=1&query=DRAT+Chennai"},
    {"name":"DRAT — Kolkata","city":"Kolkata","address":"DRAT Kolkata, Esplanade Row East, Kolkata — 700 069","map_url":"https://maps.google.com/maps/search/?api=1&query=DRAT+Kolkata"}
  ]'::jsonb,
  'Appellate body for DRT orders. Appeals lie to DRAT within 30/45 days of DRT order.',
  'drat debt recovery appellate tribunal sarfaesi drt appeal bank npa',
  81
),

-- ── Telecom ───────────────────────────────────────────────────────────────────
(
  'tdsat', 'TDSAT', 'Telecom Disputes Settlement and Appellate Tribunal', 'telecom',
  'https://tdsat.gov.in',
  'https://tdsat.gov.in/case_status.php',
  'https://tdsat.gov.in/cause_list.php',
  'https://tdsat.gov.in/orders.php',
  '[
    {"name":"TDSAT — New Delhi","city":"New Delhi","address":"Hall of Justice, Ashok Place, Near Gole Market, New Delhi — 110 001","map_url":"https://maps.google.com/maps/search/?api=1&query=TDSAT+New+Delhi+Ashok+Place"}
  ]'::jsonb,
  'Settles disputes between telecom service providers, between providers and consumers, and hears appeals against TRAI orders. Sits only in New Delhi.',
  'tdsat telecom disputes settlement appellate tribunal trai telecom broadband spectrum ott',
  90
),

-- ── Electricity ───────────────────────────────────────────────────────────────
(
  'aptel', 'APTEL', 'Appellate Tribunal for Electricity', 'electricity',
  'https://aptel.gov.in',
  'https://aptel.gov.in/case-status',
  'https://aptel.gov.in/cause-list',
  'https://aptel.gov.in/orders',
  '[
    {"name":"APTEL — New Delhi","city":"New Delhi","address":"Core 4, SCOPE Complex, 7, Lodhi Road, New Delhi — 110 003","map_url":"https://maps.google.com/maps/search/?api=1&query=APTEL+New+Delhi+SCOPE+Complex+Lodhi+Road"}
  ]'::jsonb,
  'Hears appeals against orders of State Electricity Regulatory Commissions (SERCs) and CERC. Sits only in New Delhi.',
  'aptel appellate tribunal electricity serc cerc power electricity tariff renewable energy',
  100
),

-- ── Consumer ─────────────────────────────────────────────────────────────────
(
  'consumer', 'Consumer Commissions', 'Consumer Disputes Redressal Commissions (NCDRC / State / District)', 'consumer',
  'https://edaakhil.nic.in',
  'https://confonet.nic.in/case-status',
  'https://confonet.nic.in/cause-list',
  'https://confonet.nic.in/orders',
  '[
    {"name":"NCDRC — National Commission, New Delhi","city":"New Delhi","address":"5th Floor, Janpath Bhawan, Janpath, New Delhi — 110 001","map_url":"https://maps.google.com/maps/search/?api=1&query=NCDRC+National+Consumer+Commission+Janpath+New+Delhi"}
  ]'::jsonb,
  'Three-tier consumer redressal system: District Commission (up to ₹50 lakh), State Commission (₹50 lakh–₹2 crore), National Commission/NCDRC (above ₹2 crore or appeals). File online via e-Daakhil. Track case status via CONFONET / e-Jagriti. State and District commissions are located at each state capital / district headquarters.',
  'consumer commissions ncdrc scdrc dcdrc national state district consumer forum jagriti edaakhil e-daakhil confonet consumer protection act',
  110
),

-- ── Competition ───────────────────────────────────────────────────────────────
(
  'cci', 'CCI', 'Competition Commission of India', 'competition',
  'https://www.cci.gov.in',
  'https://www.cci.gov.in/case-status',
  'https://www.cci.gov.in/cause-list',
  'https://www.cci.gov.in/orders-judgements',
  '[
    {"name":"CCI — New Delhi","city":"New Delhi","address":"8–10, Bhikaji Cama Bhawan, Bhikaji Cama Place, New Delhi — 110 066","map_url":"https://maps.google.com/maps/search/?api=1&query=Competition+Commission+of+India+New+Delhi+Bhikaji+Cama"}
  ]'::jsonb,
  'Enforces the Competition Act 2002: anti-competitive agreements, abuse of dominant position, and merger control. CCI orders are appealable to NCLAT. Sits only in New Delhi.',
  'cci competition commission india antitrust merger dominance cartel competition act',
  120
),

-- ── Railway Claims ────────────────────────────────────────────────────────────
(
  'rct', 'RCT', 'Railway Claims Tribunal', 'railway',
  'https://rct.indianrailways.gov.in',
  'https://rct.indianrailways.gov.in/case-status',
  'https://rct.indianrailways.gov.in/cause-list',
  'https://rct.indianrailways.gov.in/orders',
  '[
    {"name":"RCT — Bhopal (Principal Bench)","city":"Bhopal","address":"Railway Claims Tribunal, Bhopal — 462 001","map_url":"https://maps.google.com/maps/search/?api=1&query=Railway+Claims+Tribunal+Bhopal"},
    {"name":"RCT — Gorakhpur","city":"Gorakhpur","address":"RCT Gorakhpur, Gorakhpur — 273 012","map_url":"https://maps.google.com/maps/search/?api=1&query=Railway+Claims+Tribunal+Gorakhpur"},
    {"name":"RCT — Kolkata","city":"Kolkata","address":"RCT Kolkata, Fairlie Place, Kolkata — 700 001","map_url":"https://maps.google.com/maps/search/?api=1&query=Railway+Claims+Tribunal+Kolkata"},
    {"name":"RCT — Mumbai","city":"Mumbai","address":"RCT Mumbai, Mumbai CST, Mumbai — 400 001","map_url":"https://maps.google.com/maps/search/?api=1&query=Railway+Claims+Tribunal+Mumbai"},
    {"name":"RCT — Secunderabad","city":"Hyderabad","address":"RCT Secunderabad, Rail Nilayam, Secunderabad — 500 071","map_url":"https://maps.google.com/maps/search/?api=1&query=Railway+Claims+Tribunal+Secunderabad"},
    {"name":"RCT — Chandigarh","city":"Chandigarh","address":"RCT Chandigarh, Sector 17, Chandigarh","map_url":"https://maps.google.com/maps/search/?api=1&query=Railway+Claims+Tribunal+Chandigarh"},
    {"name":"RCT — Ernakulam (Kochi)","city":"Kochi","address":"RCT Ernakulam, Railway Station Road, Ernakulam, Kochi","map_url":"https://maps.google.com/maps/search/?api=1&query=Railway+Claims+Tribunal+Ernakulam"},
    {"name":"RCT — Patna","city":"Patna","address":"RCT Patna, Fraser Road, Patna — 800 001","map_url":"https://maps.google.com/maps/search/?api=1&query=Railway+Claims+Tribunal+Patna"}
  ]'::jsonb,
  'Handles railway accident compensation claims and undelivered goods/luggage disputes. Jurisdiction based on where accident occurred or contract was made.',
  'rct railway claims tribunal railway accident compensation luggage goods',
  130
),

-- ── GST ───────────────────────────────────────────────────────────────────────
(
  'gstat', 'GSTAT', 'GST Appellate Tribunal', 'gst',
  'https://gstat.gov.in',
  'https://gstat.gov.in/case-status',
  null,
  'https://gstat.gov.in/orders',
  '[
    {"name":"GSTAT — National Bench, New Delhi","city":"New Delhi","address":"GST Appellate Tribunal, New Delhi","map_url":"https://maps.google.com/maps/search/?api=1&query=GSTAT+GST+Appellate+Tribunal+New+Delhi"}
  ]'::jsonb,
  'Hears appeals against orders of Appellate Authorities under the CGST Act 2017. GSTAT is being constituted in phases — check gstat.gov.in for current status. State benches are being established across all states. Also refer to gst.gov.in for GST common portal services.',
  'gstat gst appellate tribunal goods services tax cgst sgst igst input tax credit appeal',
  140
);
