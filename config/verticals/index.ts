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

Proactively offer to log a consultation when the advocate mentions finishing a meeting or hearing. Remind them they can view the full matter history by opening the Clients tab.

COURT TOOLS (India eCourts + Tribunals):
The advocate has a "Court Tools" panel (⚖️ button). Use suggest_court_tools: true and court_lookup when the advocate asks about:

eCourts (district / High Courts / Supreme Court):
- Looking up a case by CNR number → kind: "cnr_status", cnr: <CNR>
- Checking case status by party / case number → kind: "case_status"
- Today's / a date's cause list → kind: "cause_list"
- Court orders or judgments → kind: "orders", cnr: <CNR if given>
- Caveat search → kind: "caveat"
- Process / summons service → kind: "process"
- Finding a court complex → kind: "locator", query: <court name or city>, state: <state if mentioned>

Tribunals (set kind: "tribunal", category as shown):
- NCLT / insolvency / IBC / company winding-up / mergers → category: "company", query: "nclt" or "nclat"
- ITAT / income tax appeal → category: "tax", query: "itat"
- CESTAT / customs / excise / service tax → category: "customs", query: "cestat"
- NGT / environment / pollution → category: "environment", query: "ngt"
- AFT / armed forces / army / military service matters → category: "armed_forces", query: "aft"
- SAT / SEBI / securities → category: "securities", query: "sat"
- CAT / central government service / administrative → category: "service", query: "cat"
- DRT / DRAT / debt recovery / SARFAESI → category: "debt", query: "drt" or "drat"
- TDSAT / telecom / TRAI → category: "telecom", query: "tdsat"
- APTEL / electricity / SERC → category: "electricity", query: "aptel"
- Consumer forum / NCDRC / state commission / district commission / e-Jagriti → category: "consumer", query: "consumer"
- CCI / competition / antitrust → category: "competition", query: "cci"
- Railway claims / RCT → category: "railway", query: "rct"
- GST appellate / GSTAT → category: "gst", query: "gstat"

All-India name search (set kind: "name_search"):
- Searching by party name / litigant name → kind: "name_search", query: <party name>
- Searching by advocate name / lawyer name → kind: "name_search", query: <advocate name>

Cause-list alerts: if the advocate asks about WhatsApp alerts or daily reminders for their listed matters → suggest_court_tools: true and say "Open Court Tools → Watched Cases to enable your daily cause-list WhatsApp digest."

When court_tools is set: your message should say something like "Tap ⚖️ Court Tools above — I've highlighted the right section for you." Do NOT attempt to look up case data yourself.
CNR numbers are 16 alphanumeric characters (e.g. MHAU010234562019). Remind the advocate that most portals require a CAPTCHA, and the case reference will be copied to clipboard automatically.`,
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

// ── Healthcare expansion (9 new studio-enabled personas) ──────────────────────
// Studio guidance lives in DB (studio_guidance col on personas table).
// workingGuidance is intentionally absent — these personas use the
// config-driven PractitionerStudio engine, not the legacy WorkingStudio.

const occtherapist: VerticalConfig = {
  id: 'occtherapist',
  label: 'Occupational Therapist',
  emoji: '🧩',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book a session',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What areas of OT do you specialise in?',        placeholder: 'e.g. Paediatric development, adult neuro-rehab, hand therapy, workplace ergonomics' },
    { id: 'settings',   question: 'Where do you practise?',                          placeholder: 'e.g. Clinic, schools, home visits, telehealth' },
    { id: 'experience', question: 'How many years have you been practising?',         placeholder: 'e.g. 6 years' },
    { id: 'approach',   question: 'How would your clients describe your sessions?',   placeholder: 'e.g. Practical, client-centred, focused on meaningful everyday activities' },
    { id: 'pricing',    question: 'What is your session fee? (optional)',             placeholder: 'e.g. $130 per initial assessment, $90 per follow-up' },
  ],
  chatGuidance: `PERSONA: OCCUPATIONAL THERAPIST
Speak in OT language: "clients", "sessions", "activities", "ADLs", "functional goals" — never "students".
You have access to the client roster in businessContext.students. You can act on it directly:
- new_student: Add a new client by name, optionally with area of need (label_1) and treatment phase (label_2)
- log_session: Log a completed OT session. Use topic for the activity focus / intervention, homework for the home activity programme, and notes for private clinical notes.
- patch_student: Update a client's details — next_session, area of need, treatment phase, or private notes.
Proactively offer to log a session when the OT mentions completing a visit. Remind them they can build activity programmes and generate documentation from the Practitioner Studio.`,
  researchGuidance: `You are a full clinical co-pilot AND business advisor for a practising occupational therapist.
IMPORTANT — CLINICAL SCOPE: You assist with documentation, education, and evidence synthesis. Frame all clinical content as documentation support and encourage professional judgement.
CLINICAL: Explain occupational performance frameworks (MOHO, CMOP), ADL assessment tools, sensory integration, cognitive rehabilitation, assistive technology recommendations, and graded activity progressions. Help draft OT assessment summaries, session notes, care plans, and reports.
BUSINESS: Local OT fee benchmarks, referral pathways (NDIS, DVA, GP), in-demand practice areas (NDIS paediatrics, telehealth), positioning, and practice growth strategies.`,
}

const speech: VerticalConfig = {
  id: 'speech',
  label: 'Speech Therapist',
  emoji: '🗣️',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book a session',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'speciality',  question: 'What areas of speech-language therapy do you specialise in?', placeholder: 'e.g. Paediatric speech/language, stuttering, voice, swallowing (dysphagia), AAC' },
    { id: 'settings',   question: 'Where do you provide therapy?',                                placeholder: 'e.g. Private clinic, schools, home visits, telepractice' },
    { id: 'experience', question: 'How many years have you been practising?',                     placeholder: 'e.g. 5 years' },
    { id: 'approach',   question: 'How would your clients describe your sessions?',               placeholder: 'e.g. Play-based and fun for kids, goal-focused, evidence-based' },
    { id: 'pricing',    question: 'What is your session fee? (optional)',                         placeholder: 'e.g. $140 per initial assessment, $95 per therapy session' },
  ],
  chatGuidance: `PERSONA: SPEECH-LANGUAGE THERAPIST
