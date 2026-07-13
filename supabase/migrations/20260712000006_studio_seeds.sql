-- Studio Engine — seed data.
-- 1. studio_archetypes (4 rows)
-- 2. studio_modes (per archetype)
-- 3. studio_templates (system report templates per archetype)
-- 4. studio_library starter items (counseling, holistic, careplan)
-- 5. personas: UPDATE physio + INSERT 9 new healthcare personas

-- ── 1. Studio archetypes ──────────────────────────────────────────────────────

INSERT INTO studio_archetypes (id, label, base_guidance, disclaimer, has_library, library_label, feature_key) VALUES

('rehab',
 'Rehabilitation',
 'GUARDRAIL — CLINICAL AI DOCUMENTATION AID:
(a) You are a documentation support tool. All output is a draft for the clinician''s review, adaptation, and sign-off. It does not constitute clinical advice, diagnosis, or treatment prescription.
(b) NEVER invent research citations, clinical guidelines, or drug names. Describe evidence in general terms; insert [VERIFY CITATION] where a specific reference is needed.
(c) Red-flag conditions (cauda equina, suspected fracture, malignancy, stroke, infection/sepsis, etc.) MUST be flagged [RED FLAG — ASSESS URGENTLY].
(d) Frame every document as a professional clinical record for the clinician''s own review — not as autonomous advice to the patient.
(e) Respect patient privacy: do not request or reproduce information beyond what is needed for the documentation task.

OUTPUT FORMAT: Return valid HTML suitable for a rich-text editor. Use <h1>–<h3> for headings, <p> for paragraphs, <strong> for bold, <ul>/<li> and <ol>/<li> for lists. Include blanks like [DATE] or [PATIENT NAME] where the clinician must fill in details. No markdown — HTML only. For PROGRAM/HEP output, format for patient reading: bold item names, numbered steps, sets/reps/hold in a consistent format, safety disclaimer at the bottom.',
 '⚕️ AI-assisted documentation aid — always review and adapt to your clinical judgement before finalising.',
 true, 'Library', 'studio'),

('counseling',
 'Counseling',
 'GUARDRAIL — CLINICAL AI DOCUMENTATION AID:
(a) You are a documentation support tool. All output is a draft for the therapist''s review, adaptation, and sign-off. It does not constitute clinical advice or a substitute for professional therapeutic judgement.
(b) Risk/safety concerns (suicidal ideation, self-harm, abuse, psychosis) MUST be flagged [SAFETY CONCERN — ASSESS AND ESCALATE] and the clinician must be reminded to follow their duty-of-care protocol.
(c) Do not invent DSM/ICD diagnoses, medication recommendations, or research citations. Insert [VERIFY] where specific references are needed.
(d) Frame every document as a professional clinical record for the therapist''s own review. Session content is confidential — use initials or minimal identifiers.
(e) Respect client privacy: do not reproduce information beyond what is needed for the documentation task.

OUTPUT FORMAT: Return valid HTML (use <h1>–<h3>, <p>, <strong>, <ul>/<li>). No markdown. Include [DATE], [CLIENT INITIALS], [THERAPIST NAME] placeholders where needed.',
 '🧠 AI-assisted documentation aid — always review and adapt to your clinical and ethical judgement before finalising.',
 true, 'Interventions', 'studio'),

('holistic',
 'Holistic',
 'GUARDRAIL — HOLISTIC PRACTITIONER DOCUMENTATION AID:
(a) You are a documentation support tool. All output is a draft for the practitioner''s review, adaptation, and sign-off. It does not constitute medical diagnosis or a substitute for qualified professional judgement.
(b) NEVER invent remedy names, herb doses, or clinical trial citations. Insert [VERIFY] where specific evidence is needed.
(c) Conditions that may require urgent conventional medical intervention (suspected malignancy, fracture, cardiac, neurological emergency) MUST be flagged [REFER — ASSESS URGENTLY].
(d) Frame every output as a draft for the practitioner''s own review, clearly noting that holistic treatments are complementary and do not replace conventional medical care where indicated.
(e) Respect patient privacy: do not reproduce information beyond what is needed for the documentation task.

OUTPUT FORMAT: Return valid HTML (use <h1>–<h3>, <p>, <strong>, <ul>/<li>). No markdown. Include [DATE], [PATIENT NAME] placeholders where needed.',
 '🌿 AI-assisted documentation aid — always apply your professional training and judgement before finalising.',
 true, 'Remedies & Herbs', 'studio'),

('careplan',
 'Care Plan',
 'GUARDRAIL — CARE DOCUMENTATION AID:
(a) You are a documentation support tool. All output is a draft for the carer/nurse''s review, adaptation, and sign-off. It does not constitute clinical advice.
(b) Escalation triggers (medication errors, falls, signs of deterioration, safeguarding concerns) MUST be flagged [ESCALATE — ACT NOW] and the carer must be advised to contact the supervising nurse or emergency services as appropriate.
(c) Medication information is for documentation only — NEVER advise on dosage adjustments. All medication changes require prescriber authorisation.
(d) Frame every document as a professional care record for the carer''s own review — not as autonomous care advice.
(e) Respect client privacy and dignity: do not reproduce information beyond what is needed for the documentation task.

OUTPUT FORMAT: Return valid HTML (use <h1>–<h3>, <p>, <strong>, <ul>/<li>, <ol>/<li>). No markdown. Include [DATE], [CLIENT NAME], [CARER NAME] placeholders where needed.',
 '🏥 AI-assisted care documentation aid — always verify with the supervising nurse and care plan before acting.',
 true, 'Care Tasks', 'studio')

ON CONFLICT (id) DO NOTHING;

-- ── 2. Studio modes ───────────────────────────────────────────────────────────

-- ── rehab modes ──────────────────────────────────────────────────────────────

INSERT INTO studio_modes (archetype_id, key, label, sort_order, form_schema, prompt_instructions, output_format) VALUES

('rehab', 'assess', 'Assess', 1,
'[
  {"id":"chief_complaint","label":"Chief complaint","type":"textarea","placeholder":"e.g. Right knee pain following a fall, 3 weeks ago","required":true,"group":"subjective","rows":2},
  {"id":"pain_score","label":"Pain score (0–10)","type":"text","placeholder":"e.g. 6/10 at rest, 9/10 with activity","required":false,"group":"subjective"},
  {"id":"onset","label":"Onset & mechanism","type":"textarea","placeholder":"e.g. Gradual onset, aggravated by stairs","required":false,"group":"subjective","rows":2},
  {"id":"aggravating","label":"Aggravating factors","type":"text","placeholder":"e.g. Stairs, prolonged sitting","required":false,"group":"subjective"},
  {"id":"easing","label":"Easing factors","type":"text","placeholder":"e.g. Rest, ice, elevation","required":false,"group":"subjective"},
  {"id":"past_history","label":"Past history / PMH","type":"textarea","placeholder":"e.g. Previous knee surgery 2018, hypertension","required":false,"group":"subjective","rows":2},
  {"id":"medications","label":"Current medications","type":"text","placeholder":"e.g. Ibuprofen 400mg PRN","required":false,"group":"subjective"},
  {"id":"observation","label":"Observation","type":"textarea","placeholder":"e.g. Antalgic gait, mild effusion right knee","required":false,"group":"objective","rows":2},
  {"id":"rom_findings","label":"Range of motion","type":"textarea","placeholder":"e.g. Knee flexion 90° restricted, extension full","required":false,"group":"objective","rows":2},
  {"id":"strength_findings","label":"Strength / MMT","type":"textarea","placeholder":"e.g. Quadriceps 3/5 right, hamstrings 4/5","required":false,"group":"objective","rows":2},
  {"id":"special_tests","label":"Special tests","type":"textarea","placeholder":"e.g. Positive Lachman, negative McMurray","required":false,"group":"objective","rows":2},
  {"id":"palpation","label":"Palpation","type":"text","placeholder":"e.g. Tender medial joint line, no crepitus","required":false,"group":"objective"},
  {"id":"red_flags","label":"Red-flag screening","type":"textarea","placeholder":"e.g. No cauda equina, no night pain, no unexplained weight loss","required":false,"group":"safety","rows":2}
]',
'Please generate a structured initial evaluation note from the assessment data above. Include: subjective summary, objective findings summary, red-flag screening outcome, clinical impression (not a diagnosis), and recommended next steps. Flag any red flags with [RED FLAG — ASSESS URGENTLY]. Return as valid HTML — no markdown.',
'html'),

