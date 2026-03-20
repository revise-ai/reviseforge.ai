"use client";

import { useState } from "react";
import Badge from "./Badge";
import Link from "next/link";

const Hero = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <section className="flex flex-col items-center bg-white">
      <nav className="flex flex-col items-center w-full">
        <div className="flex items-center justify-between p-4 md:px-16 lg:px-24 xl:px-32 md:py-4 w-full">
          <div
            id="menu"
            className={`${mobileOpen ? "max-md:w-full" : "max-md:w-0"} max-md:fixed max-md:top-0 max-md:z-10 max-md:left-0 max-md:transition-all max-md:duration-300 max-md:overflow-hidden max-md:h-screen max-md:bg-white/25 max-md:backdrop-blur max-md:flex-col max-md:justify-center flex items-center gap-8 text-sm`}
          >
            <a
              href="#"
              onClick={() => setMobileOpen(false)}
              className="text-[#050040] hover:text-[#050040]/70"
            >
              Home
            </a>
            <a
              href="#"
              onClick={() => setMobileOpen(false)}
              className="text-[#050040] hover:text-[#050040]/70"
            >
              Products
            </a>
            <a
              href="#"
              onClick={() => setMobileOpen(false)}
              className="text-[#050040] hover:text-[#050040]/70"
            >
              Features
            </a>
            <a
              href="#"
              onClick={() => setMobileOpen(false)}
              className="text-[#050040] hover:text-[#050040]/70"
            >
              Pricing
            </a>
            <a
              href="#"
              onClick={() => setMobileOpen(false)}
              className="text-[#050040] hover:text-[#050040]/70"
            >
              Docs
            </a>
            <button
              id="close-menu"
              onClick={() => setMobileOpen(false)}
              className="md:hidden bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-md aspect-square font-medium transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link
              href={"/signin"}
              className="active:scale-95 hover:bg-indigo-50/50 transition px-4 py-2 border border-blue-600 rounded-md text-slate-800 cursor-pointer"
            >
              Sign in
            </Link>
            <Link
              href={"/signup"}
              className="text-white px-4 py-2 bg-blue-600 active:scale-95 hover:bg-blue-700 transition rounded-md cursor-pointer"
            >
              Get started for free
            </Link>
          </div>
          <button
            id="open-menu"
            onClick={() => setMobileOpen(true)}
            className="md:hidden bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-md aspect-square font-medium transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12h16" />
              <path d="M4 18h16" />
              <path d="M4 6h16" />
            </svg>
          </button>
        </div>
        <div className="w-full border-b border-slate-200"></div>
      </nav>

      {/* Headline */}
      <h1 className="text-center text-slate-800 text-4xl md:text-5xl/16 font-semibold max-w-3xl leading-tight mt-20 mb-2.5 px-4">
        Study smarter with{" "}
        <span className="text-gray-900 font-bold">AI-powered tools</span>
      </h1>

      <p className="text-center text-base text-gray-500 max-w-md px-4">
        Turn your lectures, videos and notes into quizzes, flashcards and
        recordings — all in one place.
      </p>

      {/* CTA buttons */}
      <div className="flex items-center gap-4 mt-5 justify-center z-1">
        <Link
          href={"/signup"}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md cursor-pointer"
        >
          Get Started For Free
        </Link>
        <button className="flex items-center gap-2 text-blue-600 border border-blue-600 hover:bg-indigo-50/50 px-6 py-3 rounded-md active:scale-95 transition cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
            <path d="M20 2v4" />
            <path d="M22 4h-4" />
            <circle cx="4" cy="20" r="2" />
          </svg>
          Book A Demo
        </button>
      </div>

      {/* Badge */}
      <div className="mt-5">
        <Badge />
      </div>

      {/* App preview mockup */}
      <div className="relative mt-12 w-full max-w-5xl px-4 pb-0">
        {/* Browser chrome wrapper */}
        <div className="relative z-1 rounded-2xl overflow-hidden border border-gray-200 shadow-xl shadow-gray-100 bg-white">
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="w-3 h-3 rounded-full bg-gray-300" />
            <div className="flex-1 mx-4 bg-gray-200 rounded-md h-5 flex items-center px-3">
              <span className="text-[10px] text-gray-400 truncate">
                app.yourstudy.ai/dashboard
              </span>
            </div>
          </div>

          {/* Dashboard mockup body */}
          <div className="flex h-[420px] bg-gray-50">
            {/* Left sidebar */}
            <div className="w-56 bg-white border-r border-gray-100 flex flex-col p-4 gap-3 shrink-0">
              {/* Logo */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="white"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  StudyAI
                </span>
              </div>

              {/* New button */}
              <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
                <span>New</span>
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>

              {/* Recent */}
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">
                Recent
              </p>
              {[
                "Introduction to Biology",
                "World History Ch. 4",
                "Calculus Notes",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-xs text-gray-600 truncate">{item}</span>
                </div>
              ))}

              {/* Upgrade */}
              <div className="mt-auto border border-gray-100 rounded-xl p-3 bg-gray-50">
                <p className="text-[10px] text-gray-400">Current Plan</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">
                  Free plan
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <svg
                    width="10"
                    height="10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#374151"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span className="text-[10px] text-gray-600">
                    Upgrade plan
                  </span>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-6 overflow-hidden">
              {/* Greeting */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#374151"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-800">
                  What would you like to study today?
                </h3>
              </div>

              {/* Tool cards grid — all gray */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: "New Recording" },
                  { label: "New Flashcards" },
                  { label: "Start a Quiz" },
                  { label: "YouTube Video" },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-200 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="#6B7280"
                        strokeWidth={2}
                      >
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {card.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                <span className="text-xs text-gray-400 flex-1">
                  Ask anything, or paste a YouTube link...
                </span>
                <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center shrink-0">
                  <svg
                    width="10"
                    height="10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="white"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