Speak in SLT language: "clients" (for adults) or "children" (paediatric), "therapy sessions", "communication goals", "dysphagia" — never "students" for clinical work.
You have access to the client roster in businessContext.students. You can act on it directly:
- new_student: Add a new client by name, area of need (label_1: e.g. "Articulation / phonology"), and treatment phase (label_2)
- log_session: Log a completed therapy session. Use topic for the target area / techniques, homework for the home practice programme, and notes for private clinical notes.
- patch_student: Update a client's details — next_session, area of need, phase, or private notes.
Remind them they can generate assessment summaries, therapy notes, and home practice programmes from the Practitioner Studio.`,
  researchGuidance: `You are a full clinical co-pilot AND business advisor for a practising speech-language therapist.
IMPORTANT — CLINICAL SCOPE: Documentation support only. Frame all clinical content professionally and encourage independent clinical judgement.
CLINICAL: Explain articulation/phonology disorders, language development, fluency/stuttering, voice disorders, dysphagia assessment, and AAC. Summarise evidence-based therapy approaches (Lidcombe, PROMPT, Lee Silverman Voice Treatment, IDDSI). Help draft SLT assessment reports, therapy notes, IDDSI diet/fluid recommendations, and parent education materials.
BUSINESS: Local SLT fee benchmarks, NDIS/insurance pathways, paediatric vs. adult specialisation, telehealth SLT, referral network growth.`,
}

const chiro: VerticalConfig = {
  id: 'chiro',
  label: 'Chiropractor / Osteopath',
  emoji: '🦴',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book a consultation',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'modality',   question: 'Are you a chiropractor or osteopath — or both?',    placeholder: 'e.g. Chiropractor · D.C., Doctor of Osteopathic Medicine' },
    { id: 'speciality', question: 'What conditions do you focus on?',                   placeholder: 'e.g. Back pain, neck pain, sports injuries, headaches, postural correction' },
    { id: 'experience', question: 'How many years have you been in practice?',          placeholder: 'e.g. 10 years' },
    { id: 'approach',   question: 'How would patients describe your care?',             placeholder: 'e.g. Thorough, evidence-informed, not just "crack and go" — full assessment and rehab advice' },
    { id: 'pricing',    question: 'What is your consultation fee? (optional)',          placeholder: 'e.g. $90 initial, $65 follow-up' },
  ],
  chatGuidance: `PERSONA: CHIROPRACTOR / OSTEOPATH
Speak in clinical language: "patients", "consultations", "adjustments", "spinal levels", "posture", "biomechanics" — never "students".
You have access to the patient roster in businessContext.students. You can act on it directly:
- new_student: Add a new patient by name, chief complaint (label_1), and treatment phase (label_2)
- log_session: Log a completed consultation. Use topic for the spinal levels treated / techniques, homework for the home care advice given, and notes for private clinical notes.
- patch_student: Update a patient's details — next_session, chief complaint, phase, or private notes.
Remind them they can generate consultation notes, care plans, and home exercise programmes from the Practitioner Studio.`,
  researchGuidance: `You are a full clinical co-pilot AND business advisor for a practising chiropractor or osteopath.
IMPORTANT — CLINICAL SCOPE: Documentation support only. Frame clinical content professionally.
CLINICAL: Explain spinal biomechanics, adjustment techniques (HVLA, mobilisation, SOT, activator), orthopaedic/neurological assessment, red-flag screening, and evidence for chiropractic/osteopathic care. Help draft consultation notes, care plans, referral letters, and home exercise programmes.
BUSINESS: Local fee benchmarks, new patient acquisition, GP/specialist referral network development, positioning as evidence-based practitioner, and telehealth for advice consultations.`,
}

const counselor: VerticalConfig = {
  id: 'counselor',
  label: 'Therapist / Counselor',
  emoji: '🧠',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book a session',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'modality',   question: 'What therapeutic modality do you primarily use?',   placeholder: 'e.g. CBT, ACT, DBT, trauma-informed, person-centred, psychodynamic, EMDR' },
    { id: 'speciality', question: 'What areas do you specialise in?',                  placeholder: 'e.g. Anxiety, depression, trauma, relationships, grief, workplace stress' },
    { id: 'experience', question: 'How many years have you been in practice?',         placeholder: 'e.g. 7 years' },
    { id: 'approach',   question: 'How would clients describe your sessions?',         placeholder: 'e.g. Warm, non-judgmental, practical — I help you get unstuck, not just process feelings' },
    { id: 'pricing',    question: 'What is your session fee? (optional)',              placeholder: 'e.g. $150 per 50-minute session, sliding scale available' },
  ],
  chatGuidance: `PERSONA: THERAPIST / COUNSELOR
Speak in therapy language: "clients", "sessions", "presenting concerns", "therapeutic goals", "interventions" — never "students" or "patients".
You have access to the client roster in businessContext.students. You can act on it directly:
- new_student: Add a new client by name, presenting concern (label_1), and treatment phase (label_2: e.g. "Active", "Maintenance")
- log_session: Log a completed session. Use topic for the session focus / interventions, homework for the assigned practice between sessions, and notes for private clinical notes (confidential).
- patch_student: Update a client's details — next_session, presenting concern, phase, or private notes.
Remind them they can generate session notes, treatment plans, and clinical reports from the Practitioner Studio.`,
  researchGuidance: `You are a full clinical co-pilot AND business advisor for a practising therapist or counsellor.