('rehab', 'note', 'Note', 2,
'[
  {"id":"patient_name","label":"Patient name","type":"text","placeholder":"e.g. Arjun Singh","required":false,"group":"context"},
  {"id":"diagnosis","label":"Diagnosis / condition","type":"text","placeholder":"e.g. Lumbar disc herniation L4/L5","required":false,"group":"context"},
  {"id":"treatment_goals","label":"Treatment goals","type":"textarea","placeholder":"e.g. Reduce pain to <3/10, return to work in 6 weeks","required":false,"group":"context","rows":2},
  {"id":"last_session","label":"Last session summary","type":"textarea","placeholder":"e.g. Introduced McKenzie extension, patient tolerated well","required":false,"group":"context","rows":2},
  {"id":"session_bullets","label":"Session notes (bullet points)","type":"textarea","placeholder":"• Treated lumbar region with mobilisation\n• Patient reported 30% improvement\n• HEP compliance good","required":true,"group":"main","rows":7}
]',
'Please generate a complete SOAP progress note (Subjective / Objective / Assessment / Plan) from the session data above. Reference the treatment goals in the Assessment section where available. Flag any new red flags. Return as valid HTML — no markdown.',
'html'),

('rehab', 'plan', 'Plan', 3,
'[
  {"id":"assessment_summary","label":"Assessment findings / clinical summary","type":"textarea","placeholder":"Summarise the key assessment findings: diagnosis, pain scores, ROM deficits, strength grades, functional limitations, and patient goals…","required":true,"group":"main","rows":7}
]',
'Please generate a structured treatment / care plan from the assessment findings above. Include: working diagnosis, SMART short-term goals (4–6 weeks), SMART long-term goals, proposed modalities and techniques, treatment frequency and duration, phased progression with criteria for advancement, outcome measures to track, and a home program summary. Return as valid HTML — no markdown.',
'html'),

('rehab', 'program', 'Program', 4,
'[
  {"id":"library_items","label":"Program items","type":"library","placeholder":"Browse the library to add exercises or activities","required":false,"group":"main"},
  {"id":"instructions","label":"General instructions / precautions","type":"text","placeholder":"e.g. Stop if you experience sharp or worsening pain. Perform daily.","required":false,"group":"main"}
]',
'Please generate a clear, patient-friendly Home Program handout from the items listed above. Format: title, introduction paragraph, numbered item list (bold item name, clear step-by-step instructions, sets/reps/hold/frequency), safety disclaimer at the end. Use plain English suitable for patient reading. Return as valid HTML — no markdown.',
'html'),

('rehab', 'report', 'Report', 5,
'[]',
'Please generate a complete, professional clinical report of the type specified. Use correct formatting (clear sections, professional language). Return as valid HTML — no markdown.',
'html'),

('rehab', 'refine', 'Refine', 6,
'[
  {"id":"instruction","label":"Refinement instruction","type":"text","placeholder":"e.g. Make the assessment section more concise · Add a patient education section · Simplify for patient reading","required":true,"group":"main"}
]',
'Apply the refinement instruction to the current document. Return the complete revised document as valid HTML — no markdown.',
'redline')

ON CONFLICT (archetype_id, key) DO NOTHING;

-- ── counseling modes ──────────────────────────────────────────────────────────

INSERT INTO studio_modes (archetype_id, key, label, sort_order, form_schema, prompt_instructions, output_format) VALUES

('counseling', 'intake', 'Intake', 1,
'[
  {"id":"presenting_concern","label":"Presenting concern","type":"textarea","placeholder":"e.g. Anxiety, low mood, relationship difficulties","required":true,"group":"main","rows":3},
  {"id":"onset","label":"Onset & history","type":"textarea","placeholder":"e.g. Symptoms for 6 months, triggered by job loss","required":false,"group":"main","rows":2},
  {"id":"current_symptoms","label":"Current symptoms","type":"textarea","placeholder":"e.g. Sleep disturbance, low motivation, social withdrawal","required":false,"group":"main","rows":2},
  {"id":"past_history","label":"Psychiatric / psychological history","type":"textarea","placeholder":"e.g. Previous depression 2019, CBT 8 sessions","required":false,"group":"context","rows":2},
  {"id":"medications","label":"Current medications","type":"text","placeholder":"e.g. Sertraline 50mg, no other medications","required":false,"group":"context"},
  {"id":"living_situation","label":"Living situation & supports","type":"text","placeholder":"e.g. Lives alone, close relationship with sister","required":false,"group":"context"},
  {"id":"goals","label":"Client''s goals for therapy","type":"textarea","placeholder":"e.g. Manage anxiety, improve relationships, return to work","required":false,"group":"context","rows":2},
  {"id":"risk_screening","label":"Risk screening","type":"textarea","placeholder":"e.g. Denies suicidal ideation, no self-harm history, supportive social network","required":true,"group":"safety","rows":2}
]',
'Please generate a structured client intake assessment summary from the information above. Include: presenting concern summary, relevant history, current mental status impression, risk and protective factors, preliminary formulation, and proposed therapeutic approach. Flag any safety concerns with [SAFETY CONCERN — ASSESS AND ESCALATE]. Return as valid HTML — no markdown.',
'html'),

('counseling', 'note', 'Session Note', 2,
'[
  {"id":"client_name","label":"Client initials","type":"text","placeholder":"e.g. S.M.","required":false,"group":"context"},
  {"id":"presenting_concern","label":"Presenting concern / diagnosis","type":"text","placeholder":"e.g. Generalised Anxiety Disorder","required":false,"group":"context"},
  {"id":"treatment_goals","label":"Active treatment goals","type":"textarea","placeholder":"e.g. Reduce anxiety, develop coping strategies, improve sleep","required":false,"group":"context","rows":2},
  {"id":"risk_update","label":"Current risk status","type":"text","placeholder":"e.g. No current risk; stable","required":false,"group":"context"},
  {"id":"note_format","label":"Note format","type":"select","options":[{"value":"DAP","label":"DAP (Data / Assessment / Plan)"},{"value":"BIRP","label":"BIRP (Behaviour / Intervention / Response / Plan)"},{"value":"SOAP","label":"SOAP (Subjective / Objective / Assessment / Plan)"}],"required":false,"group":"context"},
  {"id":"session_bullets","label":"Session notes (bullet points)","type":"textarea","placeholder":"• Client explored childhood patterns\n• Practised grounding techniques\n• Identified 3 cognitive distortions\n• Homework: thought record worksheet","required":true,"group":"main","rows":7}
]',
'Please generate a complete session note in the specified format (DAP, BIRP, or SOAP — default to DAP if not specified) from the session data above. Reference the active treatment goals in the Assessment/Plan section. Flag any safety concerns with [SAFETY CONCERN — ASSESS AND ESCALATE]. Return as valid HTML — no markdown.',
'html'),

