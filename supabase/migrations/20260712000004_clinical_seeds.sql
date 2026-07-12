-- System seeds for the physio Working Studio.
-- 1. clinical_doc_templates — report/referral/discharge templates.
-- 2. exercise_library       — common physiotherapy exercises by body region.

-- ── 1. Clinical document templates ───────────────────────────────────────────

INSERT INTO clinical_doc_templates (doc_type, label, description, fields, persona, is_system, provider_id) VALUES

('referral_letter',
 'Referral Letter',
 'Professional referral to a specialist, imaging centre, or allied health provider',
 '[
   {"id":"patient_name","label":"Patient full name & DOB","placeholder":"e.g. Arjun Singh, 12 Mar 1985","required":true},
   {"id":"referring_to","label":"Referred to (provider / facility)","placeholder":"e.g. Dr. Priya Menon, Sports Physician — ABC Medical Centre","required":true},
   {"id":"reason","label":"Reason for referral","placeholder":"e.g. Chronic right shoulder impingement unresponsive to 6 weeks conservative physio","required":true},
   {"id":"clinical_summary","label":"Clinical summary","placeholder":"Brief history, examination findings, treatments tried","required":true},
   {"id":"request","label":"Specific request","placeholder":"e.g. MRI right shoulder + orthopaedic assessment; please advise re: surgical candidacy","required":false},
   {"id":"urgency","label":"Urgency","placeholder":"e.g. Routine / Urgent / Emergency","required":false}
 ]',
 'physio', true, null),

('discharge_summary',
 'Discharge Summary',
 'Summary of treatment course and outcomes on discharge from physiotherapy',
 '[
   {"id":"patient_name","label":"Patient full name & DOB","placeholder":"e.g. Sunita Reddy, 05 Sep 1972","required":true},
   {"id":"diagnosis","label":"Working diagnosis / condition","placeholder":"e.g. Lumbar disc herniation L4/L5 with right leg radiculopathy","required":true},
   {"id":"treatment_period","label":"Treatment period","placeholder":"e.g. 01 May 2026 – 10 Jul 2026 (10 sessions)","required":true},
   {"id":"interventions","label":"Interventions provided","placeholder":"e.g. Manual therapy, McKenzie exercises, core stabilisation, hydrotherapy","required":true},
   {"id":"outcome","label":"Outcome achieved","placeholder":"e.g. Pain reduced from 8/10 to 1/10 VAS; full return to work","required":true},
   {"id":"home_program","label":"Ongoing home program","placeholder":"Summary of HEP issued on discharge","required":false},
   {"id":"precautions","label":"Precautions / follow-up advice","placeholder":"e.g. Avoid heavy lifting >10 kg for 4 weeks; self-refer if symptoms recur","required":false}
 ]',
 'physio', true, null),

('progress_report',
 'Progress Report',
 'Interim clinical progress report for GP, insurer, or employer',
 '[
   {"id":"patient_name","label":"Patient full name & DOB","placeholder":"e.g. Meena Krishnan, 22 Jan 1990","required":true},
   {"id":"report_period","label":"Report period","placeholder":"e.g. Sessions 1–8, 01 Jun – 30 Jun 2026","required":true},
   {"id":"diagnosis","label":"Diagnosis / condition","placeholder":"e.g. Rotator cuff tear (partial) — right shoulder","required":true},
   {"id":"progress","label":"Clinical progress","placeholder":"Summary of improvement in pain, ROM, strength, function","required":true},
   {"id":"outcome_scores","label":"Outcome measure scores","placeholder":"e.g. DASH: initial 62% → current 34%; VAS: 7/10 → 3/10","required":false},
   {"id":"plan","label":"Ongoing plan","placeholder":"e.g. Continue physio 1×/week for 4 more weeks; progress to gym-based strengthening","required":false}
 ]',
 'physio', true, null),

