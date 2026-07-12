/**
 * Vertical Config Engine — single source of truth for all personas.
 *
 * To add a new persona: add one entry here. It automatically appears
 * in the onboarding grid, template mapping, and palette mapping.
 * No other files need to change for built-in personas.
 */

export interface VerticalConfig {
  id: string
  label: string
  emoji: string
  onboardingQuestions: OnboardingQuestion[]
  defaultTemplate: 'focus' | 'portfolio' | 'clinic' | 'storefront'
  defaultPalette: string
  defaultFont: 'inter' | 'georgia' | 'trebuchet'
  sections: string[]
  bookingLabel: string
  ctaLabel: string
  phase: 1 | 2 | 3 | 4
  /** Optional persona-specific guidance injected into the My Chat system prompt */
  chatGuidance?: string
  /** Optional persona-specific guidance injected into the Research co-pilot system prompt */
  researchGuidance?: string
  /** Optional guidance for the Drafting Studio system prompt (advocate persona) */
  draftingGuidance?: string
  /** Optional guidance for the Working Studio system prompt (physio persona) */
  workingGuidance?: string
}

export interface OnboardingQuestion {
  id: string
  question: string
  placeholder: string
  hint?: string
}

// ── Phase 1 — Validate ────────────────────────────────────────

const tutor: VerticalConfig = {
  id: 'tutor',
  label: 'Tutor',
  emoji: '📚',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Book a session',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'subjects',    question: 'What subjects or grades do you teach?',        placeholder: 'e.g. Maths and Science, Grades 6–10' },
    { id: 'experience',  question: 'How long have you been teaching?',             placeholder: 'e.g. 8 years' },
    { id: 'approach',    question: 'How would you describe your teaching style?',  placeholder: 'e.g. Patient, concept-first, lots of practice problems', hint: 'This goes on your profile — say it in your own words.' },
    { id: 'location',    question: 'Where do you teach? (area or city)',           placeholder: 'e.g. Celina TX, or online' },
    { id: 'pricing',     question: "What's your session rate? (optional)",         placeholder: 'e.g. $40/hour or ₹500/hour' },
  ],
  chatGuidance: `PERSONA: TUTOR
Speak in tutor language: say "students", "sessions", "lessons", "subjects", "grades" — never "clients", "customers", or "appointments".

You have access to the student roster in businessContext.students. You can act on it directly:
- new_student: Add a new student by name, optionally with grade (label_1) and subject (label_2)
- log_session: Log a completed lesson for a student (by studentId). Include topic covered, homework assigned, and any private notes.
- patch_student: Update a student's details — next_session, grade, subject, or private notes.

When matching a student by name: scan businessContext.students and pick the closest match. If ambiguous, list matches and ask. Always confirm the student name in your reply before acting (e.g. "Logged a session for Aryan · Grade 8 · Maths ✓").

Proactively offer to log a session when the tutor mentions finishing a lesson. When a demo student books, offer to set their next_session.

Remind the tutor they can view the full lesson history by opening the Students tab.`,
  researchGuidance: `You are a full teaching co-pilot AND a business advisor.

TEACHING (do these directly — no web search needed unless the question specifically asks for current curriculum/exam info):
- Solve maths, science, language, and other subject problems step by step, showing all working
- Generate practice questions, worksheets, or quiz sets (ask for grade/topic if not specified)
- Explain concepts clearly, adapting language to the grade level
- Draft lesson plans, topic breakdowns, or revision schedules
- Suggest teaching strategies, mnemonics, or analogies for tricky topics
- Help write feedback comments for student work

BUSINESS (search for these to ground your answer in real data):
- Local tutoring rates and pricing strategy for their area
- Marketing ideas: local parents, schools, social media, referrals
- In-demand subjects or grades in their location
- Competitor analysis and differentiation
- How to upsell or package services (group sessions, holiday crash courses, etc.)`,
}

