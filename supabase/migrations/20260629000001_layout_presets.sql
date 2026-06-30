CREATE TABLE IF NOT EXISTS layout_presets (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  persona     text    NOT NULL,
  name        text    NOT NULL,
  description text    NOT NULL DEFAULT '',
  template    text    NOT NULL,
  palette     text    NOT NULL,
  font        text    NOT NULL,
  sort_order  int     NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Seed: one row per persona × 4 layouts
INSERT INTO layout_presets (persona, name, description, template, palette, font, sort_order) VALUES
-- tutor
('tutor','Academic','Clean and trustworthy','focus','professional','inter',0),
('tutor','Creative Studio','Expressive and colourful','portfolio','creative','georgia',1),
('tutor','Fresh Start','Light and approachable','focus','fresh','inter',2),
('tutor','Editorial','Refined serif elegance','portfolio','professional','georgia',3),
-- trainer
('trainer','Performance','Bold and energetic','focus','fresh','inter',0),
('trainer','Power','Dark and impactful','focus','minimal','inter',1),
('trainer','Studio','Modern service showcase','storefront','fresh','inter',2),
('trainer','Recovery','Calming wellness feel','focus','calm','georgia',3),
-- baker
('baker','Artisan','Warm handcrafted vibe','portfolio','warm','georgia',0),
('baker','Modern Bakery','Clean product showcase','storefront','professional','inter',1),
('baker','Cozy Kitchen','Friendly and personal','focus','warm','trebuchet',2),
('baker','Sweet Studio','Playful and creative','portfolio','creative','trebuchet',3),
-- photographer
('photographer','Portfolio','Imagery-first minimal look','portfolio','minimal','inter',0),
('photographer','Editorial','Refined magazine style','portfolio','professional','georgia',1),
('photographer','Creative','Bold and expressive','portfolio','creative','inter',2),
('photographer','Lifestyle','Light and fresh','portfolio','fresh','inter',3),
-- salon
('salon','Luxe','Elegant and premium','storefront','creative','georgia',0),
('salon','Clean & Modern','Minimal and sophisticated','storefront','minimal','inter',1),
('salon','Warm Glow','Welcoming and personal','focus','warm','trebuchet',2),
('salon','Fresh','Bright and modern','storefront','fresh','inter',3),
-- chef
('chef','Restaurant','Rich and inviting','storefront','warm','georgia',0),
('chef','Modern Kitchen','Clean culinary showcase','storefront','professional','inter',1),
('chef','Rustic','Earthy and authentic','portfolio','warm','trebuchet',2),
('chef','Fusion','Bold and playful','portfolio','creative','inter',3),
-- doctor
('doctor','Clinical','Professional medical layout','clinic','calm','inter',0),
('doctor','Executive','Authoritative and clean','focus','professional','inter',1),
('doctor','Wellness','Approachable and calming','focus','fresh','georgia',2),
('doctor','Modern Practice','Contemporary clinic feel','clinic','professional','inter',3),
-- musician
('musician','Stage','Bold and expressive','focus','creative','trebuchet',0),
('musician','Acoustic','Warm and intimate','portfolio','calm','georgia',1),
('musician','Minimal','Let your work speak','portfolio','minimal','inter',2),
('musician','Indie','Bright and independent','focus','fresh','trebuchet',3),
-- other / general
('other','Professional','Clean and credible','focus','professional','inter',0),
('other','Creative','Show off your work','portfolio','creative','georgia',1),
('other','Modern','Sleek service showcase','storefront','minimal','inter',2),
('other','Friendly','Warm and approachable','focus','fresh','inter',3);