('insurance_report',
 'Medico-Legal / Insurance Report',
 'Clinical report for insurance claim, workers compensation, or medico-legal purposes',
 '[
   {"id":"patient_name","label":"Patient full name, DOB & ID","placeholder":"e.g. Rajesh Patel, 15 Apr 1980, Claim No. WC-2026-0042","required":true},
   {"id":"injury_mechanism","label":"Mechanism of injury / incident","placeholder":"e.g. Fell from scaffold on 02 Mar 2026 — reported to employer same day","required":true},
   {"id":"diagnosis","label":"Diagnosis","placeholder":"e.g. Left knee ACL partial tear + medial meniscus injury","required":true},
   {"id":"examination_findings","label":"Objective examination findings","placeholder":"Key ROM, strength, special tests at initial and most recent assessment","required":true},
   {"id":"treatment_summary","label":"Treatment provided","placeholder":"Sessions, modalities, HEP","required":true},
   {"id":"work_capacity","label":"Work capacity assessment","placeholder":"e.g. Currently unfit for manual duties; suitable for sedentary work with 15 min standing breaks hourly","required":true},
   {"id":"prognosis","label":"Prognosis & return-to-work estimate","placeholder":"e.g. Expected full recovery in 12–16 weeks with continued physiotherapy","required":false}
 ]',
 'physio', true, null),

('return_to_work_certificate',
 'Return-to-Work / Fitness Certificate',
 'Fitness certificate for return to work or sport',
 '[
   {"id":"patient_name","label":"Patient full name & DOB","placeholder":"e.g. Keerthi Nair, 08 Nov 1995","required":true},
   {"id":"employer_or_team","label":"Employer / sports club","placeholder":"e.g. Infosys Ltd / Chennai FC Under-21","required":false},
   {"id":"role","label":"Role / position","placeholder":"e.g. Warehouse worker / Central midfielder","required":false},
   {"id":"injury_condition","label":"Injury or condition","placeholder":"e.g. Left ankle lateral ligament sprain (Grade II)","required":true},
   {"id":"cleared_for","label":"Cleared for","placeholder":"e.g. Full return to all work duties / Return to full training without restriction","required":true},
   {"id":"restrictions","label":"Restrictions or modified duties (if any)","placeholder":"e.g. Avoid ladder work for 2 weeks; tape ankle for first 4 sessions back","required":false},
   {"id":"review_date","label":"Review date","placeholder":"e.g. Review in 4 weeks or earlier if symptoms recur","required":false}
 ]',
 'physio', true, null);

-- ── 2. Exercise library — system seeds ───────────────────────────────────────
-- Common physiotherapy exercises grouped by body region / category.
-- Enough to demonstrate the ExercisePanel library in the Working Studio.

INSERT INTO exercise_library (persona, category, name, description, instructions, default_sets, default_reps, default_hold, default_duration, tags, is_system, provider_id) VALUES

-- ── Core / Lumbar ──────────────────────────────────────────────────────────
('physio', 'lumbar',
 'Pelvic Tilt (Supine)',
 'Activates deep lumbar stabilisers; cornerstone of lumbar rehabilitation.',
 'Lie on your back with knees bent and feet flat. Gently flatten your lower back against the floor by tightening your stomach muscles. Hold, then release. Breathe normally throughout.',
 3, 10, 5, null, '["lumbar","core","beginner","stabilisation"]', true, null),

('physio', 'lumbar',
 'Knee-to-Chest Stretch',
 'Stretches lumbar extensors and hip flexors; reduces lumbar compression.',
 'Lie on your back. Bring one knee up to your chest and hold with both hands. Hold the stretch, then slowly lower the leg. Alternate sides.',
 3, 10, 20, null, '["lumbar","stretch","hip flexor","beginner"]', true, null),

('physio', 'lumbar',
 'Cat-Cow Mobilisation',
 'Rhythmic spinal flexion/extension to restore lumbar mobility.',
 'Start on hands and knees (tabletop position). Breathe in: drop your belly, lift your head and tailbone (cow). Breathe out: arch your back up, tuck your chin and pelvis (cat). Move smoothly between positions.',
 3, 10, null, null, '["lumbar","mobility","thoracic","cat-cow","beginner"]', true, null),