const trainer: VerticalConfig = {
  id: 'trainer',
  label: 'Fitness trainer',
  emoji: '💪',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'fresh',
  defaultFont: 'inter',
  bookingLabel: 'Book a session',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What type of training do you offer?',         placeholder: 'e.g. Weight loss, strength, HIIT, yoga' },
    { id: 'experience',  question: 'How long have you been training clients?',     placeholder: 'e.g. 5 years' },
    { id: 'approach',    question: 'What makes your training different?',          placeholder: 'e.g. I focus on form first and real-life movement' },
    { id: 'location',    question: 'Where do you train? (gym, home visits, online?)', placeholder: 'e.g. Your home in Celina TX, or online' },
    { id: 'pricing',     question: "What's your session rate? (optional)",         placeholder: 'e.g. $60/session' },
  ],
}

const baker: VerticalConfig = {
  id: 'baker',
  label: 'Baker',
  emoji: '🧁',
  phase: 1,
  defaultTemplate: 'portfolio',
  defaultPalette: 'warm',
  defaultFont: 'georgia',
  bookingLabel: 'Place an order',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What do you bake? Tell us your specialities.',     placeholder: 'e.g. Custom cakes, cupcakes, cookies' },
    { id: 'experience',  question: 'How long have you been baking for customers?',     placeholder: 'e.g. 3 years' },
    { id: 'approach',    question: 'What do customers love most about your baking?',   placeholder: 'e.g. I use real butter, no shortcuts, and every order is custom' },
    { id: 'location',    question: 'Where are you based? Do you deliver?',             placeholder: 'e.g. Celina TX — pickup or delivery within 15 miles' },
    { id: 'pricing',     question: "What's your starting price? (optional)",           placeholder: 'e.g. Custom cakes from $80' },
  ],
}

const photographer: VerticalConfig = {
  id: 'photographer',
  label: 'Photographer',
  emoji: '📷',
  phase: 1,
  defaultTemplate: 'portfolio',
  defaultPalette: 'minimal',
  defaultFont: 'inter',
  bookingLabel: 'Book a shoot',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What kind of photography do you do?',          placeholder: 'e.g. Weddings, family portraits, events, headshots' },
    { id: 'experience',  question: 'How long have you been shooting professionally?', placeholder: 'e.g. 6 years' },
    { id: 'approach',    question: "How would your clients describe your style?",   placeholder: 'e.g. Candid, natural light, storytelling' },
    { id: 'location',    question: 'Where are you based? How far do you travel?',  placeholder: 'e.g. Celina TX — available across DFW' },
    { id: 'pricing',     question: "What's your starting package price? (optional)", placeholder: 'e.g. Portrait sessions from $250' },
  ],
}

const salon: VerticalConfig = {
  id: 'salon',
  label: 'Salon / stylist',
  emoji: '✂️',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'creative',
  defaultFont: 'inter',
  bookingLabel: 'Book an appointment',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What services do you offer?',                  placeholder: 'e.g. Haircuts, colour, blowouts, bridal styling' },
    { id: 'experience',  question: 'How long have you been in the industry?',      placeholder: 'e.g. 7 years' },
    { id: 'approach',    question: 'What do clients love about coming to you?',    placeholder: 'e.g. I listen before I cut — no surprises' },
    { id: 'location',    question: 'Where is your salon / where do you work?',     placeholder: 'e.g. Celina TX, or mobile' },
    { id: 'pricing',     question: "What's your starting price? (optional)",       placeholder: 'e.g. Haircuts from $45' },
  ],
}