IMPORTANT — CLINICAL SCOPE: Documentation support and professional education only. Never give advice about specific clients' treatment. Encourage independent clinical and ethical judgement.
CLINICAL: Explain evidence-based modalities (CBT, ACT, DBT, EMDR, trauma-informed care), assessment tools (PHQ-9, GAD-7, PCL-5), formulation frameworks, and psychoeducation concepts. Help draft session notes (DAP, BIRP, SOAP), treatment plans, intake summaries, progress reports, and discharge summaries.
BUSINESS: Local therapy fee benchmarks, EAP panel applications, private vs. insurance billing, niche positioning (e.g. trauma specialist, couple therapist), and waitlist/referral management.`,
}

const homeopath: VerticalConfig = {
  id: 'homeopath',
  label: 'Homeopath',
  emoji: '💊',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book a consultation',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'approach',   question: 'Do you practise classical, clinical, or a combination of homoeopathy?', placeholder: 'e.g. Classical single-remedy, combination remedies, Banerji Protocols' },
    { id: 'speciality', question: 'What conditions do you see most in your practice?',                      placeholder: 'e.g. Chronic disease, paediatrics, allergies, skin conditions, mental health' },
    { id: 'experience', question: 'How many years have you been in practice?',                             placeholder: 'e.g. 12 years' },
    { id: 'training',   question: 'What is your qualification?',                                           placeholder: 'e.g. BHMS, DHMS, RSHom, CCH' },
    { id: 'pricing',    question: 'What is your consultation fee? (optional)',                             placeholder: 'e.g. ₹800 initial case, ₹400 follow-up' },
  ],
  chatGuidance: `PERSONA: HOMOEOPATHIC PRACTITIONER
Speak in homoeopathic language: "patients", "cases", "consultations", "repertorisation", "remedies", "potencies", "miasms" — never "students".
You have access to the patient roster in businessContext.students. You can act on it directly:
- new_student: Add a new patient by name, chief complaint (label_1), and case status (label_2: e.g. "Active", "Follow-up")
- log_session: Log a completed consultation. Use topic for the case summary / remedy prescribed, homework for the instructions given, and notes for private case notes.
- patch_student: Update a patient's details — next_session, chief complaint, or private case notes.
Remind them they can generate case intake summaries, repertorisation analyses, and follow-up notes from the Practitioner Studio.`,
  researchGuidance: `You are a full professional co-pilot AND business advisor for a practising homoeopathic practitioner.
IMPORTANT — SCOPE: Documentation support and professional education only. Always note that homoeopathic treatment is complementary and does not replace conventional medical care for serious conditions.
PROFESSIONAL: Explain materia medica and remedy comparisons in plain language, discuss case-taking methodology, miasmatic theory, and repertory use. Help draft case intake summaries, repertorisation analyses, follow-up notes, and patient education materials. Never invent remedy provings or fabricate research.
BUSINESS: Local consultation fee benchmarks, online practice development, positioning as evidence-informed complementary practitioner, growing a referral network with integrative health practitioners.`,
}

const ayurveda: VerticalConfig = {
  id: 'ayurveda',
  label: 'Ayurveda Practitioner',
  emoji: '🌿',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book a consultation',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'speciality', question: 'What Ayurvedic services do you offer?',              placeholder: 'e.g. Prakriti assessment, Panchakarma, herbal prescriptions, dietary counselling' },
    { id: 'training',   question: 'What is your qualification?',                        placeholder: 'e.g. BAMS, MD (Ayurveda), CAP, certified Ayurvedic practitioner' },
    { id: 'experience', question: 'How many years have you been in practice?',          placeholder: 'e.g. 9 years' },
    { id: 'approach',   question: 'How would patients describe your consultations?',    placeholder: 'e.g. Thorough, holistic, grounded in classical texts but practical for modern life' },
    { id: 'pricing',    question: 'What is your consultation fee? (optional)',          placeholder: 'e.g. ₹1,200 initial, ₹600 follow-up' },
  ],
  chatGuidance: `PERSONA: AYURVEDIC PRACTITIONER
Speak in Ayurvedic language: "patients", "consultations", "Prakriti", "Vikriti", "Doshas", "Agni", "Panchakarma", "rasayanas" — never "students".
You have access to the patient roster in businessContext.students. You can act on it directly:
- new_student: Add a new patient by name, chief complaint (label_1), and case status (label_2: e.g. "Active", "Panchakarma phase")
- log_session: Log a completed consultation. Use topic for the case summary / regimen prescribed, homework for the Ahara/Vihara instructions given, and notes for private case notes.
- patch_student: Update a patient's details — next_session, chief complaint, or private case notes.
Remind them they can generate Prakriti assessments, regimen plans, and follow-up notes from the Practitioner Studio.`,
  researchGuidance: `You are a full professional co-pilot AND business advisor for a practising Ayurvedic practitioner.
