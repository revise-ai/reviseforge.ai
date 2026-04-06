"use client";

import { useEffect, useRef, useState } from "react";

const features = [
  {
    id: "youtube",
    tag: "YouTube Analysis",
    title: "Turn any video into elite study notes",
    description:
      "Paste a link and ReviseForge extracts the transcript, key ideas, and structures them into pedagogical chapters instantly.",
    accent: "#EF4444",
    tagBg: "#FEF2F2",
    tagColor: "#DC2626",
    visual: (
      <div className="flex flex-col gap-2.5">
        <div className="bg-gray-900 rounded-xl overflow-hidden shadow-sm relative group cursor-default">
          <div className="h-20 bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-2 left-3 right-3 flex flex-col gap-1">
             <div className="w-full h-1 bg-gray-500/30 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-red-500" />
             </div>
             <div className="flex justify-between items-center">
                <span className="text-[7px] text-gray-300 font-bold uppercase">04:12 / 12:45</span>
             </div>
          </div>
        </div>
        <div className="space-y-1.5 px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tighter">Intro to Organic Chem</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            <span className="text-[10px] font-medium text-gray-400">Carbon Bonding Basics</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "recording",
    tag: "Voice & Audio",
    title: "Capture lectures as they happen",
    description:
      "Record or upload your lectures. We provide verbatim transcripts and structured pedagogical takeaways instantly.",
    accent: "#6366F1",
    tagBg: "#EEF2FF",
    tagColor: "#4338CA",
    visual: (
      <div className="flex flex-col gap-3 px-1">
        <div className="flex items-center justify-center gap-4 py-1">
          <div className="flex items-end gap-1 h-8">
            {[4, 7, 5, 9, 6].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-blue-500/40 animate-pulse" style={{ height: `${h * 3}px`, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-100 ring-4 ring-blue-50">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
          </div>
          <div className="flex items-end gap-1 h-8">
            {[6, 9, 4, 7, 5].map((h, i) => (
              <div key={i} className="w-1 rounded-full bg-blue-500/40 animate-pulse" style={{ height: `${h * 3}px`, animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-xs">
          <p className="text-[9px] text-gray-400 leading-tight italic line-clamp-2">
            "So today we are looking at the French Revolution, specifically the fall of the Bastille..."
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "notes",
    tag: "AI Note-Taking",
    title: "Your thoughts, perfectly organized",
    description:
      "Jot down your notes and let ReviseForge clean up the structure, add references, and suggest related study files.",
    accent: "#10B981",
    tagBg: "#ECFDF5",
    tagColor: "#059669",
    visual: (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 pb-2 border-b border-gray-50">
           <div className="w-3 h-3 rounded bg-green-500" />
           <span className="text-[10px] font-bold text-gray-800">Macroeconomics 101</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
             <div className="w-1 h-3 bg-green-200 rounded-full" />
             <p className="text-[9px] font-bold text-gray-700 italic">Keynesian Theory Summary</p>
          </div>
          <div className="pl-3 space-y-1">
             <div className="w-full h-1 bg-gray-100 rounded-full" />
             <div className="w-5/6 h-1 bg-gray-100 rounded-full" />
             <div className="w-2/3 h-1 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div className="mt-auto flex gap-1">
           <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[7px] font-bold rounded">#Econ</span>
           <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[7px] font-bold rounded">#Concepts</span>
        </div>
      </div>
    ),
  },
  {
    id: "channels",
    tag: "Collaborative Channels",
    title: "Study together, anywhere",
    description:
      "Create study spaces for your classes, invite friends, and share notes or quizzes in real-time.",
    accent: "#6366F1",
    tagBg: "#EEF2FF",
    tagColor: "#4338CA",
    visual: (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-bold text-[10px]">#</span>
              <span className="text-[10px] font-bold text-gray-800">bio-study-group</span>
           </div>
           <div className="flex -space-x-1.5">
              <div className="w-4 h-4 rounded-full bg-blue-500 border border-white" />
              <div className="w-4 h-4 rounded-full bg-rose-500 border border-white" />
              <div className="w-4 h-4 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[6px] text-white font-bold">+2</div>
           </div>
        </div>
        <div className="p-3 space-y-2.5">
           <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-indigo-100 shrink-0" />
              <div className="bg-gray-100 rounded-lg px-2 py-1.5 max-w-[80%]">
                 <p className="text-[8px] text-gray-700 leading-tight">Wait, when is the quiz? 🤔</p>
              </div>
           </div>
           <div className="flex items-start gap-2 flex-row-reverse">
              <div className="w-4 h-4 rounded-full bg-indigo-500 shrink-0" />
              <div className="bg-blue-600 rounded-lg px-2 py-1.5 max-w-[80%]">
                 <p className="text-[8px] text-white leading-tight">Tomorrow at 2pm! Just shared notes 📎</p>
              </div>
           </div>
        </div>
      </div>
    ),
  },
  {
    id: "exammode",
    tag: "Exam Simulation",
    title: "Simulate exam day, stress-free",
    description:
      "Enter a timed exam simulation generated from your own material. Practice under pressure until you're confident.",
    accent: "#1A1A1A",
    tagBg: "#F3F4F6",
    tagColor: "#111827",
    visual: (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1 border-b border-gray-50 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Live Session</span>
          </div>
          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-mono font-bold rounded">11:59</span>
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-gray-800 leading-tight">Q3: Identify the primary function of Mitochondria.</p>
          <div className="flex flex-col gap-1.5">
            <div className="px-2 py-1.5 rounded-lg border border-blue-500 bg-blue-50 text-[9px] font-medium text-blue-700 cursor-default">A. ATP Production</div>
            <div className="px-2 py-1.5 rounded-lg border border-gray-200 text-[9px] font-medium text-gray-400 cursor-default">B. Protein Synthesis</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "studytools",
    tag: "Pedagogical Tools",
    title: "Summaries, Quizzes & Flashcards",
    description:
      "Instantly generate elite summaries, interactive quizzes, and flashcards from any source.",
    accent: "#2563EB",
    tagBg: "#EFF6FF",
    tagColor: "#1D4ED8",
    visual: (
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg border border-gray-100 p-2 shadow-xs group-hover:border-blue-200 transition-all">
          <div className="w-full aspect-square bg-blue-50 rounded mb-1.5 flex items-center justify-center">
             <span className="text-[14px] font-bold text-blue-500">?</span>
          </div>
          <span className="text-[8px] font-bold text-gray-400 uppercase">Quiz</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-2 shadow-xs group-hover:border-green-200 transition-all">
          <div className="w-full aspect-square bg-green-50 rounded mb-1.5 flex items-center justify-center">
             <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <span className="text-[8px] font-bold text-gray-400 uppercase">Notes</span>
        </div>
        <div className="col-span-2 bg-white rounded-lg border border-blue-100 px-3 py-2 shadow-xs flex items-center justify-between">
           <span className="text-[9px] font-bold text-gray-800">Flashcards Ready</span>
           <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        </div>
      </div>
    ),
  },
  {
    id: "history",
    tag: "Uninterrupted Session Tracker",
    title: "Track your academic journey",
    description:
      "Never lose a moment of learning. Pick up exactly where you left off with our unified history dashboard.",
    accent: "#059669",
    tagBg: "#ECFDF5",
    tagColor: "#047857",
    visual: (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="bg-gray-50 border-b border-gray-100 px-3 py-1.5 flex justify-between items-center">
          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">History Tracker</span>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
        <div className="p-2 space-y-2 flex-1">
          {[
            { label: "Economics Quiz", type: "Quiz", color: "bg-blue-100" },
            { label: "History Set", type: "Artifact", color: "bg-orange-100" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg ${item.color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-gray-800 truncate leading-none">{item.label}</p>
                <p className="text-[7px] text-gray-400 font-medium">Session Artifact · 2h ago</p>
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
          <div className="lg:sticky lg:top-24 lg:w-96 shrink-0">
            <p className="text-xs font-bold tracking-[0.2em] text-blue-500 uppercase mb-4">
              Study Smarter, Not Harder
            </p>
            <h2
              className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.1] mb-6"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              The all-in-one
              <br />
              <span className="text-blue-600 whitespace-nowrap">learning platform</span>
              <br />
              for students
            </h2>
            <p className="text-[17px] text-gray-500 leading-relaxed mb-8 max-w-sm">
              ReviseForge transforms messy lectures and hours of video into clean academic assets. It's the only companion you need to ace your next exam.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#1A1111] hover:bg-black active:scale-95 transition-all text-white text-sm font-bold rounded-2xl shadow-xl shadow-gray-200"
            >
              Get started free
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