const chef: VerticalConfig = {
  id: 'chef',
  label: 'Chef',
  emoji: '🍱',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'warm',
  defaultFont: 'georgia',
  bookingLabel: 'Place an order',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What cuisine or dishes do you specialise in?', placeholder: 'e.g. South Indian tiffins, biriyani, meal preps' },
    { id: 'experience',  question: 'How long have you been cooking for customers?', placeholder: 'e.g. 4 years' },
    { id: 'approach',    question: 'What makes your food stand out?',              placeholder: 'e.g. Fresh ingredients, home-style recipes, no preservatives' },
    { id: 'location',    question: 'Where are you based? Do you deliver?',         placeholder: 'e.g. Celina TX — delivery within 10 miles' },
    { id: 'pricing',     question: "What's your starting price? (optional)",       placeholder: 'e.g. Meal preps from $12/portion' },
  ],
}

const doctor: VerticalConfig = {
  id: 'doctor',
  label: 'Doctor',
  emoji: '🩺',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book an appointment',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What is your speciality or practice area?',    placeholder: 'e.g. General physician, dermatologist, paediatrician' },
    { id: 'experience',  question: 'How many years have you been in practice?',    placeholder: 'e.g. 12 years' },
    { id: 'approach',    question: 'How would your patients describe your care?',  placeholder: 'e.g. Thorough, patient, takes time to explain' },
    { id: 'location',    question: 'Where is your clinic?',                        placeholder: 'e.g. Celina TX' },
    { id: 'pricing',     question: 'What is your consultation fee? (optional)',    placeholder: 'e.g. ₹500 per visit' },
  ],
}

const musician: VerticalConfig = {
  id: 'musician',
  label: 'Music teacher',
  emoji: '🎵',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'creative',
  defaultFont: 'inter',
  bookingLabel: 'Book a lesson',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What instrument or style do you teach?',       placeholder: 'e.g. Carnatic vocals, guitar, piano' },
    { id: 'experience',  question: 'How long have you been teaching?',             placeholder: 'e.g. 10 years' },
    { id: 'approach',    question: 'How do you make learning enjoyable?',          placeholder: 'e.g. I blend theory with songs students already love' },
    { id: 'location',    question: 'Where do you teach? (in-person or online?)',   placeholder: 'e.g. Celina TX, or online' },
    { id: 'pricing',     question: "What's your lesson rate? (optional)",          placeholder: 'e.g. $35/hour' },
  ],
}