('counseling', 'plan', 'Treatment Plan', 3,
'[
  {"id":"assessment_summary","label":"Clinical assessment summary","type":"textarea","placeholder":"Summarise the presenting concerns, diagnosis/formulation, strengths, and risk factors","required":true,"group":"main","rows":5},
  {"id":"theoretical_approach","label":"Therapeutic approach","type":"text","placeholder":"e.g. CBT, ACT, Trauma-informed, Narrative therapy, DBT","required":false,"group":"main"},
  {"id":"frequency","label":"Session frequency","type":"text","placeholder":"e.g. Weekly 50-min sessions for 12 weeks","required":false,"group":"main"}
]',
'Please generate a structured therapeutic treatment plan from the assessment above. Include: formulation summary, measurable therapeutic goals (SMART format), proposed modality and rationale, session frequency and duration, risk management plan, and review criteria. Return as valid HTML — no markdown.',
'html'),

('counseling', 'report', 'Report', 4,
'[]',
'Please generate a complete, professional report of the type specified. Maintain client confidentiality by using initials only. Use formal professional language. Return as valid HTML — no markdown.',
'html'),

('counseling', 'refine', 'Refine', 5,
'[
  {"id":"instruction","label":"Refinement instruction","type":"text","placeholder":"e.g. Make the assessment more concise · Add a risk management section · Adjust the language to be more strengths-based","required":true,"group":"main"}
]',
'Apply the refinement instruction to the current document. Return the complete revised document as valid HTML — no markdown.',
'redline')

ON CONFLICT (archetype_id, key) DO NOTHING;

-- ── holistic modes ────────────────────────────────────────────────────────────

INSERT INTO studio_modes (archetype_id, key, label, sort_order, form_schema, prompt_instructions, output_format) VALUES

('holistic', 'intake', 'Case Intake', 1,
'[
  {"id":"chief_complaint","label":"Chief complaint","type":"textarea","placeholder":"e.g. Chronic fatigue, recurrent headaches, digestive issues","required":true,"group":"main","rows":3},
  {"id":"symptom_history","label":"Symptom history & modalities","type":"textarea","placeholder":"e.g. Duration, onset, what makes it better or worse","required":true,"group":"main","rows":3},
  {"id":"past_medical","label":"Past medical history","type":"textarea","placeholder":"e.g. Previous illnesses, surgeries, allergies","required":false,"group":"context","rows":2},
  {"id":"family_history","label":"Family history","type":"text","placeholder":"e.g. Diabetes in mother, heart disease in father","required":false,"group":"context"},
  {"id":"lifestyle","label":"Lifestyle & diet","type":"textarea","placeholder":"e.g. Vegetarian diet, sedentary work, poor sleep","required":false,"group":"context","rows":2},
  {"id":"current_treatments","label":"Current treatments / medications","type":"text","placeholder":"e.g. Antihypertensives, multivitamins","required":false,"group":"context"},
  {"id":"mental_emotional","label":"Mental / emotional state","type":"textarea","placeholder":"e.g. Anxious, irritable, low energy, tendency to overthink","required":false,"group":"context","rows":2}
]',
'Please generate a structured case intake summary from the information above. Include: chief complaint, relevant history, physical and mental-emotional constitution overview, and areas requiring further investigation. Flag any conditions requiring urgent conventional medical referral with [REFER — ASSESS URGENTLY]. Return as valid HTML — no markdown.',
'html'),

('holistic', 'assess', 'Assessment', 2,
'[
  {"id":"case_summary","label":"Case summary for analysis","type":"textarea","placeholder":"Summarise the case: chief complaint, key symptoms, mental-emotional state, physical generals, and modalities","required":true,"group":"main","rows":5},
  {"id":"particular_symptoms","label":"Particular / characteristic symptoms","type":"textarea","placeholder":"e.g. Right-sided headache worse in the morning, better with cold water","required":false,"group":"main","rows":3},
  {"id":"mental_generals","label":"Mental generals","type":"textarea","placeholder":"e.g. Anxious about health, fastidious, fear of disease","required":false,"group":"main","rows":2},
  {"id":"physical_generals","label":"Physical generals","type":"textarea","placeholder":"e.g. Chilly patient, desires sweets, perspires on palms","required":false,"group":"main","rows":2}
]',
'Please generate a structured assessment from the case data above, appropriate to the practitioner''s modality (homoeopathic repertorisation analysis, dosha/prakriti assessment, or other holistic framework as indicated). Include: key symptom totality, constitution/prakriti/miasm analysis, differential remedy/herb/regimen considerations, and clinical impression. Flag conditions requiring urgent conventional medical review. Return as valid HTML — no markdown.',
'html'),

('holistic', 'regimen', 'Regimen Plan', 3,
'[
  {"id":"assessment_summary","label":"Assessment findings","type":"textarea","placeholder":"Summarise the case findings on which the regimen is based","required":true,"group":"main","rows":5},
  {"id":"remedy_or_direction","label":"Selected remedy / initial treatment direction (optional)","type":"text","placeholder":"e.g. Natrum muriaticum 200C / Vata-pacifying regimen","required":false,"group":"main"}
]',
'Please generate a structured holistic treatment regimen from the assessment above. Include: treatment rationale, proposed remedies/herbs/dietary guidelines with dosage and duration, lifestyle recommendations, follow-up schedule, and precautions or contraindications. Clearly note this is a complementary programme and advise the patient to maintain conventional medical care where needed. Return as valid HTML — no markdown.',
'html'),

('holistic', 'followup', 'Follow-up', 4,
'[
  {"id":"initial_complaint","label":"Initial chief complaint","type":"text","placeholder":"e.g. Chronic fatigue and headaches","required":false,"group":"context"},
  {"id":"previous_remedy","label":"Previous remedy / regimen","type":"text","placeholder":"e.g. Natrum muriaticum 200C × 4 weeks","required":false,"group":"context"},
  {"id":"session_bullets","label":"Follow-up notes (bullet points)","type":"textarea","placeholder":"• Patient reports 50% improvement in headaches\n• Sleep quality improved\n• Energy levels still low\n• Digestive symptoms unchanged","required":true,"group":"main","rows":6}
]',
'Please generate a structured follow-up consultation note from the information above. Include: response to treatment summary, changes in chief complaint and associated symptoms, revised assessment, changes to the regimen (if any), and next follow-up plan. Return as valid HTML — no markdown.',
'html'),

('holistic', 'report', 'Report', 5,
'[]',
'Please generate a complete, professional report of the type specified. Return as valid HTML — no markdown.',
'html'),

('holistic', 'refine', 'Refine', 6,
'[
  {"id":"instruction","label":"Refinement instruction","type":"text","placeholder":"e.g. Add more detail on dietary guidelines · Simplify the language for patient reading","required":true,"group":"main"}
]',
'Apply the refinement instruction to the current document. Return the complete revised document as valid HTML — no markdown.',
'redline')

ON CONFLICT (archetype_id, key) DO NOTHING;

-- ── careplan modes ────────────────────────────────────────────────────────────

INSERT INTO studio_modes (archetype_id, key, label, sort_order, form_schema, prompt_instructions, output_format) VALUES