('physio', 'lumbar',
 'Bird Dog',
 'Anti-extension core exercise; challenges stability with alternating limb loading.',
 'Start on hands and knees. Tighten your core. Slowly extend your right arm forward and left leg back at the same time, keeping your back flat. Hold, then return. Alternate sides.',
 3, 10, 3, null, '["core","lumbar","stability","anti-extension","beginner"]', true, null),

('physio', 'core',
 'Dead Bug',
 'Challenges deep core stability with contralateral limb movement; minimal spinal loading.',
 'Lie on your back with arms pointing to the ceiling and hips/knees at 90°. Slowly lower your right arm and left leg toward the floor (keeping them straight), keeping your lower back pressed down. Return and alternate.',
 3, 8, null, null, '["core","lumbar","anti-extension","intermediate"]', true, null),

('physio', 'core',
 'Plank (Prone)',
 'Isometric co-contraction of all core muscles.',
 'Lie face down. Prop yourself up on your forearms and toes, keeping your body in a straight line from head to heels. Do not let your hips sag or pike. Hold.',
 3, null, 20, null, '["core","isometric","intermediate"]', true, null),

('physio', 'core',
 'Side Plank',
 'Targets lateral core stabilisers (quadratus lumborum, obliques, hip abductors).',
 'Lie on your side. Prop up on your forearm and feet stacked (or knees bent for easier version). Lift your hips so your body forms a straight line. Hold, then lower. Repeat on the other side.',
 3, null, 15, null, '["core","lateral","obliques","QL","intermediate"]', true, null),

('physio', 'lumbar',
 'Glute Bridge',
 'Activates gluteus maximus and posterior chain; offloads lumbar extensors.',
 'Lie on your back with knees bent, feet hip-width apart. Squeeze your glutes and lift your hips off the floor until your body forms a straight line from knees to shoulders. Hold, then lower slowly.',
 3, 12, 3, null, '["glutes","lumbar","posterior chain","beginner"]', true, null),

-- ── Cervical ───────────────────────────────────────────────────────────────
('physio', 'cervical',
 'Cervical Retraction (Chin Tuck)',
 'Restores cervical postural alignment; stretches posterior cervical muscles.',
 'Sit or stand tall. Gently draw your chin straight back (as if making a double chin) without tilting your head up or down. Hold briefly, then release.',
 3, 10, 5, null, '["cervical","posture","chin tuck","beginner"]', true, null),

('physio', 'cervical',
 'Cervical Rotation Stretch',
 'Improves cervical rotation range of motion.',
 'Sit tall. Slowly turn your head to one side as far as comfortable. Hold, then return to centre. Repeat on the other side.',
 3, 5, 15, null, '["cervical","rotation","mobility","stretch","beginner"]', true, null),

('physio', 'cervical',
 'Cervical Lateral Flexion Stretch',
 'Stretches ipsilateral neck muscles and scalenes.',
 'Sit tall. Gently tilt your ear toward your shoulder without shrugging. You can add a gentle overpressure with one hand for a deeper stretch. Hold, then return. Repeat on the other side.',
 3, 5, 20, null, '["cervical","lateral flexion","stretch","scalene","beginner"]', true, null),

('physio', 'cervical',
 'Deep Neck Flexor Activation',
 'Strengthens longus colli and longus capitis; key for cervicogenic headache and postural correction.',
 'Lie on your back. Perform a gentle chin tuck, then nod your head slightly as if saying "yes" very slowly. Keep the movement small and controlled. Do not lift your head off the pillow.',
 3, 10, null, null, '["cervical","deep flexors","headache","posture","intermediate"]', true, null),

-- ── Shoulder ───────────────────────────────────────────────────────────────
('physio', 'shoulder',
 'Pendulum (Codman) Exercise',
 'Gentle shoulder distraction and mobilisation; ideal early post-injury or post-op.',
 'Stand and lean forward, supporting your weight on a table with your good arm. Let your affected arm hang freely. Gently swing it in small circles (clockwise and anticlockwise), then forward-back and side-to-side. Use gravity, not muscle effort.',
 3, null, null, '1 minute', '["shoulder","mobility","post-op","early rehab","beginner"]', true, null),

