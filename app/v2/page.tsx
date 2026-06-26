'use client';

import { useState, useEffect } from 'react';

type Loc = 'india' | 'usa';

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --amber: #F5A623;
    --dark:  #0D0D0D;
    --mid:   #1A1A1A;
    --light: #FAFAFA;
    --ff: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }

  .v2 {
    font-family: var(--ff);
    overflow-x: hidden;
    background: var(--dark);
  }

  /* ─── LOCATION BAR ─────────────────────────────────────── */
  .loc-bar {
    position: fixed; top: 0; left: 0; right: 0;
    height: 44px; z-index: 200;
    background: #1a1a1a;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .loc-pill {
    background: none; border: none; cursor: pointer;
    padding: 5px 18px; border-radius: 100px;
    font-size: 13px; font-weight: 600;
    color: rgba(255,255,255,0.38);
    transition: background 0.2s, color 0.2s;
    font-family: var(--ff); line-height: 1;
  }
  .loc-pill:hover { color: rgba(255,255,255,0.65); }
  .loc-pill.active { background: var(--amber); color: #0D0D0D; }

  /* ─── NAV ──────────────────────────────────────────────── */
  .v2-nav {
    position: fixed; top: 44px; left: 0; right: 0; z-index: 100;
    height: 64px;
    background: rgba(13,13,13,0.96);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .nav-join {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--amber); color: #0D0D0D;
    font-size: 14px; font-weight: 700;
    padding: 9px 22px; border-radius: 100px;
    text-decoration: none;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .nav-join:hover {
    transform: scale(1.04);
    box-shadow: 0 6px 24px rgba(245,166,35,0.32);
  }

  /* ─── HERO ─────────────────────────────────────────────── */
  .hero {
    background: #0D0D0D;
    padding: 152px 24px 100px;
    display: flex; flex-direction: column; align-items: center;
    text-align: center;
    position: relative; overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 72% 48% at 50% 18%, rgba(245,166,35,0.10) 0%, transparent 68%);
    pointer-events: none;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: none; }
  }

  .hero-eyebrow {
    font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--amber);
    margin-bottom: 30px;
    animation: fadeUp 0.55s ease both 0.05s;
  }
  .hero-h1 {
    max-width: 700px;
    display: flex; flex-direction: column; gap: 4px;
    margin-bottom: 28px;
  }
  .h1-l1 {
    font-size: clamp(34px, 6.5vw, 52px);
    font-weight: 900; line-height: 1.1;
    letter-spacing: -0.025em; color: #fff;
    animation: fadeUp 0.55s ease both 0.18s;
  }
  .h1-l2 {
    font-size: clamp(34px, 6.5vw, 52px);
    font-weight: 900; line-height: 1.1;
    letter-spacing: -0.025em; color: var(--amber);
    animation: fadeUp 0.55s ease both 0.34s;
  }
  .h1-l3 {
    font-size: clamp(18px, 3vw, 26px);
    font-weight: 500; line-height: 1.35;
    color: rgba(255,255,255,0.45);
    margin-top: 12px;
    animation: fadeUp 0.55s ease both 0.52s;
  }
  .hero-sub {
    font-size: clamp(16px, 2.2vw, 20px);
    color: rgba(255,255,255,0.5);
    line-height: 1.65; max-width: 480px;
    margin-bottom: 40px;
    animation: fadeUp 0.55s ease both 0.68s;
  }
  .hero-btns {
    display: flex; flex-wrap: wrap; gap: 12px;
    justify-content: center; margin-bottom: 28px;
    animation: fadeUp 0.55s ease both 0.82s;
  }
  .hero-proof {
    font-size: 13px; color: rgba(255,255,255,0.28);
    animation: fadeUp 0.55s ease both 0.96s;
  }

  /* ─── BUTTONS ───────────────────────────────────────────── */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--amber); color: #0D0D0D;
    font-size: 16px; font-weight: 700;
    padding: 15px 30px; border-radius: 100px;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
    font-family: var(--ff); border: none; cursor: pointer;
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 36px rgba(245,166,35,0.34);
  }
  .btn-primary.lg { font-size: 18px; padding: 17px 38px; }
  .btn-secondary {
    display: inline-flex; align-items: center; gap: 7px;
    background: none; color: rgba(255,255,255,0.65);
    font-size: 16px; font-weight: 600;
    padding: 15px 28px; border-radius: 100px;
    text-decoration: none;
    border: 1.5px solid rgba(255,255,255,0.18);
    transition: border-color 0.2s, color 0.2s;
  }
  .btn-secondary:hover { border-color: rgba(255,255,255,0.48); color: #fff; }

  /* ─── SECTIONS ──────────────────────────────────────────── */
  .sec { padding: 88px 24px; }
  .sec-light { background: var(--light); }
  .sec-dark  { background: #0D0D0D; }

  .sec-inner {
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 72px; align-items: center;
  }
  @media (max-width: 800px) {
    .sec-inner { grid-template-columns: 1fr; gap: 44px; }
    .sec-dark .card-col { order: -1; }
  }

  .sec-eyebrow {
    font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--amber);
    margin-bottom: 18px;
  }
  .sec-h2 {
    font-size: clamp(27px, 3.8vw, 40px);
    font-weight: 900; line-height: 1.15;
    letter-spacing: -0.02em; margin-bottom: 20px;
  }
  .sec-h2.dark  { color: #1a1a1a; }
  .sec-h2.light { color: #ffffff; }
  .sec-body {
    font-size: 17px; line-height: 1.75; margin-bottom: 20px;
  }
  .sec-body.on-light { color: #555; }
  .sec-body.on-dark  { color: rgba(255,255,255,0.58); }
  .sec-warm {
    font-size: 15px; font-weight: 600;
    color: var(--amber); line-height: 1.6;
  }

  /* ─── PROFILE CARD ──────────────────────────────────────── */
  .profile-card {
    background: #1a1a1a;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.07);
    box-shadow: 0 0 60px rgba(245,166,35,0.11), 0 28px 56px rgba(0,0,0,0.32);
    padding: 28px;
    position: relative;
  }
  .pc-live {
    position: absolute; top: 20px; right: 20px;
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 600; color: #4ade80;
  }
  .pc-live::before {
    content: '';
    width: 7px; height: 7px; border-radius: 50%;
    background: #4ade80;
    animation: pulse 2.2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }
  .pc-avatar {
    width: 58px; height: 58px; border-radius: 50%;
    background: linear-gradient(135deg, var(--amber), #c97b0a);
    display: flex; align-items: center; justify-content: center;
    font-size: 25px; margin-bottom: 14px;
  }
  .pc-name  { font-size: 19px; font-weight: 800; color: #fff; margin-bottom: 3px; }
  .pc-role  { font-size: 13px; color: rgba(255,255,255,0.48); margin-bottom: 6px; }
  .pc-url   { font-size: 12.5px; color: var(--amber); font-family: monospace; font-weight: 600; margin-bottom: 0; }
  .pc-hr    { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 18px 0; }
  .pc-svcs  { display: flex; flex-direction: column; gap: 10px; }
  .pc-svc   { display: flex; justify-content: space-between; align-items: center; }
  .pc-svc-n { font-size: 13px; color: rgba(255,255,255,0.62); }
  .pc-svc-p { font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; margin-left: 12px; }
  .pc-btns  { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pc-btn-a {
    background: var(--amber); color: #0D0D0D;
    font-size: 13px; font-weight: 700;
    padding: 10px; border-radius: 10px;
    text-align: center; border: none; cursor: pointer;
    font-family: var(--ff);
  }
  .pc-btn-w {
    background: none; color: rgba(255,255,255,0.65);
    font-size: 13px; font-weight: 600;
    padding: 10px; border-radius: 10px;
    text-align: center;
    border: 1.5px solid rgba(255,255,255,0.14);
    cursor: pointer; font-family: var(--ff);
  }
  .pc-rating {
    font-size: 13px; color: rgba(255,255,255,0.42);
    text-align: center;
  }
  .pc-rating span { color: var(--amber); font-weight: 700; }

  /* ─── WHATSAPP CHAT ─────────────────────────────────────── */
  .wa-chat {
    margin-top: 28px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px; padding: 20px 18px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .wa-msg  { display: flex; flex-direction: column; }
  .wa-in   { align-items: flex-start; }
  .wa-out  { align-items: flex-end; }
  .wa-bubble {
    max-width: 84%; padding: 10px 14px;
    display: flex; flex-direction: column; gap: 5px;
  }
  .wa-in .wa-bubble {
    background: #2e2e2e;
    border-radius: 3px 14px 14px 14px;
  }
  .wa-out .wa-bubble {
    background: var(--amber);
    border-radius: 14px 3px 14px 14px;
  }
  .wa-txt { font-size: 14px; line-height: 1.5; }
  .wa-in  .wa-txt { color: rgba(255,255,255,0.88); }
  .wa-out .wa-txt { color: #0D0D0D; }
  .wa-out .wa-txt strong { color: #0D0D0D; }
  .wa-meta { font-size: 10px; align-self: flex-end; }
  .wa-in  .wa-meta { color: rgba(255,255,255,0.3); }
  .wa-out .wa-meta { color: rgba(13,13,13,0.48); }
  .wa-ticks { margin-left: 2px; }

  /* ─── CTA SECTION ───────────────────────────────────────── */
  .cta-sec {
    background: var(--amber);
    padding: 96px 24px;
    display: flex; flex-direction: column; align-items: center;
    text-align: center;
  }
  .cta-eyebrow {
    font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: rgba(13,13,13,0.45);
    margin-bottom: 18px;
  }
  .cta-h2 {
    font-size: clamp(36px, 6.5vw, 62px);
    font-weight: 900; color: #0D0D0D;
    line-height: 1.08; letter-spacing: -0.028em;
    margin-bottom: 16px;
  }
  .cta-sub {
    font-size: 18px; color: rgba(13,13,13,0.58);
    margin-bottom: 40px; line-height: 1.65;
  }
  .cta-sec .btn-primary {
    background: #0D0D0D; color: var(--amber);
  }
  .cta-sec .btn-primary:hover {
    box-shadow: 0 12px 36px rgba(13,13,13,0.22);
  }
  .cta-note {
    margin-top: 16px; font-size: 13px;
    color: rgba(13,13,13,0.42);
  }

  /* ─── RESPONSIVE ────────────────────────────────────────── */
  @media (max-width: 480px) {
    .v2-nav     { padding: 0 16px; }
    .hero       { padding: 144px 20px 72px; }
    .sec        { padding: 64px 20px; }
    .hero-btns  { flex-direction: column; align-items: stretch; }
    .btn-primary, .btn-secondary { justify-content: center; }
    .pc-btns    { grid-template-columns: 1fr; }
  }
`;

function PriyaCard({ loc }: { loc: Loc }) {
  const p1 = loc === 'india' ? '₹800/hr'      : '$30/hr';
  const p2 = loc === 'india' ? '₹400/hr'      : '$15/hr';
  const p3 = loc === 'india' ? '₹4,999/mo'    : '$199/mo';
  return (
    <div className="profile-card">
      <div className="pc-live">Live</div>
      <div className="pc-avatar">📚</div>
      <div className="pc-name">Priya Sharma</div>
      <div className="pc-role">Maths &amp; Science Tutor · Celina, TX</div>
      <div className="pc-url">kryla.work/priyasharma</div>
      <hr className="pc-hr" />
      <div className="pc-svcs">
        <div className="pc-svc"><span className="pc-svc-n">One-on-one session</span><span className="pc-svc-p">{p1}</span></div>
        <div className="pc-svc"><span className="pc-svc-n">Small group (3–4)</span><span className="pc-svc-p">{p2}</span></div>
        <div className="pc-svc"><span className="pc-svc-n">Monthly plan</span><span className="pc-svc-p">{p3}</span></div>
      </div>
      <hr className="pc-hr" />
      <div className="pc-btns" style={{ marginBottom: '18px' }}>
        <button className="pc-btn-a">Book a Session</button>
        <button className="pc-btn-w">WhatsApp</button>
      </div>
      <div className="pc-rating"><span>4.9 ★★★★★</span> · 47 students</div>
    </div>
  );
}

function MeenaCard({ loc }: { loc: Loc }) {
  const p1 = loc === 'india' ? '₹600'      : '$25';
  const p2 = loc === 'india' ? '₹1,200'    : '$50';
  const p3 = loc === 'india' ? '₹3,499/mo' : '$149/mo';
  return (
    <div className="profile-card">
      <div className="pc-live">Live</div>
      <div className="pc-avatar">🎂</div>
      <div className="pc-name">Meena Krishnan</div>
      <div className="pc-role">Home Baker · Pune, India</div>
      <div className="pc-url">kryla.work/meenabakes</div>
      <hr className="pc-hr" />
      <div className="pc-svcs">
        <div className="pc-svc"><span className="pc-svc-n">Custom Birthday Cake</span><span className="pc-svc-p">{p1}</span></div>
        <div className="pc-svc"><span className="pc-svc-n">Themed Box (12 pieces)</span><span className="pc-svc-p">{p2}</span></div>
        <div className="pc-svc"><span className="pc-svc-n">Monthly Dessert Plan</span><span className="pc-svc-p">{p3}</span></div>
      </div>
      <hr className="pc-hr" />
      <div className="pc-btns" style={{ marginBottom: '18px' }}>
        <button className="pc-btn-a">Order Now</button>
        <button className="pc-btn-w">WhatsApp</button>
      </div>
      <div className="pc-rating"><span>4.8 ★★★★★</span> · 124 orders</div>
    </div>
  );
}

export default function V2Page() {
  const [loc, setLoc] = useState<Loc>('india');

  useEffect(() => {
    const stored = localStorage.getItem('kryla-loc') as Loc | null;
    if (stored === 'india' || stored === 'usa') { setLoc(stored); return; }
    if (navigator.language === 'en-US' || navigator.language.startsWith('en-US')) setLoc('usa');
  }, []);

  const setAndStore = (l: Loc) => {
    setLoc(l);
    localStorage.setItem('kryla-loc', l);
  };

  return (
    <div className="v2">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Location toggle ── */}
      <div className="loc-bar">
        <button className={`loc-pill${loc === 'india' ? ' active' : ''}`} onClick={() => setAndStore('india')}>
          🇮🇳 India
        </button>
        <button className={`loc-pill${loc === 'usa' ? ' active' : ''}`} onClick={() => setAndStore('usa')}>
          🇺🇸 USA
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="v2-nav">
        <a href="/">
          <img src="/kryla-wordmark-dark.svg" alt="Kryla.work" height={32} style={{ display: 'block' }} />
        </a>
        <a href="/onboarding" className="nav-join">Join free →</a>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <p className="hero-eyebrow">FOR EVERY SKILLED PROFESSIONAL</p>
        <h1 className="hero-h1">
          <span className="h1-l1">Your craft deserves</span>
          <span className="h1-l2">a name online.</span>
          <span className="h1-l3">Give your business its own identity.</span>
        </h1>
        <p className="hero-sub">
          Your name. Your work. Your spot online — in 15 minutes.
        </p>
        <div className="hero-btns">
          <a href="/onboarding" className="btn-primary">Claim your spot — it&apos;s free</a>
          <a href="#how" className="btn-secondary">See how it works ↓</a>
        </div>
        <p className="hero-proof">
          Free to start · No card needed · Live in 15 minutes · Works on WhatsApp
        </p>
      </section>

      {/* ── Section 1: Card left · Text right ── */}
      <section className="sec sec-light" id="how">
        <div className="sec-inner">
          <div className="card-col">
            <PriyaCard loc={loc} />
          </div>
          <div className="text-col">
            <p className="sec-eyebrow">YOUR IDENTITY ONLINE</p>
            <h2 className="sec-h2 dark">
              Your name.<br />
              Your work.<br />
              One link that says it all.
            </h2>
            <p className="sec-body on-light">
              Every skilled professional deserves a presence that matches their craft. Kryla gives you your own spot — with your services, your prices, and a way for people to reach you directly.
            </p>
            <p className="sec-warm">
              Like a visiting card — but one that works while you sleep.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 2: Text left · Card right ── */}
      <section className="sec sec-dark">
        <div className="sec-inner">
          <div className="text-col">
            <p className="sec-eyebrow">ONE LINK FOR EVERYTHING</p>
            <h2 className="sec-h2 light">
              Send one link.<br />
              They know everything<br />
              they need to know.
            </h2>
            <p className="sec-body on-dark">
              Your name. What you do. What you charge. When you&apos;re free. What your clients say. All in one place they can open on any phone.
            </p>
            <div className="wa-chat">
              <div className="wa-msg wa-in">
                <div className="wa-bubble">
                  <span className="wa-txt">Hi! Are you available this week?</span>
                  <span className="wa-meta">10:42 AM <span className="wa-ticks">✓✓</span></span>
                </div>
              </div>
              <div className="wa-msg wa-out">
                <div className="wa-bubble">
                  <span className="wa-txt">Here&apos;s my Kryla link — <strong>kryla.work/priyasharma</strong> — book directly there! 😊</span>
                  <span className="wa-meta">10:43 AM <span className="wa-ticks">✓✓</span></span>
                </div>
              </div>
            </div>
          </div>
          <div className="card-col">
            <MeenaCard loc={loc} />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-sec">
        <p className="cta-eyebrow">YOUR SPOT IS WAITING</p>
        <h2 className="cta-h2">Ready to claim yours?</h2>
        <p className="cta-sub">Free to join. Live in 15 minutes.</p>
        <a href="/onboarding" className="btn-primary lg">Claim your spot — it&apos;s free →</a>
        <p className="cta-note">No card needed · Cancel anytime</p>
      </section>
    </div>
  );
}
