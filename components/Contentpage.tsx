"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

type Mode = "youtube" | "microphone" | "browsertab" | "chat";
type ActiveTool = "summary" | "quiz" | "flashcards" | "exams" | null;

interface QuizQuestion {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  category: string;
}

interface Flashcard {
  id: number;
  term: string;
  definition: string;
  hint: string;
  category: string;
}

interface ChapterItem {
  time: string;
  title: string;
  text: string;
}
interface TranscriptItem {
  time: string;
  text: string;
}

const panels = [
  {
    id: "summary" as ActiveTool,
    label: "Summary",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#4B9CF5" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "quiz" as ActiveTool,
    label: "Quiz",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#E05252" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "flashcards" as ActiveTool,
    label: "Flashcards",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#E07B39" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: "exams" as ActiveTool,
    label: "Exams Mode",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#E0B83A" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 9.5v5" />
      </svg>
    ),
  },
];

function RenderMd({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm text-gray-700 leading-relaxed">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## "))
          return (
            <h3 key={i} className="text-sm font-semibold text-gray-900 mt-5 mb-1 first:mt-0">
              {line.replace("## ", "")}
            </h3>
          );
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-gray-400 shrink-0 mt-0.5">•</span>
              <span>{line.replace(/^[-•] /, "")}</span>
            </div>
          );
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
      <svg className="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <p className="text-xs text-gray-400 text-center px-4">{label}</p>
    </div>
  );
}

function SummaryContent({
  summary,
  loading,
  error,
  isRec = false,
}: {
  summary: string;
  loading: boolean;
  error: string;
  isRec?: boolean;
}) {
  if (loading)
    return <Spinner label={isRec ? "Analysing recording and generating summary…" : "Analysing video and generating summary…"} />;
  if (error)
    return <div className="px-5 py-6 text-center"><p className="text-xs text-red-400">{error}</p></div>;
  if (!summary) return null;
  return <div className="flex-1 overflow-y-auto px-5 py-4"><RenderMd text={summary} /></div>;
}