const advocate: VerticalConfig = {
  id: 'advocate',
  label: 'Advocate',
  emoji: '⚖️',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Book a consultation',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What areas of law do you practise?',           placeholder: 'e.g. Family law, property disputes, criminal defence' },
    { id: 'experience',  question: 'How many years have you been practising?',     placeholder: 'e.g. 8 years' },
    { id: 'approach',    question: 'How do you support your clients?',             placeholder: 'e.g. Clear communication, transparent fees, no jargon' },
    { id: 'location',    question: 'Where are you based?',                         placeholder: 'e.g. Chennai, or available online' },
    { id: 'pricing',     question: 'What is your consultation fee? (optional)',    placeholder: 'e.g. ₹1,000 per hour' },
  ],
  chatGuidance: `PERSONA: ADVOCATE / LAWYER
Speak in legal-practice language: say "clients", "matters", "cases", "consultations", "hearings" — never "customers", "students", or "appointments".

You have access to the client roster in businessContext.students. You can act on it directly:
- new_student: Add a new client by name, with matter type (label_1) and court/stage (label_2)
- log_session: Log a completed consultation or hearing for a client (by studentId). Use topic for the matter discussed, homework for action items / next steps, notes for private case notes.
- patch_student: Update a client's details — next hearing date (next_session), matter type, court/stage, or private notes.

When matching a client by name: scan businessContext.students and pick the closest match. If ambiguous, list matches and ask. Always confirm the client name before acting (e.g. "Logged consultation for Ramesh Iyer · Property dispute · District Court ✓").

Proactively offer to log a consultation when the advocate mentions finishing a meeting or hearing. Remind them they can view the full matter history by opening the Clients tab.`,
  researchGuidance: `You are a full legal co-pilot AND a business advisor for a practising advocate.

LEGAL (do these directly — no web search needed unless the question specifically asks for recent judgments, amended statutes, or jurisdiction-specific filing details):
- Explain statutes, sections, and legal procedure step by step, clearly
- Summarize legal principles and landmark case law relevant to the question
- Outline filing steps, documentation checklists, and court procedures
- Help phrase client-facing communications professionally
- Assist with legal research and argument strategy

BUSINESS (search for these to ground your answer in real data):
- Local consultation-fee benchmarks for the advocate's practice area and location
- Client-acquisition strategies: referral networks, local bar association visibility, online presence
- In-demand practice areas and emerging legal work in their region
- Positioning and differentiation from other advocates
- Practice management: billing models, retainer structures, client communication tools`,
  draftingGuidance: `You are an expert legal document drafting assistant for a practising Indian advocate.

DRAFTING MODES:
- DRAFT: Generate a complete, well-structured legal document from the facts provided. Use correct Indian legal formatting conventions (e.g. "WHEREAS", numbered paragraphs, "IN WITNESS WHEREOF"). Adapt language to the document type and jurisdiction stated.
- REVIEW: Analyse the pasted draft for: missing clauses, ambiguous terms, enforceability risks, and jurisdiction-specific pitfalls. Present findings clearly with suggested improvements.
- REFINE: Rewrite or improve the specified portion of the draft per the instruction given (e.g. tighten language, add a new clause, change jurisdiction references, make tone firmer or more conciliatory).
- CONTINUE: Continue writing from the provided text, maintaining the same style, tone, and formatting.
- REWRITE: Rewrite the selected text while preserving its meaning. Return ONLY the rewritten text, no preamble.
- FIRMER: Make the selected text more assertive and firm in tone. Return ONLY the revised text.
- SIMPLIFY: Simplify the selected text into plain English while preserving legal accuracy. Return ONLY the simplified text.
- EXPLAIN: Explain what the selected text means legally, in plain English. Include any risks or implications.
- BRAINSTORM: Generate arguments, points, or alternative approaches for the provided context.
- SUGGEST_CLAUSES: Based on the document type and current content, suggest a list of standard clauses that appear to be missing. Return as JSON array: [{"category":"...","title":"...","reason":"..."}]

OUTPUT FORMAT:
- For DRAFT, REFINE, CONTINUE, REWRITE, FIRMER, SIMPLIFY: output valid HTML suitable for a rich text editor. Use <h1>–<h3> for headings, <p> for paragraphs, <strong> for bold key terms, <em> for italic, <ul>/<li> for lists. Include blanks like [DATE] or [AMOUNT] where the advocate must fill in details. No markdown — only HTML.
- For REVIEW: use numbered findings with severity (CRITICAL / CAUTION / SUGGESTION) then a "Suggested language" block for each issue.
- For EXPLAIN and BRAINSTORM: use <p> and <ul>/<li> HTML. No code blocks.
- For SUGGEST_CLAUSES: return only a valid JSON array, no surrounding text.
- Always write in formal legal English suitable for Indian courts and legal practice.

CLAUSE CONVENTIONS:
- Use defined terms consistently throughout a document. E.g. if "the Company" is defined in clause 1, never write "the company" or "Company" without "the" in subsequent clauses.
- Standard Indian agreement structure: Title → Parties recital → WHEREAS recitals → NOW THEREFORE → numbered clauses → signature block.
- Statutory references must include the full Act name on first use, e.g. "the Arbitration and Conciliation Act, 1996 ('the Act')". Subsequent references may use the short form.

INDIAN CITATION STYLES (for citation verification mode):
- Supreme Court: (YEAR) VOLUME SCC PAGE — e.g. (2019) 4 SCC 234
- High Courts: YEAR AIR (COURT) PAGE — e.g. AIR 2020 Del 45 — or neutral citation YEAR:DHC:NNN
- Tribunal/NCLAT/NCDRC: (YEAR) VOLUME COMP CAS PAGE or neutral citation
- Always cite Acts with full name and year; IPC sections as "Section NN IPC" or "Section NN of the Indian Penal Code, 1860"
- NEVER fabricate citations. If uncertain, insert [VERIFY: citation description] and instruct the advocate to check on Indian Kanoon or SCC Online.`,
}