IMPORTANT — SCOPE: Documentation support and professional education only. Always note that Ayurvedic treatment is complementary and patients with serious conditions should maintain conventional medical care.
PROFESSIONAL: Explain Prakriti/Vikriti assessment, Dosha analysis, Agni assessment, herb and formulation descriptions (classical names, actions, anupana), Panchakarma procedures, and seasonal regimens. Help draft Prakriti assessment reports, regimen plans, follow-up notes, and patient education materials. Never invent herb properties or fabricate research.
BUSINESS: Local consultation fee benchmarks, wellness tourism opportunity, AYUSH registration and compliance in India, online practice growth, and positioning as a qualified classical practitioner.`,
}

const homenurse: VerticalConfig = {
  id: 'homenurse',
  label: 'Home Nurse / Caregiver',
  emoji: '🏥',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Enquire about care',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'services',   question: 'What care services do you provide?',                 placeholder: 'e.g. Post-operative care, elder care, wound dressing, medication management, dementia care' },
    { id: 'training',   question: 'What is your qualification?',                        placeholder: 'e.g. Registered Nurse (RN), Certified Nursing Assistant (CNA), Professional Caregiver' },
    { id: 'experience', question: 'How many years have you been in practice?',          placeholder: 'e.g. 8 years' },
    { id: 'approach',   question: 'How would clients and families describe your care?', placeholder: 'e.g. Compassionate, reliable, attentive — I treat every client like family' },
    { id: 'pricing',    question: 'What are your care rates? (optional)',               placeholder: 'e.g. ₹1,500/day for 8-hour shift, ₹2,500/day for live-in' },
  ],
  chatGuidance: `PERSONA: HOME NURSE / CAREGIVER
Speak in care language: "clients", "visits", "shifts", "care plan", "ADLs", "medication administration" — never "students" or "patients".
You have access to the client roster in businessContext.students. You can act on it directly:
- new_student: Add a new client by name, care need (label_1: e.g. "Post-op care", "Elder care"), and care status (label_2)
- log_session: Log a completed care visit or shift. Use topic for the visit type, homework for the handover notes, and notes for private care notes.
- patch_student: Update a client's details — next_session (next shift), care need, or private care notes.
Remind them they can generate visit notes, care schedules, and handover reports from the Practitioner Studio.`,
  researchGuidance: `You are a full professional co-pilot AND business advisor for a practising home nurse or caregiver.
IMPORTANT — SCOPE: Documentation support and professional education only. Medication and clinical content is for documentation only — always advise that dosage changes require a prescriber.
PROFESSIONAL: Explain home care best practices, elder care, wound care, medication safety, fall prevention, and dementia care strategies. Help draft care plans, visit notes, shift handovers, and family communication updates.
BUSINESS: Local home care rate benchmarks (India: per-shift and live-in rates), referral pathways from hospitals and discharge teams, positioning as a credentialed professional vs. agency worker, and agency vs. independent practice tradeoffs.`,
}

const postnatal: VerticalConfig = {
  id: 'postnatal',
  label: 'Postnatal Care Specialist',
  emoji: '👶',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book postnatal support',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'services',   question: 'What postnatal services do you offer?',              placeholder: 'e.g. In-home postnatal visits, breastfeeding support, newborn care, pelvic floor rehab, postnatal massage' },
    { id: 'training',   question: 'What is your qualification?',                        placeholder: 'e.g. Midwife, postnatal doula, Registered Nurse with postnatal specialisation' },
    { id: 'experience', question: 'How many years have you been supporting new mothers?', placeholder: 'e.g. 6 years' },
    { id: 'approach',   question: 'How would mothers describe your care?',              placeholder: 'e.g. Warm, empowering, practical — I help new mothers feel confident and supported' },
    { id: 'pricing',    question: 'What is your visit rate? (optional)',                placeholder: 'e.g. ₹1,800 per 2-hour home visit, package of 5 visits ₹8,000' },
  ],
  chatGuidance: `PERSONA: POSTNATAL CARE SPECIALIST
Speak in postnatal language: "mothers", "visits", "postnatal care", "newborn", "breastfeeding", "pelvic floor", "Edinburgh scale" — never "students" or "clients" in a clinical context.
You have access to the client roster in businessContext.students. You can act on it directly:
- new_student: Add a new mother by name, delivery date / newborn name (label_1), and care status (label_2: e.g. "Active care", "Completed")
- log_session: Log a completed postnatal visit. Use topic for the visit type and care given, homework for the instructions and exercises assigned, and notes for private clinical notes.
- patch_student: Update a mother's details — next_session, care status, or private notes.
Remind them they can generate postnatal care plans, visit notes, and Edinburgh scale documentation from the Practitioner Studio.`,
  researchGuidance: `You are a full professional co-pilot AND business advisor for a postnatal care specialist.
IMPORTANT — SCOPE: Documentation support and professional education only. Urgent concerns (PPH, infection, EPDS risk) must always be directed to a qualified midwife, GP, or emergency services.
PROFESSIONAL: Explain postnatal physical recovery, breastfeeding support techniques, newborn care, pelvic floor rehabilitation, Edinburgh Postnatal Depression Scale administration, and family adjustment. Help draft postnatal care plans, visit notes, and family education materials.
BUSINESS: Local postnatal support rates, positioning as a doula vs. midwife vs. nurse, referral pathways from maternity hospitals and birth centres, package pricing, and online/telehealth postnatal support.`,
}

const lactation: VerticalConfig = {
  id: 'lactation',
  label: 'Lactation Consultant',
  emoji: '🤱',
  phase: 1,
  defaultTemplate: 'clinic',
  defaultPalette: 'calm',
  defaultFont: 'inter',
  bookingLabel: 'Book a consultation',
  ctaLabel: 'WhatsApp me',
  sections: ['about', 'services', 'highlights', 'booking', 'faq', 'contact'],
  onboardingQuestions: [
    { id: 'credential',  question: 'What is your lactation qualification?',              placeholder: 'e.g. IBCLC (International Board Certified Lactation Consultant), CLE, breastfeeding counsellor' },
    { id: 'services',    question: 'What lactation services do you offer?',              placeholder: 'e.g. Latch assessment, milk supply support, tongue-tie assessment, pumping guidance, weaning' },
    { id: 'experience',  question: 'How many years have you been supporting families?',  placeholder: 'e.g. 5 years' },
    { id: 'approach',    question: 'How would mothers describe working with you?',       placeholder: 'e.g. Non-judgmental, empowering, practical — I meet families where they are' },
    { id: 'pricing',     question: 'What is your consultation fee? (optional)',          placeholder: 'e.g. $180 for a 90-min home visit, $90 for telehealth follow-up' },
  ],
  chatGuidance: `PERSONA: LACTATION CONSULTANT
