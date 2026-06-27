'use client';

import { useState, useEffect, useRef } from 'react';

type Loc = 'india' | 'usa';

const R1 = [
  { icon: '📚', name: 'Priya Sharma',    role: 'Maths Tutor',         loc: 'Celina, TX',         url: 'kryla.work/priyasharma' },
  { icon: '🎂', name: 'Meena Krishnan',  role: 'Home Baker',          loc: 'Pune, India',        url: 'kryla.work/meenabakes' },
  { icon: '💪', name: 'Raj Patel',       role: 'Fitness Trainer',     loc: 'Prosper, TX',        url: 'kryla.work/rajfitness' },
  { icon: '📷', name: 'Alex Chen',       role: 'Photographer',        loc: 'Frisco, TX',         url: 'kryla.work/alexchenphoto' },
  { icon: '🧁', name: 'Sofia Rodriguez', role: 'Pastry Chef',         loc: 'Austin, TX',         url: 'kryla.work/sofiabakes' },
  { icon: '🎵', name: 'Ananya Iyer',     role: 'Music Teacher',       loc: 'Chennai, India',     url: 'kryla.work/ananyaiyer' },
];
const R2 = [
  { icon: '🧘', name: 'Lakshmi Nair',   role: 'Yoga Instructor',     loc: 'Bengaluru, India',   url: 'kryla.work/lakshmiyoga' },
  { icon: '✂️', name: 'Carlos Mendes',  role: 'Hair Stylist',        loc: 'Dallas, TX',         url: 'kryla.work/carlosstyle' },
  { icon: '🎨', name: 'Preethi Sundar', role: 'Art Teacher',         loc: 'Hyderabad, India',   url: 'kryla.work/preethiart' },
  { icon: '🧑‍🍳', name: 'David Okonkwo', role: 'Private Chef',        loc: 'Houston, TX',        url: 'kryla.work/davidchef' },
  { icon: '📐', name: 'Sunita Verma',   role: 'Interior Consultant', loc: 'Mumbai, India',      url: 'kryla.work/sunitadesign' },
  { icon: '🎤', name: 'Ravi Menon',     role: 'Voice Coach',         loc: 'Kochi, India',       url: 'kryla.work/ravivoice' },
];

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

  /* ─── LOCATION BAR ─── */
  .loc-bar {
    position: fixed; top: 0; left: 0; right: 0;
    height: 44px; z-index: 200;
    background: #0D0D0D;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .loc-pill {
    background: none; border: none; cursor: pointer;
    padding: 5px 16px; border-radius: 100px;
    font-size: 13px; font-weight: 600; color: #FFFFFF;
    transition: background 0.2s, color 0.2s;
    font-family: var(--ff); line-height: 1;
    display: inline-flex; align-items: center; gap: 5px;
  }
  .loc-pill:hover { color: rgba(255,255,255,0.75); }
  .loc-pill.active { background: #F5A623; color: #0D0D0D; }

  /* ─── NAV ─── */
  .v2-nav {
    position: fixed; top: 44px; left: 0; right: 0; z-index: 100;
    height: 64px;
    background: #FFFFFF;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px;
    border-bottom: 1px solid #E5E5E5;
  }
  .nav-join {
    display: inline-flex; align-items: center; gap: 6px;
    background: #0D0D0D; color: #FFFFFF;
    font-size: 14px; font-weight: 700;
    padding: 9px 22px; border-radius: 100px;
    text-decoration: none;
    transition: transform 0.15s;
  }
  .nav-join:hover { transform: scale(1.04); }
  .nav-right { display: flex; align-items: center; gap: 16px; }
  .nav-loc { font-size: 12px; color: #999; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
  .nav-loc-switch { font-size: 12px; color: #999; background: none; border: none; cursor: pointer; font-family: var(--ff); padding: 0; text-decoration: underline; text-underline-offset: 2px; }
  .nav-loc-switch:hover { color: #555; }

  /* ─── HERO ─── */
  .hero {
    background: #FFFFFF;
    border-bottom: 1px solid rgba(0,0,0,0.08);
    padding: 128px 24px 100px;
    display: flex; flex-direction: column; align-items: center;
    text-align: center;
    position: relative; overflow: hidden;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: none; }
  }
  .hero-eyebrow {
    font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: #F5A623;
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
    letter-spacing: -0.025em; color: #0D0D0D;
    animation: fadeUp 0.55s ease both 0.18s;
  }
  .h1-l2 {
    font-size: clamp(34px, 6.5vw, 52px);
    font-weight: 900; line-height: 1.1;
    letter-spacing: -0.025em; color: #F5A623;
    animation: fadeUp 0.55s ease both 0.34s;
  }
  .h1-l3 {
    font-size: clamp(18px, 3vw, 26px);
    font-weight: 500; line-height: 1.35;
    color: #444444;
    margin-top: 12px;
    animation: fadeUp 0.55s ease both 0.52s;
  }
  .hero-sub {
    font-size: clamp(16px, 2.2vw, 20px);
    color: #666666;
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
    font-size: 13px; color: rgba(13,13,13,0.4);
    animation: fadeUp 0.55s ease both 0.96s;
  }

  /* ─── BUTTONS ─── */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--amber); color: #0D0D0D;
    font-size: 16px; font-weight: 700;
    padding: 15px 30px; border-radius: 100px;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
    font-family: var(--ff); border: none; cursor: pointer;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(245,166,35,0.34); }
  .btn-primary.lg { font-size: 18px; padding: 17px 38px; }
  .btn-secondary {
    display: inline-flex; align-items: center; gap: 7px;
    background: none; color: rgba(13,13,13,0.65);
    font-size: 16px; font-weight: 600;
    padding: 15px 28px; border-radius: 100px;
    text-decoration: none;
    border: 1.5px solid rgba(13,13,13,0.2);
    transition: border-color 0.2s, color 0.2s;
  }
  .btn-secondary:hover { border-color: rgba(13,13,13,0.5); color: #0D0D0D; }
  .hero .btn-primary { background: #F5A623; color: #0D0D0D; }
  .hero .btn-primary:hover { box-shadow: 0 12px 36px rgba(245,166,35,0.4); }
  .hero .btn-secondary { color: #0D0D0D; border: 1.5px solid #0D0D0D; }
  .hero .btn-secondary:hover { border-color: #0D0D0D; background: rgba(0,0,0,0.04); }

  /* ─── SECTIONS ─── */
  .sec { padding: 88px 24px; }
  .sec-light { background: var(--light); }
  .sec-dark  { background: #0D0D0D; }
  .sec-white { background: #FFFFFF; }
  .sec-border { border-top: 1px solid rgba(0,0,0,0.06); }

  .sec-inner {
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 72px; align-items: center;
  }
  @media (max-width: 800px) {
    .sec-inner { grid-template-columns: 1fr; gap: 44px; }
    .card-right .card-col { order: -1; }
  }

  .sec-eyebrow {
    font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--amber); margin-bottom: 18px;
  }
  .sec-h2 {
    font-size: clamp(27px, 3.8vw, 40px);
    font-weight: 900; line-height: 1.15;
    letter-spacing: -0.02em; margin-bottom: 20px;
  }
  .sec-h2.dark  { color: #0D0D0D; }
  .sec-h2.light { color: #ffffff; }
  .sec-body { font-size: 17px; line-height: 1.75; margin-bottom: 20px; }
  .sec-body.on-light { color: #555; }
  .sec-body.on-dark  { color: rgba(255,255,255,0.58); }
  .sec-warm { font-size: 15px; font-weight: 600; color: var(--amber); line-height: 1.6; }

  /* ─── PROFILE CARD ─── */
  .profile-card {
    background: #1a1a1a;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.07);
    box-shadow: 0 0 60px rgba(245,166,35,0.13), 0 28px 56px rgba(0,0,0,0.22);
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
    animation: livepulse 2.2s ease-in-out infinite;
  }
  @keyframes livepulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .pc-avatar {
    width: 58px; height: 58px; border-radius: 50%;
    background: linear-gradient(135deg, var(--amber), #c97b0a);
    display: flex; align-items: center; justify-content: center;
    font-size: 25px; margin-bottom: 14px;
  }
  .pc-name  { font-size: 19px; font-weight: 800; color: #fff; margin-bottom: 3px; }
  .pc-role  { font-size: 13px; color: rgba(255,255,255,0.48); margin-bottom: 6px; }
  .pc-url   { font-size: 12.5px; color: var(--amber); font-family: monospace; font-weight: 600; }
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
    text-align: center; border: none; cursor: pointer; font-family: var(--ff);
  }
  .pc-btn-w {
    background: none; color: rgba(255,255,255,0.65);
    font-size: 13px; font-weight: 600;
    padding: 10px; border-radius: 10px; text-align: center;
    border: 1.5px solid rgba(255,255,255,0.14);
    cursor: pointer; font-family: var(--ff);
  }
  .pc-rating { font-size: 13px; color: rgba(255,255,255,0.42); text-align: center; }
  .pc-rating span { color: var(--amber); font-weight: 700; }

  /* ─── WHATSAPP CHAT ─── */
  .wa-chat {
    margin-top: 28px;
    background: #FFFFFF;
    border-radius: 16px; padding: 20px 18px;
    display: flex; flex-direction: column; gap: 10px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.08);
  }
  .wa-msg { display: flex; flex-direction: column; }
  .wa-in  { align-items: flex-start; }
  .wa-out { align-items: flex-end; }
  .wa-bubble {
    max-width: 84%; padding: 10px 14px;
    display: flex; flex-direction: column; gap: 5px;
  }
  .wa-in  .wa-bubble { background: #E5E5EA; border-radius: 3px 14px 14px 14px; }
  .wa-out .wa-bubble { background: var(--amber); border-radius: 14px 3px 14px 14px; }
  .wa-txt { font-size: 14px; line-height: 1.5; }
  .wa-in  .wa-txt { color: #0D0D0D; }
  .wa-out .wa-txt { color: #0D0D0D; }
  .wa-out .wa-txt strong { color: #0D0D0D; }
  .wa-meta { font-size: 10px; align-self: flex-end; color: #8c8c8c; }
  .wa-ticks { margin-left: 2px; }

  /* ─── COMMUNITY TICKER ─── */
  .community {
    background: #0D0D0D;
    padding: 80px 0;
    overflow: hidden;
  }
  .community-head {
    text-align: center; padding: 0 24px 48px;
  }
  .community-head .sec-h2 { margin-bottom: 0; }
  .ticker-row { overflow: hidden; margin-bottom: 14px; }
  .ticker-track {
    display: flex; gap: 14px;
    width: max-content;
  }
  .tick-left  { animation: tickL 44s linear infinite; }
  .tick-right { animation: tickR 44s linear infinite; }
  @keyframes tickL { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes tickR { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
  .ticker-card {
    background: #1A1A1A;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px; padding: 15px 18px;
    min-width: 210px; display: inline-flex;
    flex-direction: column; gap: 3px; flex-shrink: 0;
  }
  .tc-icon { font-size: 18px; margin-bottom: 3px; }
  .tc-name { font-size: 13px; font-weight: 700; color: #fff; }
  .tc-role { font-size: 11px; color: rgba(255,255,255,0.55); }
  .tc-loc  { font-size: 10px; color: rgba(255,255,255,0.35); }
  .tc-url  { font-size: 10px; color: var(--amber); font-family: monospace; }

  /* ─── PRICING ─── */
  .pricing { background: #FFFFFF; padding: 88px 24px; }
  .pricing-head { text-align: center; margin-bottom: 56px; }
  .pricing-head .sec-h2 { color: #0D0D0D; }
  .pricing-sub {
    font-size: 18px; color: #555; max-width: 480px;
    margin: 12px auto 0; line-height: 1.65;
  }
  .pricing-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 20px; max-width: 1100px; margin: 0 auto;
  }
  @media (max-width: 900px) { .pricing-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 540px) { .pricing-grid { grid-template-columns: 1fr; } }
  .plan-card {
    background: #fff;
    border: 1.5px solid rgba(0,0,0,0.09);
    border-radius: 18px; padding: 28px 24px;
    display: flex; flex-direction: column; gap: 0;
    position: relative;
  }
  .plan-card.popular {
    border-color: var(--amber);
    box-shadow: 0 0 0 3px rgba(245,166,35,0.14);
  }
  .plan-popular-badge {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    background: var(--amber); color: #0D0D0D;
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
    padding: 3px 12px; border-radius: 100px; white-space: nowrap;
  }
  .plan-icon { font-size: 24px; margin-bottom: 10px; }
  .plan-name { font-size: 18px; font-weight: 800; color: #0D0D0D; margin-bottom: 4px; }
  .plan-price { font-size: 26px; font-weight: 900; color: #0D0D0D; margin-bottom: 4px; }
  .plan-price .per { font-size: 14px; font-weight: 500; color: #888; }
  .plan-tagline { font-size: 13px; color: #777; margin-bottom: 20px; line-height: 1.5; }
  .plan-divider { border: none; border-top: 1px solid rgba(0,0,0,0.07); margin: 0 0 16px; }
  .plan-features { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; flex: 1; }
  .plan-features li {
    font-size: 13px; color: #444; line-height: 1.5;
    display: flex; align-items: flex-start; gap: 8px;
  }
  .plan-features li::before { content: '✓'; color: var(--amber); font-weight: 700; flex-shrink: 0; }
  .plan-btn {
    display: block; text-align: center;
    background: var(--amber); color: #0D0D0D;
    font-size: 14px; font-weight: 700;
    padding: 12px; border-radius: 10px;
    text-decoration: none; transition: transform 0.15s;
  }
  .plan-btn:hover { transform: scale(1.02); }
  .plan-btn.outline {
    background: none; color: #0D0D0D;
    border: 1.5px solid rgba(0,0,0,0.15);
  }
  .plan-btn.outline:hover { border-color: var(--amber); }
  .pricing-elevate {
    text-align: center; margin-top: 36px;
    font-size: 14px; color: #777; max-width: 520px; margin-left: auto; margin-right: auto;
  }
  .pricing-elevate strong { color: #0D0D0D; }

  /* ─── TESTIMONIALS ─── */
  .testimonials { background: #0D0D0D; padding: 88px 24px; }
  .testi-head { text-align: center; margin-bottom: 56px; }
  .testi-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 20px; max-width: 1100px; margin: 0 auto;
  }
  @media (max-width: 800px) { .testi-grid { grid-template-columns: 1fr; } }
  .testi-card {
    background: #1A1A1A;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px; padding: 28px 24px;
    display: flex; flex-direction: column; gap: 20px;
  }
  .testi-stars { font-size: 14px; color: var(--amber); }
  .testi-quote {
    font-size: 15px; line-height: 1.7;
    color: rgba(255,255,255,0.8); flex: 1;
    font-style: italic;
  }
  .testi-author { display: flex; flex-direction: column; gap: 2px; }
  .testi-name { font-size: 14px; font-weight: 700; color: #fff; }
  .testi-role { font-size: 12px; color: rgba(255,255,255,0.45); }

  /* ─── CTA ─── */
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
  .cta-sub { font-size: 18px; color: rgba(13,13,13,0.58); margin-bottom: 40px; line-height: 1.65; }
  .cta-sec .btn-primary { background: #0D0D0D; color: var(--amber); }
  .cta-sec .btn-primary:hover { box-shadow: 0 12px 36px rgba(13,13,13,0.22); }
  .cta-note { margin-top: 16px; font-size: 13px; color: rgba(13,13,13,0.42); }

  /* ─── FOOTER ─── */
  .v2-footer {
    background: #FAFAFA;
    border-top: 1px solid rgba(0,0,0,0.06);
    padding: 40px 32px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    text-align: center;
  }
  .footer-brand { display: flex; align-items: center; gap: 8px; }
  .footer-wordmark { font-size: 16px; font-weight: 800; letter-spacing: -0.5px; }
  .footer-copy { font-size: 12px; color: rgba(13,13,13,0.35); }

  /* ─── CENTERED SECTION HEADS ─── */
  .sec-head-center { text-align: center; margin-bottom: 56px; }
  .sec-head-center .sec-h2 { max-width: 600px; margin-left: auto; margin-right: auto; margin-bottom: 0; }

  /* ─── HERO FLOATING PHOTOS ─── */
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(var(--rotation)); }
    50%       { transform: translateY(-12px) rotate(var(--rotation)); }
  }
  .hero-bg {
    position: absolute; inset: 0;
    overflow: hidden; pointer-events: none; z-index: 0;
  }
  .hero-content {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center;
    width: 100%;
  }
  .hf-wrap {
    position: absolute;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    animation: float 5s ease-in-out infinite;
  }
  .hf-photo {
    width: 160px; height: 200px;
    object-fit: cover;
    border-radius: 20px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    border-radius: 16px;
    opacity: 0.85;
    display: block;
  }
  .hf-label {
    background: rgba(255,255,255,0.92);
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 11px; font-weight: 600; color: #C17A3A;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    white-space: nowrap;
  }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 768px) {
    .hero { padding-top: 108px; padding-bottom: 40px; flex-direction: column; }
    .hero-bg { position: relative; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; padding: 16px 16px 0; margin-bottom: 24px; }
    .hf-wrap { position: static; animation: none; transform: none !important; }
    .hf-wrap:nth-child(5), .hf-wrap:nth-child(6) { display: none; }
    .hf-photo { width: 90px; height: 110px; }
    .hf-label { font-size: 10px; }
    .hero-content { position: relative; z-index: 1; }
    .hero-btns { flex-direction: column; align-items: center; }
    .btn-primary, .btn-secondary { justify-content: center; max-width: 280px; }
  }
  @media (max-width: 480px) {
    .v2-nav  { padding: 0 16px; }
    .hero    { padding: 108px 20px 72px; }
    .hero-h1 span { font-size: 36px !important; }
    .sec     { padding: 64px 20px; }
    .pc-btns { grid-template-columns: 1fr; }
  }

  /* ─── HORIZONTAL SLIDER ─── */
  .slider-outer {
    background: var(--light);
    position: relative;
    overflow: hidden;
    width: 100%;
  }
  .slider-track {
    display: flex;
    transition: transform 0.55s cubic-bezier(0.77, 0, 0.175, 1);
  }
  .slider-slide {
    width: 100%;
    min-width: 100%;
    flex-shrink: 0;
    padding: 88px 24px;
    box-sizing: border-box;
  }
  .slider-arrow {
    position: absolute; top: 50%; transform: translateY(-50%);
    z-index: 10;
    width: 48px; height: 48px; border-radius: 50%;
    background: #fff; border: 1.5px solid rgba(0,0,0,0.12);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 18px; color: #0D0D0D;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    transition: background 0.2s, border-color 0.2s, transform 0.2s;
  }
  .slider-arrow:hover { background: #F5A623; border-color: #F5A623; transform: translateY(-50%) scale(1.08); }
  .slider-arrow.prev { left: 16px; }
  .slider-arrow.next { right: 16px; }
  .slider-dots {
    display: flex; justify-content: center; gap: 8px;
    padding: 20px 0 32px;
    background: var(--light);
  }
  .slider-dot {
    width: 8px; height: 8px; border-radius: 50%;
    border: none; cursor: pointer;
    background: rgba(0,0,0,0.15);
    transition: background 0.3s, transform 0.3s;
    padding: 0;
  }
  .slider-dot.active { background: #F5A623; transform: scale(1.4); }
  @media (max-width: 768px) {
    .slider-arrow { display: none; }
    .slider-slide { padding: 32px 20px; }
    .slider-slide .sec-inner { display: block; }
    .slider-slide .card-col { margin-bottom: 28px; }
    .slider-slide .card-right .card-col { margin-bottom: 28px; }
    .profile-card { max-width: 100%; box-sizing: border-box; }
    .pc-btns { grid-template-columns: 1fr 1fr; }
  }
`;

function PriyaCard({ loc }: { loc: Loc }) {
  const p1 = loc === 'india' ? '₹800/hr'   : '$30/hr';
  const p2 = loc === 'india' ? '₹400/hr'   : '$15/hr';
  const p3 = loc === 'india' ? '₹4,999/mo' : '$199/mo';
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

function RajCard({ loc }: { loc: Loc }) {
  const p1 = loc === 'india' ? '₹1,200/hr'  : '$40/hr';
  const p2 = loc === 'india' ? '₹400/class' : '$15/class';
  const p3 = loc === 'india' ? '₹6,999/mo'  : '$249/mo';
  return (
    <div className="profile-card">
      <div className="pc-live">Live</div>
      <div className="pc-avatar">💪</div>
      <div className="pc-name">Raj Patel</div>
      <div className="pc-role">Fitness Trainer · Prosper, TX</div>
      <div className="pc-url">kryla.work/rajfitness</div>
      <hr className="pc-hr" />
      <div className="pc-svcs">
        <div className="pc-svc"><span className="pc-svc-n">Personal training session</span><span className="pc-svc-p">{p1}</span></div>
        <div className="pc-svc"><span className="pc-svc-n">Group class</span><span className="pc-svc-p">{p2}</span></div>
        <div className="pc-svc"><span className="pc-svc-n">Monthly coaching</span><span className="pc-svc-p">{p3}</span></div>
      </div>
      <hr className="pc-hr" />
      <div className="pc-btns" style={{ marginBottom: '18px' }}>
        <button className="pc-btn-a">Book a Session</button>
        <button className="pc-btn-w">WhatsApp</button>
      </div>
      <div className="pc-rating"><span>4.9 ★★★★★</span> · 89 clients</div>
    </div>
  );
}

function AlexCard({ loc }: { loc: Loc }) {
  const p1 = loc === 'india' ? '₹3,500'     : '$120';
  const p2 = loc === 'india' ? '₹6,000'     : '$220';
  const p3 = loc === 'india' ? '₹15,000/mo' : '$499/mo';
  return (
    <div className="profile-card">
      <div className="pc-live">Live</div>
      <div className="pc-avatar">📷</div>
      <div className="pc-name">Alex Chen</div>
      <div className="pc-role">Photographer · Frisco, TX</div>
      <div className="pc-url">kryla.work/alexchenphoto</div>
      <hr className="pc-hr" />
      <div className="pc-svcs">
        <div className="pc-svc"><span className="pc-svc-n">Portrait session</span><span className="pc-svc-p">{p1}</span></div>
        <div className="pc-svc"><span className="pc-svc-n">Half-day shoot</span><span className="pc-svc-p">{p2}</span></div>
        <div className="pc-svc"><span className="pc-svc-n">Monthly retainer</span><span className="pc-svc-p">{p3}</span></div>
      </div>
      <hr className="pc-hr" />
      <div className="pc-btns" style={{ marginBottom: '18px' }}>
        <button className="pc-btn-a">Book Now</button>
        <button className="pc-btn-w">WhatsApp</button>
      </div>
      <div className="pc-rating"><span>5.0 ★★★★★</span> · 32 clients</div>
    </div>
  );
}

function HorizontalSlider({ loc }: { loc: Loc }) {
  const [current, setCurrent] = useState(0);
  const [width, setWidth] = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = 4;

  useEffect(() => {
    const measure = () => {
      if (outerRef.current) setWidth(outerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % total), 4000);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const goTo = (i: number) => { setCurrent(i); startTimer(); };
  const prev = () => goTo((current - 1 + total) % total);
  const next = () => goTo((current + 1) % total);

  const touchStart = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
  };

  return (
    <>
      <div className="slider-outer" ref={outerRef}>
        <button className="slider-arrow prev" onClick={prev} aria-label="Previous">←</button>
        <button className="slider-arrow next" onClick={next} aria-label="Next">→</button>
        <div
          className="slider-track"
          style={{ transform: `translateX(-${current * (width || 100)}px)` }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >

          <div className="slider-slide">
            <div className="sec-inner card-right">
              <div className="text-col">
                <p className="sec-eyebrow">YOUR IDENTITY ONLINE</p>
                <h2 className="sec-h2 dark">Your name.<br />Your work.<br />One link that says it all.</h2>
                <p className="sec-body on-light">Every skilled professional deserves a presence that matches their craft. Kryla gives you your own spot — with your services, your prices, and a way for people to reach you directly.</p>
                <p className="sec-warm">Like a visiting card — but one that works while you sleep.</p>
              </div>
              <div className="card-col"><PriyaCard loc={loc} /></div>
            </div>
          </div>

          <div className="slider-slide">
            <div className="sec-inner card-right">
              <div className="text-col">
                <p className="sec-eyebrow">ONE LINK FOR EVERYTHING</p>
                <h2 className="sec-h2 dark">Send one link.<br />They know everything<br />they need to know.</h2>
                <p className="sec-body on-light">Your name. What you do. What you charge. When you&apos;re free. What your clients say. All in one place they can open on any phone.</p>
                <div className="wa-chat">
                  <div className="wa-msg wa-in"><div className="wa-bubble"><span className="wa-txt">Hi! Are you available this week?</span><span className="wa-meta">10:42 AM <span className="wa-ticks">✓✓</span></span></div></div>
                  <div className="wa-msg wa-out"><div className="wa-bubble"><span className="wa-txt">Here&apos;s my Kryla link — <strong>kryla.work/meenabakes</strong> — order directly there! 😊</span><span className="wa-meta">10:43 AM <span className="wa-ticks">✓✓</span></span></div></div>
                </div>
              </div>
              <div className="card-col"><MeenaCard loc={loc} /></div>
            </div>
          </div>

          <div className="slider-slide">
            <div className="sec-inner card-right">
              <div className="text-col">
                <p className="sec-eyebrow">LIVE IN 15 MINUTES</p>
                <h2 className="sec-h2 dark">Answer 5 questions.<br />We handle<br />everything else.</h2>
                <p className="sec-body on-light">No design skills needed. No complicated setup. Tell us what you do, who you help, and what you charge — your professional spot is live before your next session starts.</p>
                <p className="sec-warm">Most members are live in under 15 minutes. No coding. No stress.</p>
              </div>
              <div className="card-col"><RajCard loc={loc} /></div>
            </div>
          </div>

          <div className="slider-slide">
            <div className="sec-inner card-right">
              <div className="text-col">
                <p className="sec-eyebrow">WORKS WHERE YOUR CLIENTS ARE</p>
                <h2 className="sec-h2 dark">New booking?<br />You get a WhatsApp.<br />Done.</h2>
                <p className="sec-body on-light">When someone&apos;s ready to hire you, Kryla sends you a WhatsApp. Accept with one tap. Your client gets their confirmation right away. Business handled — without switching between apps.</p>
                <div className="wa-chat">
                  <div className="wa-msg wa-in"><div className="wa-bubble"><span className="wa-txt">📅 New request from Sarah — Family Portraits, Saturday 10am. Tap to confirm.</span><span className="wa-meta">9:14 AM <span className="wa-ticks">✓✓</span></span></div></div>
                  <div className="wa-msg wa-out"><div className="wa-bubble"><span className="wa-txt">Confirmed! 📸 Sarah gets your details straight away.</span><span className="wa-meta">9:15 AM <span className="wa-ticks">✓✓</span></span></div></div>
                </div>
              </div>
              <div className="card-col"><AlexCard loc={loc} /></div>
            </div>
          </div>

        </div>
      </div>
      <div className="slider-dots">
        {Array.from({ length: total }).map((_, i) => (
          <button key={i} className={`slider-dot${i === current ? ' active' : ''}`} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`} />
        ))}
      </div>
    </>
  );
}

export default function V2Page() {
  const [loc, setLoc] = useState<Loc>('usa');
  const [locDetected, setLocDetected] = useState(false);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        setLoc(data.country_code === 'IN' ? 'india' : 'usa');
        setLocDetected(true);
      })
      .catch(() => { setLoc('usa'); setLocDetected(true); });
  }, []);

  const toggleLoc = () => setLoc(l => l === 'india' ? 'usa' : 'india');

  const sproutP = loc === 'india' ? '₹299' : '$5';
  const growP   = loc === 'india' ? '₹799' : '$12';
  const thriveP = loc === 'india' ? '₹1,999' : '$25';
  const eleP    = loc === 'india' ? '₹3,999' : '$45';

  return (
    <div className="v2">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Location toggle bar */}
      <div className="loc-bar">
        <button className={`loc-pill${loc === 'india' ? ' active' : ''}`} onClick={() => setLoc('india')}>🇮🇳 India</button>
        <button className={`loc-pill${loc === 'usa' ? ' active' : ''}`} onClick={() => setLoc('usa')}>🇺🇸 USA</button>
      </div>

      {/* Nav */}
      <nav className="v2-nav">
        <a href="/" style={{textDecoration:'none'}}>
          <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 10 L20 90" stroke="#0D0D0D" strokeWidth="14" strokeLinecap="round"/>
              <path d="M20 50 L70 10" stroke="#0D0D0D" strokeWidth="14" strokeLinecap="round"/>
              <path d="M20 50 L70 90" stroke="#F5A623" strokeWidth="14" strokeLinecap="round"/>
            </svg>
            <span style={{fontSize:'17px', fontWeight:800, letterSpacing:'-0.5px'}}>
              <span style={{color:'#0D0D0D'}}>kryla</span><span style={{color:'#F5A623'}}>.work</span>
            </span>
          </div>
        </a>
        <div className="nav-right">
          <a href="/onboarding" className="nav-join">Join free →</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">

        {/* Floating background cards */}
        <div className="hero-bg">
          <div className="hf-wrap" style={{ top:'5%', left:'20px', '--rotation':'-6deg', animationDelay:'0s' } as React.CSSProperties}>
            <img className="hf-photo" src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&q=80" alt="Maths Tutor" />
            <span className="hf-label">📚 Maths Tutor</span>
          </div>
          <div className="hf-wrap" style={{ top:'3%', right:'0%', '--rotation':'5deg', animationDelay:'0.8s' } as React.CSSProperties}>
            <img className="hf-photo" src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&q=80" alt="Home Baker" />
            <span className="hf-label">🎂 Home Baker</span>
          </div>
          <div className="hf-wrap" style={{ top:'42%', left:'20px', '--rotation':'3deg', animationDelay:'1.6s' } as React.CSSProperties}>
            <img className="hf-photo" src="https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80" alt="Fitness Trainer" />
            <span className="hf-label">💪 Fitness Trainer</span>
          </div>
          <div className="hf-wrap" style={{ top:'38%', right:'-1%', '--rotation':'-4deg', animationDelay:'2.4s' } as React.CSSProperties}>
            <img className="hf-photo" src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=300&q=80" alt="Photographer" />
            <span className="hf-label">📸 Photographer</span>
          </div>
          <div className="hf-wrap" style={{ bottom:'2%', left:'12%', '--rotation':'-3deg', animationDelay:'3.2s' } as React.CSSProperties}>
            <img className="hf-photo" src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80" alt="Salon" />
            <span className="hf-label">✂️ Salon</span>
          </div>
          <div className="hf-wrap" style={{ bottom:'0%', right:'8%', '--rotation':'6deg', animationDelay:'4s' } as React.CSSProperties}>
            <img className="hf-photo" src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&q=80" alt="Yoga Teacher" />
            <span className="hf-label">🧘 Yoga Teacher</span>
          </div>
        </div>

        {/* Foreground text content */}
        <div className="hero-content">
          <p className="hero-eyebrow">FOR EVERY SKILLED PROFESSIONAL</p>
          <h1 className="hero-h1">
            <span className="h1-l1">Your craft deserves</span>
            <span className="h1-l2">a name online.</span>
            <span className="h1-l3">Give your business its own identity.</span>
          </h1>
          <p className="hero-sub">Your name. Your work. Your spot online — in 15 minutes.</p>
          <div className="hero-btns">
            <a href="/onboarding" className="btn-primary">Claim your spot — it&apos;s free</a>
            <a href="#s1" className="btn-secondary">See how it works ↓</a>
          </div>
          <p className="hero-proof">Free to start · No card needed · Live in 15 minutes · Works on WhatsApp</p>
        </div>

        {/* K mark watermark */}
        <div style={{position:'absolute', bottom:'24px', right:'24px', zIndex:0, opacity:0.15, pointerEvents:'none'}}>
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 10 L20 90" stroke="#0D0D0D" strokeWidth="12" strokeLinecap="round"/>
            <path d="M20 50 L70 10" stroke="#0D0D0D" strokeWidth="12" strokeLinecap="round"/>
            <path d="M20 50 L70 90" stroke="#F5A623" strokeWidth="12" strokeLinecap="round"/>
          </svg>
        </div>

      </section>

      <div id="slider">
        <HorizontalSlider loc={loc} />
      </div>

      {/* ── COMMUNITY — dark #0D0D0D ── */}
      <section className="community">
        <div className="community-head">
          <p className="sec-eyebrow">THE COMMUNITY</p>
          <h2 className="sec-h2 light">Join professionals already growing on Kryla</h2>
        </div>
        <div className="ticker-row">
          <div className="ticker-track tick-left">
            {[...R1, ...R1].map((m, i) => (
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
          <div className="ticker-track tick-right">
            {[...R2, ...R2].map((m, i) => (
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

      {/* ── PRICING — white #FFFFFF ── */}
      <section className="pricing">
        <div className="pricing-head">
          <p className="sec-eyebrow">YOUR MEMBERSHIP</p>
          <h2 className="sec-h2">Free to start. Grow when you&apos;re ready.</h2>
          <p className="pricing-sub">Every membership starts free. Move up only when Kryla is already working for you.</p>
        </div>
        <div className="pricing-grid">

          {/* Seed */}
          <div className="plan-card">
            <div className="plan-icon">🌱</div>
            <div className="plan-name">Seed</div>
            <div className="plan-price">Free <span className="per">forever</span></div>
            <div className="plan-tagline">Your presence online, yours to keep.</div>
            <hr className="plan-divider" />
            <ul className="plan-features">
              <li>Your own spot on kryla.work</li>
              <li>Services &amp; contact form</li>
              <li>Member directory listing</li>
            </ul>
            <a href="/onboarding" className="plan-btn outline">Start free →</a>
          </div>

          {/* Sprout */}
          <div className="plan-card">
            <div className="plan-icon">🌿</div>
            <div className="plan-name">Sprout</div>
            <div className="plan-price">{sproutP} <span className="per">/mo</span></div>
            <div className="plan-tagline">Bookings and real-time alerts.</div>
            <hr className="plan-divider" />
            <ul className="plan-features">
              <li>Everything in Seed</li>
              <li>Booking form on your spot</li>
              <li>WhatsApp alert when new business comes in</li>
            </ul>
            <a href="/onboarding" className="plan-btn">Join Sprout →</a>
          </div>

          {/* Grow */}
          <div className="plan-card popular">
            <div className="plan-popular-badge">MOST POPULAR</div>
            <div className="plan-icon">🌳</div>
            <div className="plan-name">Grow</div>
            <div className="plan-price">{growP} <span className="per">/mo</span></div>
            <div className="plan-tagline">Your own address on the internet.</div>
            <hr className="plan-divider" />
            <ul className="plan-features">
              <li>Everything in Sprout</li>
              <li>Your own domain (priya.com)</li>
              <li>Analytics — see who&apos;s looking you up</li>
            </ul>
            <a href="/onboarding" className="plan-btn">Join Grow →</a>
          </div>

          {/* Thrive */}
          <div className="plan-card">
            <div className="plan-icon">🚀</div>
            <div className="plan-name">Thrive</div>
            <div className="plan-price">{thriveP} <span className="per">/mo</span></div>
            <div className="plan-tagline">Your spot runs itself.</div>
            <hr className="plan-divider" />
            <ul className="plan-features">
              <li>Everything in Grow</li>
              <li>Update your spot via WhatsApp</li>
              <li>All smart features active</li>
              <li>Review collection</li>
            </ul>
            <a href="/onboarding" className="plan-btn">Join Thrive →</a>
          </div>

        </div>
        <p className="pricing-elevate">
          Going bigger? <strong>Elevate ({eleP}/mo)</strong> adds online payments, team access, and branded email — for members who are ready to scale.
        </p>
      </section>

      {/* ── TESTIMONIALS — dark #0D0D0D ── */}
      <section className="testimonials">
        <div className="testi-head">
          <p className="sec-eyebrow">WHAT MEMBERS SAY</p>
          <h2 className="sec-h2 light">Real people. Real results.</h2>
        </div>
        <div className="testi-grid">
          {loc === 'india' ? (
            <>
              <div className="testi-card">
                <div className="testi-stars">★★★★★</div>
                <p className="testi-quote">&ldquo;I was embarrassed to share my Instagram — it&rsquo;s just food photos and messages. My Kryla link made me feel like a real business for the first time.&rdquo;</p>
                <div className="testi-author">
                  <span className="testi-name">Meena Krishnan</span>
                  <span className="testi-role">Home Baker · Pune, India</span>
                </div>
              </div>
              <div className="testi-card">
                <div className="testi-stars">★★★★★</div>
                <p className="testi-quote">&ldquo;I used to spend 30 minutes explaining myself to every new enquiry. Now I send one link. Three new students booked last week alone.&rdquo;</p>
                <div className="testi-author">
                  <span className="testi-name">Priya Sharma</span>
                  <span className="testi-role">Maths Tutor · Celina, TX</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="testi-card">
                <div className="testi-stars">★★★★★</div>
                <p className="testi-quote">&ldquo;I used to spend 30 minutes explaining myself to every new enquiry. Now I send one link. Three new students booked last week alone.&rdquo;</p>
                <div className="testi-author">
                  <span className="testi-name">Priya Sharma</span>
                  <span className="testi-role">Maths Tutor · Celina, TX</span>
                </div>
              </div>
              <div className="testi-card">
                <div className="testi-stars">★★★★★</div>
                <p className="testi-quote">&ldquo;I was embarrassed to share my Instagram — it&rsquo;s just food photos and messages. My Kryla link made me feel like a real business for the first time.&rdquo;</p>
                <div className="testi-author">
                  <span className="testi-name">Meena Krishnan</span>
                  <span className="testi-role">Home Baker · Pune, India</span>
                </div>
              </div>
            </>
          )}
          <div className="testi-card">
            <div className="testi-stars">★★★★★</div>
            <p className="testi-quote">&ldquo;Bookings come in while I&rsquo;m training someone else. I confirm with one tap and my client gets everything they need. It basically runs itself.&rdquo;</p>
            <div className="testi-author">
              <span className="testi-name">Raj Patel</span>
              <span className="testi-role">Fitness Trainer · Prosper, TX</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA — amber #F5A623 ── */}
      <section className="cta-sec">
        <div style={{display:'flex', justifyContent:'center', marginBottom:'24px'}}>
          <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity:0.2}}>
            <path d="M20 10 L20 90" stroke="#0D0D0D" strokeWidth="12" strokeLinecap="round"/>
            <path d="M20 50 L70 10" stroke="#0D0D0D" strokeWidth="12" strokeLinecap="round"/>
            <path d="M20 50 L70 90" stroke="rgba(0,0,0,0.4)" strokeWidth="12" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="cta-eyebrow">YOUR SPOT IS WAITING</p>
        <h2 className="cta-h2">Ready to claim yours?</h2>
        <p className="cta-sub">Free to join. Live in 15 minutes.</p>
        <a href="/onboarding" className="btn-primary lg">Claim your spot — it&apos;s free →</a>
        <p className="cta-note">No card needed · Cancel anytime</p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="v2-footer">
        <div className="footer-brand">
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 10 L20 90" stroke="#0D0D0D" strokeWidth="14" strokeLinecap="round"/>
            <path d="M20 50 L70 10" stroke="#0D0D0D" strokeWidth="14" strokeLinecap="round"/>
            <path d="M20 50 L70 90" stroke="#F5A623" strokeWidth="14" strokeLinecap="round"/>
          </svg>
          <span className="footer-wordmark">
            <span style={{color:'rgba(13,13,13,0.5)'}}>kryla</span>
            <span style={{color:'#F5A623'}}>.work</span>
          </span>
        </div>
        <p className="footer-copy">© 2026 Kryla.work · Built for makers everywhere.</p>
      </footer>
    </div>
  );
}