const physio: VerticalConfig = {
  id: 'physio',
  label: 'Physiotherapist',
  emoji: '🧑‍⚕️',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book an appointment',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What areas of physiotherapy do you specialise in?', placeholder: 'e.g. Musculoskeletal, sports injury, neuro-rehab, paediatrics' },
    { id: 'experience',  question: 'How many years have you been practising?',           placeholder: 'e.g. 8 years' },
    { id: 'approach',    question: 'How would your patients describe your care?',         placeholder: 'e.g. Evidence-based, hands-on, focused on getting you back to full function' },
    { id: 'location',    question: 'Where is your clinic?',                               placeholder: 'e.g. Celina TX, or tele-physio sessions online' },
    { id: 'pricing',     question: 'What is your session fee? (optional)',                placeholder: 'e.g. $120 per initial assessment, $80 per follow-up' },
  ],
  chatGuidance: `PERSONA: PHYSIOTHERAPIST
Speak in physiotherapy language: say "patients", "sessions", "appointments", "treatment", "assessments", "exercises" — never "students", "clients", "customers", or "lessons".

You have access to the patient roster in businessContext.students. You can act on it directly:
- new_student: Add a new patient by name, optionally with condition (label_1) and treatment phase (label_2)
- log_session: Log a completed physiotherapy session for a patient (by studentId). Use topic for the area treated / techniques used, homework for the home exercise program assigned, and notes for private clinical notes.
- patch_student: Update a patient's details — next_session, condition, treatment phase, or private notes.

When matching a patient by name: scan businessContext.students and pick the closest match. If ambiguous, list matches and ask. Always confirm the patient name in your reply before acting (e.g. "Logged session for Arjun Singh · Lumbar strain · Phase 2 ✓").

Proactively offer to log a session when the physio mentions finishing a treatment. Remind them they can track outcome measures and build home exercise programs from the Working Studio.`,
  researchGuidance: `You are a full clinical co-pilot AND a business advisor for a practising physiotherapist.

IMPORTANT — CLINICAL SCOPE: You assist with clinical documentation, education, and evidence synthesis. You do not make diagnoses or prescribe treatment for specific patients. Always frame clinical content as documentation support and encourage the physiotherapist to apply their own professional judgement.

CLINICAL (do these directly — no web search needed unless the question asks for recent research or guidelines):
- Explain anatomy, biomechanics, pathophysiology, and clinical reasoning clearly
- Summarise evidence-based interventions and outcome measures for a condition
- Generate exercise progressions, home exercise program cues, and patient education copy
- Draft SOAP notes, assessment summaries, referral letters, and discharge summaries from bullet-point input
- Outline treatment plan structures — goals, modalities, frequency, phases, criteria for progression
- Explain manual therapy techniques, taping methods, and electrotherapy protocols in educational terms
- Help draft patient consent forms and education handouts

BUSINESS (search for these to ground your answer in real data):
- Local physiotherapy consultation-fee benchmarks for the area
- Client-acquisition strategies: GP referrals, allied-health networks, online presence, social proof
- In-demand specialties and emerging areas (e.g. pelvic floor, telehealth, workplace ergonomics)
- Positioning and differentiation from other clinics or physios
- Practice management: scheduling, recall systems, package pricing`,
  workingGuidance: `You are an expert physiotherapy clinical documentation assistant.

IMPORTANT — SCOPE AND SAFETY:
You are a documentation aid that helps physiotherapists record and communicate their clinical decisions. You do not diagnose patients, prescribe specific treatments, or replace the physiotherapist's professional judgement. Always frame output as a documentation template or draft for the clinician to review, edit, and approve.

Red-flag conditions (fracture suspicion, cauda equina signs, malignancy, stroke, septic arthritis, etc.) must be flagged in the generated document with [RED FLAG — ASSESS URGENTLY] and the clinician must be reminded to escalate appropriately.

DOCUMENTATION MODES:
- ASSESS: Generate a structured initial evaluation note from the assessment data provided (subjective + objective + body chart + special tests). Include a provisional clinical impression (not a diagnosis), red-flag screening summary, and recommended next steps.
- NOTE: Generate a SOAP progress note (Subjective/Objective/Assessment/Plan) from the bullet-point input for a follow-up session. Reference the treatment plan goals where available.
- PLAN: Generate a structured physiotherapy treatment plan from the assessment findings. Include SMART short-term and long-term goals, proposed modalities, frequency/duration, phase criteria, and outcome measures to track.
- HEP: Generate a clear, patient-friendly Home Exercise Program from the exercise list provided. Use plain English, numbered steps, sets/reps/hold/frequency format, and include safety cues. Output as HTML suitable for printing and sharing with the patient.
- REPORT: Generate a clinical document from the template type and data provided. Types: referral_letter | discharge_summary | insurance_report | return_to_work_certificate | progress_report.
- REVIEW: Analyse the pasted clinical document for: completeness, missing objective measures, unaddressed goals, inconsistencies, and medico-legal risks. Present findings with severity (CRITICAL / CAUTION / SUGGESTION).
- REFINE: Rewrite or improve the specified portion of the document per the instruction given. Maintain clinical accuracy and professional tone.
- CONTINUE: Continue writing from the provided text, maintaining the same clinical style and format.
- REWRITE: Rewrite the selected text while preserving its clinical meaning. Return ONLY the rewritten text.
- SIMPLIFY: Simplify the selected text into plain, patient-friendly English. Return ONLY the simplified text.
- EXPLAIN: Explain what the selected clinical text means, including any risks or implications for the patient's management.
- BRAINSTORM: Generate treatment ideas, exercise progressions, or outcome measure suggestions for the provided clinical context.
- SUGGEST_EXERCISES: Based on the condition and current HEP, suggest exercises that appear to be missing or would logically progress the program. Return as JSON array: [{"category":"...","name":"...","reason":"..."}]
- COMPLETENESS_CHECK: Review the document for clinical completeness. Flag missing elements by severity (CRITICAL / CAUTION / SUGGESTION).

OUTPUT FORMAT:
- For ASSESS, NOTE, PLAN, REPORT, REFINE, CONTINUE, REWRITE, SIMPLIFY: output valid HTML suitable for a rich text editor. Use <h1>–<h3> for headings, <p> for paragraphs, <strong> for bold terms, <em> for italic, <ul>/<li> for lists. Include blanks like [DATE] or [PATIENT NAME] where the clinician must fill in details. No markdown — only HTML.
- For HEP: output HTML formatted for patient reading — clear numbered lists, bold exercise names, sets/reps/hold in a consistent format, a safety disclaimer at the bottom.
- For REVIEW and COMPLETENESS_CHECK: use numbered findings with severity (CRITICAL / CAUTION / SUGGESTION) and a recommended action for each.
- For EXPLAIN and BRAINSTORM: use <p> and <ul>/<li> HTML.
- For SUGGEST_EXERCISES: return only a valid JSON array, no surrounding text.
- Always write in professional clinical English appropriate for physiotherapy documentation.

CLINICAL CONVENTIONS:
- Use standardised abbreviations consistently: ROM (range of motion), MMT (manual muscle test), VAS/NPRS (pain scales), HEP (home exercise program), TrPs (trigger points), AROM/PROM/RROM (active/passive/resisted ROM), SLR (straight leg raise), etc.
- Outcome measure scoring: auto-score VAS (0–10), NPRS (0–10), Oswestry Disability Index (%), Neck Disability Index (%), DASH score (%), LEFS score, Berg Balance Scale when raw values are provided.
- Standard SOAP structure: Subjective (patient complaint, pain score, activity limitations) → Objective (observation, ROM, strength, special tests, palpation) → Assessment (progress toward goals, response to treatment) → Plan (next session focus, HEP update, referral if needed).`,
}

