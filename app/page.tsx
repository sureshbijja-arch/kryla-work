"use client";

import { useState } from "react";

interface Service {
  label: string;
  price: string;
}

interface MemberCard {
  emoji: string;
  name: string;
  role: string;
  slug: string;
  services: Service[];
  primaryCta: string;
  rating: string;
  ratingCount: string;
}

const priyaCard: MemberCard = {
  emoji: "📚",
  name: "Priya Sharma",
  role: "Maths & Science Tutor · Celina, TX",
  slug: "kryla.work/priyasharma",
  services: [
    { label: "One-on-one session", price: "$30/hr" },
    { label: "Small group (3–4)", price: "$15/hr" },
    { label: "Monthly plan", price: "$199/mo" },
  ],
  primaryCta: "Book a Session",
  rating: "4.9",
  ratingCount: "47 students",
};

const meenaCard: MemberCard = {
  emoji: "🎂",
  name: "Meena Krishnan",
  role: "Home Baker · Pune, India",
  slug: "kryla.work/meenabakes",
  services: [
    { label: "Custom Birthday Cake", price: "$25" },
    { label: "Themed Box (12 pieces)", price: "$50" },
    { label: "Monthly Dessert Plan", price: "$149/mo" },
  ],
  primaryCta: "Order Now",
  rating: "4.8",
  ratingCount: "124 orders",
};

const rajCard: MemberCard = {
  emoji: "💪",
  name: "Raj Patel",
  role: "Fitness Trainer · Prosper, TX",
  slug: "kryla.work/rajfitness",
  services: [
    { label: "Personal training session", price: "$40/hr" },
    { label: "Group class", price: "$15/class" },
    { label: "Monthly coaching", price: "$249/mo" },
  ],
  primaryCta: "Book a Session",
  rating: "4.9",
  ratingCount: "89 clients",
};

const alexCard: MemberCard = {
  emoji: "📷",
  name: "Alex Chen",
  role: "Photographer · Frisco, TX",
  slug: "kryla.work/alexchenphoto",
  services: [
    { label: "Portrait session", price: "$120" },
    { label: "Half-day shoot", price: "$220" },
    { label: "Monthly retainer", price: "$499/mo" },
  ],
  primaryCta: "Book Now",
  rating: "5.0",
  ratingCount: "32 clients",
};

function TopBar({ market, onToggle }: { market: "IN" | "US"; onToggle: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0D] flex items-center justify-center gap-3 py-1.5">
      <button
        onClick={() => market !== "IN" && onToggle()}
        className={`px-3 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
          market === "IN" ? "bg-[#F5A623] text-[#0D0D0D]" : "bg-transparent text-white"
        }`}
      >
        🇮🇳 India
      </button>
      <button
        onClick={() => market !== "US" && onToggle()}
        className={`px-3 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
          market === "US" ? "bg-[#F5A623] text-[#0D0D0D]" : "bg-transparent text-white"
        }`}
      >
        🇺🇸 USA
      </button>
    </div>
  );
}