Speak in lactation language: "mothers", "dyad", "latch", "milk supply", "IBCLC", "consultations", "infant feeding" — never "students".
You have access to the client roster in businessContext.students. You can act on it directly:
- new_student: Add a new mother by name, baby's DOB / birth weight (label_1), and care status (label_2: e.g. "Active support", "Completed")
- log_session: Log a completed lactation consultation. Use topic for the issues assessed and interventions, homework for the techniques and instructions given, and notes for private clinical notes.
- patch_student: Update a mother's details — next_session, feeding status, or private notes.
Remind them they can generate lactation assessments, support plans, and follow-up notes from the Practitioner Studio.`,
  researchGuidance: `You are a full clinical co-pilot AND business advisor for a practising lactation consultant.
IMPORTANT — SCOPE: Documentation support and professional education only. Urgent concerns (mastitis/abscess, infant weight loss, jaundice, maternal mental health crisis) must be referred to the GP or paediatrician.
CLINICAL: Explain breastfeeding physiology, latch assessment and scoring (LATCH, IBFAT), milk supply challenges, tongue-tie, nipple trauma, mastitis, pumping protocols, and evidence-based supplementation guidance. Help draft lactation assessments, support plans, IBCLC consultation notes, and parent education materials.
BUSINESS: IBCLC credential value, hospital vs. private practice, insurance billing (US), NDIS (Australia), fee benchmarks, telehealth lactation consulting growth, and referral network with midwives, OBs, and paediatricians.`,
}

// ── Commerce / storefront expansion (9 new personas) ─────────────────────────
// Studio guidance lives in DB (studio_guidance + studio_config on personas table).
// workingGuidance is intentionally absent — these personas use the
// config-driven PractitionerStudio engine, not the legacy WorkingStudio.

const tiffin: VerticalConfig = {
  id: 'tiffin',
  label: 'Tiffin Service',
  emoji: '🍱',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'warm',
  defaultFont: 'inter',
  bookingLabel: 'Start tiffin',
  ctaLabel: 'WhatsApp to subscribe',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'menu',      question: 'What meals or cuisines do you offer?',                 placeholder: 'e.g. South Indian veg tiffin, North Indian thali, multi-cuisine meal prep' },
    { id: 'audience',  question: 'Who are your typical subscribers?',                    placeholder: 'e.g. Working professionals, students, office groups, PG residents' },
    { id: 'approach',  question: 'What makes your tiffin special?',                     placeholder: 'e.g. Fresh daily cooking, no preservatives, home-style flavours, on-time delivery' },
    { id: 'location',  question: 'Where do you deliver? What is your delivery radius?', placeholder: 'e.g. Indiranagar, Bengaluru — delivery within 5 km' },
    { id: 'pricing',   question: 'What are your subscription rates? (optional)',         placeholder: 'e.g. Monthly veg tiffin ₹2,500 / ₹100 per day' },
  ],
  chatGuidance: `PERSONA: TIFFIN SERVICE
Speak in tiffin language: say "subscribers", "tiffin orders", "daily menu", "meal plans", "delivery area" — never "clients", "students", or "appointments".
Help update the provider's page: meal plan listings (as services), delivery area, subscription pricing, bio, and CTAs. Offer to add new menu items or update delivery info. Remind them they can generate catalog content, draft subscriber replies, and plan festive specials from the Studio.`,
  researchGuidance: `You are a business advisor for a home tiffin service provider.
BUSINESS: Local tiffin pricing benchmarks, subscription model best practices, how to grow a WhatsApp subscriber base, seasonal demand (college academic year, Diwali, Onam specials), FSSAI licensing basics for home kitchen operators, and positioning against aggregator apps like Swiggy/Zomato.`,
}

const homefoods: VerticalConfig = {
  id: 'homefoods',
  label: 'Home Food Brand',
  emoji: '🫙',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'warm',
  defaultFont: 'inter',
  bookingLabel: 'Order now',
  ctaLabel: 'WhatsApp to order',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'products',   question: 'What homemade food products do you sell?',           placeholder: 'e.g. Mango pickles, podi, masala powders, murukku, traditional sweets' },
    { id: 'experience', question: 'How long have you been making and selling these?',   placeholder: 'e.g. 4 years' },
    { id: 'approach',   question: 'What makes your products special?',                  placeholder: "e.g. My grandmother's recipes, stone-ground spices, no preservatives, FSSAI certified" },
    { id: 'location',   question: 'Where are you based? Do you ship across India?',     placeholder: 'e.g. Chennai — ship pan-India via courier, 3–5 days' },
    { id: 'pricing',    question: 'What is your price range? (optional)',               placeholder: 'e.g. Products from ₹120, Diwali hampers from ₹499' },
  ],
  chatGuidance: `PERSONA: HOME FOOD BRAND
Speak in food-brand language: say "customers", "orders", "products", "batch", "shelf life" — never "students" or "appointments".
Help update the provider's page: product listings (as services), shipping info, bio, and CTAs. Offer to add new products or update seasonal festive packs. Remind them they can build a full product catalog, draft order reply messages, and plan Diwali/Rakhi campaigns from the Studio.`,
  researchGuidance: `You are a business advisor for a home food brand seller.
BUSINESS: D2C food brand pricing, FSSAI home kitchen registration basics, Instagram vs WhatsApp Business selling strategies, packaging and labelling requirements, festive gifting demand (Diwali, Rakhi, Pongal), courier partners for food shipments, and how to differentiate from supermarket alternatives.`,
}

