"use client";

import { useState } from "react";
import Badge from "./Badge";
import Link from "next/link";
import TrustedBrand from "./TrustedBrand";

const Hero = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <section className="flex flex-col items-center bg-white relative overflow-hidden">

      {/* ── Exact patientdesk.ai — floats with margin on left, right and bottom, fades in from top ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          right: "16px",
          height: "45%",
          background: "linear-gradient(to bottom, transparent 0%, #eff6ff 30%, #dbeafe 65%, #bfdbfe 100%)",
          borderRadius: "24px",
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          viewBox="0 0 1400 500"
          fill="none"
          preserveAspectRatio="none"
        >
          <path d="M-100 150 Q350 20 700 120 Q1050 220 1500 80"  stroke="white" strokeWidth="1.2" strokeOpacity="0.45" fill="none" />
          <path d="M-100 230 Q300 90 700 190 Q1100 290 1500 150" stroke="white" strokeWidth="1"   strokeOpacity="0.35" fill="none" />
          <path d="M-100 310 Q400 150 700 260 Q1000 370 1500 230" stroke="white" strokeWidth="0.8" strokeOpacity="0.25" fill="none" />
          <path d="M0 390 Q350 250 700 340 Q1050 430 1400 320"   stroke="white" strokeWidth="1"   strokeOpacity="0.38" fill="none" />
          <path d="M0 450 Q350 330 700 410 Q1050 490 1400 390"   stroke="white" strokeWidth="0.7" strokeOpacity="0.28" fill="none" />
          <path d="M300 490 Q480 420 630 478"                    stroke="white" strokeWidth="0.6" strokeOpacity="0.2"  fill="none" />
          <path d="M720 490 Q900 420 1020 475"                   stroke="white" strokeWidth="0.6" strokeOpacity="0.2"  fill="none" />
        </svg>
      </div>

      <nav className="flex flex-col items-center w-full relative z-10">
        <div className="flex items-center justify-between p-4 md:px-16 lg:px-24 xl:px-32 md:py-4 w-full">
          <div
            id="menu"
            className={`${mobileOpen ? "max-md:w-full" : "max-md:w-0"} max-md:fixed max-md:top-0 max-md:z-10 max-md:left-0 max-md:transition-all max-md:duration-300 max-md:overflow-hidden max-md:h-screen max-md:bg-white/25 max-md:backdrop-blur max-md:flex-col max-md:justify-center flex items-center gap-8 text-sm`}
          >
            <Link href="#" onClick={() => setMobileOpen(false)} className="text-[#050040] hover:text-[#050040]/70">Home</Link>
            <Link href="#" onClick={() => setMobileOpen(false)} className="text-[#050040] hover:text-[#050040]/70">Products</Link>
            <Link href="#" onClick={() => setMobileOpen(false)} className="text-[#050040] hover:text-[#050040]/70">Features</Link>
            <Link href={"/Pricing"} onClick={() => setMobileOpen(false)} className="text-[#050040] hover:text-[#050040]/70">Pricing</Link>
            <Link href="#" onClick={() => setMobileOpen(false)} className="text-[#050040] hover:text-[#050040]/70">Docs</Link>
            <button
              id="close-menu"
              onClick={() => setMobileOpen(false)}
              className="md:hidden bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-md aspect-square font-medium transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link href={"/signin"} className="active:scale-95 hover:bg-indigo-50/50 transition px-4 py-2 border border-blue-600 rounded-md text-slate-800 cursor-pointer">
              Sign in
            </Link>
            <Link href={"/signup"} className="text-white px-4 py-2 bg-blue-600 active:scale-95 hover:bg-blue-700 transition rounded-md cursor-pointer">
              Get started for free
            </Link>
          </div>
          <button
            id="open-menu"
            onClick={() => setMobileOpen(true)}
            className="md:hidden bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-md aspect-square font-medium transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h16" /><path d="M4 18h16" /><path d="M4 6h16" />
            </svg>
          </button>
        </div>
        <div className="w-full border-b border-slate-200"></div>
      </nav>


       
      {/* Badge — at top like Unstuck */}
      <div className="relative z-10 mt-15">
        <Badge />
      </div>

      {/* Headline */}
      <h1 className="relative z-10 text-center text-gray-950 text-4xl md:text-6xl font-bold max-w-3xl leading-[1.05] mt-5 mb-3  tracking-tight">
        Study smarter
        score higher.
      </h1>

      <p className="relative z-10 text-center text-base text-gray-400 max-w-lg px-4 leading-relaxed">
        Turn your lectures, videos and notes into quizzes, flashcards, summaries and more all powered by AI, all in one place.
      </p>

      {/* CTA buttons */}
      <div className="relative z-10 flex items-center gap-4 mt-6 justify-center">
        <Link href={"/signup"} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md cursor-pointer font-medium transition">
          Get Started For Free
        </Link>
      </div>

      {/* TrustedBrand — sits inside the blue section like patientdesk.ai */}
      <div className="relative z-10 w-full mt-10 pb-16">
        <TrustedBrand />
      </div>
    </section>
  );
};

export default Hero;