function Nav({ dark = false }: { dark?: boolean }) {
  return (
    <nav
      className={`absolute top-7 left-0 right-0 z-40 flex items-center justify-between px-8 py-3.5 ${
        dark
          ? "bg-[#0D0D0D] border-b border-[#222]"
          : "bg-white border-b border-[#f0f0f0]"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`text-2xl font-black italic ${dark ? "text-white" : "text-[#0D0D0D]"}`}>
          K
        </span>
        <span className={`text-[15px] font-semibold ${dark ? "text-white" : "text-[#0D0D0D]"}`}>
          kryla<span className="text-[#F5A623]">.work</span>
        </span>
      </div>
      <a
        href="/onboarding"
        className="bg-[#0D0D0D] text-white text-[13px] font-semibold px-5 py-2 rounded-full hover:bg-[#222] transition-colors"
      >
        Join free →
      </a>
    </nav>
  );
}

function KrylaCard({ card }: { card: MemberCard }) {
  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-5 w-[280px] text-white flex-shrink-0">
      <div className="flex justify-end mb-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-[#22C55E] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block" />
          Live
        </span>
      </div>
      <div className="w-11 h-11 rounded-full bg-[#F5A623] flex items-center justify-center text-xl mb-2.5">
        {card.emoji}
      </div>
      <p className="text-[17px] font-bold">{card.name}</p>
      <p className="text-[12px] text-[#aaa] mt-0.5">{card.role}</p>
      <p className="text-[11px] text-[#F5A623] font-semibold mt-1 mb-3.5">{card.slug}</p>
      <hr className="border-[#333] mb-3" />
      {card.services.map((s) => (
        <div key={s.label} className="flex justify-between text-[12px] py-[3px]">
          <span className="text-[#ccc]">{s.label}</span>
          <span className="font-semibold">{s.price}</span>
        </div>
      ))}
      <div className="flex gap-2 mt-3.5">
        <button className="flex-1 bg-[#F5A623] text-[#0D0D0D] text-[12px] font-bold rounded-lg py-2.5">
          {card.primaryCta}
        </button>
        <button className="flex-1 bg-[#333] text-white text-[12px] font-semibold rounded-lg py-2.5">
          WhatsApp
        </button>
      </div>
      <p className="text-center text-[11px] text-[#F5A623] font-semibold mt-2.5">
        {card.rating} ★★★★★ · {card.ratingCount}
      </p>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#F5A623] text-[10px] font-bold tracking-[1.5px] uppercase mb-2.5">
      {children}
    </p>
  );
}

function Chip({ emoji, label, className }: { emoji: string; label: string; className: string }) {
  return (
    <div
      className={`absolute bg-white/95 border border-[#eee] rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#0D0D0D] shadow-sm ${className}`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  );
}

function ScrollDots({
  total,
  active,
  onDotClick,
}: {
  total: number;
  active: number;
  onDotClick: (i: number) => void;
}) {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          aria-label={`Go to section ${i + 1}`}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            i === active ? "bg-[#F5A623] scale-125" : "bg-[#ddd] hover:bg-[#bbb]"
          }`}
        />
      ))}
    </div>
  );
}

function HeroSection() {
  return (
    <section
      id="section-0"
      className="snap-start relative w-full h-screen flex flex-col items-center justify-center bg-white text-center overflow-hidden"
    >
      <Nav />
      <div className="absolute inset-0 pointer-events-none">
        <Chip emoji="📐" label="Maths Tutor" className="top-[22%] left-[4%] animate-float-1" />
        <Chip emoji="💪" label="Fitness Trainer" className="top-[58%] left-[3%] animate-float-2" />
        <Chip emoji="🏠" label="Home Baker" className="top-[20%] right-[5%] animate-float-3" />
        <Chip emoji="📷" label="Photographer" className="top-[55%] right-[4%] animate-float-4" />
      </div>
      <div className="relative z-10 px-6 max-w-xl mt-16">
        <Eyebrow>For every skilled professional</Eyebrow>
        <h1 className="text-5xl md:text-6xl font-black leading-[1.04] text-[#0D0D0D] mb-3">
          Your craft deserves
          <span className="block text-[#F5A623]">a name online.</span>
        </h1>
        <p className="text-[17px] font-semibold text-[#444] mb-2">
          Give your business its own identity.
        </p>
        <p className="text-[14px] text-[#777] mb-7 max-w-sm mx-auto">
          Your name. Your work. Your spot online — in 15 minutes.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="/onboarding"
            className="bg-[#F5A623] text-[#0D0D0D] text-[14px] font-bold px-6 py-3.5 rounded-full hover:bg-[#e09510] transition-colors"
          >
            Claim your spot — it&apos;s free
          </a>
          <a
            href="#section-1"
            className="bg-white text-[#0D0D0D] text-[14px] font-semibold px-6 py-3.5 rounded-full border-[1.5px] border-[#0D0D0D] hover:bg-[#f5f5f5] transition-colors"
          >
            See how it works ↓
          </a>
        </div>
        <p className="text-[11px] text-[#aaa] mt-5">
          Free to start · No card needed · Live in 15 minutes · Works on WhatsApp
        </p>
      </div>
    </section>
  );
}

function IdentitySection() {
  return (
    <section
      id="section-1"
      className="snap-start relative w-full h-screen flex flex-col bg-[#FAFAFA] overflow-hidden"
    >
      <Nav />
      <div className="flex-1 flex items-center justify-center gap-12 px-10 pt-20">
        <KrylaCard card={priyaCard} />
        <div className="max-w-[340px]">
          <Eyebrow>Your identity online</Eyebrow>
          <h2 className="text-4xl font-black text-[#0D0D0D] leading-[1.1] mb-4">
            Your name.<br />Your work.<br />One link that says it all.
          </h2>
          <p className="text-[14px] text-[#555] leading-relaxed mb-3">
            Every skilled professional deserves a presence that matches their craft. Kryla gives you your own spot — with your services, your prices, and a way for people to reach you directly.
          </p>
          <p className="text-[14px] text-[#F5A623] font-semibold">
            Like a visiting card — but one that works while you sleep.
          </p>
        </div>
      </div>
    </section>
  );
}

function OneLinkSection() {
  return (
    <section
      id="section-2"
      className="snap-start relative w-full h-screen flex flex-col bg-[#FAFAFA] overflow-hidden"
    >
      <Nav />
      <div className="flex-1 flex items-center justify-center gap-12 px-10 pt-20">
        <div className="max-w-[340px]">
          <Eyebrow>One link for everything</Eyebrow>
          <h2 className="text-4xl font-black text-[#0D0D0D] leading-[1.1] mb-4">
            Send one link.<br />They know everything<br />they need to know.
          </h2>
          <p className="text-[14px] text-[#555] leading-relaxed mb-5">
            Your name. What you do. What you charge. When you&apos;re free. What your clients say. All in one place they can open on any phone.
          </p>
          <div className="bg-white border border-[#eee] rounded-xl p-4 max-w-[260px]">
            <div className="bg-[#f0f0f0] rounded-[14px_14px_14px_4px] px-3 py-2 text-[12px] text-[#333] mb-1.5 leading-snug">
              Hi! Are you available this week?
            </div>
            <p className="text-[10px] text-[#bbb] text-right mb-2">10:42 AM ✓✓</p>
            <div className="bg-[#F5A623] rounded-[14px_14px_4px_14px] px-3 py-2 text-[12px] font-semibold text-[#0D0D0D] ml-auto max-w-[90%] leading-snug">
              Here&apos;s my Kryla link — <strong>kryla.work/meenabakes</strong> — order directly there! 😊
            </div>
            <p className="text-[10px] text-[#bbb] text-right mt-1">10:43 AM ✓✓</p>
          </div>
        </div>
        <KrylaCard card={meenaCard} />
      </div>
    </section>
  );
}

function FifteenMinSection() {
  return (
    <section
      id="section-3"
      className="snap-start relative w-full h-screen flex flex-col bg-[#FAFAFA] overflow-hidden"
    >
      <Nav />
      <div className="flex-1 flex items-center justify-center gap-12 px-10 pt-20">
        <KrylaCard card={rajCard} />
        <div className="max-w-[340px]">
          <Eyebrow>Live in 15 minutes</Eyebrow>
          <h2 className="text-4xl font-black text-[#0D0D0D] leading-[1.1] mb-4">
            Answer 5 questions.<br />We handle<br />everything else.
          </h2>
          <p className="text-[14px] text-[#555] leading-relaxed mb-3">
            No design skills needed. No complicated setup. Tell us what you do, who you help, and what you charge — your professional spot is live before your next session starts.
          </p>
          <p className="text-[14px] text-[#F5A623] font-semibold">
            Most members are live in under 15 minutes. No coding. No stress.
          </p>
        </div>
      </div>
    </section>
  );
}

function WhatsAppSection() {
  return (
    <section
      id="section-4"
      className="snap-start relative w-full h-screen flex flex-col bg-[#FAFAFA] overflow-hidden"
    >
      <Nav />
      <div className="flex-1 flex items-center justify-center gap-12 px-10 pt-20">
        <div className="max-w-[340px]">
          <Eyebrow>Works where your clients are</Eyebrow>
          <h2 className="text-4xl font-black text-[#0D0D0D] leading-[1.1] mb-4">
            New booking?<br />You get a WhatsApp.<br />Done.
          </h2>
          <p className="text-[14px] text-[#555] leading-relaxed mb-5">
            When someone&apos;s ready to hire you, Kryla sends you a WhatsApp. Accept with one tap. Your client gets their confirmation right away. Business handled — without switching between apps.
          </p>
          <div className="bg-white border border-[#eee] rounded-xl p-4 max-w-[260px]">
            <div className="bg-[#f0f0f0] rounded-[14px_14px_14px_4px] px-3 py-2 text-[12px] text-[#333] mb-1.5 leading-snug">
              📅 New request from Sarah — Family Portraits, Saturday 10am. Tap to confirm.
            </div>
            <p className="text-[10px] text-[#bbb] text-right mb-2">9:14 AM ✓✓</p>
            <div className="bg-[#F5A623] rounded-[14px_14px_4px_14px] px-3 py-2 text-[12px] font-semibold text-[#0D0D0D] ml-auto max-w-[90%] leading-snug">
              Confirmed! 📸 Sarah gets your details straight away.
            </div>
            <p className="text-[10px] text-[#F5A623] text-right mt-1 font-semibold">9:15 AM ✓✓</p>
          </div>
        </div>
        <KrylaCard card={alexCard} />
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [market, setMarket] = useState<"IN" | "US">("US");
  const [activeSection, setActiveSection] = useState(0);
  const totalSections = 5;

  const handleToggle = () => setMarket((m) => (m === "US" ? "IN" : "US"));

  const scrollTo = (i: number) => {
    document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(i);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.target as HTMLDivElement;
    setActiveSection(Math.round(el.scrollTop / el.clientHeight));
  };

  return (
    <>
      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes float3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes float4 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        .animate-float-1{animation:float1 3.8s ease-in-out infinite}
        .animate-float-2{animation:float2 4.2s ease-in-out infinite 0.8s}
        .animate-float-3{animation:float3 3.5s ease-in-out infinite 0.4s}
        .animate-float-4{animation:float4 4.5s ease-in-out infinite 1.2s}
      `}</style>

      <TopBar market={market} onToggle={handleToggle} />
      <ScrollDots total={totalSections} active={activeSection} onDotClick={scrollTo} />

      <div
        className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth mt-7"
        onScroll={handleScroll}
        style={{ scrollbarWidth: "none" }}
      >
        <HeroSection />
        <IdentitySection />
        <OneLinkSection />
        <FifteenMinSection />
        <WhatsAppSection />
      </div>
    </>
  );
}
