'use client';

import { useEffect, useRef } from 'react';

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --amber: #F5A623;
    --dark: #0D0D0D;
    --mid: #1A1A1A;
    --surface: #242424;
    --tp: #FFFFFF;
    --ts: rgba(255,255,255,0.65);
    --tm: rgba(255,255,255,0.38);
  }

  .v2 {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: var(--dark);
    color: var(--tp);
    overflow-x: hidden;
  }

  /* NAV */
  .v2-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(13,13,13,0.82);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .v2-nav-logo img { height: 26px; display: block; }
  .v2-nav-cta {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--amber); color: var(--dark);
    font-size: 14px; font-weight: 700;
    padding: 9px 20px; border-radius: 100px;
    text-decoration: none; transition: transform 0.15s;
  }
  .v2-nav-cta:hover { transform: scale(1.04); }

  /* SCREEN 1: HERO */
  .hero {
    min-height: 100dvh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 100px 24px 80px;
    text-align: center;
    position: relative; overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 55% at 50% 20%, rgba(245,166,35,0.13) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 6px 14px;
    background: rgba(245,166,35,0.13);
    border: 1px solid rgba(245,166,35,0.3);
    border-radius: 100px;
    font-size: 13px; font-weight: 600; color: var(--amber);
    letter-spacing: 0.02em; margin-bottom: 32px;
  }
  .hero-badge::before {
    content: '●'; font-size: 8px;
    animation: blink 2s ease-in-out infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
  .hero-h1 {
    font-size: clamp(38px, 8.5vw, 80px);
    font-weight: 900; line-height: 1.05;
    letter-spacing: -0.03em;
    max-width: 820px; margin-bottom: 24px;
  }
  .hero-h1 em { font-style: normal; color: var(--amber); }
  .hero-sub {
    font-size: clamp(16px, 2.5vw, 20px);
    color: var(--ts); max-width: 520px;
    line-height: 1.65; margin-bottom: 44px;
  }
  .cta-pill {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--amber); color: var(--dark);
    font-size: 17px; font-weight: 700;
    padding: 16px 36px; border-radius: 100px;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
    margin-bottom: 56px;
  }
  .cta-pill:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 44px rgba(245,166,35,0.35);
  }
  .hero-card {
    background: var(--surface);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 24px; padding: 28px 24px;
    max-width: 300px; width: 100%; text-align: left;
    box-shadow: 0 48px 96px rgba(0,0,0,0.45);
    position: relative;
    animation: float 4s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-9px); }
  }
  .hero-card-live {
    position: absolute; top: 18px; right: 18px;
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; color: #4ade80; font-weight: 600;
  }
  .hero-card-live::before {
    content: '';
    width: 6px; height: 6px; border-radius: 50%;
    background: #4ade80;
    animation: blink 2s ease-in-out infinite;
  }
  .hero-card-ava {
    width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(135deg, var(--amber), #d4850d);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; margin-bottom: 12px;
  }
  .hero-card-name { font-size: 17px; font-weight: 700; margin-bottom: 2px; }
  .hero-card-role { font-size: 13px; color: var(--ts); margin-bottom: 10px; }
  .hero-card-url { font-size: 12px; color: var(--amber); font-family: monospace; font-weight: 600; margin-bottom: 16px; }
  .hero-card-stats { display: flex; gap: 18px; }
  .hcs-val { font-size: 19px; font-weight: 800; }
  .hcs-lab { font-size: 10px; color: var(--tm); margin-top: 1px; }

  /* SCREEN 2: BEFORE / AFTER */
  .ba-section {
    min-height: 100dvh;
    padding: 80px 24px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: #0f0f0f;
  }
  .eyebrow {
    font-size: 12px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--amber); margin-bottom: 18px; text-align: center;
  }
  .sec-title {
    font-size: clamp(28px, 6vw, 58px);
    font-weight: 900; line-height: 1.1;
    letter-spacing: -0.025em;
    text-align: center; max-width: 640px; margin-bottom: 14px;
  }
  .sec-sub {
    font-size: 17px; color: var(--ts);
    text-align: center; max-width: 480px;
    line-height: 1.65; margin-bottom: 56px;
  }
  .ba-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 20px; max-width: 740px; width: 100%;
  }
  @media (max-width: 600px) { .ba-grid { grid-template-columns: 1fr; } }
  .ba-panel {
    border-radius: 20px; padding: 26px 22px;
    opacity: 0; transform: translateY(40px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .ba-panel.visible { opacity: 1; transform: none; }
  .ba-panel:nth-child(2) { transition-delay: 0.14s; }
  .ba-before {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
  }
  .ba-after {
    background: rgba(245,166,35,0.07);
    border: 1px solid rgba(245,166,35,0.22);
  }
  .ba-lbl {
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.09em; text-transform: uppercase;
    margin-bottom: 16px;
    display: flex; align-items: center; gap: 7px;
  }
  .ba-lbl-b { color: rgba(255,255,255,0.35); }
  .ba-lbl-a { color: var(--amber); }

  /* WhatsApp scene */
  .wa-scene {
    background: #ddd7d0;
    border-radius: 12px; padding: 14px;
    display: flex; flex-direction: column; gap: 9px;
  }
  .wa-bubble {
    background: white; border-radius: 12px 12px 12px 2px;
    padding: 9px 11px; max-width: 86%; align-self: flex-start;
    box-shadow: 0 1px 2px rgba(0,0,0,0.12);
  }
  .wa-txt { font-size: 12.5px; color: #1a1a1a; line-height: 1.4; }
  .wa-meta {
    font-size: 10px; color: #8c8c8c;
    display: flex; align-items: center; justify-content: flex-end;
    gap: 3px; margin-top: 4px;
  }
  .wa-ticks { color: #53bdeb; }
  .wa-note {
    font-size: 12px; color: rgba(255,255,255,0.4);
    margin-top: 10px; text-align: center; font-style: italic;
  }

  /* After panel */
  .after-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .after-ava {
    width: 42px; height: 42px; border-radius: 50%;
    background: linear-gradient(135deg, var(--amber), #d4850d);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }
  .after-name { font-size: 15px; font-weight: 700; margin-bottom: 1px; }
  .after-role { font-size: 12px; color: var(--ts); }
  .after-url { font-size: 11px; color: var(--amber); font-family: monospace; }
  .after-stats {
    display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; margin-bottom: 12px;
  }
  .after-stat {
    background: rgba(255,255,255,0.05);
    border-radius: 10px; padding: 9px 6px; text-align: center;
  }
  .as-val { font-size: 17px; font-weight: 800; color: var(--amber); }
  .as-lab { font-size: 9px; color: var(--tm); margin-top: 1px; }
  .after-bio {
    font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.5;
    background: rgba(255,255,255,0.03); border-radius: 9px; padding: 10px 12px;
  }

  /* SCREEN 3: CINEMATIC */
  .cinematic {
    min-height: 100dvh;
    padding: 80px 24px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: var(--dark); position: relative; overflow: hidden;
  }
  .cinematic::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 50% at 50% 100%, rgba(245,166,35,0.07) 0%, transparent 70%);
    pointer-events: none;
  }
  .cin-card {
    background: var(--mid);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 28px; padding: 36px 32px;
    max-width: 420px; width: 100%; text-align: center;
    box-shadow: 0 64px 128px rgba(0,0,0,0.5);
    opacity: 0; transform: translateY(64px);
    transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1);
  }
  .cin-card.visible { opacity: 1; transform: none; }
  .cin-ava {
    width: 76px; height: 76px; border-radius: 50%;
    background: linear-gradient(135deg, #2a2a2a, #3d3d3d);
    display: flex; align-items: center; justify-content: center;
    font-size: 34px; margin: 0 auto 16px;
    border: 3px solid rgba(245,166,35,0.28);
  }
  .cin-name { font-size: 25px; font-weight: 800; margin-bottom: 4px; }
  .cin-role { font-size: 15px; color: var(--ts); margin-bottom: 6px; }
  .cin-loc { font-size: 13px; color: var(--tm); margin-bottom: 20px; }
  .cin-rating { font-size: 22px; font-weight: 800; color: var(--amber); margin-bottom: 3px; }
  .cin-stars { font-size: 16px; color: var(--amber); margin-bottom: 22px; }
  .cin-quote {
    font-size: 14px; color: var(--ts); font-style: italic;
    line-height: 1.65; padding: 14px 16px;
    background: rgba(255,255,255,0.04); border-radius: 13px;
    border-left: 3px solid var(--amber); text-align: left; margin-bottom: 22px;
  }
  .cin-url { font-size: 13px; color: var(--amber); font-family: monospace; font-weight: 600; }
  .cin-tagline {
    margin-top: 52px; text-align: center;
    font-size: clamp(26px, 5vw, 46px);
    font-weight: 900; line-height: 1.15;
    letter-spacing: -0.025em; max-width: 500px;
  }
  .cin-tagline em { font-style: normal; color: var(--amber); }

  /* SCREEN 4: CHAT */
  .chat-screen {
    min-height: 100dvh;
    padding: 80px 24px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: #090909;
  }
  .chat-wrap { max-width: 420px; width: 100%; }
  .chat-head { text-align: center; margin-bottom: 40px; }
  .chat-msgs { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
  .chat-row {
    display: flex; flex-direction: column; gap: 7px;
    opacity: 0; transform: translateY(18px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .chat-row.visible { opacity: 1; transform: none; }
  .chat-q {
    align-self: flex-end;
    background: var(--amber); color: var(--dark);
    padding: 11px 15px; border-radius: 18px 18px 3px 18px;
    font-size: 14px; font-weight: 600; max-width: 82%;
  }
  .chat-a {
    align-self: flex-start;
    background: var(--surface); color: var(--tp);
    padding: 11px 15px; border-radius: 18px 18px 18px 3px;
    font-size: 14px; line-height: 1.5; max-width: 82%;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .chat-reveal {
    background: var(--mid);
    border: 1px solid rgba(245,166,35,0.28);
    border-radius: 20px; padding: 22px;
    display: flex; align-items: center; gap: 14px;
    opacity: 0; transform: scale(0.96);
    transition: opacity 0.6s ease, transform 0.6s ease;
    margin-bottom: 24px;
  }
  .chat-reveal.visible { opacity: 1; transform: scale(1); }
  .chat-rev-ava {
    width: 50px; height: 50px; border-radius: 50%;
    background: linear-gradient(135deg, var(--amber), #d4850d);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .chat-rev-name { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
  .chat-rev-role { font-size: 13px; color: var(--ts); margin-bottom: 3px; }
  .chat-rev-url { font-size: 12px; color: var(--amber); font-family: monospace; }
  .chat-footer {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    opacity: 0; transition: opacity 0.6s ease 0.25s;
  }
  .chat-footer.visible { opacity: 1; }
  .chat-cta-btn {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    background: var(--amber); color: var(--dark);
    font-size: 16px; font-weight: 700;
    padding: 15px 32px; border-radius: 100px;
    text-decoration: none; width: 100%;
    transition: transform 0.15s;
  }
  .chat-cta-btn:hover { transform: scale(1.02); }
  .chat-note { font-size: 12px; color: var(--tm); }

  /* SCREEN 5: COMMUNITY TICKER */
  .community {
    padding: 80px 0;
    overflow: hidden;
    background: #111;
  }
  .comm-head { text-align: center; padding: 0 24px 48px; }
  .ticker-row { overflow: hidden; margin-bottom: 14px; }
  .ticker-track {
    display: flex; gap: 14px;
    width: max-content;
  }
  .ticker-left { animation: tickL 42s linear infinite; }
  .ticker-right { animation: tickR 42s linear infinite; }
  @keyframes tickL {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes tickR {
    0% { transform: translateX(-50%); }
    100% { transform: translateX(0); }
  }
  .ticker-card {
    background: var(--surface);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px; padding: 15px 18px;
    min-width: 210px; display: inline-flex;
    flex-direction: column; gap: 3px; flex-shrink: 0;
  }
  .tc-icon { font-size: 18px; margin-bottom: 3px; }
  .tc-name { font-size: 13px; font-weight: 700; }
  .tc-role { font-size: 11px; color: var(--ts); }
  .tc-loc { font-size: 10px; color: var(--tm); }
  .tc-url { font-size: 10px; color: var(--amber); font-family: monospace; }

  /* SCREEN 6: INVITATION */
  .invitation {
    min-height: 100dvh;
    background: var(--amber);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 80px 24px; text-align: center;
  }
  .inv-h2 {
    font-size: clamp(40px, 8.5vw, 84px);
    font-weight: 900; color: var(--dark);
    line-height: 1.05; letter-spacing: -0.03em;
    max-width: 680px; margin-bottom: 24px;
  }
  .inv-sub {
    font-size: clamp(16px, 2.5vw, 20px);
    color: rgba(13,13,13,0.65);
    max-width: 480px; line-height: 1.65; margin-bottom: 48px;
  }
  .inv-cta {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--dark); color: var(--amber);
    font-size: 18px; font-weight: 700;
    padding: 18px 44px; border-radius: 100px;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
    margin-bottom: 18px;
  }
  .inv-cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 52px rgba(13,13,13,0.22);
  }
  .inv-note { font-size: 13px; color: rgba(13,13,13,0.5); }
`;

const CHAT_QA = [
  { q: 'What do you do?', a: 'I teach Maths to GCSE and A-Level students.' },
  { q: 'How do clients find you?', a: 'Word of mouth, mostly. And some WhatsApp groups.' },
  { q: 'Where do you send them first?', a: 'I just share my number… no real link or anything.' },
  { q: 'Do you have a professional spot online?', a: 'Not really. I keep meaning to make one.' },
  { q: 'What if you had one live in 15 minutes?', a: 'That would be incredible, honestly.' },
];

const ROW1 = [
  { icon: '📚', name: 'Priya Sharma', role: 'Maths Tutor', loc: 'Celina, TX', url: 'kryla.work/priyasharma' },
  { icon: '🎂', name: 'Meena Krishnan', role: 'Home Baker', loc: 'Pune, India', url: 'kryla.work/meenabakes' },
  { icon: '💪', name: 'Raj Patel', role: 'Fitness Trainer', loc: 'Prosper, TX', url: 'kryla.work/rajfitness' },
  { icon: '📷', name: 'Alex Chen', role: 'Photographer', loc: 'Frisco, TX', url: 'kryla.work/alexchenphoto' },
  { icon: '🧁', name: 'Sofia Rodriguez', role: 'Pastry Chef', loc: 'Austin, TX', url: 'kryla.work/sofiabakes' },
  { icon: '🎵', name: 'Ananya Iyer', role: 'Music Teacher', loc: 'Chennai, India', url: 'kryla.work/ananyaiyer' },
];

const ROW2 = [
  { icon: '🧘', name: 'Lakshmi Nair', role: 'Yoga Instructor', loc: 'Bengaluru, India', url: 'kryla.work/lakshmiyoga' },
  { icon: '✂️', name: 'Carlos Mendes', role: 'Hair Stylist', loc: 'Dallas, TX', url: 'kryla.work/carlosstyle' },
  { icon: '🎨', name: 'Preethi Sundar', role: 'Art Teacher', loc: 'Hyderabad, India', url: 'kryla.work/preethiart' },
  { icon: '🧑‍🍳', name: 'David Okonkwo', role: 'Private Chef', loc: 'Houston, TX', url: 'kryla.work/davidchef' },
  { icon: '📐', name: 'Sunita Verma', role: 'Interior Consultant', loc: 'Mumbai, India', url: 'kryla.work/sunitadesign' },
  { icon: '🎤', name: 'Ravi Menon', role: 'Voice Coach', loc: 'Kochi, India', url: 'kryla.work/ravivoice' },
];

export default function V2Page() {
  const baRef = useRef<HTMLDivElement>(null);
  const cinematicRef = useRef<HTMLDivElement>(null);
  const chatRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chatRevealRef = useRef<HTMLDivElement>(null);
  const chatFooterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.12 }
    );

    baRef.current?.querySelectorAll('.ba-panel').forEach((el) => observer.observe(el));

    if (cinematicRef.current) observer.observe(cinematicRef.current);

    chatRowRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.transitionDelay = `${i * 0.18}s`;
      observer.observe(el);
    });

    if (chatRevealRef.current) {
      chatRevealRef.current.style.transitionDelay = `${CHAT_QA.length * 0.18}s`;
      observer.observe(chatRevealRef.current);
    }

    if (chatFooterRef.current) observer.observe(chatFooterRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="v2">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Nav */}
      <nav className="v2-nav">
        <a className="v2-nav-logo" href="/">
          <img src="/kryla-wordmark-light.svg" alt="Kryla.work" />
        </a>
        <a className="v2-nav-cta" href="/onboarding">Join free →</a>
      </nav>

      {/* Screen 1 — Hero */}
      <section className="hero">
        <div className="hero-badge">Free to start · Live in 15 minutes</div>
        <h1 className="hero-h1">
          Your work deserves<br />
          a <em>real home</em> online
        </h1>
        <p className="hero-sub">
          Your own spot at kryla.work/yourname — bookings, reviews, services, and contact. All in one place.
        </p>
        <a className="cta-pill" href="/onboarding">Claim your spot free →</a>
        <div className="hero-card">
          <div className="hero-card-live">Live</div>
          <div className="hero-card-ava">📚</div>
          <div className="hero-card-name">Priya Sharma</div>
          <div className="hero-card-role">Maths Tutor · Celina, TX</div>
          <div className="hero-card-url">kryla.work/priyasharma</div>
          <div className="hero-card-stats">
            <div>
              <div className="hcs-val">47</div>
              <div className="hcs-lab">Students</div>
            </div>
            <div>
              <div className="hcs-val">4.9★</div>
              <div className="hcs-lab">Rating</div>
            </div>
            <div>
              <div className="hcs-val">£40</div>
              <div className="hcs-lab">/ hr</div>
            </div>
          </div>
        </div>
      </section>

      {/* Screen 2 — Before / After */}
      <section className="ba-section" ref={baRef}>
        <p className="eyebrow">The difference</p>
        <h2 className="sec-title">Stop living in WhatsApp threads</h2>
        <p className="sec-sub">Every question, every rate enquiry, every new client — they all go to one place now.</p>
        <div className="ba-grid">
          <div className="ba-panel ba-before">
            <div className="ba-lbl ba-lbl-b">✕ Before Kryla</div>
            <div className="wa-scene">
              <div className="wa-bubble">
                <div className="wa-txt">Hi! Do you do home lessons? What are your rates? Any slots this week?</div>
                <div className="wa-meta"><span>10:42 AM</span><span className="wa-ticks">✓✓</span></div>
              </div>
              <div className="wa-bubble">
                <div className="wa-txt">Someone gave me your number. Are you still taking students?</div>
                <div className="wa-meta"><span>11:07 AM</span><span className="wa-ticks">✓✓</span></div>
              </div>
              <div className="wa-bubble">
                <div className="wa-txt">Can you send your credentials? And some reviews from other parents?</div>
                <div className="wa-meta"><span>2:33 PM</span><span className="wa-ticks">✓✓</span></div>
              </div>
            </div>
            <div className="wa-note">Answering the same questions all day</div>
          </div>
          <div className="ba-panel ba-after">
            <div className="ba-lbl ba-lbl-a">✓ With Kryla</div>
            <div className="after-head">
              <div className="after-ava">📚</div>
              <div>
                <div className="after-name">Priya Sharma</div>
                <div className="after-role">Maths Tutor · Celina, TX</div>
                <div className="after-url">kryla.work/priyasharma</div>
              </div>
            </div>
            <div className="after-stats">
              <div className="after-stat"><div className="as-val">47</div><div className="as-lab">Students</div></div>
              <div className="after-stat"><div className="as-val">4.9★</div><div className="as-lab">Rating</div></div>
              <div className="after-stat"><div className="as-val">£40</div><div className="as-lab">/ hr</div></div>
            </div>
            <div className="after-bio">GCSE &amp; A-Level Maths · 8 yrs exp · Online &amp; in-person · DBS checked</div>
          </div>
        </div>
      </section>

      {/* Screen 3 — Cinematic profile */}
      <section className="cinematic">
        <div className="cin-card" ref={cinematicRef}>
          <div className="cin-ava">🧁</div>
          <div className="cin-name">Sofia Rodriguez</div>
          <div className="cin-role">Artisan Pastry Chef</div>
          <div className="cin-loc">Austin, TX</div>
          <div className="cin-rating">4.9</div>
          <div className="cin-stars">★★★★★</div>
          <blockquote className="cin-quote">
            "I used to turn down clients because I had no way to show my work professionally. Now I send them my link and they book the same day."
          </blockquote>
          <div className="cin-url">kryla.work/sofiabakes</div>
        </div>
        <p className="cin-tagline">
          Your work is <em>already remarkable.</em><br />
          Your presence should match it.
        </p>
      </section>

      {/* Screen 4 — Chat UI */}
      <section className="chat-screen">
        <div className="chat-wrap">
          <div className="chat-head">
            <p className="eyebrow">5 questions</p>
            <h2 className="sec-title" style={{ fontSize: 'clamp(24px,5vw,40px)', marginBottom: '8px' }}>
              That build your presence
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--ts)', lineHeight: '1.65' }}>
              Answer five questions. Your spot is live.
            </p>
          </div>
          <div className="chat-msgs">
            {CHAT_QA.map((item, i) => (
              <div
                key={i}
                className="chat-row"
                ref={(el) => { chatRowRefs.current[i] = el; }}
              >
                <div className="chat-q">{item.q}</div>
                <div className="chat-a">{item.a}</div>
              </div>
            ))}
          </div>
          <div className="chat-reveal" ref={chatRevealRef}>
            <div className="chat-rev-ava">📚</div>
            <div>
              <div className="chat-rev-name">Your spot is ready</div>
              <div className="chat-rev-role">Maths Tutor · Celina, TX</div>
              <div className="chat-rev-url">kryla.work/yourname</div>
            </div>
          </div>
          <div className="chat-footer" ref={chatFooterRef}>
            <a className="chat-cta-btn" href="/onboarding">Claim your spot free →</a>
            <span className="chat-note">No card needed · Live in 15 minutes</span>
          </div>
        </div>
      </section>

      {/* Screen 5 — Community ticker */}
      <section className="community">
        <div className="comm-head">
          <p className="eyebrow">The community</p>
          <h2 className="sec-title">Join professionals<br />already growing on Kryla</h2>
        </div>
        <div className="ticker-row">
          <div className="ticker-track ticker-left">
            {[...ROW1, ...ROW1].map((m, i) => (
              <div className="ticker-card" key={i}>
                <div className="tc-icon">{m.icon}</div>
                <div className="tc-name">{m.name}</div>
                <div className="tc-role">{m.role}</div>
                <div className="tc-loc">{m.loc}</div>
                <div className="tc-url">{m.url}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="ticker-row">
          <div className="ticker-track ticker-right">
            {[...ROW2, ...ROW2].map((m, i) => (
              <div className="ticker-card" key={i}>
                <div className="tc-icon">{m.icon}</div>
                <div className="tc-name">{m.name}</div>
                <div className="tc-role">{m.role}</div>
                <div className="tc-loc">{m.loc}</div>
                <div className="tc-url">{m.url}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screen 6 — Amber invitation */}
      <section className="invitation">
        <h2 className="inv-h2">Ready for your own spot?</h2>
        <p className="inv-sub">
          Join tutors, bakers, trainers, and makers who have a real professional presence on Kryla.work.
        </p>
        <a className="inv-cta" href="/onboarding">Join free today →</a>
        <p className="inv-note">Free to start · No card needed · Live in 15 minutes</p>
      </section>
    </div>
  );
}
