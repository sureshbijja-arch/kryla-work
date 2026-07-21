-- Move PERSONA_DEFAULT_GALLERY out of inngest/build-page.ts (hardcoded source constant)
-- into the personas table, matching the DB-driven pattern already used for
-- template/palette/font (see lib/personas.ts fetchPersonaDefaults). Personas not
-- listed here simply have default_gallery = '[]' (no seeded gallery image).

ALTER TABLE personas ADD COLUMN IF NOT EXISTS default_gallery jsonb NOT NULL DEFAULT '[]';

UPDATE personas SET default_gallery = '["/images/Tutor1.jpg"]' WHERE id = 'tutor';
UPDATE personas SET default_gallery = '["/images/FitnessTrainer1.jpg"]' WHERE id = 'trainer';
UPDATE personas SET default_gallery = '["/images/Baker1.jpg"]' WHERE id = 'baker';
UPDATE personas SET default_gallery = '["/images/Photographer1.jpg"]' WHERE id = 'photographer';
UPDATE personas SET default_gallery = '["/images/HomeChef1.jpg"]' WHERE id = 'chef';
UPDATE personas SET default_gallery = '["/images/Doctor1.jpg"]' WHERE id = 'doctor';
UPDATE personas SET default_gallery = '["/images/MusicTeacher1.jpg"]' WHERE id = 'musician';
UPDATE personas SET default_gallery = '["/images/Advocate1.jpg"]' WHERE id = 'advocate';
UPDATE personas SET default_gallery = '["/images/Retailer1.jpg"]' WHERE id = 'retailer';
UPDATE personas SET default_gallery = '["/images/Salon1.jpg"]' WHERE id = 'salon';
UPDATE personas SET default_gallery = '["/images/Ganesh1.jpg", "/images/Ganesh2.jpg", "/images/Ganesh3.jpg", "/images/GaneshClay.jpg"]' WHERE id = 'sellganeshidols';