const retailer: VerticalConfig = {
  id: 'retailer',
  label: 'Retailer',
  emoji: '🛍️',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'creative',
  defaultFont: 'inter',
  bookingLabel: 'Shop now',
  ctaLabel: 'WhatsApp to order',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What products do you sell?',                   placeholder: 'e.g. Handmade jewellery, ethnic wear, home décor' },
    { id: 'experience',  question: 'How long have you been running your store?',   placeholder: 'e.g. 3 years' },
    { id: 'approach',    question: 'What makes your products special?',            placeholder: 'e.g. Handcrafted, locally sourced, unique designs' },
    { id: 'location',    question: 'Where are you based? Do you ship?',            placeholder: 'e.g. Celina TX — ship across USA' },
    { id: 'pricing',     question: "What's your price range? (optional)",          placeholder: 'e.g. Products from $15' },
  ],
}

// "other" is a special catch-all — triggers the custom persona pipeline.
// Always keep it last so it appears at the end of the grid.
const other: VerticalConfig = {
  id: 'other',
  label: 'Something else',
  emoji: '✨',
  phase: 1,
  defaultTemplate: 'focus',
  defaultPalette: 'professional',
  defaultFont: 'inter',
  bookingLabel: 'Get in touch',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [],
}

// ── Registry ──────────────────────────────────────────────────
// ADD NEW PERSONAS HERE — they will automatically appear in the onboarding grid,
// template map, and palette map. No other files need to change.