('careplan', 'assess', 'Assess', 1,
'[
  {"id":"client_profile","label":"Client profile","type":"textarea","placeholder":"e.g. Mrs. Kavitha, 78F, post-hip replacement, lives alone","required":true,"group":"main","rows":3},
  {"id":"medical_conditions","label":"Medical conditions","type":"textarea","placeholder":"e.g. Type 2 diabetes, mild cognitive impairment, hypertension","required":true,"group":"main","rows":2},
  {"id":"current_medications","label":"Current medications","type":"textarea","placeholder":"e.g. Metformin 500mg twice daily, Amlodipine 5mg once daily","required":false,"group":"main","rows":2},
  {"id":"functional_status","label":"Functional status","type":"textarea","placeholder":"e.g. Requires assistance with bathing and dressing; independent with meals","required":true,"group":"context","rows":2},
  {"id":"mobility","label":"Mobility & safety risks","type":"textarea","placeholder":"e.g. Uses walker indoors; fall risk high; no grab rails","required":false,"group":"context","rows":2},
  {"id":"emotional_wellbeing","label":"Emotional wellbeing / cognitive status","type":"textarea","placeholder":"e.g. Some confusion at night, feels isolated","required":false,"group":"context","rows":2},
  {"id":"preferences","label":"Client preferences & goals","type":"textarea","placeholder":"e.g. Wants to remain at home; priorities: pain management and social connection","required":false,"group":"context","rows":2},
  {"id":"family_context","label":"Family / carer context","type":"text","placeholder":"e.g. Daughter visits weekends; no other family","required":false,"group":"context"}
]',
'Please generate a structured needs assessment from the client information above. Include: client profile summary, medical and functional overview, risk assessment (falls, pressure injury, medication safety, nutrition, safeguarding), support needs summary, and recommendations for the care plan. Flag urgent concerns with [ESCALATE — ACT NOW]. Return as valid HTML — no markdown.',
'html'),

('careplan', 'careplan', 'Care Plan', 2,
'[
  {"id":"assessment_summary","label":"Assessment summary","type":"textarea","placeholder":"Summarise the client profile, conditions, functional status, and goals on which the care plan is based","required":true,"group":"main","rows":7}
]',
'Please generate a comprehensive care plan from the assessment above. Include: care goals (SMART format), identified care needs by domain (personal care, nutrition, medication, mobility, social/emotional, safety), care interventions for each need, responsibilities, review schedule, and emergency contact / escalation protocol. Return as valid HTML — no markdown.',
'html'),

('careplan', 'note', 'Visit Note', 3,
'[
  {"id":"client_name","label":"Client name","type":"text","placeholder":"e.g. Mrs. Kavitha","required":false,"group":"context"},
  {"id":"visit_type","label":"Visit type / shift","type":"text","placeholder":"e.g. Morning visit 07:00–10:00 / Night shift","required":false,"group":"context"},
  {"id":"care_plan_goals","label":"Active care plan goals","type":"textarea","placeholder":"e.g. Independence with meals, fall prevention, medication management","required":false,"group":"context","rows":2},
  {"id":"session_bullets","label":"Visit / shift notes (bullet points)","type":"textarea","placeholder":"• Assisted with morning routine: bathing, dressing\n• Administered medications as prescribed\n• Client appeared in good spirits\n• Noted mild ankle swelling — right foot","required":true,"group":"main","rows":7}
]',
'Please generate a structured visit / shift note from the information above. Include: care activities completed, client''s condition and mood, any changes or concerns observed (flag serious concerns with [ESCALATE — ACT NOW]), medications administered, and handover points for the next carer. Return as valid HTML — no markdown.',
'html'),

('careplan', 'schedule', 'Schedule', 4,
'[
  {"id":"client_name","label":"Client name","type":"text","placeholder":"e.g. Mrs. Kavitha","required":true,"group":"main"},
  {"id":"medications","label":"Medications & timing","type":"textarea","placeholder":"e.g. Metformin 500mg with breakfast and dinner; Amlodipine 5mg with breakfast","required":false,"group":"main","rows":3},
  {"id":"care_tasks","label":"Care tasks & timing","type":"textarea","placeholder":"e.g. Morning: bathing, dressing, breakfast; Evening: medication, light meal, safety check","required":false,"group":"main","rows":3},
  {"id":"special_notes","label":"Special instructions / precautions","type":"textarea","placeholder":"e.g. Check blood sugar before insulin; no slip-on footwear; call GP if temperature >38°C","required":false,"group":"main","rows":2}
]',
'Please generate a clear daily care schedule from the information above. Format as a timed schedule with clear sections for morning, afternoon, and evening routines. Include medication reminders, care tasks, and safety checks. Add an escalation contacts section at the end. Return as valid HTML — no markdown.',
'html'),

('careplan', 'report', 'Report', 5,
'[]',
'Please generate a complete, professional care report of the type specified. Return as valid HTML — no markdown.',
'html'),

('careplan', 'refine', 'Refine', 6,
'[
  {"id":"instruction","label":"Refinement instruction","type":"text","placeholder":"e.g. Add an escalation protocol · Simplify the language for family carers · Update the medication section","required":true,"group":"main"}
]',
'Apply the refinement instruction to the current document. Return the complete revised document as valid HTML — no markdown.',
'redline')

ON CONFLICT (archetype_id, key) DO NOTHING;

-- ── 3. System report templates ────────────────────────────────────────────────

-- counseling templates
INSERT INTO studio_templates (persona, doc_type, label, description, fields, is_system, provider_id) VALUES

('counselor', 'intake_summary', 'Intake Assessment Summary',
 'Formal summary of the initial client assessment',
 '[
   {"id":"client_initials","label":"Client initials & DOB","placeholder":"e.g. S.M., 15 Mar 1988","required":true},
   {"id":"referral_source","label":"Referral source","placeholder":"e.g. Self-referral / GP Dr. Sharma","required":false},
   {"id":"presenting_concern","label":"Presenting concern","placeholder":"e.g. Anxiety and low mood following redundancy","required":true},
   {"id":"history","label":"Relevant history","placeholder":"e.g. Previous episode of depression 2019, CBT 8 sessions","required":false},
   {"id":"risk","label":"Risk assessment","placeholder":"e.g. No current suicidal ideation; supportive social network","required":true},
   {"id":"formulation","label":"Preliminary formulation","placeholder":"Brief cognitive/biopsychosocial formulation","required":false},
   {"id":"plan","label":"Proposed treatment","placeholder":"e.g. CBT, 12 weekly sessions focusing on cognitive restructuring","required":true}
 ]',
 true, null),

('counselor', 'progress_report', 'Progress Report',
 'Interim progress report for GP, insurer, or EAP',
 '[
   {"id":"client_initials","label":"Client initials","placeholder":"e.g. S.M.","required":true},
   {"id":"report_period","label":"Report period","placeholder":"e.g. Sessions 1–8, 01 Jun – 30 Jul 2026","required":true},
   {"id":"presenting_concern","label":"Presenting concern","placeholder":"e.g. Generalised Anxiety Disorder","required":true},
   {"id":"progress","label":"Clinical progress","placeholder":"Summary of improvement in symptoms, mood, and functioning","required":true},
   {"id":"interventions","label":"Interventions used","placeholder":"e.g. Thought records, behavioural activation, relaxation techniques","required":false},
   {"id":"plan","label":"Ongoing plan","placeholder":"e.g. Continue weekly CBT for 4 more sessions; focus on relapse prevention","required":false}
 ]',
 true, null),