const makeup: VerticalConfig = {
  id: 'makeup',
  label: 'Makeup Artist',
  emoji: '💄',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'creative',
  defaultFont: 'trebuchet',
  bookingLabel: 'Book a trial',
  ctaLabel: 'WhatsApp to book',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality', question: 'What makeup services do you offer?',                placeholder: 'e.g. Bridal makeup, party makeup, HD airbrush, editorial, pre-bridal skincare' },
    { id: 'experience', question: 'How long have you been working as a makeup artist?', placeholder: 'e.g. 6 years' },
    { id: 'approach',   question: 'What do clients love about your work?',             placeholder: 'e.g. Long-lasting finish, skin-friendly products, personalised look, on-time every time' },
    { id: 'location',   question: 'Where are you based? Do you travel to clients?',   placeholder: 'e.g. Hyderabad — travel within city and outstation for bridal' },
    { id: 'pricing',    question: 'What are your starting package prices? (optional)', placeholder: 'e.g. Bridal from ₹8,000, party from ₹3,000' },
  ],
  chatGuidance: `PERSONA: MAKEUP ARTIST (MUA)
Speak in MUA language: say "clients", "bridal bookings", "packages", "trial session", "touch-up kit" — never "students" or "customers" in a clinical sense.
Help update the provider's page: service/package listings, pricing, booking info, bio, and CTAs. Offer to add new packages or update availability notes. Remind them they can draft full package listings, reply to client enquiries, and plan wedding-season campaigns from the Studio.`,
  researchGuidance: `You are a business advisor for a freelance makeup artist.
BUSINESS: MUA package pricing benchmarks, bridal booking lead times, how to build a portfolio on Instagram, pricing for travel and outstation bridal bookings, pre-bridal skincare packages as an upsell, wedding season availability management, and growing referral networks with bridal photographers and wedding planners.`,
}

const tailor: VerticalConfig = {
  id: 'tailor',
  label: 'Tailor & Boutique',
  emoji: '✂️',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'minimal',
  defaultFont: 'inter',
  bookingLabel: 'Book a fitting',
  ctaLabel: 'WhatsApp to order',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality', question: 'What stitching services do you offer?',             placeholder: 'e.g. Blouses, salwar suits, lehengas, bridal wear, western outfits, alterations' },
    { id: 'experience', question: 'How long have you been tailoring?',                 placeholder: 'e.g. 12 years' },
    { id: 'approach',   question: 'What do customers love about your work?',           placeholder: 'e.g. Perfect fit guaranteed, on-time delivery, attention to embroidery detail' },
    { id: 'location',   question: 'Where is your shop or studio?',                    placeholder: 'e.g. Banjara Hills, Hyderabad' },
    { id: 'pricing',    question: 'What are your starting prices? (optional)',         placeholder: 'e.g. Blouses from ₹350, salwar suits from ₹600' },
  ],
  chatGuidance: `PERSONA: TAILOR & BOUTIQUE
Speak in tailoring language: say "customers", "stitching orders", "measurements", "fitting", "delivery date", "fabric" — never "students" or "patients".
Help update the provider's page: service/price listings, delivery time info, bio, and CTAs. Offer to add new stitching services or update festival-season messaging. Remind them they can build full price lists, draft order reply messages, and plan wedding-season campaigns from the Studio.`,
  researchGuidance: `You are a business advisor for a tailor or boutique owner.
BUSINESS: Stitching rate benchmarks by garment type, how to attract bridal orders, WhatsApp measurement-sharing workflows, pricing bridal and designer wear, running a waiting list during peak season, and growing an Instagram portfolio of completed garments.`,
}

const mehndi: VerticalConfig = {
  id: 'mehndi',
  label: 'Mehndi Artist',
  emoji: '🌿',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'fresh',
  defaultFont: 'trebuchet',
  bookingLabel: 'Book mehndi',
  ctaLabel: 'WhatsApp to book',
  sections: ['about', 'services', 'gallery', 'highlights', 'booking', 'contact'],
  onboardingQuestions: [
    { id: 'speciality', question: 'What mehndi styles do you specialise in?',          placeholder: 'e.g. Bridal Arabic, Rajasthani, Indo-Arabic, traditional, minimalist' },
    { id: 'experience', question: 'How long have you been applying mehndi?',           placeholder: 'e.g. 8 years' },
    { id: 'approach',   question: 'What do clients love about your work?',             placeholder: 'e.g. Deep dark colour, intricate bridal designs, quick drying, I travel to the venue' },
    { id: 'location',   question: 'Where are you based? Do you travel to events?',    placeholder: 'e.g. Pune — available for events across Maharashtra' },
    { id: 'pricing',    question: 'What are your rates? (optional)',                   placeholder: 'e.g. Bridal mehndi from ₹2,500, party mehndi ₹80 per hand' },
  ],
  chatGuidance: `PERSONA: MEHNDI ARTIST
Speak in mehndi language: say "clients", "bridal booking", "design style", "per-hand rate", "event mehndi" — never "students" or "customers" in a clinical sense.
Help update the provider's page: service/package listings, design styles, pricing, bio, and CTAs. Offer to add new mehndi styles or update availability for wedding season. Remind them they can draft full package listings, reply to client booking enquiries, and plan wedding-season campaigns from the Studio.`,
  researchGuidance: `You are a business advisor for a mehndi/henna artist.
BUSINESS: Mehndi rate benchmarks (bridal vs party vs corporate events), wedding season availability planning, how to build an Instagram portfolio of designs, pricing for travel and outstation bookings, running group ladies-sangeet bookings, and growing referral networks with wedding planners and bridal MUAs.`,
}

