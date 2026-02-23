"use client";

import { useState, useEffect } from "react";
import Badge from "./Badge";
import Link from "next/link";

const Hero = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const animatedWords = [
    "Flashcards",
    "Recordings",
    "Quizzes",
    "Video Summaries",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % animatedWords.length);
        setVisible(true);
      }, 400);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="flex flex-col items-center">
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
              {" "}
              <path d="M4 12h16" /> <path d="M4 18h16" />{" "}
              <path d="M4 6h16" />{" "}
            </svg>
          </button>
        </div>
        <div className="w-full border-b border-slate-200"></div>
      </nav>

      <a
        href="#"
        className="flex items-center gap-2 bg-blue-100 rounded-full p-1 pr-3 text-sm mt-23"
      >
        <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
          NEW
        </span>
        <p className="flex items-center gap-2 text-blue-600">
          <span className="text-sm">Try 30 days free trial option</span>
          <svg
            className="mt-px"
            width="6"
            height="9"
            viewBox="0 0 6 9"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m1 1 4 3.5L1 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </p>
      </a>

      <h1 className="text-center text-slate-800 text-4xl md:text-5xl/16 font-semibold max-w-3xl leading-tight bg-clip-text my-2.5 px-4">
        Study smarter with{" "}
        <span
          style={{
            transition: "opacity 0.4s ease, transform 0.4s ease",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0px)" : "translateY(10px)",
            display: "inline-block",
          }}
          className="bg-linear-to-r from-blue-600 to-pink-300 bg-clip-text text-transparent"
        >
          {animatedWords[currentIndex]}
        </span>
      </h1>

      <p className="text-center text-base text-gray-600 max-w-md px-4">
        Turn your lectures, videos and notes into quizzes, flashcards and
        recordings — all in one place.
      </p>

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

      <div className="relative mt-12 w-full max-w-4xl px-4">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-full h-full bg-[#d7bef4] blur-[100px] opacity-70 z-0"></div>
        <img
          className="relative z-1 w-full object-cover object-top"
          src="https://assets.prebuiltui.com/images/components/hero-section/hero-dashImage2.png"
          alt=""
        />
      </div>
    </section>
  );
};

export default Hero;