('physio', 'shoulder',
 'Shoulder External Rotation (Theraband)',
 'Strengthens infraspinatus and teres minor (rotator cuff external rotators).',
 'Stand with a resistance band anchored at elbow height. Elbow bent at 90°, tucked in to your side. Pull the band outward (rotating your forearm away from your body). Keep the elbow pinned to your side. Return slowly.',
 3, 15, null, null, '["shoulder","rotator cuff","external rotation","theraband","intermediate"]', true, null),

('physio', 'shoulder',
 'Shoulder Internal Rotation (Theraband)',
 'Strengthens subscapularis (rotator cuff internal rotator).',
 'Stand with a resistance band anchored at elbow height to the side being exercised. Elbow bent at 90°, tucked in. Pull the band inward (rotating your forearm across your body). Keep the elbow still. Return slowly.',
 3, 15, null, null, '["shoulder","rotator cuff","internal rotation","theraband","intermediate"]', true, null),

('physio', 'shoulder',
 'Scapular Retraction (Prone T)',
 'Strengthens lower/mid trapezius and rhomboids; corrects scapular dyskinesis.',
 'Lie face down on a bed or exercise mat with your arms out to the side at shoulder height (T-shape). Squeeze your shoulder blades together and lift your arms a few centimetres. Hold, then lower slowly.',
 3, 12, 3, null, '["shoulder","scapula","trapezius","rhomboids","intermediate"]', true, null),

-- ── Hip ────────────────────────────────────────────────────────────────────
('physio', 'hip',
 'Clamshell',
 'Isolates gluteus medius and external hip rotators.',
 'Lie on your side with hips and knees bent to 45°. Keeping your feet together, rotate your top knee upward as far as you can without your pelvis rolling back. Lower slowly. Repeat, then switch sides.',
 3, 15, null, null, '["hip","glutes","clamshell","beginner","abduction"]', true, null),

('physio', 'hip',
 'Hip Flexor Stretch (Kneeling Lunge)',
 'Stretches iliopsoas; beneficial for lumbar pain, hip impingement, and anterior pelvic tilt.',
 'Kneel on one knee with the other foot forward (lunge position). Keeping your trunk upright, gently shift your hips forward until you feel a stretch in the front of the rear hip. Hold, then switch sides.',
 3, null, 30, null, '["hip","hip flexor","iliopsoas","stretch","beginner"]', true, null),

('physio', 'hip',
 'Side-Lying Hip Abduction',
 'Strengthens gluteus medius and tensor fascia latae; important for IT band syndrome and gait rehab.',
 'Lie on your side with the bottom leg slightly bent. Top leg straight. Lift the top leg to about 30° (no higher), keeping the foot flexed and knee straight. Hold briefly, then lower slowly.',
 3, 12, 3, null, '["hip","abduction","glute med","IT band","beginner"]', true, null),

('physio', 'hip',
 'Hip External Rotation Stretch (Figure-4)',
 'Stretches piriformis and deep external hip rotators; reduces hip impingement symptoms.',
 'Lie on your back. Cross your right ankle over your left knee (figure-4). Either stop here if you feel a stretch, or gently pull the left leg toward you. Hold, then switch.',
 3, null, 30, null, '["hip","piriformis","external rotation","stretch","beginner"]', true, null),

-- ── Knee ───────────────────────────────────────────────────────────────────
('physio', 'knee',
 'Quad Set (Isometric Quadriceps)',
 'Activates quadriceps in inner-range; safe for early post-op knee rehabilitation.',
 'Sit or lie with your leg straight. Place a rolled towel under your knee. Tighten your thigh muscle, pushing the back of your knee down into the towel. Hold, then relax.',
 3, 10, 10, null, '["knee","quadriceps","isometric","post-op","beginner"]', true, null),