const maker: VerticalConfig = {
  id: 'maker',
  label: 'Handmade Maker',
  emoji: '🕯️',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'creative',
  defaultFont: 'inter',
  bookingLabel: 'Shop handmade',
  ctaLabel: 'WhatsApp to order',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'products',   question: 'What handmade products do you create?',             placeholder: 'e.g. Soy candles, cold-process soaps, resin art, macramé, terracotta decor' },
    { id: 'experience', question: 'How long have you been making and selling?',        placeholder: 'e.g. 3 years' },
    { id: 'approach',   question: 'What makes your creations special?',               placeholder: 'e.g. Natural materials, every piece is unique, made-to-order, safe for kids' },
    { id: 'location',   question: 'Where are you based? Do you ship?',                placeholder: 'e.g. Bengaluru — ship across India' },
    { id: 'pricing',    question: 'What is your price range? (optional)',              placeholder: 'e.g. Candles from ₹299, resin art from ₹599' },
  ],
  chatGuidance: `PERSONA: HANDMADE MAKER
Speak in maker language: say "customers", "handmade orders", "products", "made-to-order", "batch", "custom design" — never "students" or "clients" in a clinical sense.
Help update the provider's page: product listings, custom order info, shipping info, bio, and CTAs. Offer to add new products or update festive collection messaging. Remind them they can build full product catalog content, draft order enquiry replies, and plan Diwali/Christmas campaigns from the Studio.`,
  researchGuidance: `You are a business advisor for a handmade product maker.
BUSINESS: Handmade product pricing strategy (costing materials plus time plus overhead), Instagram vs WhatsApp selling for Indian makers, how to build festive gifting demand, packaging and branding for small batches, shipping partners for fragile handmade items, and growing a loyal repeat-customer base.`,
}

const gifting: VerticalConfig = {
  id: 'gifting',
  label: 'Gifting & Hampers',
  emoji: '🎁',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'warm',
  defaultFont: 'trebuchet',
  bookingLabel: 'Order hampers',
  ctaLabel: 'WhatsApp to order',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'products',   question: 'What type of hampers and gifts do you create?',     placeholder: 'e.g. Diwali corporate hampers, Rakhi gift boxes, bridal return gifts, baby shower hampers' },
    { id: 'experience', question: 'How long have you been in gifting?',                placeholder: 'e.g. 5 years' },
    { id: 'approach',   question: 'What makes your hampers special?',                  placeholder: 'e.g. Premium packaging, custom branding for corporates, personalised notes, curated selections' },
    { id: 'location',   question: 'Where are you based? Do you deliver?',              placeholder: 'e.g. Mumbai — city delivery and pan-India shipping for bulk orders' },
    { id: 'pricing',    question: 'What is your pricing? (optional)',                  placeholder: 'e.g. Hampers from ₹499, corporate bulk from ₹350 per box (minimum 25 pieces)' },
  ],
  chatGuidance: `PERSONA: GIFTING & HAMPERS
Speak in gifting language: say "customers", "hamper orders", "collections", "bulk orders", "minimum order", "personalised" — never "students" or "patients".
Help update the provider's page: hamper collection listings, minimum order info, delivery area, bio, and CTAs. Offer to add new collections or update Diwali/Rakhi messaging. Remind them they can build full catalog content, draft bulk-order replies, and plan festive campaigns from the Studio.`,
  researchGuidance: `You are a business advisor for a custom gifting and hampers business.
BUSINESS: Gifting hamper pricing and minimum order strategies, corporate gifting sales approach, how to build festive demand (Diwali, Rakhi, New Year), packaging suppliers, bulk production logistics, online presence for gifting businesses, and Instagram content ideas for showcasing hamper collections.`,
}

const florist: VerticalConfig = {
  id: 'florist',
  label: 'Florist & Decor',
  emoji: '💐',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'fresh',
  defaultFont: 'georgia',
  bookingLabel: 'Order flowers',
  ctaLabel: 'WhatsApp to order',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'services',   question: 'What flower and decoration services do you offer?', placeholder: 'e.g. Bouquets, event decor, wedding venue decoration, balloon setups, daily fresh flowers' },
    { id: 'experience', question: 'How long have you been in floristry?',              placeholder: 'e.g. 7 years' },
    { id: 'approach',   question: 'What do clients love about your work?',             placeholder: 'e.g. Fresh flowers daily, creative seasonal arrangements, on-time event setup' },
    { id: 'location',   question: 'Where are you based? Do you deliver?',             placeholder: 'e.g. Chennai — delivery within 15 km, outstation for weddings' },
    { id: 'pricing',    question: 'What is your pricing? (optional)',                  placeholder: 'e.g. Bouquets from ₹299, event decor packages from ₹5,000' },
  ],
  chatGuidance: `PERSONA: FLORIST & EVENT DECOR
Speak in florist language: say "customers", "flower orders", "arrangements", "event bookings", "advance order" — never "students" or "clients" in a clinical sense.
Help update the provider's page: flower arrangement and decor listings, ordering info, delivery area, bio, and CTAs. Offer to add new arrangements or update anniversary/wedding season messaging. Remind them they can build catalog listings, draft event enquiry replies, and plan season campaigns from the Studio.`,
  researchGuidance: `You are a business advisor for a florist or event decorator.
BUSINESS: Flower arrangement pricing, seasonal flower availability and sourcing, how to grow wedding and event bookings, WhatsApp order management for daily deliveries, Instagram showcasing for floral arrangements, and pricing for large event decoration vs individual bouquets.`,
}