function QuizContent({
  questions,
  loading,
  error,
  isRec = false,
}: {
  questions: QuizQuestion[];
  loading: boolean;
  error: string;
  isRec?: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);

  if (loading)
    return <Spinner label={isRec ? "Generating quiz from recording…" : "Generating quiz from video…"} />;
  if (error)
    return <div className="px-5 py-6 text-center"><p className="text-xs text-red-400">{error}</p></div>;
  if (!questions.length) return null;

  if (done) {
    const score = questions.filter((q) => selected[q.id] === q.correctAnswer).length;
    const pct = Math.round((score / questions.length) * 100);
    const ringColor = pct >= 70 ? "#2563EB" : pct >= 50 ? "#EAB308" : "#EF4444";
    const circ = 2 * Math.PI * 34;
    return (
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" stroke="#F3F4F6" strokeWidth="8" fill="none" />
              <circle
                cx="40" cy="40" r="34" stroke={ringColor} strokeWidth="8" fill="none"
                strokeDasharray={`${circ}`} strokeDashoffset={`${circ * (1 - pct / 100)}`}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-gray-800">{pct}%</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-800">{score} / {questions.length} correct</p>
          <button
            onClick={() => { setCurrent(0); setSelected({}); setRevealed({}); setDone(false); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer active:scale-95"
          >
            Retake Quiz
          </button>
        </div>
        <div className="space-y-2">
          {questions.map((q, i) => {
            const correct = selected[q.id] === q.correctAnswer;
            return (
              <div key={q.id} className="flex items-start gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${correct ? "bg-green-100" : "bg-red-100"}`}>
                  {correct ? (
                    <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">{i + 1}. {q.question}</p>
                  {!correct && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Correct: {q.correctAnswer}. {q.options[q.correctAnswer]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const q = questions[current];
  const sel = selected[q.id];
  const isRevealed = revealed[q.id];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">{current + 1} / {questions.length}</span>
          <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-semibold">{q.category}</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="text-sm font-medium text-gray-800 leading-relaxed mb-4">{q.question}</p>
        <div className="space-y-2 mb-4">
          {(["A", "B", "C", "D"] as const).map((key) => {
            let cls = "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50";
            if (isRevealed) {
              if (key === q.correctAnswer) cls = "border-green-500 bg-green-50 text-green-800";
              else if (key === sel) cls = "border-red-400 bg-red-50 text-red-700";
              else cls = "border-gray-100 bg-white text-gray-400";
            } else if (sel === key) {
              cls = "border-blue-500 bg-blue-50 text-blue-800";
            }
            return (
              <button
                key={key}
                onClick={() => !isRevealed && setSelected((p) => ({ ...p, [q.id]: key }))}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left text-xs transition-all cursor-pointer ${cls}`}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold shrink-0 text-[10px] transition-colors ${
                  isRevealed && key === q.correctAnswer ? "bg-green-500 text-white"
                  : isRevealed && key === sel ? "bg-red-400 text-white"
                  : sel === key ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-500"
                }`}>
                  {key}
                </span>
                {q.options[key]}
              </button>
            );
          })}
        </div>
        {sel && !isRevealed && (
          <button
            onClick={() => setRevealed((p) => ({ ...p, [q.id]: true }))}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer mb-3"
          >
            Check Answer
          </button>
        )}
        {isRevealed && (
          <>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-3">
              <p className="text-xs font-semibold text-blue-800 mb-1">Explanation</p>
              <p className="text-xs text-blue-700 leading-relaxed">{q.explanation}</p>
            </div>
            <button
              onClick={() => { if (current < questions.length - 1) setCurrent((c) => c + 1); else setDone(true); }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              {current < questions.length - 1 ? "Next Question →" : "See Results"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function FlashcardsContent({
  cards,
  loading,
  error,
  isRec = false,
}: {
  cards: Flashcard[];
  loading: boolean;
  error: string;
  isRec?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  if (loading)
    return <Spinner label={isRec ? "Generating flashcards from recording…" : "Generating flashcards from video…"} />;
  if (error)
    return <div className="px-5 py-6 text-center"><p className="text-xs text-red-400">{error}</p></div>;
  if (!cards.length) return null;

  const card = cards[idx];
  const go = (dir: 1 | -1) => {
    setIdx((i) => (i + dir + cards.length) % cards.length);
    setFlipped(false);
    setShowHint(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-4 py-4">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-xs text-gray-400">{idx + 1} / {cards.length}</span>
        <span className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-500 rounded-full font-semibold">{card.category}</span>
      </div>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4 shrink-0">
        <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${((idx + 1) / cards.length) * 100}%` }} />
      </div>
      <div
        onClick={() => setFlipped((f) => !f)}
        className="flex-1 rounded-2xl border-2 border-gray-200 bg-white cursor-pointer hover:border-gray-300 transition-all flex flex-col items-center justify-center px-5 py-6 text-center"
        style={{ minHeight: "160px", maxHeight: "240px" }}
      >
        {!flipped ? (
          <>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Term</p>
            <p className="text-base font-semibold text-gray-800 leading-snug">{card.term}</p>
            <p className="text-[10px] text-gray-300 mt-4">Tap to reveal definition</p>
          </>
        ) : (
          <>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Definition</p>
            <p className="text-xs text-gray-700 leading-relaxed">{card.definition}</p>
            <p className="text-[10px] text-gray-300 mt-4">Tap to go back</p>
          </>
        )}
      </div>
      <div className="mt-3 shrink-0">
        <button
          onClick={() => setShowHint((h) => !h)}
          className="text-xs text-gray-400 hover:text-gray-600 transition cursor-pointer flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          {showHint ? "Hide hint" : "Show hint"}
        </button>
        {showHint && (
          <div className="mt-2 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-2">
            <p className="text-xs text-yellow-700">{card.hint}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-4 shrink-0">
        <button
          onClick={() => go(-1)}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div
              key={i}
              onClick={() => { setIdx(i); setFlipped(false); setShowHint(false); }}
              className={`h-1.5 rounded-full cursor-pointer transition-all ${i === idx ? "w-3 bg-orange-400" : "w-1.5 bg-gray-200"}`}
            />
          ))}
        </div>
        <button
          onClick={() => go(1)}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-400 hover:bg-orange-500 rounded-xl text-xs text-white font-semibold transition cursor-pointer"
        >
          Next
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function MessageActions({
  message,
  onThumbUp,
  onThumbDown,
  onMenuAction,
  showMenu = true,
}: {
  message: string;
  onThumbUp: () => void;
  onThumbDown: () => void;
  onMenuAction: (action: "quiz" | "flashcards" | "exams") => void;
  showMenu?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [thumbState, setThumbState] = useState<"up" | "down" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-center gap-1 mt-1.5">
      <button onClick={handleCopy} title="Copy" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer">
        {copied ? (
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      <button
        onClick={() => { setThumbState("up"); onThumbUp(); }}
        title="Good response"
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition cursor-pointer ${thumbState === "up" ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
      >
        <svg width="14" height="14" fill={thumbState === "up" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      </button>

      <button
        onClick={() => { setThumbState("down"); onThumbDown(); }}
        title="Bad response"
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition cursor-pointer ${thumbState === "down" ? "text-red-500 bg-red-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
      >
        <svg width="14" height="14" fill={thumbState === "down" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
        </svg>
      </button>

      {showMenu && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            title="More options"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute left-0 bottom-8 z-50 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
              {[
                { key: "quiz" as const, label: "Generate Quiz", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
                { key: "flashcards" as const, label: "Generate Flashcards", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
                { key: "exams" as const, label: "Exam Mode", icon: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setMenuOpen(false); onMenuAction(item.key); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition cursor-pointer text-left"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed top-4 right-4 z-[300] flex items-center gap-2.5 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl shadow-xl animate-in">
      <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  );
}

function FeedbackModal({
  type,
  onClose,
  onSubmit,
}: {
  type: "up" | "down";
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const isPositive = type === "up";

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    onSubmit(note);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-base font-semibold text-gray-900">{isPositive ? "What was helpful?" : "What went wrong?"}</h3>
          {!isPositive && <p className="text-xs text-gray-400 mt-1">Help us improve</p>}
        </div>
        <div className="px-6 py-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder={isPositive ? "What was satisfying about this response?" : "What was unsatisfying about this response?"}
            className="w-full px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none resize-none focus:border-blue-400 transition placeholder-gray-300"
            autoFocus
            disabled={loading}
          />
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer disabled:opacity-70 flex items-center gap-2"
          >
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {loading ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RightSidebar({
  open,
  onToggle,
  mode,
  isChat,
  activeTool,
  onToolClick,
  onBack,
  summary,
  summaryLoading,
  summaryError,
  quizQuestions,
  quizLoading,
  quizError,
  flashcards,
  flashcardsLoading,
  flashcardsError,
  chatMessages,
  chatInput,
  setChatInput,
  onChatSend,
  chatLoading,
  recordingReady = false,
  onFeedback,
  onMenuAction,
}: {
  open: boolean;
  onToggle: () => void;
  mode: Mode;
  isChat: boolean;
  activeTool: ActiveTool;
  onToolClick: (tool: ActiveTool) => void;
  onBack: () => void;
  summary: string;
  summaryLoading: boolean;
  summaryError: string;
  quizQuestions: QuizQuestion[];
  quizLoading: boolean;
  quizError: string;
  flashcards: Flashcard[];
  flashcardsLoading: boolean;
  flashcardsError: string;
  chatMessages: { role: "user" | "ai"; message: string }[];
  chatInput: string;
  setChatInput: (v: string) => void;
  onChatSend: () => void;
  chatLoading: boolean;
  recordingReady?: boolean;
  onFeedback: (message: string, type: "up" | "down", note: string) => void;
  onMenuAction: (action: "quiz" | "flashcards" | "exams") => void;
}) {
  const isRecording = mode === "microphone" || mode === "browsertab";
  const [isListening, setIsListening] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ type: "up" | "down"; message: string } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isChatMode) chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatMode]);

  const handleChatSendWrapper = () => {
    setIsChatMode(true);
    onChatSend();
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => { setChatInput(e.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  };

  const toolTitle =
    activeTool === "summary" ? "Summary"
    : activeTool === "quiz" ? "Quiz"
    : activeTool === "flashcards" ? "Flashcards"
    : "";

  return (
    <>
      {!open && (
        <button
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-20 w-6 h-16 bg-white border border-gray-200 border-r-0 rounded-l-lg flex items-center justify-center shadow-md hover:shadow-lg cursor-pointer transition-all text-gray-400 hover:text-gray-700"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {showToast && <Toast message="Feedback submitted — thank you!" onDone={() => setShowToast(false)} />}

      {feedbackModal && (
        <FeedbackModal
          type={feedbackModal.type}
          onClose={() => setFeedbackModal(null)}
          onSubmit={(note) => {
            onFeedback(feedbackModal.message, feedbackModal.type, note);
            setShowToast(true);
          }}
        />
      )}

      <div className={`relative flex flex-col border-l border-gray-200 bg-white transition-all duration-300 ease-in-out shrink-0 ${open ? "w-130" : "w-0 overflow-hidden"}`}>
        {open && (
          <button
            onClick={onToggle}
            className="absolute -left-3.5 top-5 z-10 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer text-gray-400 hover:text-gray-700"
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {open && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
              {(activeTool || isChatMode) && (
                <button
                  onClick={() => { if (isChatMode) setIsChatMode(false); else onBack(); }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition cursor-pointer shrink-0 mr-1"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back</span>
                </button>
              )}
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-sm font-medium text-gray-700">
                {isChatMode ? "Chat" : activeTool ? toolTitle : "ReviseForge"}
              </span>
            </div>

            {!isChatMode && !activeTool && (
              <div className="px-5 pt-4 pb-3 shrink-0">
                <p className="text-xs text-gray-400 font-medium tracking-wide">Generate</p>
              </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {isChatMode && (
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <p className="text-sm text-gray-800 leading-relaxed max-w-[90%]">{msg.message}</p>
                      {msg.role === "ai" && (
                        <MessageActions
                          message={msg.message}
                          onThumbUp={() => setFeedbackModal({ type: "up", message: msg.message })}
                          onThumbDown={() => setFeedbackModal({ type: "down", message: msg.message })}
                          onMenuAction={onMenuAction}
                          showMenu={false}
                        />
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
              )}

              {!isChatMode && !activeTool && (
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  {!isRecording ? (
                    <div className="grid grid-cols-2 gap-2">
                      {panels.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => onToolClick(p.id)}
                          className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer text-left group"
                        >
                          <span className="shrink-0">{p.icon}</span>
                          <span className="text-sm text-gray-700 font-medium leading-tight">{p.label}</span>
                          <span className="ml-auto text-gray-300 group-hover:text-gray-400 shrink-0">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {panels.map((p) =>
                          recordingReady ? (
                            <button
                              key={p.label}
                              onClick={() => onToolClick(p.id)}
                              className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer text-left group"
                            >
                              <span className="shrink-0">{p.icon}</span>
                              <span className="text-sm text-gray-700 font-medium leading-tight">{p.label}</span>
                              <span className="ml-auto text-gray-300 group-hover:text-gray-400 shrink-0">
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                            </button>
                          ) : (
                            <div key={p.label} className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl border border-gray-100 bg-white opacity-40">
                              <span className="shrink-0">{p.icon}</span>
                              <span className="text-sm text-gray-500 font-medium leading-tight">{p.label}</span>
                            </div>
                          )
                        )}
                      </div>
                      <p className="text-xs text-gray-400 px-1 pt-1">
                        {recordingReady ? "Recording ready — generate study tools above" : "Finish a recording to generate study tools"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!isChatMode && activeTool === "summary" && (
                <SummaryContent summary={summary} loading={summaryLoading} error={summaryError} isRec={isRecording} />
              )}
              {!isChatMode && activeTool === "quiz" && (
                <QuizContent questions={quizQuestions} loading={quizLoading} error={quizError} isRec={isRecording} />
              )}
              {!isChatMode && activeTool === "flashcards" && (
                <FlashcardsContent cards={flashcards} loading={flashcardsLoading} error={flashcardsError} isRec={isRecording} />
              )}
            </div>

            {!isChat && (
              <div className="border-t border-gray-100 shrink-0 px-4 py-3">
                <div className={`flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border transition-colors ${chatLoading ? "border-gray-300" : "border-gray-200 focus-within:border-gray-300"}`}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !chatLoading && handleChatSendWrapper()}
                    placeholder={isRecording ? "Ask anything about the recording…" : "Ask anything about this video…"}
                    className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                    disabled={chatLoading}
                  />
                  {chatLoading ? (
                    <svg className="w-4 h-4 animate-spin text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <button
                      onClick={toggleVoice}
                      className={`shrink-0 transition cursor-pointer ${isListening ? "text-red-500 animate-pulse" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  )}
                </div>
                {isListening && (
                  <p className="text-[10px] text-red-400 mt-1 px-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    Listening…
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function YoutubeView({
  url,
  chapters,
  transcripts,
  chaptersLoading,
}: {
  url: string;
  chapters: ChapterItem[];
  transcripts: TranscriptItem[];
  chaptersLoading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"chapters" | "transcripts">("chapters");
  const videoId = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1] ?? "";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="px-4 pt-4 shrink-0">
        <div className="rounded-2xl overflow-hidden bg-black shadow-md" style={{ aspectRatio: "16/9", maxHeight: "420px" }}>
          {videoId ? (
            <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} allowFullScreen />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#EF4444">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white shrink-0 mt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("chapters")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "chapters" ? "text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
          >
            {activeTab === "chapters" && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
            Chapters
          </button>
          <button
            onClick={() => setActiveTab("transcripts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "transcripts" ? "text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            Transcripts
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Auto Scroll
          </button>
          <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chaptersLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <svg className="w-5 h-5 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-xs text-gray-400">Loading chapters &amp; transcript…</p>
          </div>
        ) : activeTab === "chapters" ? (
          chapters.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {chapters.map((item, i) => (
                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <p className="text-xs text-gray-400 font-mono mb-1">{item.time}</p>
                  <p className="text-sm font-semibold text-gray-800 mb-1">{item.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-gray-400">No chapters available for this video</p>
            </div>
          )
        ) : transcripts.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {transcripts.map((item, i) => (
              <div key={i} className="px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                <p className="text-xs font-mono text-gray-400 mb-1">{item.time}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-400">No transcript available for this video</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RecordingView({
  mode,
  onAudioReady,
  onChaptersReady,
}: {
  mode: "microphone" | "browsertab";
  onAudioReady: (base64: string, mimeType: string) => void;
  onChaptersReady: (chapters: ChapterItem[], transcripts: TranscriptItem[]) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const [activeTab, setActiveTab] = useState<"chapters" | "transcripts">("chapters");
  const [localChapters, setLocalChapters] = useState<ChapterItem[]>([]);
  const [liveTranscripts, setLiveTranscripts] = useState<TranscriptItem[]>([]);
  const [processingChapters, setProcessingChapters] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRef = useRef<any>(null);
  const liveTranscriptsRef = useRef<TranscriptItem[]>([]);
  const [bars, setBars] = useState<number[]>(Array(60).fill(2));
  const isBrowserTab = mode === "browsertab";

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => { elapsedRef.current = e + 1; return e + 1; });
      }, 1000);
      animRef.current = setInterval(() => {
        setBars(Array(60).fill(0).map(() => Math.random() * 28 + 2));
      }, 120);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animRef.current) clearInterval(animRef.current);
      setBars(Array(60).fill(2));
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [isRecording]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleStartStop = async () => {
    if (!isRecording) {
      try {
        let audioStream: MediaStream;

        if (isBrowserTab) {
          const displayStream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
          const displayAudioTracks = displayStream.getAudioTracks();
          if (displayAudioTracks.length > 0) {
            audioStream = new MediaStream(displayAudioTracks);
          } else {
            try {
              const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              audioStream = micStream;
            } catch {
              audioStream = new MediaStream(displayAudioTracks);
            }
          }
          streamRef.current = displayStream;
        } else {
          audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = audioStream;
        }

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/ogg";

        const recorder = new MediaRecorder(audioStream, { mimeType });
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          speechRef.current?.stop();
          speechRef.current = null;
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          if (chunksRef.current.length === 0) return;

          const finalDuration = elapsedRef.current;
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1];
            onAudioReady(base64, mimeType.split(";")[0]);
            setProcessingChapters(true);
            try {
              const res = await fetch("/api/generate-chapters-recording", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioBase64: base64, mimeType: mimeType.split(";")[0], durationSecs: finalDuration }),
              });
              if (res.ok) {
                const data = await res.json();
                const ch = data.chapters ?? [];
                const tr = (data.transcripts ?? []).length > 0 ? data.transcripts : liveTranscriptsRef.current;
                setLocalChapters(ch);
                setLiveTranscripts(tr);
                onChaptersReady(ch, tr);
              } else {
                onChaptersReady([], liveTranscriptsRef.current);
              }
            } catch {
              onChaptersReady([], liveTranscriptsRef.current);
            } finally {
              setProcessingChapters(false);
            }
          };
          reader.readAsDataURL(blob);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        elapsedRef.current = 0;
        liveTranscriptsRef.current = [];
        setLiveTranscripts([]);
        setLocalChapters([]);
        setIsRecording(true);

        if (!isBrowserTab) {
          const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (SR) {
            const recognition = new SR();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = "en-US";
            recognition.onresult = (e: any) => {
              const transcript = Array.from(e.results).slice(e.resultIndex).map((r: any) => r[0].transcript).join(" ").trim();
              if (!transcript) return;
              const timestamp = `${Math.floor(elapsedRef.current / 60).toString().padStart(2, "0")}:${(elapsedRef.current % 60).toString().padStart(2, "0")}`;
              const newEntry: TranscriptItem = { time: timestamp, text: transcript };
              liveTranscriptsRef.current = [...liveTranscriptsRef.current, newEntry];
              setLiveTranscripts([...liveTranscriptsRef.current]);
            };
            recognition.onerror = () => {};
            recognition.start();
            speechRef.current = recognition;
          }
        }

        streamRef.current?.getVideoTracks()[0]?.addEventListener("ended", () => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setElapsed(0);
          }
        });
      } catch {
        return;
      }
    } else {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      setIsRecording(false);
      setElapsed(0);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleStartStop}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {isRecording ? (
              <><span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />Stop Recording</>
            ) : (
              <><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />{isBrowserTab ? "Start Recording Tab" : "Start Recording"}</>
            )}
          </button>
          <div className="flex items-end gap-px flex-1 h-9 overflow-hidden">
            {bars.map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-full shrink-0 transition-all duration-100 ${isRecording ? "bg-gray-700" : "bg-gray-200"}`}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <span className="text-sm font-mono text-gray-500 shrink-0">{formatTime(elapsed)}</span>
        </div>
      </div>
      <div className="px-5 py-2 shrink-0">
        <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Help
        </button>
      </div>
      <div className="flex items-center justify-between px-5 py-2 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("chapters")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "chapters" ? "text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
          >
            {activeTab === "chapters" && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
            Chapters
          </button>
          <button
            onClick={() => setActiveTab("transcripts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "transcripts" ? "text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            Transcripts
          </button>
        </div>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Auto Scroll
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {processingChapters ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <svg className="w-5 h-5 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-xs text-gray-400">Processing recording…</p>
          </div>
        ) : activeTab === "chapters" ? (
          localChapters.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {localChapters.map((item, i) => (
                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <p className="text-xs text-gray-400 font-mono mb-1">{item.time}</p>
                  <p className="text-sm font-semibold text-gray-800 mb-1">{item.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <p className="text-sm text-gray-400">
                {isRecording ? "Recording… chapters will appear when you stop" : "Start recording to view chapters"}
              </p>
            </div>
          )
        ) : liveTranscripts.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {liveTranscripts.map((item, i) => (
              <div key={i} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                <p className="text-xs font-mono text-gray-400 mb-1">{item.time}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
            {isRecording && (
              <div className="px-5 py-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                <p className="text-xs text-gray-400 italic">Listening…</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center px-8">
            <p className="text-sm text-gray-400">
              {isRecording && !isBrowserTab
                ? "Transcribing live…"
                : isRecording && isBrowserTab
                ? "Transcript will appear after recording stops"
                : "Start recording to see transcript"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ChatView ──────────────────────────────────────────────────────────────────
// Centered column layout (like ChatGPT): messages and input bar are constrained
// to max-w-2xl and centred horizontally, leaving breathing room on both sides.
// User messages appear as right-aligned gray bubbles; AI messages flow left.
// A disclaimer sits below the input bar, matching the channels page pattern.
function ChatView({
  initialQuery,
  uploadedFile,
}: {
  initialQuery: string;
  uploadedFile: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>(() => {
    const msgs: { role: "user" | "ai"; text: string }[] = [];
    if (uploadedFile) {
      msgs.push({ role: "user", text: `Uploaded: ${uploadedFile}` });
      msgs.push({
        role: "ai",
        text: `I've received your file ${uploadedFile}. What would you like to do with it? I can help summarise, explain, or quiz you on the content.`,
      });
    } else if (initialQuery) {
      msgs.push({ role: "user", text: initialQuery });
    }
    return msgs;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ type: "up" | "down"; message: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send the initial query to the AI on first mount
  useEffect(() => {
    if (initialQuery && messages.length === 1) {
      sendToAI(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendToAI = async (question: string) => {
    setLoading(true);
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, message: m.text }));
      const res = await fetch("/api/chat-general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    await sendToAI(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: `Uploaded: ${file.name}` },
      { role: "ai", text: `I've received ${file.name}. What would you like to do with it?` },
    ]);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {showToast && (
        <Toast message="Feedback submitted — thank you!" onDone={() => setShowToast(false)} />
      )}
      {feedbackModal && (
        <FeedbackModal
          type={feedbackModal.type}
          onClose={() => setFeedbackModal(null)}
          onSubmit={() => setShowToast(true)}
        />
      )}

      {/* ── Messages — centred narrow column like ChatGPT ── */}
      <div className="flex-1 overflow-y-auto py-8">
        <div className="w-full max-w-4xl mx-auto px-16 space-y-10">
          {messages.map((msg, i) => (
            <div key={i} className="flex flex-col">
              {msg.role === "user" ? (
                /* User bubble — right aligned */
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-gray-100 rounded-2xl px-4 py-2.5">
                    <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ) : (
                /* AI response — left aligned within the same column */
                <div className="flex flex-col items-start">
                  <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>
                  <MessageActions
                    message={msg.text}
                    onThumbUp={() => setFeedbackModal({ type: "up", message: msg.text })}
                    onThumbDown={() => setFeedbackModal({ type: "down", message: msg.text })}
                    onMenuAction={(action) => {
                      if (action === "exams") {
                        router.push("/dashboard/exam-mode");
                      } else {
                        setMessages((prev) => [
                          ...prev,
                          {
                            role: "ai",
                            text: `To generate ${action === "quiz" ? "a quiz" : "flashcards"}, please start from the dashboard by pasting a YouTube link or recording a lecture. That gives me the source material to work from.`,
                          },
                        ]);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar + disclaimer — same centred column as messages ── */}
      <div className="shrink-0 bg-white pb-5 px-16">
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-300 transition-colors">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.mp3,.wav,.m4a"
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask anything…"
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
            {loading ? (
              <svg className="w-4 h-4 animate-spin text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-8 h-8 shrink-0 rounded-xl bg-blue-600 disabled:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
          {/* Disclaimer — mirrors the channels page "@reviseforge is AI…" pattern */}
          <p className="text-center text-[11px] text-gray-400 mt-2.5">
            ReviseForge AI can make mistakes. Please double-check responses.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Supabase persistence helpers ──────────────────────────────────────────────

async function persistFeedback(
  userId: string,
  messageText: string,
  type: "up" | "down",
  note: string,
  sessionId: string,
  isRec: boolean,
) {
  const col = isRec ? { recording_session_id: sessionId } : { session_id: sessionId };
  try {
    await supabase.from("message_feedback").insert({
      user_id: userId,
      message_text: messageText.slice(0, 1000),
      feedback_type: type,
      note,
      ...col,
    });
  } catch {
    /* non-critical — fail silently */
  }
}

function sessionCol(id: string, isRec: boolean) {
  return isRec ? { recording_session_id: id } : { session_id: id };
}
function sessionFilter(query: any, id: string, isRec: boolean) {
  return isRec ? query.eq("recording_session_id", id) : query.eq("session_id", id);
}

async function persistSummary(sessionId: string, userId: string, summaryText: string, isRec = false) {
  const col = sessionCol(sessionId, isRec);
  await sessionFilter(supabase.from("content_summaries").delete(), sessionId, isRec);
  await supabase.from("content_summaries").insert({ ...col, user_id: userId, summary: summaryText });
}

async function persistQuiz(sessionId: string, userId: string, questions: QuizQuestion[], isRec = false) {
  const col = sessionCol(sessionId, isRec);
  await sessionFilter(supabase.from("content_quizzes").delete(), sessionId, isRec);
  const { data: quiz, error: quizErr } = await supabase
    .from("content_quizzes")
    .insert({ ...col, user_id: userId })
    .select("id")
    .single();
  if (quizErr || !quiz) return;
  const rows = questions.map((q, i) => ({
    quiz_id: quiz.id,
    question_order: i + 1,
    question: q.question,
    option_a: q.options.A,
    option_b: q.options.B,
    option_c: q.options.C,
    option_d: q.options.D,
    correct_answer: q.correctAnswer,
    explanation: q.explanation,
    category: q.category,
  }));
  await supabase.from("content_quiz_questions").insert(rows);
}

async function persistFlashcards(sessionId: string, userId: string, cards: Flashcard[], isRec = false) {
  const col = sessionCol(sessionId, isRec);
  await sessionFilter(supabase.from("content_flashcards").delete(), sessionId, isRec);
  const rows = cards.map((c, i) => ({
    ...col,
    user_id: userId,
    card_order: i + 1,
    term: c.term,
    definition: c.definition,
    hint: c.hint || "",
    category: c.category || "General",
  }));
  await supabase.from("content_flashcards").insert(rows);
}

async function persistChaptersAndTranscripts(
  sessionId: string,
  userId: string,
  chapters: ChapterItem[],
  transcripts: TranscriptItem[],
  isRec = false,
) {
  const col = sessionCol(sessionId, isRec);
  await Promise.all([
    sessionFilter(supabase.from("content_chapters").delete(), sessionId, isRec),
    sessionFilter(supabase.from("content_transcripts").delete(), sessionId, isRec),
  ]);
  const chapterRows = chapters.map((c, i) => ({ ...col, user_id: userId, chapter_order: i + 1, time: c.time, title: c.title, text: c.text }));
  const transcriptRows = transcripts.map((t, i) => ({ ...col, user_id: userId, transcript_order: i + 1, time: t.time, text: t.text }));
  await Promise.all([
    chapterRows.length ? supabase.from("content_chapters").insert(chapterRows) : Promise.resolve(),
    transcriptRows.length ? supabase.from("content_transcripts").insert(transcriptRows) : Promise.resolve(),
  ]);
}

async function loadCachedChaptersAndTranscripts(sessionId: string, isRec = false) {
  const col = isRec ? "recording_session_id" : "session_id";
  const [chaptersRes, transcriptsRes] = await Promise.all([
    supabase.from("content_chapters").select("time, title, text").eq(col, sessionId).order("chapter_order", { ascending: true }),
    supabase.from("content_transcripts").select("time, text").eq(col, sessionId).order("transcript_order", { ascending: true }),
  ]);
  return {
    chapters: (chaptersRes.data ?? []) as ChapterItem[],
    transcripts: (transcriptsRes.data ?? []) as TranscriptItem[],
  };
}

async function persistChatMessage(sessionId: string, userId: string, role: "user" | "ai", message: string, isRec = false) {
  const col = sessionCol(sessionId, isRec);
  await supabase.from("content_chat_messages").insert({ ...col, user_id: userId, role, message });
}

async function loadChatMessages(sessionId: string, isRec = false) {
  const col = isRec ? "recording_session_id" : "session_id";
  const { data } = await supabase
    .from("content_chat_messages")
    .select("role, message, created_at")
    .eq(col, sessionId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => ({ role: row.role as "user" | "ai", message: row.message }));
}

async function loadCachedData(sessionId: string, isRec = false) {
  const col = isRec ? "recording_session_id" : "session_id";
  const [summaryRes, quizRes, flashcardsRes] = await Promise.all([
    supabase.from("content_summaries").select("summary").eq(col, sessionId).maybeSingle(),
    supabase.from("content_quizzes").select("id").eq(col, sessionId).maybeSingle(),
    supabase.from("content_flashcards").select("*").eq(col, sessionId).order("card_order"),
  ]);

  let quizQuestions: QuizQuestion[] = [];
  if (quizRes.data?.id) {
    const { data: qRows } = await supabase
      .from("content_quiz_questions")
      .select("*")
      .eq("quiz_id", quizRes.data.id)
      .order("question_order");
    quizQuestions = (qRows ?? []).map((row, i) => ({
      id: i + 1,
      question: row.question,
      options: { A: row.option_a, B: row.option_b, C: row.option_c, D: row.option_d },
      correctAnswer: row.correct_answer as "A" | "B" | "C" | "D",
      explanation: row.explanation,
      category: row.category,
    }));
  }

  const flashcards: Flashcard[] = (flashcardsRes.data ?? []).map((row, i) => ({
    id: i + 1,
    term: row.term,
    definition: row.definition,
    hint: row.hint ?? "",
    category: row.category ?? "General",
  }));

  return { summary: summaryRes.data?.summary ?? "", quizQuestions, flashcards };
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Contentpages() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = (params.get("mode") as Mode) ?? "youtube";
  const url = params.get("url") ?? "";
  const sessionId = params.get("session_id") ?? "";
  const initialQuery = params.get("q") ?? "";
  const uploadedFile = params.get("file") ?? "";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isRecording = mode === "microphone" || mode === "browsertab";
  const isChat = mode === "chat";

  const userIdRef = useRef<string>("");
  const recordingAudioRef = useRef<{ base64: string; mimeType: string } | null>(null);
  const [recordingSessionId, setRecordingSessionId] = useState<string>("");
  const isRec = isRecording && !!recordingSessionId;

  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState("");
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; message: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;

        if (sessionId) {
          await supabase.from("youtube_sessions").update({ last_visited: new Date().toISOString() }).eq("id", sessionId);
          const [cached, chatHistory, cachedChapters] = await Promise.all([
            loadCachedData(sessionId, false),
            loadChatMessages(sessionId, false),
            loadCachedChaptersAndTranscripts(sessionId, false),
          ]);
          if (cached.summary) setSummary(cached.summary);
          if (cached.quizQuestions.length) setQuizQuestions(cached.quizQuestions);
          if (cached.flashcards.length) setFlashcards(cached.flashcards);
          if (chatHistory.length) setChatMessages(chatHistory);
          if (cachedChapters.chapters.length) setChapters(cachedChapters.chapters);
          if (cachedChapters.transcripts.length) setTranscripts(cachedChapters.transcripts);
        }

        const recSidParam = new URLSearchParams(window.location.search).get("recording_session_id");
        if (recSidParam && !sessionId) {
          await supabase.from("recording_sessions").update({ last_visited: new Date().toISOString() }).eq("id", recSidParam);
          setRecordingSessionId(recSidParam);
          const [cached, chatHistory, cachedChapters] = await Promise.all([
            loadCachedData(recSidParam, true),
            loadChatMessages(recSidParam, true),
            loadCachedChaptersAndTranscripts(recSidParam, true),
          ]);
          if (cached.summary) setSummary(cached.summary);
          if (cached.quizQuestions.length) setQuizQuestions(cached.quizQuestions);
          if (cached.flashcards.length) setFlashcards(cached.flashcards);
          if (chatHistory.length) setChatMessages(chatHistory);
          if (cachedChapters.chapters.length) setChapters(cachedChapters.chapters);
          if (cachedChapters.transcripts.length) setTranscripts(cachedChapters.transcripts);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!recordingSessionId || !userIdRef.current) return;
    if (chapters.length > 0 || transcripts.length > 0) {
      persistChaptersAndTranscripts(recordingSessionId, userIdRef.current, chapters, transcripts, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingSessionId]);

  useEffect(() => {
    if (!sessionId || !videoTitle || !userIdRef.current) return;
    supabase.from("youtube_sessions").update({ video_title: videoTitle }).eq("id", sessionId).then(() => {});
  }, [videoTitle, sessionId]);

  useEffect(() => {
    if (!url || isRecording || isChat) return;
    (async () => {
      setChaptersLoading(true);
      try {
        const res = await fetch("/api/generate-chapters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const fetchedChapters = data.chapters ?? [];
        const fetchedTranscripts = data.transcripts ?? [];
        setChapters(fetchedChapters);
        setTranscripts(fetchedTranscripts);
        setVideoTitle(data.title ?? "");
        if (sessionId && userIdRef.current) {
          await persistChaptersAndTranscripts(sessionId, userIdRef.current, fetchedChapters, fetchedTranscripts, false);
        }
      } catch {
      } finally {
        setChaptersLoading(false);
      }
    })();
  }, [url]);

  const handleToolClick = useCallback(
    async (tool: ActiveTool) => {
      if (tool === "exams") {
        if (isRecording) {
          if (!recordingAudioRef.current?.base64 && !transcripts.length) return;
          try {
            sessionStorage.setItem("rec_exam_audio", recordingAudioRef.current?.base64 ?? "");
            sessionStorage.setItem("rec_exam_mimeType", recordingAudioRef.current?.mimeType ?? "");
            sessionStorage.setItem("rec_exam_transcript", transcripts.map((t) => `[${t.time}] ${t.text}`).join("\n"));
          } catch { /* sessionStorage might be full for large recordings */ }
          router.push("/dashboard/exam-mode?source=recording");
        } else {
          const destination = url
            ? `/dashboard/exam-mode?url=${encodeURIComponent(url)}&source=youtube`
            : "/dashboard/exam-mode";
          router.push(destination);
        }
        return;
      }

      setActiveTool(tool);
      const userId = userIdRef.current;

      const audioPayload = {
        audioBase64: recordingAudioRef.current?.base64 ?? null,
        mimeType: recordingAudioRef.current?.mimeType ?? null,
        transcript: transcripts.map((t) => `[${t.time}] ${t.text}`).join("\n"),
      };

      if (isRecording) {
        if (!audioPayload.audioBase64 && !audioPayload.transcript) {
          if (tool === "summary") setSummaryError("Please finish recording before generating a summary.");
          if (tool === "quiz") setQuizError("Please finish recording before generating a quiz.");
          if (tool === "flashcards") setFlashcardsError("Please finish recording before generating flashcards.");
          return;
        }

        if (tool === "summary" && !summary && !summaryLoading) {
          setSummaryLoading(true);
          setSummaryError("");
          try {
            const res = await fetch("/api/generate-summary-recording", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(audioPayload),
            });
            if (!res.ok) {
              const text = await res.text();
              const msg = text.startsWith("{") ? JSON.parse(text).error : "Failed to generate summary";
              throw new Error(msg);
            }
            const data = await res.json();
            setSummary(data.summary);
            if (recordingSessionId && userId) await persistSummary(recordingSessionId, userId, data.summary, true);
          } catch (e: any) {
            setSummaryError(e.message || "Failed to generate summary");
          } finally {
            setSummaryLoading(false);
          }
        }

        if (tool === "quiz" && !quizQuestions.length && !quizLoading) {
          setQuizLoading(true);
          setQuizError("");
          try {
            const res = await fetch("/api/generate-quiz-recording", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(audioPayload),
            });
            if (!res.ok) {
              const text = await res.text();
              const msg = text.startsWith("{") ? JSON.parse(text).error : "Failed to generate quiz";
              throw new Error(msg);
            }
            const data = await res.json();
            const questions: QuizQuestion[] = (data.questions ?? []).map((q: any, i: number) => ({ ...q, id: i + 1 }));
            setQuizQuestions(questions);
            if (recordingSessionId && userId) await persistQuiz(recordingSessionId, userId, questions, true);
          } catch (e: any) {
            setQuizError(e.message || "Failed to generate quiz");
          } finally {
            setQuizLoading(false);
          }
        }

        if (tool === "flashcards" && !flashcards.length && !flashcardsLoading) {
          setFlashcardsLoading(true);
          setFlashcardsError("");
          try {
            const res = await fetch("/api/generate-flashcards-recording", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(audioPayload),
            });
            if (!res.ok) {
              const text = await res.text();
              const msg = text.startsWith("{") ? JSON.parse(text).error : "Failed to generate flashcards";
              throw new Error(msg);
            }
            const data = await res.json();
            const cards: Flashcard[] = (data.flashcards ?? []).map((c: any, i: number) => ({ ...c, id: i + 1 }));
            setFlashcards(cards);
            if (recordingSessionId && userId) await persistFlashcards(recordingSessionId, userId, cards, true);
          } catch (e: any) {
            setFlashcardsError(e.message || "Failed to generate flashcards");
          } finally {
            setFlashcardsLoading(false);
          }
        }

        return;
      }

      if (!url) return;

      if (tool === "summary" && !summary && !summaryLoading) {
        setSummaryLoading(true);
        setSummaryError("");
        try {
          const res = await fetch("/api/generate-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
          const data = await res.json();
          setSummary(data.summary);
          if (sessionId && userId) await persistSummary(sessionId, userId, data.summary, false);
        } catch (e: any) {
          setSummaryError(e.message || "Failed to generate summary");
        } finally {
          setSummaryLoading(false);
        }
      }

      if (tool === "quiz" && !quizQuestions.length && !quizLoading) {
        setQuizLoading(true);
        setQuizError("");
        try {
          const res = await fetch("/api/generate-quiz-youtube", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
          const data = await res.json();
          const questions: QuizQuestion[] = (data.questions ?? []).map((q: any, i: number) => ({ ...q, id: i + 1 }));
          setQuizQuestions(questions);
          if (sessionId && userId) await persistQuiz(sessionId, userId, questions, false);
        } catch (e: any) {
          setQuizError(e.message || "Failed to generate quiz");
        } finally {
          setQuizLoading(false);
        }
      }

      if (tool === "flashcards" && !flashcards.length && !flashcardsLoading) {
        setFlashcardsLoading(true);
        setFlashcardsError("");
        try {
          const res = await fetch("/api/generate-flashcards-youtube", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
          const data = await res.json();
          const cards: Flashcard[] = (data.flashcards ?? []).map((c: any, i: number) => ({ ...c, id: i + 1 }));
          setFlashcards(cards);
          if (sessionId && userId) await persistFlashcards(sessionId, userId, cards, false);
        } catch (e: any) {
          setFlashcardsError(e.message || "Failed to generate flashcards");
        } finally {
          setFlashcardsLoading(false);
        }
      }
    },
    [url, isRecording, transcripts, recordingSessionId, summary, summaryLoading, quizQuestions.length, quizLoading, flashcards.length, flashcardsLoading, sessionId, router],
  );

  const handleChatSend = useCallback(async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    const userId = userIdRef.current;

    setChatMessages((prev) => [...prev, { role: "user", message: q }]);
    setChatInput("");
    setChatLoading(true);

    const activeSid = isRec ? recordingSessionId : sessionId;
    if (activeSid && userId) {
      await persistChatMessage(activeSid, userId, "user", q, isRec);
    }

    try {
      let answer = "";

      if (isRecording) {
        const res = await fetch("/api/chat-recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: recordingAudioRef.current?.base64 ?? null,
            mimeType: recordingAudioRef.current?.mimeType ?? null,
            transcript: transcripts.map((t) => `[${t.time}] ${t.text}`).join("\n"),
            question: q,
            history: chatMessages.slice(-6),
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
        const data = await res.json();
        answer = data.answer;
      } else {
        if (!url) throw new Error("No video URL available.");
        const res = await fetch("/api/chat-youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, question: q, history: chatMessages.slice(-6) }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
        const data = await res.json();
        answer = data.answer;
      }

      setChatMessages((prev) => [...prev, { role: "ai", message: answer }]);

      if (activeSid && userId) {
        await persistChatMessage(activeSid, userId, "ai", answer, isRec);
      }
    } catch (e: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          message: e.message?.includes("quota")
            ? "API quota exceeded. Please wait a moment and try again."
            : "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, url, isRecording, isRec, recordingSessionId, chatMessages, chatLoading, sessionId, transcripts]);

  const title = isRecording
    ? `Recording at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : isChat
    ? initialQuery || uploadedFile || "Chat"
    : url
    ? url.replace("https://", "").replace("www.", "").slice(0, 70)
    : "Content";

  // Chat mode — full screen with sidebar, no right panel
  if (isChat) {
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden ml-[90px] min-w-0">
          <ChatView initialQuery={initialQuery} uploadedFile={uploadedFile} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <header className="h-12 flex items-center justify-between px-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 cursor-pointer transition-colors shrink-0">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700 truncate">{videoTitle || title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard">
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all">
              ← Dashboard
            </button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden min-w-0">
          {!isRecording && !isChat && (
            <YoutubeView url={url} chapters={chapters} transcripts={transcripts} chaptersLoading={chaptersLoading} />
          )}
          {isRecording && (
            <RecordingView
              mode={mode as "microphone" | "browsertab"}
              onAudioReady={async (base64, mimeType) => {
                recordingAudioRef.current = { base64, mimeType };
                const userId = userIdRef.current;
                if (userId) {
                  const { data: recSession } = await supabase
                    .from("recording_sessions")
                    .insert({ user_id: userId, mode: mode as "microphone" | "browsertab", last_visited: new Date().toISOString() })
                    .select("id")
                    .single();
                  if (recSession?.id) setRecordingSessionId(recSession.id);
                }
              }}
              onChaptersReady={async (ch, tr) => {
                setChapters(ch);
                setTranscripts(tr);
                if (ch.length > 0 && recordingSessionId) {
                  await supabase
                    .from("recording_sessions")
                    .update({ title: ch[0].title, last_visited: new Date().toISOString() })
                    .eq("id", recordingSessionId);
                }
              }}
            />
          )}
        </div>

        {!isChat && (
          <RightSidebar
            open={sidebarOpen}
            onToggle={() => setSidebarOpen((o) => !o)}
            mode={mode}
            isChat={isChat}
            activeTool={activeTool}
            onToolClick={handleToolClick}
            onBack={() => setActiveTool(null)}
            summary={summary}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            quizQuestions={quizQuestions}
            quizLoading={quizLoading}
            quizError={quizError}
            flashcards={flashcards}
            flashcardsLoading={flashcardsLoading}
            flashcardsError={flashcardsError}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onChatSend={handleChatSend}
            chatLoading={chatLoading}
            recordingReady={!!recordingAudioRef.current}
            onFeedback={async (message, type, note) => {
              const userId = userIdRef.current;
              const sid = isRec ? recordingSessionId : sessionId;
              if (userId && sid) await persistFeedback(userId, message, type, note, sid, isRec);
            }}
            onMenuAction={(action) => {
              handleToolClick(action as any);
            }}
          />
        )}
      </div>
    </div>
  );
}