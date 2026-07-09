-- Reusable clause library for the advocate Drafting Studio.
-- system clauses: is_system=true, provider_id=null — seeded here.
-- member clauses: is_system=false, provider_id set — saved from the Studio.

CREATE TABLE IF NOT EXISTS clause_library (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid        REFERENCES providers(id) ON DELETE CASCADE,  -- null = system clause
  persona     text        NOT NULL DEFAULT 'advocate',
  category    text        NOT NULL,   -- e.g. 'dispute_resolution', 'indemnity'
  title       text        NOT NULL,
  body        text        NOT NULL,
  tags        jsonb       NOT NULL DEFAULT '[]',
  is_system   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup: all system clauses for a persona
CREATE INDEX IF NOT EXISTS idx_clause_library_persona  ON clause_library(persona, is_system);
-- Fast lookup: a member's own saved clauses
CREATE INDEX IF NOT EXISTS idx_clause_library_provider ON clause_library(provider_id) WHERE provider_id IS NOT NULL;

-- ── Seed: 10 common Indian legal clauses ─────────────────────────────────────
INSERT INTO clause_library (persona, category, title, body, tags, is_system, provider_id) VALUES

('advocate',
 'dispute_resolution',
 'Arbitration Clause (Indian Arbitration Act)',
 'All disputes, differences or claims arising out of or in connection with this Agreement, including any question regarding its existence, validity or termination, shall be referred to and finally resolved by arbitration under the Arbitration and Conciliation Act, 1996, and the rules framed thereunder as amended from time to time. The arbitration shall be conducted by a sole arbitrator mutually appointed by the parties. The seat and venue of arbitration shall be [CITY], India. The language of arbitration shall be English. The arbitration award shall be final and binding on both parties.',
 '["arbitration","dispute","ADR"]',
 true, null),

('advocate',
 'jurisdiction',
 'Exclusive Jurisdiction Clause',
 'The courts at [CITY], [STATE], India, shall have exclusive jurisdiction to try and entertain any suit, action, or proceedings arising out of or in connection with this Agreement, and the parties hereby irrevocably submit to such jurisdiction. This Agreement shall be governed by and construed in accordance with the laws of India.',
 '["jurisdiction","governing law","courts"]',
 true, null),

('advocate',
 'indemnity',
 'Indemnity Clause',
 '[PARTY A] (the "Indemnifying Party") shall indemnify, defend, and hold harmless [PARTY B] and its officers, directors, employees, agents, and successors (collectively, the "Indemnified Parties") from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with: (a) any breach by the Indemnifying Party of its representations, warranties, or obligations under this Agreement; or (b) the negligence or wilful misconduct of the Indemnifying Party. The obligations under this clause shall survive the termination or expiry of this Agreement.',
 '["indemnity","liability","hold harmless"]',
 true, null),

('advocate',
 'confidentiality',
 'Non-Disclosure / Confidentiality Clause',
 'Each party agrees to keep confidential all Confidential Information of the other party received in connection with this Agreement and shall not disclose such Confidential Information to any third party without the prior written consent of the disclosing party, except: (a) to its employees or professional advisors on a need-to-know basis, subject to equivalent confidentiality obligations; (b) as required by applicable law, regulation, or court order, provided the disclosing party is given prior written notice to the extent permitted. "Confidential Information" means all non-public information disclosed by one party to the other, whether orally or in writing, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and circumstances of disclosure. This clause shall survive the termination of this Agreement for a period of [2/3/5] years.',
 '["NDA","confidentiality","non-disclosure","secret"]',
 true, null),

('advocate',
 'force_majeure',
 'Force Majeure Clause',
 'Neither party shall be liable for any failure or delay in the performance of its obligations under this Agreement to the extent such failure or delay is caused by circumstances beyond the reasonable control of the affected party, including but not limited to acts of God, natural disasters, epidemic or pandemic, acts of government or regulatory authority, war, civil unrest, fire, flood, or power failure (each, a "Force Majeure Event"). The party affected by a Force Majeure Event shall: (a) promptly notify the other party in writing of the nature and expected duration of such event; and (b) use reasonable efforts to mitigate the effects of and resume performance. If the Force Majeure Event continues for more than [30/60/90] days, either party may terminate this Agreement by written notice without liability.',
 '["force majeure","act of god","pandemic","excused performance"]',
 true, null),

('advocate',
 'non_compete',
 'Non-Compete and Non-Solicitation Clause',
 'During the term of this Agreement and for a period of [DURATION, e.g. 12 months] following its termination or expiry, [PARTY] shall not, directly or indirectly: (a) engage in, carry on, or be employed by any business that competes with [OTHER PARTY]''s business in [TERRITORY, e.g. India]; (b) solicit, induce, or attempt to induce any employee, contractor, or consultant of [OTHER PARTY] to terminate their engagement; or (c) solicit or canvass the custom of any client or customer of [OTHER PARTY] with whom [PARTY] had contact during the term of this Agreement. The parties acknowledge that the restrictions in this clause are reasonable and necessary to protect the legitimate business interests of [OTHER PARTY]. If any restriction is found to be unenforceable, it shall be modified to the minimum extent necessary to make it enforceable.',
 '["non-compete","non-solicitation","restrictive covenant"]',
 true, null),

('advocate',
 'termination',
 'Termination for Cause and Convenience',
 'Either party may terminate this Agreement: (a) immediately upon written notice if the other party commits a material breach of this Agreement and, where such breach is capable of remedy, fails to remedy it within [15/30] days of receiving written notice specifying the breach; (b) immediately if the other party becomes insolvent, makes an assignment for the benefit of creditors, or has a receiver or liquidator appointed; or (c) for convenience, upon [30/60/90] days'' prior written notice to the other party. Upon termination: (i) all outstanding fees and sums due shall become immediately payable; (ii) each party shall promptly return or destroy the other party''s Confidential Information; and (iii) clauses that by their nature should survive shall continue in effect.',
 '["termination","breach","convenience","exit"]',
 true, null),

('advocate',
 'severability',
 'Severability and Entire Agreement Clause',
 'If any provision of this Agreement is held to be invalid, illegal, or unenforceable by any court of competent jurisdiction, such provision shall be severed from this Agreement without affecting the validity or enforceability of the remaining provisions, which shall continue in full force and effect. The parties shall negotiate in good faith to replace the severed provision with a lawful provision that, as closely as possible, achieves the original intent of the parties. This Agreement constitutes the entire agreement between the parties with respect to its subject matter and supersedes all prior negotiations, representations, warranties, understandings, and agreements, whether written or oral, relating thereto. No amendment to this Agreement shall be effective unless made in writing and signed by both parties.',
 '["severability","entire agreement","integration"]',
 true, null),

('advocate',
 'notice',
 'Notice Clause',
 'Any notice, request, consent, or other communication required or permitted under this Agreement shall be in writing and shall be deemed duly given when: (a) delivered personally; (b) sent by registered post or courier with acknowledgment due, to the address specified below; or (c) sent by email with read-receipt confirmation or followed by a written hard copy within 48 hours. Notices to [PARTY A] shall be addressed to: [ADDRESS / EMAIL]. Notices to [PARTY B] shall be addressed to: [ADDRESS / EMAIL]. Either party may change its notice details by written notice to the other party given in accordance with this clause.',
 '["notice","communication","registered post","email"]',
 true, null),

('advocate',
 'limitation_liability',
 'Limitation of Liability Clause',
 'Notwithstanding anything to the contrary in this Agreement: (a) neither party shall be liable to the other for any indirect, incidental, special, consequential, punitive, or exemplary damages, loss of profits, loss of data, or loss of goodwill, even if advised of the possibility of such damages; and (b) each party''s total aggregate liability to the other arising out of or in connection with this Agreement, whether in contract, tort (including negligence), breach of statutory duty, or otherwise, shall not exceed [THE TOTAL FEES PAID / ₹AMOUNT] in the [12] months immediately preceding the event giving rise to the claim. Nothing in this clause shall limit liability for fraud, wilful misconduct, death, or personal injury caused by negligence.',
 '["limitation of liability","cap","consequential damages"]',
 true, null);
