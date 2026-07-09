'use client';

import { useState, useEffect, useRef } from 'react';
import type { PlanDef } from '@/lib/plans';

type Loc = 'india' | 'usa';

// persona: null = always shown regardless of toggle
const R1_ALL = [
  { icon: '📚', name: 'Priya Sharma',    role: 'Tutor',           loc: 'Celina, TX',       url: 'kryla.work/priyasharma',   persona: 'tutor' },
  { icon: '🎂', name: 'Meena Krishnan',  role: 'Home Baker',      loc: 'Pune, India',      url: 'kryla.work/meenabakes',    persona: 'baker' },
  { icon: '💪', name: 'Raj Patel',       role: 'Fitness Trainer', loc: 'Prosper, TX',      url: 'kryla.work/rajfitness',    persona: 'trainer' },
  { icon: '📷', name: 'Alex Chen',       role: 'Photographer',    loc: 'Frisco, TX',       url: 'kryla.work/alexchenphoto', persona: 'photographer' },
  { icon: '🧁', name: 'Sofia Rodriguez', role: 'Pastry Chef',     loc: 'Austin, TX',       url: 'kryla.work/sofiabakes',    persona: 'chef' },
  { icon: '🎵', name: 'Ananya Iyer',     role: 'Music Teacher',   loc: 'Chennai, India',   url: 'kryla.work/ananyaiyer',    persona: 'musician' },
];
const R2_ALL = [
  { icon: '🧘', name: 'Lakshmi Nair',   role: 'Yoga Instructor',     loc: 'Bengaluru, India', url: 'kryla.work/lakshmiyoga',    persona: 'trainer' },
  { icon: '✂️', name: 'Carlos Mendes',  role: 'Hair Stylist',        loc: 'Dallas, TX',       url: 'kryla.work/carlosstyle',    persona: 'salon' },
  { icon: '🎨', name: 'Preethi Sundar', role: 'Art Teacher',         loc: 'Hyderabad, India', url: 'kryla.work/preethiart',     persona: 'tutor' },
  { icon: '🧑‍🍳', name: 'David Okonkwo', role: 'Private Chef',        loc: 'Houston, TX',      url: 'kryla.work/davidchef',      persona: 'chef' },
  { icon: '📐', name: 'Sunita Verma',   role: 'Interior Consultant', loc: 'Mumbai, India',    url: 'kryla.work/sunitadesign',   persona: null },
  { icon: '🎤', name: 'Ravi Menon',     role: 'Voice Coach',         loc: 'Kochi, India',     url: 'kryla.work/ravivoice',      persona: 'musician' },
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
    min-height: 660px;
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

  /* ─── MINI PAGE PREVIEW CARDS ─── */
  .mp-card {
    max-width: 320px; width: 100%;
    border-radius: 14px; overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08);
    background: #fff;
    border: 1px solid rgba(0,0,0,0.07);
  }
  .mp-chrome {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px;
    background: #F0F0F0; border-bottom: 1px solid #E0E0E0;
  }
  .mp-dots { display: flex; gap: 5px; }
  .mp-dots span { width: 7px; height: 7px; border-radius: 50%; display: block; }
  .mp-url { font-size: 10px; color: #999; flex: 1; text-align: center; font-family: monospace; }
  .mp-hero { padding: 22px 18px 18px; text-align: center; }
  .mp-hero-avatar { font-size: 34px; margin-bottom: 8px; line-height: 1; }
  .mp-hero-name { font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 3px; letter-spacing: -0.01em; }
  .mp-hero-role { font-size: 10px; color: rgba(255,255,255,0.55); margin-bottom: 3px; }
  .mp-hero-loc  { font-size: 10px; color: rgba(255,255,255,0.35); margin-bottom: 13px; }
  .mp-cta {
    display: inline-block;
    font-size: 10px; font-weight: 800;
    padding: 7px 16px; border-radius: 100px; border: none;
    cursor: pointer; letter-spacing: 0.02em; font-family: var(--ff);
  }
  .mp-svcs { padding: 12px 16px; }
  .mp-svcs-label {
    font-size: 8.5px; font-weight: 900; letter-spacing: 0.18em;
    color: #bbb; text-transform: uppercase; margin-bottom: 9px;
  }
  .mp-svc {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 0; border-bottom: 1px solid #F5F5F5;
    font-size: 11.5px; color: #444;
  }
  .mp-svc:last-child { border-bottom: none; }
  .mp-svc-p { font-weight: 700; font-size: 11.5px; white-space: nowrap; margin-left: 8px; }
  .mp-footer {
    padding: 8px 16px;
    background: #FAFAFA; border-top: 1px solid #F0F0F0;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 10px; color: #999;
  }
  .mp-footer-brand { font-size: 9px; font-weight: 700; color: #ccc; }
  @media (max-width: 768px) { .mp-card { max-width: 100%; box-sizing: border-box; } }

  /* ─── FEATURE LIST (slider step 4) ─── */
  .feature-list {
    margin-top: 20px;
    display: flex; flex-direction: column; gap: 7px;
  }
  .feature-item {
    font-size: 13.5px; line-height: 1.4; color: #444;
    display: flex; align-items: flex-start; gap: 9px;
  }
  .feature-check {
    color: #F5A623; font-weight: 800; font-size: 14px; flex-shrink: 0; margin-top: 1px;
  }

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
    display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px; max-width: 1100px; margin: 0 auto;
  }
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
    50%       { transform: translateY(-14px) rotate(var(--rotation)); }
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
  /* Two 2×2 clusters flanking the headline, vertically centred */
  .hf-cluster {
    position: absolute; top: 50%; transform: translateY(-50%);
    display: grid; grid-template-columns: repeat(2, auto);
    gap: 20px 18px;
  }
  .hf-cluster.left  { left: 20px; }
  .hf-cluster.right { right: 20px; }
  .hf-wrap {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    animation: float 5s ease-in-out infinite;
  }
  .hf-photo {
    width: 135px; height: 170px;
    object-fit: cover;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
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
    .hf-cluster { display: contents; transform: none; }
    .hf-wrap { position: static; animation: none; transform: none !important; }
    .hf-wrap:nth-child(n+5) { display: none; }
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
  }

  /* ─── STEP PLAN CARDS (slider step 3) ─── */
  .step-plans { display: flex; flex-direction: column; gap: 10px; max-width: 280px; }
  .step-plan {
    display: grid; grid-template-columns: 28px 1fr auto;
    align-items: center; gap: 4px 10px;
    background: #FAFAFA; border: 1.5px solid #E5E5E5;
    border-radius: 12px; padding: 10px 14px;
  }
  .step-plan-pop { border-color: #F5A623; background: #FFFBF5; }
  .step-plan-emoji { font-size: 20px; grid-row: span 2; }
  .step-plan-name  { font-size: 13px; font-weight: 700; color: #0D0D0D; }
  .step-plan-price { font-size: 13px; font-weight: 700; color: #F5A623; }
  .step-plan-tag   { font-size: 11px; color: #777; grid-column: 2 / 4; }

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
  }
`;

function PriyaCard({ loc }: { loc: Loc }) {
  const accent = '#F5A623';
  const p1 = loc === 'india' ? 'Rs 800/hr'   : '$30/hr';
  const p2 = loc === 'india' ? 'Rs 400/hr'   : '$15/hr';
  const p3 = loc === 'india' ? 'Rs 4,999/mo' : '$199/mo';
  return (
    <div className="mp-card">
      <div className="mp-chrome">
        <div className="mp-dots"><span style={{background:'#FF5F57'}}/><span style={{background:'#FEBC2E'}}/><span style={{background:'#28C840'}}/></div>
        <div className="mp-url">kryla.work/priyasharma</div>
      </div>
      <div className="mp-hero" style={{ background: '#0D0D0D' }}>
        <div className="mp-hero-avatar">📚</div>
        <div className="mp-hero-name">Priya Sharma</div>
        <div className="mp-hero-role">Maths &amp; Science Tutor</div>
        <div className="mp-hero-loc">📍 Celina, TX</div>
        <button className="mp-cta" style={{ background: accent, color: '#0D0D0D' }}>Book a Session →</button>
      </div>
      <div className="mp-svcs">
        <div className="mp-svcs-label">Services</div>
        <div className="mp-svc"><span>One-on-one session</span><span className="mp-svc-p" style={{color:accent}}>{p1}</span></div>
        <div className="mp-svc"><span>Small group (3–4)</span><span className="mp-svc-p" style={{color:accent}}>{p2}</span></div>
        <div className="mp-svc"><span>Monthly plan</span><span className="mp-svc-p" style={{color:accent}}>{p3}</span></div>
      </div>
      <div className="mp-footer">
        <span><span style={{color:accent}}>★★★★★</span> 4.9 · 47 students</span>
        <span className="mp-footer-brand">kryla.work</span>
      </div>
    </div>
  );
}

function MeenaCard({ loc }: { loc: Loc }) {
  const accent = '#EA8C00';
  const p1 = loc === 'india' ? 'Rs 600'      : '$25';
  const p2 = loc === 'india' ? 'Rs 1,200'    : '$50';
  const p3 = loc === 'india' ? 'Rs 3,499/mo' : '$149/mo';
  return (
    <div className="mp-card">
      <div className="mp-chrome">
        <div className="mp-dots"><span style={{background:'#FF5F57'}}/><span style={{background:'#FEBC2E'}}/><span style={{background:'#28C840'}}/></div>
        <div className="mp-url">kryla.work/meenabakes</div>
      </div>
      <div className="mp-hero" style={{ background: '#1C0A00' }}>
        <div className="mp-hero-avatar">🎂</div>
        <div className="mp-hero-name">Meena Krishnan</div>
        <div className="mp-hero-role">Home Baker</div>
        <div className="mp-hero-loc">📍 Pune, India</div>
        <button className="mp-cta" style={{ background: accent, color: '#fff' }}>Order Now →</button>
      </div>
      <div className="mp-svcs">
        <div className="mp-svcs-label">Menu</div>
        <div className="mp-svc"><span>Custom Birthday Cake</span><span className="mp-svc-p" style={{color:accent}}>{p1}</span></div>
        <div className="mp-svc"><span>Themed Box (12 pcs)</span><span className="mp-svc-p" style={{color:accent}}>{p2}</span></div>
        <div className="mp-svc"><span>Monthly Dessert Plan</span><span className="mp-svc-p" style={{color:accent}}>{p3}</span></div>
      </div>
      <div className="mp-footer">
        <span><span style={{color:accent}}>★★★★★</span> 4.8 · 124 orders</span>
        <span className="mp-footer-brand">kryla.work</span>
      </div>
    </div>
  );
}

function RajCard({ loc }: { loc: Loc }) {
  const accent = '#22C55E';
  const p1 = loc === 'india' ? 'Rs 1,200/hr'  : '$40/hr';
  const p2 = loc === 'india' ? 'Rs 400/class' : '$15/class';
  const p3 = loc === 'india' ? 'Rs 6,999/mo'  : '$249/mo';
  return (
    <div className="mp-card">
      <div className="mp-chrome">
        <div className="mp-dots"><span style={{background:'#FF5F57'}}/><span style={{background:'#FEBC2E'}}/><span style={{background:'#28C840'}}/></div>
        <div className="mp-url">kryla.work/rajfitness</div>
      </div>
      <div className="mp-hero" style={{ background: '#0A1A0D' }}>
        <div className="mp-hero-avatar">💪</div>
        <div className="mp-hero-name">Raj Patel</div>
        <div className="mp-hero-role">Fitness Trainer</div>
        <div className="mp-hero-loc">📍 Prosper, TX</div>
        <button className="mp-cta" style={{ background: accent, color: '#fff' }}>Book a Session →</button>
      </div>
      <div className="mp-svcs">
        <div className="mp-svcs-label">Services</div>
        <div className="mp-svc"><span>Personal training</span><span className="mp-svc-p" style={{color:accent}}>{p1}</span></div>
        <div className="mp-svc"><span>Group class</span><span className="mp-svc-p" style={{color:accent}}>{p2}</span></div>
        <div className="mp-svc"><span>Monthly coaching</span><span className="mp-svc-p" style={{color:accent}}>{p3}</span></div>
      </div>
      <div className="mp-footer">
        <span><span style={{color:accent}}>★★★★★</span> 4.9 · 89 clients</span>
        <span className="mp-footer-brand">kryla.work</span>
      </div>
    </div>
  );
}

function AlexCard({ loc }: { loc: Loc }) {
  const p1 = loc === 'india' ? 'Rs 3,500'     : '$120';
  const p2 = loc === 'india' ? 'Rs 6,000'     : '$220';
  const p3 = loc === 'india' ? 'Rs 15,000/mo' : '$499/mo';
  return (
    <div className="mp-card">
      <div className="mp-chrome">
        <div className="mp-dots"><span style={{background:'#FF5F57'}}/><span style={{background:'#FEBC2E'}}/><span style={{background:'#28C840'}}/></div>
        <div className="mp-url">kryla.work/alexchenphoto</div>
      </div>
      <div className="mp-hero" style={{ background: '#111' }}>
        <div className="mp-hero-avatar">📷</div>
        <div className="mp-hero-name">Alex Chen</div>
        <div className="mp-hero-role">Photographer</div>
        <div className="mp-hero-loc">📍 Frisco, TX</div>
        <button className="mp-cta" style={{ background: '#fff', color: '#0D0D0D' }}>Book Now →</button>
      </div>
      <div className="mp-svcs">
        <div className="mp-svcs-label">Sessions</div>
        <div className="mp-svc"><span>Portrait session</span><span className="mp-svc-p">{p1}</span></div>
        <div className="mp-svc"><span>Half-day shoot</span><span className="mp-svc-p">{p2}</span></div>
        <div className="mp-svc"><span>Monthly retainer</span><span className="mp-svc-p">{p3}</span></div>
      </div>
      <div className="mp-footer">
        <span><span style={{color:'#0D0D0D'}}>★★★★★</span> 5.0 · 32 clients</span>
        <span className="mp-footer-brand">kryla.work</span>
      </div>
    </div>
  );
}

function HorizontalSlider({ loc, plans }: { loc: Loc; plans: PlanDef[] }) {
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
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % total), 8000);
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
                <p className="sec-eyebrow">STEP 1 · GET INVITED</p>
                <h2 className="sec-h2 dark">Kryla is invite-only.<br />Apply for your<br />spot today.</h2>
                <p className="sec-body on-light">We&apos;re a curated community of skilled professionals. Your application takes under a minute — we review every request and get back to you quickly.</p>
                <p className="sec-warm">Because quality matters more than quantity.</p>
              </div>
              <div className="card-col"><PriyaCard loc={loc} /></div>
            </div>
          </div>

          <div className="slider-slide">
            <div className="sec-inner card-right">
              <div className="text-col">
                <p className="sec-eyebrow">STEP 2 · BUILD YOUR PAGE</p>
                <h2 className="sec-h2 dark">Answer 5 questions.<br />Your page is live<br />in 15 minutes.</h2>
                <p className="sec-body on-light">Tell us your name, what you do, where you&apos;re based, and what you charge. Kryla builds your professional page automatically — no design skills needed.</p>
                <p className="sec-warm">Most members are live before their next session starts.</p>
              </div>
              <div className="card-col"><RajCard loc={loc} /></div>
            </div>
          </div>

          <div className="slider-slide">
            <div className="sec-inner card-right">
              <div className="text-col">
                <p className="sec-eyebrow">STEP 3 · PICK YOUR PLAN</p>
                <h2 className="sec-h2 dark">Start simple.<br />Grow when<br />you&apos;re ready.</h2>
                <p className="sec-body on-light">Choose the plan that fits you today — upgrade anytime from MyChat. No lock-ins, no surprises.</p>
              </div>
              <div className="card-col">
                <div className="step-plans">
                  {plans.filter(p => !p.isQuote).map(p => (
                    <div key={p.id} className={`step-plan${p.popular ? ' step-plan-pop' : ''}`}>
                      <span className="step-plan-emoji">{p.emoji}</span>
                      <span className="step-plan-name">{p.name}{p.popular ? ' ★' : ''}</span>
                      <span className="step-plan-price">{loc === 'india' ? (p.indiaPrice || '').replace('₹', 'Rs ') : p.usaPrice} per month</span>
                      <span className="step-plan-tag">{p.tagline}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="slider-slide">
            <div className="sec-inner card-right">
              <div className="text-col">
                <p className="sec-eyebrow">STEP 4 · SHARE &amp; GET BOOKINGS</p>
                <h2 className="sec-h2 dark">Share your link.<br />Everything your<br />business needs.</h2>
                <p className="sec-body on-light">Your Kryla page comes with everything built in — just share it and grow.</p>
                <div className="feature-list">
                  <div className="feature-item"><span className="feature-check">✓</span><strong>MyChat</strong> — type or speak to update your page, instantly</div>
                  <div className="feature-item"><span className="feature-check">✓</span><strong>Design tabs</strong> — layouts, section styles, gallery, moving frames &amp; profile photo</div>
                  <div className="feature-item"><span className="feature-check">✓</span><strong>WhatsApp inbox</strong> — receive &amp; reply to client messages in one place</div>
                  <div className="feature-item"><span className="feature-check">✓</span><strong>Booking management</strong> — accept, track and follow up on every booking</div>
                  <div className="feature-item"><span className="feature-check">✓</span><strong>Service &amp; menu editor</strong> — update offerings, pricing &amp; photos via chat</div>
                  <div className="feature-item"><span className="feature-check">✓</span><strong>Share</strong> — Instagram, Nextdoor &amp; WhatsApp — fully integrated</div>
                  <div className="feature-item"><span className="feature-check">✓</span><strong>Multilanguage</strong> — your page, your clients, in the language that feels like home</div>
                </div>
              </div>
              <div className="card-col"><PriyaCard loc={loc} /></div>
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

export default function HomeClient({ plans, enabledPersonaIds = [] }: { plans: PlanDef[]; enabledPersonaIds?: string[] }) {
  const [loc, setLoc] = useState<Loc>('usa');
  const [locDetected, setLocDetected] = useState(false);

  // Build enabled set for persona card filtering (empty list = show all, for SSG fallback safety)
  const enabledSet = new Set(enabledPersonaIds);
  const isEnabled = (persona: string | null) => !persona || enabledPersonaIds.length === 0 || enabledSet.has(persona);

  // Filter ticker rows — always keep at least 2 cards per row so the ticker isn't empty
  const R1 = R1_ALL.filter(m => isEnabled(m.persona));
  const R2 = R2_ALL.filter(m => isEnabled(m.persona));

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
  const startPlan = plans.find(p => !p.isQuote);

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
          <a href="/join" className="nav-join">Join by invite →</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">

        {/* Flanking 2×2 bobbing card clusters */}
        <div className="hero-bg">
          {/* Left cluster — Tutor, Baker, Chef, Retailer */}
          <div className="hf-cluster left">
            {isEnabled('tutor') && (
              <div className="hf-wrap" style={{ '--rotation':'-5deg', animationDelay:'0s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&q=80" alt="Tutor" />
                <span className="hf-label">📚 Tutor</span>
              </div>
            )}
            {isEnabled('baker') && (
              <div className="hf-wrap" style={{ '--rotation':'4deg', animationDelay:'0.5s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&q=80" alt="Baker" />
                <span className="hf-label">🎂 Baker</span>
              </div>
            )}
            {isEnabled('chef') && (
              <div className="hf-wrap" style={{ '--rotation':'3deg', animationDelay:'1s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=300&q=80" alt="Chef" />
                <span className="hf-label">🍱 Chef</span>
              </div>
            )}
            {isEnabled('retailer') && (
              <div className="hf-wrap" style={{ '--rotation':'-4deg', animationDelay:'1.5s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&q=80" alt="Retailer" />
                <span className="hf-label">🛍️ Retailer</span>
              </div>
            )}
          </div>
          {/* Right cluster — Music Teacher, Salon / Stylist, Advocate, Doctor */}
          <div className="hf-cluster right">
            {isEnabled('musician') && (
              <div className="hf-wrap" style={{ '--rotation':'5deg', animationDelay:'0.3s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&q=80" alt="Music Teacher" />
                <span className="hf-label">🎵 Music Teacher</span>
              </div>
            )}
            {isEnabled('salon') && (
              <div className="hf-wrap" style={{ '--rotation':'-3deg', animationDelay:'0.8s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80" alt="Salon / Stylist" />
                <span className="hf-label">✂️ Salon / Stylist</span>
              </div>
            )}
            {isEnabled('advocate') && (
              <div className="hf-wrap" style={{ '--rotation':'-5deg', animationDelay:'1.3s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=300&q=80" alt="Advocate" />
                <span className="hf-label">⚖️ Advocate</span>
              </div>
            )}
            {isEnabled('doctor') && (
              <div className="hf-wrap" style={{ '--rotation':'4deg', animationDelay:'1.8s' } as React.CSSProperties}>
                <img className="hf-photo" src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80" alt="Doctor" />
                <span className="hf-label">🩺 Doctor</span>
              </div>
            )}
          </div>
        </div>

        {/* Foreground text content */}
        <div className="hero-content">
          <p className="hero-eyebrow">INVITE-ONLY COMMUNITY · FOR SKILLED PROFESSIONALS</p>
          <h1 className="hero-h1">
            <span className="h1-l1">One platform,</span>
            <span className="h1-l2">built around your craft.</span>
            <span className="h1-l3">Run it, grow it — your way.</span>
          </h1>
          <div className="hero-btns">
            <a href="/join" className="btn-primary">I have an invite code →</a>
            <a href="#slider" className="btn-secondary">See how it works ↓</a>
          </div>
          <p className="hero-proof">Invite-only · Live in 15 minutes</p>
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
        <HorizontalSlider loc={loc} plans={plans} />
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
          <h2 className="sec-h2">Invite-only. Built for serious professionals.</h2>
          <p className="pricing-sub">Kryla is invite-only. Every member was brought in by someone already on the platform.</p>
        </div>
        <div className="pricing-grid">
          {plans.map(plan => (
            <div key={plan.id} className={`plan-card${plan.popular ? ' popular' : ''}`}>
              {plan.popular && <div className="plan-popular-badge">MOST POPULAR</div>}
              <div className="plan-icon">{plan.emoji}</div>
              <div className="plan-name">{plan.name}</div>
              {plan.isQuote ? (
                <div className="plan-price" style={{fontSize:'1.1rem', color:'#666'}}>Contact for quote</div>
              ) : (
                <div className="plan-price">
                  {loc === 'india' ? plan.indiaPrice : plan.usaPrice}
                  <span className="per"> /mo</span>
                </div>
              )}
              <div className="plan-tagline">{plan.tagline}</div>
              <hr className="plan-divider" />
              <ul className="plan-features">
                {plan.features.map((f, i) => <li key={i}>{f.label}</li>)}
              </ul>
              {plan.isQuote ? (
                <a href="mailto:hello@kryla.work" className="plan-btn" style={{background:'#444'}}>Get a quote →</a>
              ) : (
                <a href="/join" className="plan-btn">Join {plan.name} →</a>
              )}
            </div>
          ))}
        </div>
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
                  <span className="testi-role">Tutor · Celina, TX</span>
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
                  <span className="testi-role">Tutor · Celina, TX</span>
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
        <h2 className="cta-h2">Got an invite code?</h2>
        <p className="cta-sub">Kryla is invite-only. Enter your code and go live in 15 minutes.</p>
        <a href="/join" className="btn-primary lg">Enter invite code →</a>
        <p className="cta-note">Invite-only · Live in 15 minutes · Cancel anytime</p>
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