('physio', 'knee',
 'Short Arc Quads (SAQ)',
 'Strengthens terminal knee extension range; key for patella tendon and meniscus rehab.',
 'Lie on your back with a rolled towel under your knee so it is bent to 30–40°. Straighten your knee fully, hold briefly, then slowly lower.',
 3, 12, 3, null, '["knee","quadriceps","short arc","beginner"]', true, null),

('physio', 'knee',
 'Straight Leg Raise',
 'Strengthens quadriceps and hip flexors with the knee fully extended.',
 'Lie on your back. Bend the unaffected leg for support. Tighten the thigh of the straight leg, then lift it to about 45°. Hold briefly, then lower slowly.',
 3, 12, 3, null, '["knee","quadriceps","hip flexor","SLR","beginner"]', true, null),

('physio', 'knee',
 'Terminal Knee Extension (TKE — Theraband)',
 'Isolates last 30° of knee extension; key for ACL rehabilitation.',
 'Stand with a resistance band looped behind your knee. Step slightly back to create tension. Bend your knee slightly, then fully straighten it against the resistance. Return slowly.',
 3, 15, null, null, '["knee","ACL","TKE","theraband","intermediate"]', true, null),

('physio', 'knee',
 'Wall Squat (Wall Slide)',
 'Closed-kinetic-chain quadriceps and gluteal strengthening; lower shear forces than open chain.',
 'Stand with your back against a wall, feet shoulder-width apart and 30 cm from the wall. Slowly slide down until knees reach 60–90° (no further than toes). Hold, then slide back up.',
 3, 12, 5, null, '["knee","quadriceps","glutes","wall squat","intermediate"]', true, null),

-- ── Ankle ──────────────────────────────────────────────────────────────────
('physio', 'ankle',
 'Calf Raises (Double Leg)',
 'Strengthens gastrocnemius and soleus; key for Achilles tendon rehabilitation.',
 'Stand near a wall for balance. Rise up on your toes as high as you can. Hold briefly, then lower slowly all the way down. Aim for a slow, controlled descent.',
 3, 15, 2, null, '["ankle","calf","Achilles","gastrocnemius","soleus","beginner"]', true, null),

('physio', 'ankle',
 'Ankle Alphabet / AROM',
 'Restores full ankle range of motion; commonly prescribed post-ankle sprain.',
 'Sit with your foot off the floor. Draw each letter of the alphabet in the air with your big toe, moving only your ankle (not your whole leg). Do this slowly and in full range.',
 1, null, null, '2 minutes', '["ankle","range of motion","AROM","sprain","beginner"]', true, null),

('physio', 'ankle',
 'Single Leg Balance',
 'Proprioceptive ankle rehabilitation; essential after lateral ankle sprain.',
 'Stand on one foot. Try to maintain your balance for the target time. Progress from eyes open → eyes closed → standing on a folded towel or wobble board.',
 3, null, 30, null, '["ankle","balance","proprioception","sprain","intermediate"]', true, null),

('physio', 'ankle',
 'Theraband Ankle Eversion',
 'Strengthens fibularis (peroneal) muscles; prevents recurrent lateral ankle sprains.',
 'Sit with a resistance band looped around the ball of your foot, anchored to a fixed point on the inside. Rotate your foot outward against the resistance. Return slowly.',
 3, 15, null, null, '["ankle","peroneal","eversion","sprain","theraband","intermediate"]', true, null),

-- ── Balance / Proprioception ──────────────────────────────────────────────
('physio', 'balance',
 'Tandem Stance',
 'Challenges medio-lateral balance control; useful for older adults and neurological rehab.',
 'Stand with one foot directly in front of the other (heel to toe), like standing on a tightrope. Hold your balance. If stable, progress to eyes closed.',
 3, null, 30, null, '["balance","proprioception","fall prevention","beginner"]', true, null),