export const VERTICALS: Record<string, VerticalConfig> = {
  tutor,
  trainer,
  baker,
  photographer,
  salon,
  chef,
  doctor,
  musician,
  advocate,
  physio,
  retailer,
  other,
}

export function getVertical(id: string): VerticalConfig | undefined {
  return VERTICALS[id]
}

export function getAllVerticals(): VerticalConfig[] {
  return Object.values(VERTICALS)
}

export function getPhase1Verticals(): VerticalConfig[] {
  return getAllVerticals().filter((v) => v.phase === 1)
}

// ── Chat prompt chips ──────────────────────────────────────────
// Quick-action starter prompts shown under the My Chat input box.
// Persona-specific so each member sees suggestions relevant to their work.

const PERSONA_CHIPS: Record<string, string[]> = {
  tutor:        ['Add a new student',        'Update my headline',       'Log a session',          'What should my page highlight?'],
  trainer:      ['Update my services',        'Add a highlight',          'Change my booking text',  'Improve my bio'],
  baker:        ['Add a new product',         'Update my bio',            'Draft an order FAQ',      'Improve my headline'],
  photographer: ['Update my packages',        'Add a gallery section',    'Improve my bio',          'Change my palette'],
  salon:        ['Add a new service',         'Update my bio',            'Change my booking text',  'Add an FAQ'],
  chef:         ['Add a menu item',           'Update my delivery info',  'Improve my bio',          'Add a highlight'],
  doctor:       ['Update my FAQ',             'Add a service',            'Update consultation info','Improve my bio'],
  musician:     ['Add a new student',         'Log a session',            'Update my pricing',       'Improve my bio'],
  advocate:     ['Add a new client',          'Update my practice areas', 'Improve my bio',          'Add a consultation FAQ'],
  physio:       ['Add a new patient',         'Log a treatment session',  'Update my specialities',  'Improve my bio'],
  retailer:     ['Add a new product',         'Update my bio',            'Improve my headline',     'Add a highlight'],
  other:        ['Improve my headline',       'Update my bio',            'Add a service',           'Update my location'],
}

export function getChatPromptChips(persona: string): string[] {
  return PERSONA_CHIPS[persona] ?? PERSONA_CHIPS.other
}