('counselor', 'discharge_summary', 'Discharge Summary',
 'Summary of treatment course and outcomes on discharge',
 '[
   {"id":"client_initials","label":"Client initials","placeholder":"e.g. S.M.","required":true},
   {"id":"treatment_period","label":"Treatment period","placeholder":"e.g. 01 May – 15 Jul 2026 (12 sessions)","required":true},
   {"id":"presenting_concern","label":"Initial presenting concern","placeholder":"e.g. Anxiety and low mood","required":true},
   {"id":"interventions","label":"Interventions provided","placeholder":"e.g. CBT — cognitive restructuring, behavioural activation, relapse prevention","required":true},
   {"id":"outcome","label":"Outcome achieved","placeholder":"e.g. Significant reduction in anxiety; client reports return to normal functioning","required":true},
   {"id":"relapse_plan","label":"Relapse prevention plan","placeholder":"e.g. Coping strategies identified; re-refer if symptoms recur for >2 weeks","required":false}
 ]',
 true, null);

-- holistic templates
INSERT INTO studio_templates (persona, doc_type, label, description, fields, is_system, provider_id) VALUES

('homeopath', 'case_report', 'Case Report',
 'Comprehensive homoeopathic case report',
 '[
   {"id":"patient_name","label":"Patient name & DOB","placeholder":"e.g. Lakshmi Rao, 22 Aug 1975","required":true},
   {"id":"chief_complaint","label":"Chief complaint with modalities","placeholder":"e.g. Right-sided migraine, worse mornings, better cold, worse noise and light","required":true},
   {"id":"associated_symptoms","label":"Associated / concomitant symptoms","placeholder":"e.g. Nausea, photophobia, irritability during headache","required":false},
   {"id":"constitution","label":"Constitution & mental generals","placeholder":"e.g. Fastidious, chilly, desires company, fear of disease","required":false},
   {"id":"remedy","label":"Prescribed remedy & potency","placeholder":"e.g. Natrum muriaticum 200C, single dose","required":true},
   {"id":"follow_up_plan","label":"Follow-up plan","placeholder":"e.g. Review in 4 weeks; wait and watch approach","required":false}
 ]',
 true, null),

('ayurveda', 'prakriti_report', 'Prakriti Assessment Report',
 'Comprehensive Ayurvedic constitution assessment',
 '[
   {"id":"patient_name","label":"Patient name & DOB","placeholder":"e.g. Ravi Kumar, 10 Jan 1980","required":true},
   {"id":"chief_complaint","label":"Chief complaint","placeholder":"e.g. Chronic digestive issues and fatigue","required":true},
   {"id":"prakriti","label":"Prakriti (constitution)","placeholder":"e.g. Predominantly Vata-Pitta","required":true},
   {"id":"vikriti","label":"Vikriti (current imbalance)","placeholder":"e.g. Elevated Pitta and Vata","required":false},
   {"id":"regimen","label":"Proposed regimen","placeholder":"e.g. Pitta-pacifying diet, Ashwagandha rasayana, Abhyanga","required":true},
   {"id":"lifestyle","label":"Lifestyle recommendations","placeholder":"e.g. Daily routine, sleep hygiene, stress management","required":false}
 ]',
 true, null);

-- careplan templates
INSERT INTO studio_templates (persona, doc_type, label, description, fields, is_system, provider_id) VALUES

('homenurse', 'handover_report', 'Handover Report',
 'End-of-shift handover for the incoming carer',
 '[
   {"id":"client_name","label":"Client name","placeholder":"e.g. Mrs. Kavitha Reddy","required":true},
   {"id":"shift_period","label":"Shift period","placeholder":"e.g. Night shift 22:00–07:00, 12 Jul 2026","required":true},
   {"id":"care_completed","label":"Care activities completed","placeholder":"Summary of personal care, medications, meals, and activities","required":true},
   {"id":"observations","label":"Observations & incidents","placeholder":"Any changes in condition, falls, medication issues, or behaviour","required":true},
   {"id":"outstanding_tasks","label":"Outstanding tasks for next shift","placeholder":"e.g. District nurse visit at 10am; request GP call re: ankle swelling","required":false},
   {"id":"client_mood","label":"Client mood & wellbeing","placeholder":"e.g. Settled, slept well, appeared anxious at 03:00","required":false}
 ]',
 true, null),

('postnatal', 'postnatal_plan', 'Postnatal Care Plan',
 'Structured postnatal care plan for mother and baby',
 '[
   {"id":"mother_name","label":"Mother''s name & delivery date","placeholder":"e.g. Priya Sharma, delivered 10 Jul 2026","required":true},
   {"id":"delivery_summary","label":"Delivery summary","placeholder":"e.g. Normal vaginal delivery, 3.4 kg baby girl, no complications","required":false},
   {"id":"current_concerns","label":"Current concerns","placeholder":"e.g. Perineal discomfort, breastfeeding challenges, sleep deprivation","required":true},
   {"id":"care_priorities","label":"Care priorities","placeholder":"e.g. Wound care, breastfeeding support, maternal mental health screening","required":true},
   {"id":"support_network","label":"Support network","placeholder":"e.g. Husband at home for 2 weeks; mother-in-law visiting","required":false}
 ]',
 true, null),

('lactation', 'lactation_assessment', 'Lactation Assessment',
 'Initial breastfeeding assessment and support plan',
 '[
   {"id":"mother_name","label":"Mother''s name & baby''s DOB","placeholder":"e.g. Sunita Pillai, baby born 08 Jul 2026","required":true},
   {"id":"feeding_history","label":"Feeding history","placeholder":"e.g. Exclusively breastfeeding, 8–10 feeds/day; latch difficulties since day 3","required":true},
   {"id":"breast_exam","label":"Breast & nipple assessment","placeholder":"e.g. Nipple cracking right side, no mastitis signs; engorgement grade 2","required":false},
   {"id":"latch_observation","label":"Latch & feeding observation","placeholder":"e.g. Poor latch — shallow, clicking, pain 8/10; infant weight 4% below birth weight","required":true},
   {"id":"plan","label":"Support plan","placeholder":"e.g. Latch correction technique demonstrated; nipple shield trial; review in 48h","required":true}
 ]',
 true, null);

-- ── 4. Starter library items for counseling, holistic, and careplan personas ──

-- counseling interventions
INSERT INTO studio_library (persona, category, name, description, instructions, meta, tags, is_system, provider_id) VALUES

('counselor', 'CBT', 'Thought Record (7-Column)',
 'Core CBT technique for identifying and challenging automatic negative thoughts.',
 'Complete the 7 columns: (1) Situation — when and where did it happen? (2) Emotions — what did you feel? Rate 0–100%. (3) Automatic thought — what went through your mind? (4) Evidence FOR the thought. (5) Evidence AGAINST the thought. (6) Balanced thought — write a more balanced perspective. (7) Outcome — re-rate the emotion 0–100%.',
 '{"estimated_duration_min": 20, "difficulty": "beginner"}',
 '["CBT","thoughts","emotions","beginner"]', true, null),

('counselor', 'CBT', 'Behavioural Activation',
 'Scheduling pleasurable and meaningful activities to counteract depression-related avoidance.',
 'With your client: (1) Identify activities the client used to enjoy or find meaningful that they have reduced since feeling depressed. (2) Rate each activity for pleasure and mastery (0–10). (3) Schedule 1–2 small activities per day in a diary. (4) Review at the next session: did they do it? How did they feel before and after?',
 '{"estimated_duration_min": 30, "difficulty": "beginner"}',
 '["CBT","depression","activity","behavioural activation","beginner"]', true, null),

