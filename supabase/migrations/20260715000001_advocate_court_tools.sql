-- ============================================================
-- Advocate Court Tools — India legal-lookup infrastructure
-- ============================================================
-- Tables:
--   court_directory  — seeded court complex data (Find Court, fully in-app)
--   watched_cases    — advocate's saved case tracking
-- Config:
--   system_config.court_tools — portal URLs, gating, kill-switch
-- ============================================================

-- ── court_directory ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS court_directory (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  court_type         text        NOT NULL CHECK (court_type IN ('supreme', 'high', 'district', 'tribunal')),
  state              text        NOT NULL,       -- e.g. "Delhi", "Maharashtra"
  district           text,                       -- NULL for supreme/high courts
  complex_name       text        NOT NULL,
  address            text        NOT NULL,
  city               text        NOT NULL,
  pincode            text,
  latitude           numeric(10,7),
  longitude          numeric(10,7),
  ecourts_state_code text,                       -- numeric code used by eCourts API (nullable — filled when API integration added)
  ecourts_dist_code  text,                       -- numeric district code (nullable)
  map_url            text,                       -- Google Maps link
  search_text        text,                       -- lowercase concat for full-text search
  active             boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Index for fast text search
CREATE INDEX IF NOT EXISTS idx_court_directory_search ON court_directory USING gin(to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_court_directory_state   ON court_directory (state);
CREATE INDEX IF NOT EXISTS idx_court_directory_type    ON court_directory (court_type);

-- ── watched_cases ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS watched_cases (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  cnr               text,                       -- 16-char CNR (nullable — not all look-up types have a CNR)
  case_title        text,
  case_type         text,                       -- e.g. "Civil", "Criminal", "Writ"
  court_name        text,
  party_name        text,                       -- petitioner / respondent names
  next_hearing_date date,
  next_hearing_note text,
  student_id        uuid REFERENCES students(id) ON DELETE SET NULL,  -- link to a client-matter
  status            text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'archived')),
  source_url        text,                       -- the eCourts portal URL used for this case
  last_checked_at   timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watched_cases_provider ON watched_cases (provider_id);
CREATE INDEX IF NOT EXISTS idx_watched_cases_student  ON watched_cases (student_id) WHERE student_id IS NOT NULL;

-- ── system_config: court_tools ───────────────────────────────────────────────

INSERT INTO system_config (key, value)
VALUES (
  'court_tools',
  jsonb_build_object(
    'enabled', true,
    'gating', jsonb_build_object(
      'personas', jsonb_build_array('advocate'),
      'regions',  jsonb_build_array('india')
    ),
    'portals', jsonb_build_object(
      'cnr_status',  'https://services.ecourts.gov.in/ecourtindia_v6/?p=cnr_status/index',
      'case_status', 'https://services.ecourts.gov.in/ecourtindia_v6/',
      'cause_list',  'https://services.ecourts.gov.in/ecourtindia_v6/?p=cause_list/index',
      'orders',      'https://services.ecourts.gov.in/ecourtindia_v6/?p=courtorder/index',
      'caveat',      'https://services.ecourts.gov.in/ecourtindia_v6/?p=caveat_search/index',
      'process',     'https://services.ecourts.gov.in/ecourtindia_v6/?p=process/index'
    )
  )
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ── Seed: Supreme Court ───────────────────────────────────────────────────────

INSERT INTO court_directory (court_type, state, district, complex_name, address, city, pincode, latitude, longitude, map_url, search_text) VALUES
('supreme', 'National', NULL, 'Supreme Court of India', 'Tilak Marg, New Delhi', 'New Delhi', '110001', 28.6229469, 77.2373889,
 'https://maps.google.com/maps/search/?api=1&query=Supreme+Court+of+India+New+Delhi',
 'supreme court india national delhi tilak marg');

-- ── Seed: High Courts ─────────────────────────────────────────────────────────

INSERT INTO court_directory (court_type, state, district, complex_name, address, city, pincode, latitude, longitude, map_url, search_text) VALUES
('high', 'Uttar Pradesh', NULL, 'Allahabad High Court', 'Sarojini Naidu Marg, Allahabad', 'Prayagraj', '211001', 25.4358, 81.8463,
 'https://maps.google.com/maps/search/?api=1&query=Allahabad+High+Court+Prayagraj',
 'allahabad high court uttar pradesh prayagraj up'),

('high', 'Maharashtra', NULL, 'Bombay High Court', 'Dr. Dadabhai Naoroji Road, Fort', 'Mumbai', '400032', 18.9250, 72.8313,
 'https://maps.google.com/maps/search/?api=1&query=Bombay+High+Court+Fort+Mumbai',
 'bombay high court maharashtra mumbai fort'),

('high', 'West Bengal', NULL, 'Calcutta High Court', '2, Esplanade Row West', 'Kolkata', '700001', 22.5691, 88.3479,
 'https://maps.google.com/maps/search/?api=1&query=Calcutta+High+Court+Kolkata',
 'calcutta high court west bengal kolkata esplanade'),

('high', 'Tamil Nadu', NULL, 'Madras High Court', 'High Court Road, Parry Corner', 'Chennai', '600104', 13.0604, 80.2861,
 'https://maps.google.com/maps/search/?api=1&query=Madras+High+Court+Chennai',
 'madras high court tamil nadu chennai parry'),

('high', 'Delhi', NULL, 'Delhi High Court', 'Sher Shah Road', 'New Delhi', '110003', 28.6274, 77.2421,
 'https://maps.google.com/maps/search/?api=1&query=Delhi+High+Court+New+Delhi',
 'delhi high court new delhi sher shah road'),

('high', 'Gujarat', NULL, 'Gujarat High Court', 'High Court of Gujarat, Sola Road', 'Ahmedabad', '380060', 23.1145, 72.5250,
 'https://maps.google.com/maps/search/?api=1&query=Gujarat+High+Court+Ahmedabad',
 'gujarat high court ahmedabad sola'),

('high', 'Rajasthan', NULL, 'Rajasthan High Court (Principal Bench)', 'Residency Road', 'Jodhpur', '342001', 26.2999, 73.0082,
 'https://maps.google.com/maps/search/?api=1&query=Rajasthan+High+Court+Jodhpur',
 'rajasthan high court jodhpur jaipur'),

('high', 'Bihar', NULL, 'Patna High Court', 'High Court Road', 'Patna', '800001', 25.6122, 85.1427,
 'https://maps.google.com/maps/search/?api=1&query=Patna+High+Court+Patna',
 'patna high court bihar'),

('high', 'Madhya Pradesh', NULL, 'Madhya Pradesh High Court', 'HC Chowk, Napier Town', 'Jabalpur', '482001', 23.1657, 79.9367,
 'https://maps.google.com/maps/search/?api=1&query=Madhya+Pradesh+High+Court+Jabalpur',
 'madhya pradesh mp high court jabalpur bhopal indore'),

('high', 'Karnataka', NULL, 'Karnataka High Court', 'High Court of Karnataka, Museum Road', 'Bengaluru', '560001', 12.9667, 77.5947,
 'https://maps.google.com/maps/search/?api=1&query=Karnataka+High+Court+Bengaluru',
 'karnataka high court bengaluru bangalore museum road'),

('high', 'Punjab & Haryana', NULL, 'Punjab and Haryana High Court', 'Sector 1, Chandigarh', 'Chandigarh', '160001', 30.7389, 76.7898,
 'https://maps.google.com/maps/search/?api=1&query=Punjab+Haryana+High+Court+Chandigarh',
 'punjab haryana high court chandigarh'),

('high', 'Andhra Pradesh', NULL, 'Andhra Pradesh High Court', 'Justice City, Amaravati', 'Amaravati', '522240', 16.5185, 80.5153,
 'https://maps.google.com/maps/search/?api=1&query=Andhra+Pradesh+High+Court+Amaravati',
 'andhra pradesh high court amaravati vijayawada'),

('high', 'Telangana', NULL, 'Telangana High Court', 'Nayapul Road, Nampally', 'Hyderabad', '500001', 17.3850, 78.4867,
 'https://maps.google.com/maps/search/?api=1&query=Telangana+High+Court+Hyderabad',
 'telangana high court hyderabad nampally'),

('high', 'Kerala', NULL, 'Kerala High Court', 'High Court Road, Ernakulam', 'Kochi', '682031', 9.9765, 76.2897,
 'https://maps.google.com/maps/search/?api=1&query=Kerala+High+Court+Ernakulam+Kochi',
 'kerala high court kochi ernakulam'),

('high', 'Assam', NULL, 'Gauhati High Court', 'Guwahati', 'Guwahati', '781001', 26.1829, 91.7517,
 'https://maps.google.com/maps/search/?api=1&query=Gauhati+High+Court+Guwahati',
 'gauhati high court assam guwahati nagaland meghalaya mizoram'),

('high', 'Odisha', NULL, 'Orissa High Court', 'Dolamundai, Cuttack', 'Cuttack', '753002', 20.4625, 85.8828,
 'https://maps.google.com/maps/search/?api=1&query=Orissa+High+Court+Cuttack',
 'orissa odisha high court cuttack'),

('high', 'Jammu & Kashmir', NULL, 'High Court of J&K and Ladakh (Principal Bench)', 'Bahu Plaza, Jammu', 'Jammu', '180001', 32.7266, 74.8570,
 'https://maps.google.com/maps/search/?api=1&query=High+Court+JK+Jammu',
 'jammu kashmir ladakh high court srinagar'),

('high', 'Himachal Pradesh', NULL, 'Himachal Pradesh High Court', 'Ravenswood, The Ridge', 'Shimla', '171001', 31.0986, 77.1734,
 'https://maps.google.com/maps/search/?api=1&query=Himachal+Pradesh+High+Court+Shimla',
 'himachal pradesh high court shimla'),

('high', 'Uttarakhand', NULL, 'Uttarakhand High Court', 'Mall Road', 'Nainital', '263001', 29.3919, 79.4542,
 'https://maps.google.com/maps/search/?api=1&query=Uttarakhand+High+Court+Nainital',
 'uttarakhand high court nainital dehradun'),

('high', 'Jharkhand', NULL, 'Jharkhand High Court', 'H.E.C. Colony, Dhurwa', 'Ranchi', '834004', 23.3441, 85.3096,
 'https://maps.google.com/maps/search/?api=1&query=Jharkhand+High+Court+Ranchi',
 'jharkhand high court ranchi'),

('high', 'Chhattisgarh', NULL, 'Chhattisgarh High Court', 'Seepat Road', 'Bilaspur', '495001', 22.1000, 82.1479,
 'https://maps.google.com/maps/search/?api=1&query=Chhattisgarh+High+Court+Bilaspur',
 'chhattisgarh high court bilaspur raipur'),

('high', 'Meghalaya', NULL, 'Meghalaya High Court', 'Rynjah, Shillong', 'Shillong', '793001', 25.5774, 91.8825,
 'https://maps.google.com/maps/search/?api=1&query=Meghalaya+High+Court+Shillong',
 'meghalaya high court shillong'),

('high', 'Manipur', NULL, 'Manipur High Court', 'D.M. College Road, Imphal', 'Imphal', '795001', 24.7932, 93.9401,
 'https://maps.google.com/maps/search/?api=1&query=Manipur+High+Court+Imphal',
 'manipur high court imphal'),

('high', 'Tripura', NULL, 'Tripura High Court', 'Agartala', 'Agartala', '799001', 23.8315, 91.2868,
 'https://maps.google.com/maps/search/?api=1&query=Tripura+High+Court+Agartala',
 'tripura high court agartala'),

('high', 'Sikkim', NULL, 'Sikkim High Court', 'Stadium Road, Gangtok', 'Gangtok', '737101', 27.3389, 88.6065,
 'https://maps.google.com/maps/search/?api=1&query=Sikkim+High+Court+Gangtok',
 'sikkim high court gangtok');

-- ── Seed: District Courts (major cities) ──────────────────────────────────────

INSERT INTO court_directory (court_type, state, district, complex_name, address, city, pincode, latitude, longitude, map_url, search_text) VALUES
-- Delhi
('district', 'Delhi', 'Central Delhi', 'Tis Hazari Courts Complex', 'Tis Hazari', 'New Delhi', '110054', 28.6674, 77.2166,
 'https://maps.google.com/maps/search/?api=1&query=Tis+Hazari+Courts+Delhi',
 'tis hazari district court delhi central'),

('district', 'Delhi', 'South Delhi', 'Saket District Courts', 'Press Enclave Road, Saket', 'New Delhi', '110017', 28.5245, 77.2066,
 'https://maps.google.com/maps/search/?api=1&query=Saket+District+Court+Delhi',
 'saket district court delhi south'),

('district', 'Delhi', 'East Delhi', 'Karkardooma Courts Complex', 'Vikas Marg, Karkardooma', 'New Delhi', '110091', 28.6562, 77.2986,
 'https://maps.google.com/maps/search/?api=1&query=Karkardooma+Courts+Delhi',
 'karkardooma district court delhi east'),

('district', 'Delhi', 'North-West Delhi', 'Rohini Courts Complex', 'Sector 14, Rohini', 'New Delhi', '110085', 28.7373, 77.1000,
 'https://maps.google.com/maps/search/?api=1&query=Rohini+Courts+Delhi',
 'rohini district court delhi north west'),

('district', 'Delhi', 'South-West Delhi', 'Dwarka Courts Complex', 'Sector 10, Dwarka', 'New Delhi', '110075', 28.5833, 77.0330,
 'https://maps.google.com/maps/search/?api=1&query=Dwarka+Courts+Delhi',
 'dwarka district court delhi south west'),

-- Mumbai
('district', 'Maharashtra', 'Mumbai City', 'City Civil and Sessions Court (Dindoshi)', 'Police Colony Road, Dindoshi', 'Mumbai', '400068', 19.1624, 72.8626,
 'https://maps.google.com/maps/search/?api=1&query=City+Civil+Court+Dindoshi+Mumbai',
 'city civil sessions court mumbai dindoshi maharashtra'),

('district', 'Maharashtra', 'Mumbai Suburban', 'Bandra Kurla Complex Court', 'G Block, BKC', 'Mumbai', '400051', 19.0660, 72.8643,
 'https://maps.google.com/maps/search/?api=1&query=BKC+Court+Mumbai',
 'bandra kurla complex court mumbai suburban'),

-- Bengaluru
('district', 'Karnataka', 'Bengaluru Urban', 'City Civil and Sessions Court', 'Albert Victor Road, Dharmaraj Pura', 'Bengaluru', '560002', 12.9774, 77.5767,
 'https://maps.google.com/maps/search/?api=1&query=City+Civil+Court+Bengaluru',
 'city civil sessions court bengaluru bangalore urban karnataka'),

-- Chennai
('district', 'Tamil Nadu', 'Chennai', 'City Civil Court', 'Allikulam Complex, High Court Road', 'Chennai', '600104', 13.0604, 80.2844,
 'https://maps.google.com/maps/search/?api=1&query=City+Civil+Court+Chennai',
 'city civil court chennai allikulam tamil nadu'),

-- Hyderabad
('district', 'Telangana', 'Hyderabad', 'District and Sessions Court (Nampally)', 'Nampally Court Complex', 'Hyderabad', '500001', 17.3865, 78.4735,
 'https://maps.google.com/maps/search/?api=1&query=District+Court+Nampally+Hyderabad',
 'district sessions court hyderabad nampally telangana'),

-- Kolkata
('district', 'West Bengal', 'Kolkata', 'City Civil Court (Alipore)', 'Judges Court Road, Alipore', 'Kolkata', '700027', 22.5353, 88.3243,
 'https://maps.google.com/maps/search/?api=1&query=City+Civil+Court+Alipore+Kolkata',
 'city civil court kolkata alipore west bengal'),

-- Pune
('district', 'Maharashtra', 'Pune', 'Pune District and Sessions Court', 'Shankarsheth Road', 'Pune', '411037', 18.5196, 73.8570,
 'https://maps.google.com/maps/search/?api=1&query=District+Court+Pune',
 'district sessions court pune maharashtra shankarsheth'),

-- Ahmedabad
('district', 'Gujarat', 'Ahmedabad', 'Ahmedabad City Civil Court', 'Sardar Patel Road, Navrangpura', 'Ahmedabad', '380009', 23.0337, 72.5641,
 'https://maps.google.com/maps/search/?api=1&query=City+Civil+Court+Ahmedabad',
 'city civil court ahmedabad gujarat navrangpura'),

-- Jaipur
('district', 'Rajasthan', 'Jaipur', 'Jaipur District Court', 'High Court Road, Bani Park', 'Jaipur', '302016', 26.9249, 75.7826,
 'https://maps.google.com/maps/search/?api=1&query=District+Court+Jaipur',
 'district court jaipur rajasthan bani park'),

-- Lucknow
('district', 'Uttar Pradesh', 'Lucknow', 'Lucknow District Court', 'Vidhan Sabha Marg', 'Lucknow', '226001', 26.8506, 80.9462,
 'https://maps.google.com/maps/search/?api=1&query=District+Court+Lucknow',
 'district court lucknow uttar pradesh'),

-- Nagpur
('district', 'Maharashtra', 'Nagpur', 'Nagpur District Court', 'Civil Lines, Nagpur', 'Nagpur', '440001', 21.1525, 79.0735,
 'https://maps.google.com/maps/search/?api=1&query=District+Court+Nagpur',
 'district court nagpur maharashtra civil lines'),

-- Surat
('district', 'Gujarat', 'Surat', 'Surat City Civil Court', 'Athwalines', 'Surat', '395001', 21.2156, 72.8312,
 'https://maps.google.com/maps/search/?api=1&query=City+Civil+Court+Surat',
 'city civil court surat gujarat athwalines');