('physio', 'balance',
 'Single Leg Squat',
 'Tests and trains dynamic single-leg stability; high-level lower limb rehabilitation.',
 'Stand on one leg. Slowly squat down to about 45°, keeping your knee tracking over your second toe and your trunk upright. Return to standing.',
 3, 10, null, null, '["balance","proprioception","knee","hip","advanced"]', true, null),

-- ── Upper Limb ─────────────────────────────────────────────────────────────
('physio', 'upper_limb',
 'Wrist Extension Stretch',
 'Stretches wrist extensors (ECRB/ECRL); standard for lateral epicondylalgia (tennis elbow).',
 'Extend your arm with elbow straight. Use your other hand to bend your wrist downward (fingers pointing to the floor) until you feel a stretch on the back of your forearm. Hold, then repeat.',
 3, null, 30, null, '["wrist","tennis elbow","stretch","lateral epicondyl","beginner"]', true, null),

('physio', 'upper_limb',
 'Wrist Flexion Eccentric Exercise',
 'Eccentric loading for flexor tendinopathy (golfer''s elbow).',
 'Sit with your forearm supported on a table, palm up. Hold a light weight. Use your other hand to lift your wrist into flexion, then slowly lower with control against gravity. The lowering phase is the therapeutic part.',
 3, 15, null, null, '["wrist","golfer''s elbow","eccentric","medial epicondyl","intermediate"]', true, null),

-- ── Breathing / Diaphragm ─────────────────────────────────────────────────
('physio', 'breathing',
 'Diaphragmatic Breathing',
 'Activates the diaphragm; key for COPD, post-surgical rehab, and stress/anxiety management.',
 'Sit comfortably or lie down. Place one hand on your chest and one on your belly. Breathe in slowly through your nose, letting your belly rise while keeping your chest still. Breathe out slowly through pursed lips. Focus on the belly hand moving.',
 3, null, null, '5 minutes', '["breathing","diaphragm","COPD","relaxation","beginner"]', true, null),

('physio', 'breathing',
 'Active Cycle of Breathing Technique (ACBT)',
 'Mobilises secretions; standard for respiratory physiotherapy and post-operative chest care.',
 'Alternate three phases: (1) Breathing control — normal relaxed breathing for 5–10 breaths. (2) Thoracic expansion exercises — 3–4 deep breaths in, relaxed breath out. (3) Forced expiration technique — 1–2 huffs (breathe in, open your mouth, squeeze air out with your stomach, do NOT cough). Repeat the cycle 2–3 times.',
 3, null, null, '10 minutes', '["breathing","ACBT","respiratory","secretions","physiotherapy","intermediate"]', true, null),

-- ── General / Other ────────────────────────────────────────────────────────
('physio', 'general',
 'Hydrotherapy Walking (Pool)',
 'Reduces weight-bearing through buoyancy; enables early mobility in acute injury.',
 'Enter the pool at waist–chest depth. Walk forward using a normal heel-to-toe gait pattern. Maintain upright posture. Increase depth to reduce weight-bearing further if needed.',
 1, null, null, '10 minutes', '["hydrotherapy","pool","aquatic","early rehab","beginner"]', true, null),

('physio', 'general',
 'Ice Application',
 'Reduces acute pain and swelling (cryotherapy); standard adjunct for acute musculoskeletal injury.',
 'Wrap ice or a frozen gel pack in a damp cloth (never apply directly to skin). Place over the affected area. Remove after 15–20 minutes. Wait at least 1 hour before reapplying. Do not use ice over areas with reduced sensation or circulation problems.',
 1, null, 15, null, '["ice","cryotherapy","acute","pain","swelling","beginner"]', true, null),

('physio', 'general',
 'Heat Application',
 'Relaxes muscle spasm and improves tissue extensibility; appropriate for chronic/sub-acute conditions.',
 'Apply a heat pack or warm damp towel to the affected area. Ensure it is comfortably warm, not hot. Remove after 15–20 minutes. Do not use heat on an acute injury (first 48 hours), open wounds, or areas with reduced sensation.',
 1, null, 15, null, '["heat","thermotherapy","chronic","muscle spasm","beginner"]', true, null);