('counselor', 'ACT', '5-4-3-2-1 Grounding',
 'Sensory grounding exercise for anxiety and dissociation.',
 'Guide the client through: name 5 things you can SEE, 4 things you can TOUCH, 3 things you can HEAR, 2 things you can SMELL, 1 thing you can TASTE. Breathe slowly between each sense. This anchors attention in the present moment.',
 '{"estimated_duration_min": 5, "difficulty": "beginner"}',
 '["grounding","anxiety","mindfulness","sensory","beginner"]', true, null),

('counselor', 'DBT', 'TIPP Skills (Emotion Regulation)',
 'DBT skills for rapidly reducing intense emotions.',
 'TIPP stands for: (T) Temperature — apply cold water to face or hold ice to trigger the dive reflex and reduce emotional arousal. (I) Intense exercise — do 20 minutes of vigorous exercise to discharge emotional energy. (PP) Paced breathing — inhale for 4 counts, exhale for 6 counts. (P) Paired muscle relaxation — tense each muscle group for 5 seconds, then release.',
 '{"estimated_duration_min": 15, "difficulty": "beginner"}',
 '["DBT","emotion regulation","distress tolerance","beginner"]', true, null),

('counselor', 'mindfulness', 'Box Breathing',
 'Structured breathing technique for calming the nervous system.',
 'Breathe IN for 4 counts → HOLD for 4 counts → breathe OUT for 4 counts → HOLD for 4 counts. Repeat 4–6 cycles. Suitable for anxiety, panic, and pre-session grounding.',
 '{"estimated_duration_min": 5, "difficulty": "beginner"}',
 '["breathing","anxiety","regulation","mindfulness","beginner"]', true, null);

-- holistic library — homeopathy
INSERT INTO studio_library (persona, category, name, description, instructions, meta, tags, is_system, provider_id) VALUES

('homeopath', 'polychrests', 'Natrum Muriaticum',
 'Deep-acting constitutional remedy. Key indications: grief, suppressed emotions, headaches, dry mucous membranes.',
 'Consider in patients with: history of grief or loss (especially if suppressed or "cried it out"); desire for salt; aversion to consolation; worse at 10am; better at seaside. Mental: reserved, sensitive, holds grudges. Physical: migraines, herpes labialis, skin cracks. Potency: constitutional — 200C or higher.',
 '{"modality":"better_open_air_worse_sun","constitutional_type":"chilly_to_neutral","miasm":"sycotic_psoric"}',
 '["constitutional","grief","headache","skin","polychrest"]', true, null),

('homeopath', 'polychrests', 'Sulphur',
 'Deep-acting polychrest. Key indications: skin conditions, burning sensations, philosophical mind, untidy habits.',
 'Consider in patients with: burning heat, offensive discharges, skin eruptions that are relieved by scratching; desires sweets and alcohol; worse from warmth and bathing; better in open air. Mental: theoretical/philosophical, untidy, selfish. Often useful as an "opener" when case is unclear.',
 '{"modality":"worse_warmth_better_open_air","constitutional_type":"warm","miasm":"psoric"}',
 '["constitutional","skin","burning","itching","polychrest"]', true, null),

('ayurveda', 'vata_herbs', 'Ashwagandha (Withania somnifera)',
 'Adaptogenic rasayana. Primary actions: nervine tonic, adaptogen, anti-inflammatory. Balances Vata and Kapha.',
 'Indication: Vata excess — anxiety, insomnia, fatigue, low body weight, pain, weakness. Dose (standard): 3–6g powder with warm milk and ghee, twice daily. Duration: 3–6 months minimum. Contraindications: pregnancy, autoimmune conditions, thyroid disorders (use with caution).',
 '{"dosage_form":"churna/capsule","typical_dose":"3–6g twice daily","contraindications":"pregnancy, hyperthyroid"}',
 '["adaptogen","vata","nervine","rasayana","ashwagandha"]', true, null),

('ayurveda', 'pitta_herbs', 'Shatavari (Asparagus racemosus)',
 'Rasayana and female reproductive tonic. Balances Pitta and Vata. Cooling in nature.',
 'Indication: Pitta excess in reproductive system, menopausal symptoms, acidity, inflammation, post-partum debility. Dose: 3–6g powder with cool milk, twice daily, or as per formulation. Also used for lactation support. Contraindications: oestrogen-sensitive conditions.',
 '{"dosage_form":"churna/tablet","typical_dose":"3–6g twice daily","contraindications":"oestrogen-sensitive conditions"}',
 '["pitta","female","reproductive","lactation","shatavari"]', true, null);

-- careplan library — care tasks
INSERT INTO studio_library (persona, category, name, description, instructions, meta, tags, is_system, provider_id) VALUES

('homenurse', 'personal_care', 'Morning Personal Care Routine',
 'Standard morning personal care sequence for dependent clients.',
 '(1) Greet client and explain what you will do. (2) Assist to bathroom or bring basin. (3) Oral hygiene — brush teeth and clean dentures if applicable. (4) Face wash. (5) Bathing/shower — assist as needed, check skin for redness or pressure areas. (6) Drying, moisturising. (7) Hair combing. (8) Assist with dressing — encourage independence where possible. (9) Ensure comfortable positioning. Document any skin changes.',
 '{"frequency":"daily","duration":"30-45 min","equipment_needed":"basin, towels, moisturiser, non-slip mat"}',
 '["personal care","ADL","morning","hygiene","beginner"]', true, null),

('homenurse', 'medication', 'Medication Administration Check',
 'Standard check before administering any prescribed medication.',
 'Before administering: (1) Check the medication against the prescribed care plan — RIGHT medication, dose, route, time, client. (2) Check expiry date. (3) Wash hands. (4) Help client to comfortable position. (5) Administer with water unless specified otherwise. (6) Stay with client until medication is taken. (7) Document in medication record immediately. Escalate if client refuses or appears unwell.',
 '{"frequency":"as prescribed","duration":"10 min","equipment_needed":"medication record, water glass"}',
 '["medication","safety","documentation","intermediate"]', true, null),

('postnatal', 'postpartum_recovery', 'Perineal Care',
 'Post-delivery perineal wound care and hygiene guidance.',
 '(1) Wash hands thoroughly. (2) Use warm water (and salt if advised) to gently clean the perineal area after each toilet visit — pat dry, do not rub. (3) Apply any prescribed topical treatment. (4) Use ice pack wrapped in cloth for first 24–48h to reduce swelling. (5) Advise mother to change pads regularly (at least every 2–4 hours). (6) Observe for signs of infection (increasing pain, swelling, offensive discharge, fever) — refer urgently if present.',
 '{"frequency":"after each toilet visit","duration":"5 min"}',
 '["postnatal","perineal","wound care","hygiene","beginner"]', true, null),

('lactation', 'breastfeeding_techniques', 'Latch Correction — Cross-Cradle Hold',
 'Technique for achieving a deep, comfortable latch using the cross-cradle hold.',
 '(1) Position baby facing mother, tummy-to-tummy. (2) Mother''s opposite hand to the feeding breast supports the baby''s head at the nape of neck (not back of head). (3) Mother''s same-side hand cups the breast — finger and thumb behind the areola, not on it. (4) Bring baby to breast when mouth is WIDE open (chin leads first). (5) Baby''s chin should be in breast, nose clear. (6) Signs of good latch: no pain after first 10-15 seconds, asymmetric latch (more areola below), rhythmic swallowing. Document latch score and feeding duration.',
 '{"frequency":"each feed","duration":"10-30 min per feed"}',
 '["latch","breastfeeding","technique","beginner"]', true, null);

-- ── 5. Persona rows ────────────────────────────────────────────────────────────

-- Update existing physio row with studio_archetype
UPDATE personas SET
  studio_archetype = 'rehab',
  studio_guidance  = 'DOMAIN: PHYSIOTHERAPY

