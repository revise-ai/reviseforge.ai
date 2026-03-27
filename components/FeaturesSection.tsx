"use client";

import { useEffect, useRef, useState } from "react";

const features = [
  {
    id: "recording",
    tag: "Record Lectures",
    title: "Capture every word, never miss a thing",
    description:
      "Record live or upload audio — we transcribe and turn it into clean, structured notes instantly.",
    accent: "#7C3AED",
    tagBg: "#EDE9FE",
    tagColor: "#6D28D9",
    visual: (
      <div className="flex flex-col gap-2">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-700">
              Economics — Lecture 3
            </span>
            <span className="text-[9px] text-gray-400">01:47</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
            "Supply and demand determines price in a free market. When supply
            falls and demand stays constant, prices tend to rise..."
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-end gap-0.75 h-6">
            {[3, 6, 4, 8, 5, 9, 3, 7, 5, 4, 8, 6, 3, 7, 5].map((h, i) => (
              <div
                key={i}
                className="w-0.75 rounded-full bg-violet-400 animate-pulse"
                style={{
                  height: `${h * 2.5}px`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shadow-md shadow-violet-200">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 15a3 3 0 01-3-3V6a3 3 0 016 0v6a3 3 0 01-3 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2z" />
            </svg>
          </div>
          <div className="flex items-end gap-0.75 h-6">
            {[5, 3, 7, 4, 9, 3, 6, 4, 8, 5, 3, 7, 6, 4, 8].map((h, i) => (
              <div
                key={i}
                className="w-0.75 rounded-full bg-violet-400 animate-pulse"
                style={{
                  height: `${h * 2.5}px`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "flashcards",
    tag: "Flashcards",
    title: "Study smarter with spaced repetition",
    description:
      "Generate a full flashcard deck from any document. Flip, review, and master concepts faster.",
    accent: "#F97316",
    tagBg: "#FFF7ED",
    tagColor: "#C2410C",
    visual: (
      <div className="flex items-center justify-center">
        <div className="relative w-full max-w-60">
          <div className="absolute inset-0 bg-orange-50 rounded-xl border border-orange-100 translate-x-2 translate-y-2" />
          <div className="relative bg-white rounded-xl border border-gray-100 shadow-md p-4">
            <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-600 text-[9px] font-bold rounded-full mb-2">
              World History
            </span>
            <p className="text-xs font-semibold text-gray-800 leading-snug mb-3">
              In what year did the Berlin Wall fall, reuniting East and West
              Germany?
            </p>
            <div className="h-px bg-gray-100 mb-2" />
            <p className="text-[10px] text-yellow-500 font-medium text-center">
              Tap to reveal answer
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "quiz",
    tag: "Quizzes",
    title: "Test yourself before the real thing",
    description:
      "Upload any material and get a custom quiz instantly. See your score and focus on weak spots.",
    accent: "#2563EB",
    tagBg: "#EFF6FF",
    tagColor: "#1D4ED8",
    visual: (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-2/4 bg-blue-500 rounded-full" />
          </div>
          <span className="text-[9px] text-gray-400 font-medium shrink-0">
            2/4
          </span>
        </div>
        <p className="text-[11px] font-semibold text-gray-800 mb-2.5">
          What is the powerhouse of the atom that carries a positive charge?
        </p>
        <div className="space-y-1.5">
          {[
            { label: "Neutron", selected: false },
            { label: "Proton", selected: true },
            { label: "Electron", selected: false },
            { label: "Quark", selected: false },
          ].map((opt, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] ${
                opt.selected
                  ? "border-blue-400 bg-blue-50 text-blue-800"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full border shrink-0 flex items-center justify-center ${opt.selected ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}
              >
                {opt.selected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              {opt.label}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "youtube",
    tag: "YouTube",
    title: "Turn any video into study material",
    description:
      "Paste a link and we extract the transcript, key ideas, and build notes or quizzes from it.",
    accent: "#EF4444",
    tagBg: "#FEF2F2",
    tagColor: "#DC2626",
    visual: (
      <div className="flex flex-col gap-2">
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="h-20 bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
              <svg
                className="w-3.5 h-3.5 text-white ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="px-3 py-1.5">
            <p className="text-[10px] text-gray-300 font-medium truncate">
              Macroeconomics Crash Course — Episode 1
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
          <svg
            className="w-3.5 h-3.5 text-red-500 shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
          </svg>
          <span className="text-[10px] text-gray-400 flex-1 truncate">
            youtube.com/watch?v=...
          </span>
          <span className="text-[9px] font-bold text-red-500 shrink-0">
            Process →
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "exammode",
    tag: "Exam Mode",
    title: "Simulate exam day, stress-free",
    description:
      "Enter a timed exam simulation from your own material. Score yourself and retake until confident.",
    accent: "#6366F1",
    tagBg: "#EEF2FF",
    tagColor: "#4338CA",
    visual: (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-semibold text-gray-500">
            Question 3 of 5
          </span>
          <span className="px-2 py-0.5 bg-indigo-100 text-blue-700 text-[9px] font-mono font-bold rounded-md">
            05:30
          </span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full mb-3 overflow-hidden">
          <div className="h-full w-3/5 bg-blue-500 rounded-full" />
        </div>
        <p className="text-[11px] font-semibold text-gray-800 mb-2.5 leading-snug">
          Which layer of the Earth's atmosphere contains the ozone layer?
        </p>
        <div className="space-y-1.5">
          {["Troposphere", "Stratosphere", "Mesosphere", "Thermosphere"].map(
            (opt, i) => (
              <div
                key={i}
                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-medium ${
                  i === 1
                    ? "border-blue-400 bg-indigo-50 text-blue-700"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                <span className="font-bold mr-1.5 text-gray-400">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </div>
            ),
          )}
        </div>
      </div>
    ),
  },
  {
    id: "channels",
    tag: "Channels",
    title: "Study together, even when apart",
    description:
      "Create a shared space, invite classmates, share notes and ask questions in real time.",
    accent: "#059669",
    tagBg: "#ECFDF5",
    tagColor: "#047857",
    visual: (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
          <span className="text-gray-400 text-xs font-light">#</span>
          <span className="text-[11px] font-bold text-gray-800">
            calculus-study
          </span>
          <div className="ml-auto flex -space-x-1.5">
            {["bg-green-600", "bg-blue-500", "bg-rose-500", "bg-amber-500"].map(
              (c, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full ${c} border-2 border-white`}
                />
              ),
            )}
          </div>
        </div>
        <div className="px-3 py-2 space-y-2">
          {[
            {
              init: "JO",
              color: "bg-blue-500",
              name: "James",
              msg: "Can anyone explain integration by parts? 🤔",
            },
            {
              init: "NB",
              color: "bg-rose-500",
              name: "Nana",
              msg: "Yes! Think of it as the reverse product rule",
            },
            {
              init: "AE",
              color: "bg-green-600",
              name: "You",
              msg: "I just shared a worked example in files 📎",
            },
          ].map((m, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <div
                className={`w-5 h-5 rounded-full ${m.color} flex items-center justify-center text-white text-[7px] font-bold shrink-0 mt-0.5`}
              >
                {m.init}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-semibold text-gray-800 mr-1">
                  {m.name}
                </span>
                <p className="text-[9px] text-gray-500 leading-relaxed">
                  {m.msg}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function FeaturesSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let animFrame: number;
    let pos = 0;
    const speed = 0.5;
    let paused = false;
    const cardWidth = 280 + 20; // card width + gap

    const step = () => {
      if (!paused) {
        pos += speed;
        const half = track.scrollWidth / 2;
        if (pos >= half) pos = 0;
        track.style.transform = `translateX(-${pos}px)`;

        // Update active dot based on position
        const idx =
          Math.floor((pos % (cardWidth * features.length)) / cardWidth) %
          features.length;
        setActiveIndex(idx);
      }
      animFrame = requestAnimationFrame(step);
    };

    animFrame = requestAnimationFrame(step);

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
    };
    track.addEventListener("mouseenter", pause);
    track.addEventListener("mouseleave", resume);

    return () => {
      cancelAnimationFrame(animFrame);
      track.removeEventListener("mouseenter", pause);
      track.removeEventListener("mouseleave", resume);
    };
  }, []);

  // Duplicate cards for infinite loop
  const allCards = [...features, ...features];

  return (
    <section className="bg-[#F5F5F7] py-24 overflow-hidden mt-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Layout: fixed text left, scrolling cards right */}
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          {/* ── Left: fixed text (sticky on desktop) ── */}
          <div className="lg:sticky lg:top-24 lg:w-85 shrink-0">
            <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-4">
              Everything you need
            </p>
            <h2
              className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-6"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              Unlock your
              <br />
              <span className="text-blue-600">brain's full</span>
              <br />
              potential
            </h2>
            <p className="text-base text-gray-500 leading-relaxed mb-8">
              Here's (almost) everything ReviseForge offers to help you study
              smarter, retain more, and perform better — all in one place.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-200"
            >
              Get started free
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>

          {/* ── Right: auto-scrolling cards ── */}
          <div className="flex-1 min-w-0">
            {/* Fade edges */}
            <div className="relative">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-linear-to-r from-[#F5F5F7] to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-linear-to-l from-[#F5F5F7] to-transparent" />

              {/* Scroll window */}
              <div className="overflow-hidden">
                <div
                  ref={trackRef}
                  className="flex gap-5 will-change-transform"
                  style={{ width: "max-content" }}
                >
                  {allCards.map((feature, idx) => (
                    <div
                      key={`${feature.id}-${idx}`}
                      className="w-70 shrink-0 bg-[#ECECEC] rounded-2xl p-4 flex flex-col gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      {/* Visual preview */}
                      <div className="rounded-xl overflow-hidden bg-white/60 p-3 min-h-37.5 flex items-center">
                        <div className="w-full">{feature.visual}</div>
                      </div>

                      {/* Tag + text */}
                      <div>
                        <span
                          className="inline-block px-2 py-0.5 text-[9px] font-bold rounded-full mb-1.5"
                          style={{
                            background: feature.tagBg,
                            color: feature.tagColor,
                          }}
                        >
                          {feature.tag}
                        </span>
                        <h3 className="text-xs font-bold text-gray-900 leading-snug mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center gap-2 mt-6 justify-center">
              {features.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-5 h-2 bg-blue-600"
                      : "w-2 h-2 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