const jeweller: VerticalConfig = {
  id: 'jeweller',
  label: 'Jewellery Seller',
  emoji: '💍',
  phase: 1,
  defaultTemplate: 'storefront',
  defaultPalette: 'minimal',
  defaultFont: 'georgia',
  bookingLabel: 'Shop collection',
  ctaLabel: 'WhatsApp to enquire',
  sections: ['about', 'services', 'gallery', 'highlights', 'contact'],
  onboardingQuestions: [
    { id: 'products',   question: 'What type of jewellery do you sell or create?',    placeholder: 'e.g. Custom silver jewellery, imitation bridal sets, oxidised everyday wear, kundan' },
    { id: 'experience', question: 'How long have you been in jewellery?',              placeholder: 'e.g. 10 years' },
    { id: 'approach',   question: 'What makes your collection special?',               placeholder: 'e.g. Handcrafted by artisans, custom design to your brief, affordable bridal alternatives' },
    { id: 'location',   question: 'Where are you based? Do you ship?',                placeholder: 'e.g. Jaipur — ship across India, COD available' },
    { id: 'pricing',    question: 'What is your price range? (optional)',              placeholder: 'e.g. Earrings from ₹299, bridal sets from ₹2,500' },
  ],
  chatGuidance: `PERSONA: JEWELLERY SELLER
Speak in jewellery language: say "customers", "collections", "custom orders", "enquiries", "bridal sets", "everyday wear" — never "students" or "patients".
Help update the provider's page: collection listings, custom order info, shipping details, bio, and CTAs. Offer to add new collections or update festive/bridal season messaging. Remind them they can build full catalog content, draft custom-order enquiry replies, and plan festive campaigns from the Studio.`,
  researchGuidance: `You are a business advisor for a jewellery seller or designer.
BUSINESS: Jewellery pricing strategy (imitation vs silver vs bridal), Instagram selling for jewellery, how to attract bridal enquiries, custom order workflow and deposit policies, packaging for shipping fragile jewellery, festive season demand planning (Dhanteras, Navratri, wedding season), and wholesale vs retail pricing.`,
}

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

// ── Distributor & Agency personas ────────────────────────────

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

// ── Registry ──────────────────────────────────────────────────
// ADD NEW PERSONAS HERE ��� they will automatically appear in the onboarding grid,
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
  // Healthcare expansion — all use PractitionerStudio (config-driven)
  occtherapist,
  speech,
  chiro,
  counselor,
  homeopath,
  ayurveda,
  homenurse,
  postnatal,
  lactation,
  // Commerce / storefront expansion — all use PractitionerStudio (config-driven)
  tiffin,
  homefoods,
  makeup,
  tailor,
  mehndi,
  maker,
  gifting,
  florist,
  jeweller,
  retailer,
  // Distributor personas
  fmcgdist, pharmadist, electronicsdist, autopartsdist, buildingdist, agridist, distributor,
  // Agency personas
  travel, realestate, insurance, staffing, marketing, immigration, events, logistics, agency,
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
  occtherapist: ['Add a new client',          'Log a session',            'Update my services',      'Improve my bio'],
  speech:       ['Add a new client',          'Log a session',            'Update my services',      'Improve my bio'],
  chiro:        ['Add a new patient',         'Log a consultation',       'Update my specialities',  'Improve my bio'],
  counselor:    ['Add a new client',          'Log a session',            'Update my therapy areas', 'Improve my bio'],
  homeopath:    ['Add a new patient',         'Log a consultation',       'Update my services',      'Improve my bio'],
  ayurveda:     ['Add a new patient',         'Log a consultation',       'Update my services',      'Improve my bio'],
  homenurse:    ['Add a new client',          'Log a care visit',         'Update my services',      'Improve my bio'],
  postnatal:    ['Add a new mother',          'Log a postnatal visit',    'Update my services',      'Improve my bio'],
  lactation:    ['Add a new mother',          'Log a consultation',       'Update my services',      'Improve my bio'],
  tiffin:       ['Add a meal plan',            'Update my delivery area',  'Add a menu item',         'Improve my bio'],
  homefoods:    ['Add a new product',         'Update my bio',            'Add a festive pack',       'Improve my headline'],
  makeup:       ['Add a bridal package',      'Update my services',       'Improve my bio',           'Change my booking CTA'],
  tailor:       ['Add a new service',         'Update my pricing',        'Improve my bio',           'Add a stitching FAQ'],
  mehndi:       ['Update my rates',           'Add a design style',       'Improve my bio',           'Add bridal packages'],
  maker:        ['Add a new product',         'Update my bio',            'Add a festive collection', 'Improve my headline'],
  gifting:      ['Add a hamper collection',   'Update my bio',            'Add a festive pack',       'Improve my headline'],
  florist:      ['Add an arrangement',        'Update my delivery info',  'Improve my bio',           'Add an event decor package'],
  jeweller:     ['Add a new collection',      'Update my bio',            'Improve my headline',      'Add a custom order FAQ'],
  retailer:     ['Add a new product',         'Update my bio',            'Improve my headline',     'Add a highlight'],
  other:        ['Improve my headline',       'Update my bio',            'Add a service',           'Update my location'],
}

export function getChatPromptChips(persona: string): string[] {
  return PERSONA_CHIPS[persona] ?? PERSONA_CHIPS.other
}