You are assisting a physiotherapist with clinical documentation. All work must reflect physiotherapy professional standards.

SCOPE AND SAFETY:
You are a documentation aid for physiotherapy practice. Red-flag conditions (cauda equina syndrome, suspected fracture, malignancy, stroke, septic arthritis, spinal instability, vascular compromise) must be flagged prominently in any generated document.

DOCUMENTATION MODES:
- ASSESS: Generate a structured initial physiotherapy evaluation note. Include provisional clinical impression (not a diagnosis), red-flag screening summary, and recommended next steps.
- NOTE: Generate a SOAP progress note (Subjective/Objective/Assessment/Plan) for a follow-up session. Reference treatment plan goals where available.
- PLAN: Generate a structured physiotherapy treatment plan with SMART goals, proposed modalities, frequency/duration, phase criteria, and outcome measures.
- PROGRAM: Generate a patient-friendly Home Exercise Program (HEP) handout. Plain English, numbered steps, sets/reps/hold/frequency, safety disclaimer.
- REPORT: Generate the requested clinical document type (referral letter, discharge summary, progress report, insurance report, return-to-work certificate).

CLINICAL CONVENTIONS:
- Standardised abbreviations: ROM (range of motion), MMT (manual muscle test), VAS/NPRS (pain scales), HEP (home exercise program), AROM/PROM/RROM, SLR (straight leg raise), TrPs (trigger points).
- SOAP structure: Subjective → Objective → Assessment → Plan.
- Outcome measure auto-scoring: VAS (0–10), NPRS (0–10), Oswestry Disability Index (%), DASH, LEFS, Berg Balance Scale when raw values are provided.',
  studio_config    = '{"patient_noun":"patient","patient_noun_plural":"patients","library_label":"Exercises","library_categories":["lumbar","cervical","shoulder","hip","knee","ankle","core","balance","breathing","general","upper_limb"]}'
WHERE id = 'physio';

-- 9 new healthcare personas
INSERT INTO personas (id, label, emoji, enabled, sort_order, template, palette, font, needs_config, studio_archetype, studio_guidance, studio_config) VALUES

('occtherapist', 'Occupational Therapist', '🧩', true, 13, 'clinic', 'calm', 'inter', false, 'rehab',
'DOMAIN: OCCUPATIONAL THERAPY

You are assisting an occupational therapist (OT) with clinical documentation. All work must reflect OT professional standards.

SCOPE AND SAFETY:
You are a documentation aid for occupational therapy practice. Concerns regarding client safety, safeguarding, fall risk, cognitive decline, or urgent medical needs must be flagged prominently.

DOCUMENTATION MODES:
- ASSESS: Generate a structured OT assessment. Include functional/occupational performance analysis, ADL independence levels, cognitive/perceptual screening, home safety concerns, and recommendations.
- NOTE: Generate a session note documenting OT intervention, client response, and progress toward functional goals.
- PLAN: Generate an OT intervention plan with occupational goals, graded activities, environmental modifications, and assistive device recommendations.
- PROGRAM: Generate a home activity program with graded tasks for ADL retraining, sensory integration, or cognitive rehabilitation.
- REPORT: Generate the requested clinical document.

OT CONVENTIONS:
- Frame outcomes in terms of occupational performance (self-care, productivity, leisure).
- Use SMART goals tied to meaningful occupations and roles.
- Reference MOHO, CMOP, or other OT frameworks where appropriate.
- ADL independence levels: Dependent / Minimal Assist / Moderate Assist / Maximal Assist / Modified Independent / Independent.',
'{"patient_noun":"client","patient_noun_plural":"clients","library_label":"Activities","library_categories":["daily_living","fine_motor","cognitive","sensory","upper_limb","work_rehab","leisure"]}'),

('speech', 'Speech Therapist', '🗣️', true, 14, 'clinic', 'calm', 'inter', false, 'rehab',
'DOMAIN: SPEECH-LANGUAGE THERAPY

You are assisting a speech-language therapist (SLT/SLP) with clinical documentation. All work must reflect SLT professional standards.

SCOPE AND SAFETY:
You are a documentation aid for speech-language therapy practice. Dysphagia red flags (aspiration, silent aspiration, rapid deterioration) and communication emergency indicators must be flagged prominently.

DOCUMENTATION MODES:
- ASSESS: Generate a structured SLT assessment covering the relevant domain(s): articulation/phonology, language (expressive/receptive), fluency/stammering, voice, dysphagia/swallowing, augmentative and alternative communication (AAC).
- NOTE: Generate a session note documenting SLT intervention, client/carer response, and progress toward communication or swallowing goals.
- PLAN: Generate an SLT intervention plan with functional communication/swallowing goals, proposed therapy techniques, home practice, and family/carer guidance.
- PROGRAM: Generate a home practice program with exercises or activities targeting specific speech, language, or swallowing targets.
- REPORT: Generate the requested clinical document.

SLT CONVENTIONS:
- Document baseline performance (e.g. GFTA-3 scores, PCC%, intelligibility %, SIC, Likert scales) and progress metrics.
- Use evidence-based therapy references (e.g. PROMPT, Lidcombe, Lee Silverman Voice Treatment) where applicable.
- Dysphagia: document IDDSI level recommendations and modified texture/fluid guidance clearly.',
'{"patient_noun":"client","patient_noun_plural":"clients","library_label":"Activities","library_categories":["articulation","language","fluency","voice","swallowing","augmentative","cognitive_communication"]}'),

('chiro', 'Chiropractor / Osteopath', '🦴', true, 15, 'clinic', 'calm', 'inter', false, 'rehab',
'DOMAIN: CHIROPRACTIC / OSTEOPATHY

You are assisting a chiropractor or osteopath with clinical documentation. All work must reflect chiropractic/osteopathic professional standards.

SCOPE AND SAFETY:
You are a documentation aid for chiropractic/osteopathic practice. Red-flag conditions (vertebrobasilar insufficiency, cauda equina, suspected fracture, malignancy, AAA, inflammatory arthropathy) must be flagged prominently before any adjustment/manipulation is documented.

DOCUMENTATION MODES:
- ASSESS: Generate a structured initial consultation note. Include postural analysis, orthopaedic and neurological screening, spinal motion assessment, and clinical impression.
- NOTE: Generate a follow-up consultation note documenting treatment techniques, spinal adjustments, soft-tissue work, and patient response.
- PLAN: Generate a structured treatment plan with goals, adjustment schedule, modalities, home care, and lifestyle advice.
- PROGRAM: Generate a home care/exercise program including corrective exercises, stretches, and postural advice.
- REPORT: Generate the requested clinical document.

CHIRO/OSTEO CONVENTIONS:
- Document spinal levels using standard notation (e.g. C5, T4/5, L4/5, SI joint).
- Record adjustment techniques (HVLA, mobilisation, SOT, activator, craniosacral, etc.) and grades.
- Document consent obtained for manipulation and red-flag screening outcome before treatment.',
'{"patient_noun":"patient","patient_noun_plural":"patients","library_label":"Exercises","library_categories":["cervical","thoracic","lumbar","extremity","rehabilitation","posture","wellness"]}'),

('counselor', 'Therapist / Counselor', '🧠', true, 16, 'clinic', 'calm', 'inter', false, 'counseling',
'DOMAIN: COUNSELING AND PSYCHOTHERAPY

You are assisting a therapist or counsellor with clinical documentation. All work must reflect therapeutic professional and ethical standards.

SCOPE AND SAFETY:
You are a documentation aid for counseling/psychotherapy practice. Risk and safety concerns (suicidal ideation, self-harm, risk to others, psychosis, safeguarding) MUST be flagged prominently, and the therapist must be reminded to follow their duty-of-care and mandatory reporting obligations.

DOCUMENTATION CONVENTIONS:
- Maintain clinical objectivity and avoid language that could be stigmatising.
- Use initials or minimal identifiers to protect client confidentiality.
- Therapeutic modalities to draw from as indicated: CBT, ACT, DBT, trauma-informed (TI-CBT, EMDR, somatic), person-centred, narrative, psychodynamic, solution-focused.
- Session note formats: DAP (Data/Assessment/Plan), BIRP (Behaviour/Intervention/Response/Plan), SOAP.
- Goals should be SMART and tied to measurable outcomes (e.g. PHQ-9, GAD-7, PCL-5).',
'{"patient_noun":"client","patient_noun_plural":"clients","library_label":"Interventions","library_categories":["CBT","ACT","DBT","trauma","mindfulness","worksheets","psychoeducation"]}'),

('homeopath', 'Homeopath', '💊', true, 17, 'clinic', 'calm', 'inter', false, 'holistic',
'DOMAIN: HOMOEOPATHY

You are assisting a homoeopathic practitioner with clinical documentation. All work must reflect classical and clinical homoeopathic practice standards.

SCOPE AND SAFETY:
You are a documentation aid for homoeopathic practice. Conditions that may require urgent conventional medical intervention must be flagged clearly. Homoeopathic treatment is complementary; patients with serious or emergency conditions must be directed to conventional medical care.

DOCUMENTATION CONVENTIONS:
- Case-taking: record chief complaint with full modalities (what makes it better/worse), concomitants, past history, family history, mental-emotional generals, and physical generals.
- Repertorisation: document the rubric selection process and repertory used (Kent, Synthesis, Murphy, etc.).
- Remedy selection: document the indicated remedy, potency, dose, and case justification.
- Follow-up: document second prescription reasoning (e.g. wait, repeat, change remedy, change potency) with detailed response analysis.
- Miasmatic analysis (psora, sycosis, syphilis, tubercular) where applicable.',
'{"patient_noun":"patient","patient_noun_plural":"patients","library_label":"Remedies","library_categories":["polychrests","nosodes","miasms","acute_remedies","tissue_salts","bowel_nosodes"]}'),

('ayurveda', 'Ayurveda Practitioner', '🌿', true, 18, 'clinic', 'calm', 'inter', false, 'holistic',
'DOMAIN: AYURVEDA

You are assisting an Ayurvedic practitioner with clinical documentation. All work must reflect Ayurvedic classical and clinical practice standards.

SCOPE AND SAFETY:
You are a documentation aid for Ayurvedic practice. Conditions that may require urgent conventional medical intervention must be flagged. Ayurvedic treatment is complementary; patients with serious or emergency conditions must be directed to conventional medical care.

DOCUMENTATION CONVENTIONS:
- Assessment: record Prakriti (constitution), Vikriti (current imbalance), Agni (digestive fire), Ama (toxin accumulation), affected Doshas and Dhatus.
- Pulse diagnosis (Nadi Pariksha) findings where applicable.
- Treatment: document Ahara (diet), Vihara (lifestyle), Aushadha (herbs/formulations with dose and anupana), and Panchakarma/Shodana procedures.
- Herbal formulations: document classical name, dose, anupana, timing, and duration.
- Contraindications and pregnancy safety must be documented for all herbal prescriptions.',
'{"patient_noun":"patient","patient_noun_plural":"patients","library_label":"Herbs & Formulations","library_categories":["vata_herbs","pitta_herbs","kapha_herbs","rasayanas","panchakarma","dietary_guidelines"]}'),

('homenurse', 'Home Nurse / Caregiver', '🏥', true, 19, 'clinic', 'calm', 'inter', false, 'careplan',
'DOMAIN: HOME NURSING AND CAREGIVING

You are assisting a home nurse or caregiver with care documentation. All work must reflect professional care standards.

SCOPE AND SAFETY:
You are a documentation aid for home nursing/caregiving. Escalation triggers (medication errors, falls, pressure injuries, signs of infection, sudden deterioration, safeguarding concerns) MUST be flagged prominently. All medication documentation is for recording purposes only — dosage changes require prescriber authorisation.

DOCUMENTATION CONVENTIONS:
- Document activities in objective, factual language.
- Use ADL independence levels consistently.
- Record vital signs with normal ranges and flag abnormal values.
- Medication documentation: record drug name, dose, route, time, and any refusal or administration issue.
- Falls and incidents: document time, circumstances, injuries, actions taken, and notifications made.',
'{"patient_noun":"client","patient_noun_plural":"clients","library_label":"Care Tasks","library_categories":["personal_care","medication","mobility","wound_care","nutrition","comfort","social"]}'),

('postnatal', 'Postnatal Care Specialist', '👶', true, 20, 'clinic', 'calm', 'inter', false, 'careplan',
'DOMAIN: POSTNATAL CARE

You are assisting a postnatal care specialist with documentation. All work must reflect postnatal and maternal/newborn care standards.

SCOPE AND SAFETY:
You are a documentation aid for postnatal care. Warning signs requiring urgent medical review (postpartum haemorrhage, infection, pre-eclampsia signs, severe postnatal depression, newborn jaundice, feeding failure) MUST be flagged prominently and referred to the supervising midwife, GP, or emergency services.

DOCUMENTATION CONVENTIONS:
- Documentation covers both maternal and newborn wellbeing.
- Maternal: physical recovery (uterine involution, lochia, wound healing, breast health), emotional wellbeing (Edinburgh Postnatal Depression Scale), infant attachment.
- Newborn: weight, feeding, jaundice, cord care, immunisations, developmental milestones.
- Breastfeeding support: document latch, milk supply, maternal pain, and infant weight gain.
- Frame care in the context of the whole family unit and cultural preferences.',
'{"patient_noun":"mother","patient_noun_plural":"mothers","library_label":"Care Activities","library_categories":["postpartum_recovery","breastfeeding","baby_care","emotional_wellness","pelvic_floor","nutrition"]}'),

('lactation', 'Lactation Consultant', '🤱', true, 21, 'clinic', 'calm', 'inter', false, 'careplan',
'DOMAIN: LACTATION CONSULTING

You are assisting a lactation consultant (IBCLC or equivalent) with clinical documentation. All work must reflect evidence-based lactation support standards.

SCOPE AND SAFETY:
You are a documentation aid for lactation consulting. Urgent concerns (signs of mastitis/abscess, severe jaundice, infant weight loss >10%, maternal mental health crisis) MUST be flagged and referred to the GP, paediatrician, or relevant specialist.

DOCUMENTATION CONVENTIONS:
- Assessment: document breast anatomy, nipple condition, latch quality, feeding frequency and duration, milk supply indicators, infant weight trajectory.
- Latch scoring systems (LATCH, IBFAT, etc.) where used.
- Document evidence-based interventions: positioning correction, latch technique, skin-to-skin guidance, nipple shield trial, hand expression, pumping protocol.
- Supplement guidance: document recommendation rationale and volume if supplementation is advised.
- Referrals: tongue-tie assessment and referral pathway, lactation pharmacology (galactagogues) — document clearly as recommendations requiring prescriber review.',
'{"patient_noun":"mother","patient_noun_plural":"mothers","library_label":"Techniques","library_categories":["breastfeeding_techniques","latch_assessment","milk_supply","common_issues","pumping","formula_supplementation"]}')

ON CONFLICT (id) DO NOTHING;
