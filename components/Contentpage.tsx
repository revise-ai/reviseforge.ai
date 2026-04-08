"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import MarkdownRenderer from "./MarkdownRenderer";
import AddContextPopup, { ContextSelection, ContextChip } from "./AddContextPopup";
import UploadPopup from "./UploadPopup";

type Mode = "youtube" | "web" | "microphone" | "browsertab" | "chat" | "file";
type ActiveTool = "summary" | "quiz" | "flashcards" | "exams" | "visualizations" | "podcast" | null;

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
  {
    id: "podcast" as ActiveTool,
    label: "Podcast",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#8B5CF6" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 01-14 0v-1M12 18v4" />
      </svg>
    ),
  },
];

// ── AI Message Renderer ───────────────────────────────────────────────────────
// Parses the structured prompt output (Given / Formula / Working / Answer /
// Verification / Key Concept) and renders each section with distinct visual
// treatment.  Falls back to plain paragraph rendering for theory / general.

type MsgSection = {
  type: "solving" | "label" | "indent" | "equation" | "separator" | "paragraph" | "blank";
  content: string;
};

const CALC_LABELS = [
  "Given", "Formula", "Working", "Answer",
  "Verification", "Key Concept", "Equation", "Solving",
];

function isMathLine(line: string): boolean {
  return /[=+\-×÷→≈≠≤≥²³√∑∫π°]/.test(line) && /\d/.test(line);
}

function isLabelLine(line: string): boolean {
  const t = line.trim();
  return CALC_LABELS.some((l) => t === l || t === l + ":" || t.startsWith(l + ":"));
}

function isSeparator(line: string): boolean {
  return /^[━─=]{6,}/.test(line.trim());
}

function isStructuredCalc(text: string): boolean {
  return (
    /\b(Given|Formula|Working|Answer|Verification|Key Concept)\s*:/i.test(text) ||
    /^Solving[: ]/im.test(text)
  );
}

function parseAIMessage(text: string): MsgSection[] {
  const sections: MsgSection[] = [];
  for (const raw of text.split("\n")) {
    const t = raw.trim();
    if (!t) { sections.push({ type: "blank", content: "" }); continue; }
    if (isSeparator(t)) { sections.push({ type: "separator", content: t }); continue; }
    if (/^solving[: ]/i.test(t)) { sections.push({ type: "solving", content: t }); continue; }
    if (isLabelLine(raw)) { sections.push({ type: "label", content: t }); continue; }
    const indented = raw.startsWith("  ") || raw.startsWith("\t");
    if (indented && isMathLine(t)) { sections.push({ type: "equation", content: t }); continue; }
    if (indented) { sections.push({ type: "indent", content: t }); continue; }
    if (isMathLine(t) && t.length < 80) { sections.push({ type: "equation", content: t }); continue; }
    sections.push({ type: "paragraph", content: t });
  }
  return sections;
}

const LABEL_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  given: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" },
  formula: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  equation: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", dot: "bg-blue-500" },
  working: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  answer: { bg: "bg-green-50", text: "text-green-800", border: "border-green-200", dot: "bg-green-500" },
  verification: { bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", dot: "bg-violet-500" },
  "key concept": { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200", dot: "bg-indigo-500" },
};

function getLabelStyle(label: string) {
  const key = label.replace(":", "").trim().toLowerCase();
  return LABEL_STYLES[key] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400" };
}

import { saveMediaToDB, getMediaFromDB } from "@/lib/idb";

function extractVideoId(url: string) {
  const match = url.match(/(?:v=|\/embed\/|\/watch\?v=|\/v\/|youtu\.be\/|\/shorts\/|live\/)([^#&?]*)/);
  return match && match[1]?.length === 11 ? match[1] : null;
}

function AIMessage({ text }: { text: string }) {
  return <MarkdownRenderer content={text} />;
}

// ─────────────────────────────────────────────────────────────────────────────

function RenderMd({ text }: { text: string }) {
  return <MarkdownRenderer content={text} />;
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function cleanExplanation(text: string): string {
  if (!text) return "";
  return text
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .replace(/^\s*[\[{]/, "")
    .replace(/[\]}]\s*$/, "")
    .trim();
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
            className="group flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer active:scale-95"
          >
            Retake Quiz
            <svg className="w-3.5 h-3.5 text-blue-200 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3V17.536L16.232 5.232z" />
            </svg>
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
                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold shrink-0 text-[10px] transition-colors ${isRevealed && key === q.correctAnswer ? "bg-green-500 text-white"
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
              <p className="text-xs text-blue-700 leading-relaxed">{cleanExplanation(q.explanation)}</p>
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
  onMenuAction: (action: "quiz" | "flashcards" | "exams" | "visualizations") => void;
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
  onFileUpload,
  contextMenuOpen,
  setContextMenuOpen,
  selectedContext,
  setSelectedContext,
  uploadMenuOpen,
  setUploadMenuOpen,
  videoTitle,
}: {
  open: boolean;
  onToggle: () => void;
  mode: Mode;
  isChat: boolean;
  activeTool: ActiveTool;
  onToolClick: (tool: ActiveTool, ignoreConfirm?: boolean) => void;
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
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  onChatSend: () => void;
  chatLoading: boolean;
  recordingReady?: boolean;
  onFeedback: (message: string, type: "up" | "down", note: string) => void;
  onMenuAction: (action: "quiz" | "flashcards" | "exams" | "visualizations") => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  contextMenuOpen: boolean;
  setContextMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedContext: ContextSelection | null;
  setSelectedContext: React.Dispatch<React.SetStateAction<ContextSelection | null>>;
  uploadMenuOpen: boolean;
  setUploadMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  videoTitle?: string;
}) {
  const isRecording = mode === "microphone" || mode === "browsertab";
  const [isListening, setIsListening] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ type: "up" | "down"; message: string } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Derived "Sets" from session data
  const sessionSets = React.useMemo(() => {
    const sets = [];
    if (summary) sets.push({ id: "summary", label: "Detailed Summary", type: "summary" });
    if (quizQuestions?.length > 0) sets.push({ id: "quiz", label: "Interactive Quiz", type: "quiz" });
    if (flashcards?.length > 0) sets.push({ id: "flashcards", label: "Vocabulary Flashcards", type: "flashcards" });
    
    chatMessages.forEach((msg, idx) => {
      if (msg.role === "ai" && msg.message.includes("```mermaid")) {
        const titleMatch = msg.message.match(/title:\s*([^\n]+)/i);
        const title = titleMatch ? titleMatch[1].trim() : "Session Mind Map";
        sets.push({ id: `mindmap-${idx}`, label: title, type: "mindmap", msgIndex: idx });
      }
    });

    return sets;
  }, [summary, quizQuestions, flashcards, chatMessages]);


  useEffect(() => {
    if (isChatMode) chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatMode]);

  const handleChatSendWrapper = () => {
    setIsChatMode(true);
    onChatSend();
  };

  const stopRecordingAndTranscribe = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setIsListening(false);
      setIsProcessingVoice(true);

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        try {
          const res = await fetch("/api/note-voice-transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64Audio, mimeType: "audio/webm" }),
          });
          const data = await res.json();
          if (data.transcript) {
            setChatInput((prev) => prev + (prev ? " " : "") + data.transcript);
          }
        } catch (err) {
          console.error("Transcription failed", err);
        } finally {
          setIsProcessingVoice(false);
        }
      };
    };
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        setIsListening(false);
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.stop();
    }
  };

  const toggleVoice = async () => {
    if (isListening) {
      await stopRecordingAndTranscribe();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsListening(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access to use dictation.");
    }
  };

  const toolTitle =
    activeTool === "summary" ? "Summary"
      : activeTool === "quiz" ? "Quiz"
        : activeTool === "flashcards" ? "Flashcards"
          : activeTool === "visualizations" ? "Visualizations"
            : activeTool === "exams" ? "Exam Mode"
              : activeTool === "podcast" ? "Podcast Hub"
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
                      {msg.role === "user" ? (
                        <div className="text-sm text-gray-800 leading-relaxed max-w-[90%] whitespace-pre-wrap flex flex-wrap gap-x-1.5 gap-y-1">
                          {msg.message.startsWith("[Requested Mind Map format] ") && (
                            <span className="inline-flex items-center gap-1 bg-blue-100/80 text-blue-700 px-2.5 rounded-full font-medium text-xs border border-blue-200/50 shadow-sm align-middle h-5 pt-[1px]" style={{ transform: 'translateY(1px)' }}>
                              @Mind Map
                            </span>
                          )}
                          {msg.message.startsWith("[Requested Interactive diagram visualization format] ") && (
                            <span className="inline-flex items-center gap-1 bg-green-100/80 text-green-700 px-2.5 rounded-full font-medium text-xs border border-green-200/50 shadow-sm align-middle h-5 pt-[1px]" style={{ transform: 'translateY(1px)' }}>
                              @Interactive
                            </span>
                          )}
                          <span>{msg.message.replace(/^\[Requested (?:Mind Map|Interactive diagram visualization) format\] /, "")}</span>
                        </div>
                      ) : (
                        <AIMessage text={msg.message} />
                      )}
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

                  {/* My Sets Section - User's local history of artifacts */}
                  {sessionSets.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center justify-center mb-3">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest shrink-0">My Recents</p>
                      </div>
                      <div className="space-y-1.5">
                        {sessionSets.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.type === "mindmap") {
                                setIsChatMode(true);
                              } else {
                                onToolClick(item.type as ActiveTool, true);
                              }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:shadow-sm hover:border-gray-100 transition-all cursor-pointer text-left group"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              item.type === "summary" ? "bg-blue-50 text-blue-500" :
                              item.type === "quiz" ? "bg-red-50 text-red-500" :
                              item.type === "flashcards" ? "bg-orange-50 text-orange-500" : "bg-indigo-50 text-indigo-500"
                            }`}>
                              {item.type === "summary" && <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                              {item.type === "quiz" && <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                              {item.type === "flashcards" && <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                              {item.type === "mindmap" && <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M12 9V4m0 16v-5m-3 .5l-3 3m9-3l3 3M9 9.5l-3-3m9 3l3-3"/></svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-800 truncate">{item.label}</p>
                              <p className="text-[10px] text-gray-400 font-medium capitalize">{item.type} · Session Artifact</p>
                            </div>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                      </div>
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
              {!isChatMode && activeTool === "visualizations" && (
                <VisualizationsContent />
              )}
            </div>

            {!isChat && (
              <div className="border-t border-gray-100 shrink-0 px-5 py-5 bg-white">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={onFileUpload}
                />
                
                <div className={`flex flex-col bg-gray-50 border rounded-[32px] px-4 py-2 transition-all duration-300 min-h-[70px] justify-center ${isListening ? "border-blue-500 shadow-md ring-2 ring-blue-50" : "border-gray-200 focus-within:border-blue-400 focus-within:bg-white"}`}>
                  {isProcessingVoice ? (
                    <div className="flex-1 flex items-center justify-center gap-2 text-gray-500 text-sm italic py-2">
                      <svg className="w-4 h-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Transcribing audio…
                    </div>
                  ) : isListening ? (
                    <div className="flex-1 flex flex-col justify-between gap-3 py-1">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex gap-1 items-center h-4">
                          {[0.1, 0.3, 0.2, 0.4, 0.25, 0.45, 0.2, 0.35].map((d, i) => (
                            <div key={i} className="w-[3px] bg-blue-500 rounded-full animate-[voiceWave_1s_infinite_ease-in-out]" style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${d}s` }}></div>
                          ))}
                        </div>
                        <span className="text-[13px] font-medium text-gray-500">Recording...</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={cancelRecording} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Cancel">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <button onClick={stopRecordingAndTranscribe} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 shadow-sm cursor-pointer" title="Done">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex flex-col min-h-[36px] relative">
                        {selectedContext && (
                          <ContextChip selection={selectedContext} onRemove={() => setSelectedContext(null)} />
                        )}
                        <textarea
                          rows={1}
                          value={chatInput}
                          onChange={(e) => {
                            setChatInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (!chatLoading) handleChatSendWrapper();
                            }
                          }}
                          placeholder={isRecording ? "Ask about the recording…" : "Ask about the video…"}
                          className="w-full bg-transparent text-[14px] text-gray-800 placeholder-gray-400 outline-none resize-none overflow-hidden py-1"
                          disabled={chatLoading}
                          style={{ minHeight: '28px', maxHeight: '120px' }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-2 relative">
                        <div className="flex items-center gap-2">
                          {/* @ Add Source (Rounded Button) */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setContextMenuOpen(o => !o); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shrink-0 shadow-sm"
                            title="Add Source"
                          >
                            <span className="text-[13px] font-bold text-gray-400">@</span>
                            <span className="text-[11px] font-bold uppercase tracking-tight text-gray-400">Add Source</span>
                          </button>
                          <AddContextPopup open={contextMenuOpen} onClose={() => setContextMenuOpen(false)} onSelect={(item) => setSelectedContext(item)} />

                          <div className="flex items-center gap-1 ml-0.5">
                            {/* Upload (Clip) */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setUploadMenuOpen(o => !o)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shrink-0 shadow-sm"
                                title="Upload Document"
                              >
                                <svg className="w-[13px] h-[13px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                <span className="text-[11px] font-medium tracking-wide">Upload</span>
                              </button>
                              <UploadPopup
                                open={uploadMenuOpen}
                                onClose={() => setUploadMenuOpen(false)}
                                onAddFile={() => fileInputRef.current?.click()}
                              />
                            </div>

                            {/* Dictate (Mic) */}
                            <button
                              type="button"
                              onClick={toggleVoice}
                              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1"
                              title="Dictate"
                            >
                              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Send Button */}
                        <div className="flex items-center">
                          {chatLoading ? (
                            <svg className="w-4 h-4 animate-spin text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                          ) : chatInput.trim() ? (
                            <button
                              onClick={handleChatSendWrapper}
                              className="w-8 h-8 cursor-pointer rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-all active:scale-90 shadow-md"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m-7 7l7-7 7 7" />
                              </svg>
                            </button>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center opacity-90 shadow-sm" title="Voice mode active">
                              <div className="flex gap-[1.5px] items-center">
                                <div className="w-[2px] h-3 bg-white rounded-full animate-[pulse_1s_infinite_0s]"></div>
                                <div className="w-[2px] h-4 bg-white rounded-full animate-[pulse_1s_infinite_0.2s]"></div>
                                <div className="w-[2px] h-2.5 bg-white rounded-full animate-[pulse_1s_infinite_0.4s]"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function VideoHub({
  file,
  chapters,
  transcripts,
  processing,
  base64,
  mimeType,
  thumbnail,
  error,
  nativeFile,
}: {
  file: string;
  chapters: ChapterItem[];
  transcripts: TranscriptItem[];
  processing: boolean;
  base64?: string;
  mimeType?: string;
  thumbnail?: string;
  error?: string;
  nativeFile?: File | null;
}) {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(thumbnail || "");
  const [activeTab, setActiveTab] = useState<"chapters" | "transcripts">("chapters");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (thumbnail) setThumbnailUrl(thumbnail);
  }, [thumbnail]);

  useEffect(() => {
    if (nativeFile) {
      const url = URL.createObjectURL(nativeFile);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVideoUrl(url);
      return () => { URL.revokeObjectURL(url); }
    } else if (base64 && mimeType) {
      const parsedMime = mimeType || "video/mp4";
      const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
      const dataUri = `data:${parsedMime};base64,${base64Data.replace(/\s/g, "")}`;
      setVideoUrl(dataUri);
    }
  }, [base64, mimeType, nativeFile]);
  
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.load();
    }
  }, [videoUrl]);

  const captureThumbnail = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnailUrl(canvas.toDataURL("image/jpeg"));
      }
    } catch (e) {
      console.error("Thumbnail capture failed", e);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="px-4 pt-4 shrink-0">
        <div className="rounded-2xl overflow-hidden bg-black shadow-md relative" style={{ aspectRatio: "16/9", maxHeight: "420px" }}>
          {videoUrl ? (
            <>
              {thumbnailUrl && (
                <img 
                  src={thumbnailUrl} 
                  className="absolute inset-0 w-full h-full object-cover opacity-40 blur-md pointer-events-none" 
                  alt="Preview" 
                />
              )}
              <video 
                ref={videoRef}
                className="relative w-full h-full object-contain z-10" 
                src={videoUrl} 
                controls 
                autoPlay 
                onLoadedMetadata={captureThumbnail}
                onCanPlay={captureThumbnail}
              />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-900">
               <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#4B5563" strokeWidth={1.5}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
               </svg>
               <p className="text-sm text-gray-500">Loading chapters & transcript...</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white shrink-0 mt-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("chapters")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "chapters" ? "text-gray-800 bg-gray-50" : "text-gray-400 hover:text-gray-600"}`}
          >
            {activeTab === "chapters" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
            Chapters
          </button>
          <button
            onClick={() => setActiveTab("transcripts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "transcripts" ? "text-gray-800 bg-gray-50" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            Transcripts
          </button>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Auto Scroll
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900">Analysis Unavailable</p>
            <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">
              We couldn&apos;t generate chapters for this video. Use the Chat tool to ask questions about it instead!
            </p>
          </div>
        ) : processing ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <svg className="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-xs text-slate-500 font-medium tracking-tight">Loading chapters & transcript…</p>
          </div>
        ) : activeTab === "chapters" ? (
          chapters.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {chapters.map((item, i) => (
                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                  <p className="text-xs text-slate-500 font-mono mb-1">{item.time}</p>
                  <p className="text-sm font-bold text-gray-800 mb-1 group-hover:text-black transition-colors">{item.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center px-8">
              <p className="text-xs text-gray-400">Chapters will appear below once the video processing is complete.</p>
            </div>
          )
        ) : transcripts.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {transcripts.map((item, i) => (
              <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <p className="text-[10px] font-bold font-mono text-slate-500 mb-1 tracking-widest">{item.time}</p>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48">
            <p className="text-xs text-gray-400">No transcript metadata found for this video.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AudioHub({ 
  file,
  chapters,
  transcripts,
  processing,
  base64,
  mimeType,
  isRecording = false,
  nativeFile
}: { 
  file: string; 
  chapters: ChapterItem[]; 
  transcripts: TranscriptItem[];
  processing: boolean;
  base64?: string;
  mimeType?: string;
  isRecording?: boolean;
  nativeFile?: File | null;
}) {
  const [activeTab, setActiveTab] = useState<"chapters" | "transcripts">("chapters");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const bounceAnim = `
    @keyframes bar-bounce {
      0%, 100% { transform: scaleY(0.6); opacity: 0.5; }
      50% { transform: scaleY(1.2); opacity: 1; }
    }
  `;

  useEffect(() => {
    if (nativeFile) {
      const url = URL.createObjectURL(nativeFile);
      setAudioUrl(url);
      return () => { URL.revokeObjectURL(url); }
    } else if (base64 && mimeType) {
      const parsedMime = mimeType || "audio/mpeg";
      const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
      const dataUri = `data:${parsedMime};base64,${base64Data.replace(/\s/g, "")}`;
      setAudioUrl(dataUri);
    }
  }, [base64, mimeType, nativeFile]);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const skip = (amount: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + amount));
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <style>{bounceAnim}</style>
      <audio 
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onDurationChange={() => audioRef.current && setDuration(audioRef.current.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="px-5 py-4 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { if(audioRef.current) audioRef.current.currentTime = 0; }} className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button 
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all cursor-pointer shadow-sm border border-gray-100"
            >
              {isPlaying ? (
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="ml-0.5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button onClick={() => skip(10)} className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="rotate-180">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9" />
              </svg>
            </button>
          </div>

          <div className="flex-1 relative h-10 flex items-center group px-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}
              className="absolute inset-x-0 w-full h-full opacity-0 z-20 cursor-pointer"
            />
            <div className="w-full flex items-center gap-[1.5px] h-6 overflow-hidden pointer-events-none">
              {[...Array(60)].map((_, i) => {
                const isActive = (i / 60) * 100 <= progress;
                return (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-full transition-all duration-300 ${isActive ? "bg-blue-500/80" : "bg-gray-200"}`}
                    style={{ 
                      height: `${25 + ((i * 7) % 55)}%`,
                      animation: (isPlaying && isActive) ? `bar-bounce 1.2s infinite ${i * 45}ms` : 'none'
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 px-2 font-mono">
            <div className="bg-gray-100 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-400">1x</div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 min-w-[70px] justify-end">
              <span>{formatTime(currentTime)}</span>
              <span className="opacity-30">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("chapters")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "chapters" ? "text-gray-800 bg-gray-50" : "text-gray-400 hover:text-gray-600"}`}
          >
            {activeTab === "chapters" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
            Chapters
          </button>
          <button
            onClick={() => setActiveTab("transcripts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "transcripts" ? "text-gray-800 bg-gray-50" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            Transcripts
          </button>
        </div>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Auto Scroll
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {processing ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <svg className="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-xs text-slate-500 font-medium">Loading chapters & transcript…</p>
          </div>
        ) : activeTab === "chapters" ? (
          chapters.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {chapters.map((item, i) => (
                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <p className="text-xs text-slate-500 font-mono mb-1">{item.time}</p>
                  <p className="text-sm font-semibold text-gray-800 mb-1">{item.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-xs text-gray-400">Chapters will appear once the audio is processed</p>
            </div>
          )
        ) : transcripts.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {transcripts.map((item, i) => (
              <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <p className="text-[10px] font-bold font-mono text-slate-500 mb-1 tracking-widest">{item.time}</p>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48">
            <p className="text-xs text-gray-400">No transcript available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FileView({ file, base64, mimeType }: { file: string, base64?: string, mimeType?: string }) {
  const isPdf = file.toLowerCase().endsWith(".pdf") || mimeType?.includes("pdf");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (base64 && (isPdf || mimeType?.includes("pdf"))) {
      try {
        const cleaned = base64.trim().replace(/\s/g, "");
        const byteCharacters = atob(cleaned);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPdfUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (e: any) {
        console.error("PDF Hydration Failed:", e);
        setError("Unable to process PDF encoding.");
      }
    }
  }, [base64, mimeType, isPdf]);

  if (!isPdf) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-5xl h-full bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col items-center justify-center">
             <div className="p-4 rounded-2xl bg-blue-50 mb-4">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
             </div>
             <p className="text-gray-500 font-medium">Viewing non-PDF file: {file}</p>
          </div>
        </div>
      </div>
    );
  }

  const finalPdfUrl = pdfUrl || (base64 ? `data:application/pdf;base64,${base64}` : "");

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-auto flex justify-center bg-white min-h-0">
        {finalPdfUrl ? (
          <iframe 
            src={finalPdfUrl} 
            className="w-full h-full max-w-5xl bg-white shadow-sm border-none"
            style={{ display: 'block', minHeight: 'calc(100vh - 48px)' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-white">
            <div className="relative">
              <div className="absolute -inset-4 bg-blue-100 rounded-full blur-2xl opacity-40"></div>
              <div className="relative w-20 h-20 bg-white rounded-2xl shadow-lg border border-blue-50 flex items-center justify-center">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">{error || "Preparing Document..."}</h3>
              <p className="text-sm text-gray-500 max-w-xs mt-2">ReviseForge is optimizing your academic workstation.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function YoutubeView({
  url,
  chapters,
  transcripts,
  chaptersLoading,
  error,
}: {
  url: string;
  chapters: ChapterItem[];
  transcripts: TranscriptItem[];
  chaptersLoading: boolean;
  error?: string;
}) {
  const [activeTab, setActiveTab] = useState<"chapters" | "transcripts">("chapters");
  const videoId = extractVideoId(url) ?? "";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="px-4 pt-4 shrink-0">
        <div className="rounded-2xl overflow-hidden bg-black shadow-md relative" style={{ aspectRatio: "16/9", maxHeight: "420px" }}>
          {videoId ? (
            <>
              <img 
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} 
                className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm"
                alt="Thumbnail"
                onError={(e) => (e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)}
              />
              <iframe className="relative w-full h-full z-10" src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} allowFullScreen />
            </>
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "chapters" ? "text-gray-800 bg-gray-50" : "text-gray-400 hover:text-gray-600"}`}
          >
            {activeTab === "chapters" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
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
        ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-8 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Analysis Unavailable</p>
              <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">
                We couldn&apos;t generate chapters for this video. Use the Chat tool to ask questions about it instead!
              </p>
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
            recognition.onerror = () => { };
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
function ChatView({
  initialQuery,
  uploadedFile,
  sessionId,
  setIsHydrated,
}: {
  initialQuery: string;
  uploadedFile: string;
  sessionId: string;
  setIsHydrated: (v: boolean) => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; message: string }[]>(() => {
    const msgs: { role: "user" | "ai"; message: string }[] = [];
    if (uploadedFile) {
      msgs.push({ role: "user", message: `Uploaded: ${uploadedFile}` });
      msgs.push({
        role: "ai",
        message: `I've received your file ${uploadedFile}. What would you like to do with it? I can help summarise, explain, or quiz you on the content.`,
      });
    } else if (initialQuery) {
      msgs.push({ role: "user", message: initialQuery });
    }
    return msgs;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<ContextSelection | null>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ type: "up" | "down"; message: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const stopRecordingAndTranscribe = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setIsListening(false);
      setIsProcessingVoice(true);

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        try {
          const res = await fetch("/api/note-voice-transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64Audio, mimeType: "audio/webm" }),
          });
          const data = await res.json();
          if (data.transcript) {
            setInput((prev) => prev + (prev ? " " : "") + data.transcript);
          }
        } catch (err) {
          console.error("Transcription failed", err);
        } finally {
          setIsProcessingVoice(false);
        }
      };
    };
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        setIsListening(false);
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.stop();
    }
  };

  const toggleVoice = async () => {
    if (isListening) {
      await stopRecordingAndTranscribe();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsListening(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access to use dictation.");
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendToAI = async (question: string) => {
    setLoading(true);
    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, message: m.message }));
      const res = await fetch("/api/chat-general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", message: data.answer }]);
      
      if (sessionId) {
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Save messages to DB in background
            persistChatMessage(sessionId, user.id, "user", question, false).catch(console.error);
            persistChatMessage(sessionId, user.id, "ai", data.answer, false).catch(console.error);
            supabase.from("chat_sessions").update({ last_visited: new Date().toISOString() }).eq("id", sessionId).catch(console.error);
          }
        })();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", message: "Sorry, I'm having trouble connecting to AI. Please check your connection and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const historyFetchedRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (historyFetchedRef.current) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsHydrated(true);
        return;
      }

      if (sessionId) {
        const past = await loadChatMessages(sessionId, false);
        historyFetchedRef.current = true;
        if (past.length > 0) {
          setMessages(past);
          setIsHydrated(true);
          return;
        }
      }
      
      setIsHydrated(true); // Set true immediately if we've checked history
      
      // If we got here, no history was found. 
      // Only fire initial query if this is the first time and we have a query.
      if (initialQuery && messages.length <= 2) { 
        sendToAI(initialQuery); // Don't await here, let it run
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, initialQuery]);

  const sendMessage = async () => {
    let text = input.trim();
    if (!text || loading) return;
    
    if (selectedContext?.id === "mindmap") {
      text = `[Requested Mind Map format] ${text}`;
      setSelectedContext(null);
    }
    
    setMessages((prev) => [...prev, { role: "user", message: text }]);
    setInput("");
    await sendToAI(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", message: `Uploaded: ${file.name}` },
      { role: "ai", message: `I've received ${file.name}. What would you like to do with it?` },
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
          onSubmit={(note) => {
            setShowToast(true);
            // Optionally persist here if needed
          }}
        />
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-8">
        <div className="w-full max-w-4xl mx-auto px-16 space-y-8">
          {messages.map((msg, i) => (
            <div key={i} className="flex flex-col">
              {msg.role === "user" ? (
                /* User bubble — right aligned */
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-gray-100 rounded-2xl px-4 py-2.5">
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap flex flex-wrap gap-x-1.5 gap-y-1">
                      {msg.message.startsWith("[Requested Mind Map format] ") && (
                        <span className="inline-flex items-center gap-1 bg-blue-100/80 text-blue-700 px-2.5 rounded-full font-medium text-xs border border-blue-200/50 shadow-sm align-middle h-5 truncate" style={{ transform: 'translateY(1px)' }}>
                          @Mind Map
                        </span>
                      )}
                      {msg.message.startsWith("[Requested Interactive diagram visualization format] ") && (
                        <span className="inline-flex items-center gap-1 bg-green-100/80 text-green-700 px-2.5 rounded-full font-medium text-xs border border-green-200/50 shadow-sm align-middle h-5 truncate" style={{ transform: 'translateY(1px)' }}>
                          @Interactive
                        </span>
                      )}
                      <span>{msg.message.replace(/^\[Requested (?:Mind Map|Interactive diagram visualization) format\] /, "")}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* AI response — structured renderer */
                <div className="flex flex-col items-start w-full">
                  {/* ↓ THE ONLY CHANGED LINE — was <p>{msg.text}</p> */}
                  <AIMessage text={msg.message} />
                  <MessageActions
                    message={msg.message}
                    onThumbUp={() => setFeedbackModal({ type: "up", message: msg.message })}
                    onThumbDown={() => setFeedbackModal({ type: "down", message: msg.message })}
                    onMenuAction={(action) => {
                      if (action === "exams") {
                        router.push("/dashboard/exam-mode");
                      } else {
                        setMessages((prev) => [
                          ...prev,
                          {
                            role: "ai",
                            message: `To generate ${action === "quiz" ? "a quiz" : "flashcards"}, please start from the dashboard by pasting a YouTube link or recording a lecture. That gives me the source material to work from.`,
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

      {/* ── Input bar ── */}
      <div className="shrink-0 bg-white pb-5 px-16">
        <div className="w-full max-w-4xl mx-auto">
          <div className={`flex flex-col bg-gray-50 border rounded-[32px] px-5 py-2.5 transition-all duration-300 min-h-[70px] justify-center ${isListening ? "border-black shadow-md ring-2 ring-black/5" : "border-gray-200 focus-within:border-gray-400 focus-within:bg-white"}`}>
            {isProcessingVoice ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-gray-500 text-sm italic py-4">
                <svg className="w-5 h-5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Transcribing message…
              </div>
            ) : isListening ? (
              <div className="flex-1 flex flex-col justify-between gap-4 py-2">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex gap-1.5 items-center h-5">
                    {[0.1, 0.3, 0.2, 0.4, 0.25, 0.45, 0.2].map((d, i) => (
                      <div key={i} className="w-[3.5px] bg-black rounded-full animate-[voiceWave_1s_infinite_ease-in-out]" style={{ height: `${25 + Math.random() * 60}%`, animationDelay: `${d}s` }}></div>
                    ))}
                  </div>
                  <span className="text-[15px] font-medium text-gray-400 tracking-tight">Recording...</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={cancelRecording} className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Cancel">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button onClick={stopRecordingAndTranscribe} className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-lg" title="Transcribe">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 flex flex-col min-h-[40px]">
                  {selectedContext && <ContextChip selection={selectedContext} onRemove={() => setSelectedContext(null)} />}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (!loading) sendMessage();
                      }
                    }}
                    placeholder="Ask a follow-up..."
                    className="w-full bg-transparent text-[16px] text-gray-800 placeholder-gray-400 outline-none resize-none overflow-hidden py-1"
                    disabled={loading}
                    style={{ minHeight: '32px', maxHeight: '160px' }}
                  />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    {/* @ Add Source (Rounded Button) */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setContextMenuOpen(o => !o); }}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shrink-0 shadow-sm"
                      title="Add Source"
                    >
                      <span className="text-[14px] font-bold text-gray-400">@</span>
                      <span className="text-[12px] font-bold uppercase tracking-tight text-gray-400">Add Source</span>
                    </button>
                    <AddContextPopup open={contextMenuOpen} onClose={() => setContextMenuOpen(false)} onSelect={(item) => setSelectedContext(item)} />

                    <div className="flex items-center gap-1.5 ml-1">
                      {/* Upload (Clip) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setUploadMenuOpen(o => !o)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shrink-0 shadow-sm"
                          title="Upload Document"
                        >
                          <svg className="w-[13px] h-[13px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="text-[11px] font-medium tracking-wide">Upload</span>
                        </button>
                        <UploadPopup
                          open={uploadMenuOpen}
                          onClose={() => setUploadMenuOpen(false)}
                          onAddFile={() => fileInputRef.current?.click()}
                        />
                      </div>

                      {/* Dictate (Mic) */}
                      <button
                        type="button"
                        onClick={toggleVoice}
                        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1"
                        title="Dictate"
                      >
                        <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Send Button */}
                  <div className="flex items-center">
                    {loading ? (
                      <svg className="w-5 h-5 animate-spin text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : input.trim() ? (
                      <button
                        onClick={sendMessage}
                        className="w-10 h-10 cursor-pointer rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-all active:scale-90 shadow-lg"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m-7 7l7-7 7 7" />
                        </svg>
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center opacity-90 shadow-sm" title="Voice mode active">
                        <div className="flex gap-[2px] items-center">
                          <div className="w-[2.5px] h-3.5 bg-white rounded-full animate-[pulse_1s_infinite_0s]"></div>
                          <div className="w-[2.5px] h-5 bg-white rounded-full animate-[pulse_1s_infinite_0.2s]"></div>
                          <div className="w-[2.5px] h-2.5 bg-white rounded-full animate-[pulse_1s_infinite_0.4s]"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-2.5">
            ReviseForge AI can make mistakes. Please double-check responses.
          </p>
        </div>
      </div>
    </div>
  );
}

async function updateRecentSession(params: {
  userId: string;
  sessionId: string;
  type: 'youtube' | 'recording' | 'quiz' | 'flashcard' | 'exam' | 'chat' | 'file';
  title: string;
  subtitle?: string;
  href: string;
  videoId?: string;
}) {
  const { userId, sessionId, type, title, subtitle, href, videoId } = params;
  
  // Basic UUID validation to prevent Postgres type errors
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
  if (!isUUID) {
    console.warn(`[History] Skipping sync for non-database session: ${sessionId}`);
    return;
  }

  console.log("Updating recent session:", params);
  try {
    const { error } = await supabase.from("recent_sessions").upsert({
      user_id: userId,
      session_id: sessionId,
      type,
      title,
      subtitle,
      href,
      video_id: videoId || null,
      last_visited: new Date().toISOString(),
    }, {
      onConflict: 'user_id,session_id'
    });
    if (error) throw error;
    console.log("Recent session updated successfully");
  } catch (err) {
    console.error("Failed to update recent session:", (err as any).message || err);
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Contentpage() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = (params.get("mode") as Mode) ?? "youtube";
  const url = params.get("url") ?? "";
  const sessionId = params.get("session_id") ?? "";
  const initialQuery = params.get("q") ?? "";
  const uploadedFile = params.get("file") ?? "";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<ContextSelection | null>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const isRecording = mode === "microphone" || mode === "browsertab";
  const isChat = mode === "chat";

  const userIdRef = useRef<string>("");
  const recordingAudioRef = useRef<{ base64: string; mimeType: string } | null>(null);
  const [recordingSessionId, setRecordingSessionId] = useState<string>("");
  const isRec = isRecording && !!recordingSessionId;

  const title = isRecording
    ? `Recording at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : isChat
      ? initialQuery && initialQuery.length < 50 ? initialQuery : (uploadedFile || "Chat")
      : url
        ? url.replace("https://", "").replace("www.", "").slice(0, 70)
        : uploadedFile
          ? uploadedFile
          : "Content";

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
  const [isListening, setIsListening] = useState(false);

  // File Hydration State
  const [fileBase64, setFileBase64] = useState<string>("");
  const [fileMimeType, setFileMimeType] = useState<string>("");
  const [fileThumbnail, setFileThumbnail] = useState<string>("");
  const [generationError, setGenerationError] = useState<string>("");
  const [nativeFile, setNativeFile] = useState<File | null>(null);
  const [fileUri, setFileUri] = useState<string>("");

  const [isHydrated, setIsHydrated] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [pendingTool, setPendingTool] = useState<ActiveTool>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__capturedFile) {
      setNativeFile((window as any).__capturedFile);
    }
    if (mode === "file") {
      (async () => {
        const stored = await getMediaFromDB();
        if (stored) {
          setFileBase64(stored.base64 || "");
          setFileMimeType(stored.mimeType || "");
          setFileThumbnail(stored.thumbnail || "");
          setFileUri(stored.geminiUri || "");
        }
      })();
    }
  }, [mode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (typeof window !== "undefined") {
      (window as any).__capturedFile = file;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(",")[1];
      const mimeType = file.type;
      
      setFileBase64(base64);
      setFileMimeType(mimeType);
      setChapters([]);
      setTranscripts([]);
      setGenerationError("");

      // Generate a quick thumbnail & Extract Audio for Analysis
      let thumbnail = "";
      let audioBase64ForAI = "";

      if (mimeType.startsWith("video/")) {
        try {
          const video = document.createElement("video");
          video.src = URL.createObjectURL(file);
          video.load();
          video.currentTime = 1;
          await new Promise<void>((resolve) => {
            video.onseeked = () => {
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                thumbnail = canvas.toDataURL("image/jpeg");
              }
              resolve();
            };
          });
          URL.revokeObjectURL(video.src);
        } catch (e) {
          console.warn("Thumbnail extraction failed", e);
        }
      }
      
      setFileThumbnail(thumbnail);
      await saveMediaToDB({ base64, mimeType, fileName: file.name, thumbnail });
      
      router.push(`/content/${sessionId || 'file-session'}?mode=file&file=${encodeURIComponent(file.name)}&session_id=${sessionId || 'file-session'}`);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Pedagogical Generation for Files
  useEffect(() => {
    const shouldTrigger = isHydrated && mode === "file" && fileBase64 && fileMimeType && chapters.length === 0 && !chaptersLoading && !generationError;
    if (!shouldTrigger) return;

    (async () => {
      setChaptersLoading(true);
      setGenerationError("");
      try {
        // Step 1: Convert base64 back to binary blob and upload to Gemini File API
        const base64Data = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
        const cleaned = base64Data.replace(/\s/g, "");
        const byteChars = atob(cleaned);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArr[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArr], { type: fileMimeType });

        const fileName = uploadedFile || "video.mp4";
        const form = new FormData();
        form.append("file", blob, fileName);

        const uploadRes = await fetch("/api/upload-to-gemini", {
          method: "POST",
          body: form,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          setGenerationError(err.error || "Video upload to AI failed.");
          return;
        }

        const { fileUri: freshUri, mimeType: uploadedMime } = await uploadRes.json();
        setFileUri(freshUri);
        await saveMediaToDB({ 
          base64: fileBase64, 
          mimeType: fileMimeType, 
          fileName: uploadedFile || "file", 
          thumbnail: fileThumbnail, 
          geminiUri: freshUri 
        });

        // Step 2: Generate chapters using the Gemini file URI
        const chapRes = await fetch("/api/generate-chapters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: freshUri, mimeType: uploadedMime || fileMimeType }),
        });

        if (chapRes.ok) {
          const data = await chapRes.json();
          if (data.chapters && data.chapters.length > 0) {
            setChapters(data.chapters);
          } else {
            setGenerationError("AI returned no chapters. The video may have no speech.");
          }
          if (data.transcripts) setTranscripts(data.transcripts);

          const { data: { user } } = await supabase.auth.getUser();
          if (user && sessionId) {
            await persistChaptersAndTranscripts(sessionId, user.id, data.chapters || [], data.transcripts || []);
          }
        } else {
          const err = await chapRes.json();
          setGenerationError(err.error || "Chapter generation failed.");
        }
      } catch (e) {
        console.error("Pedagogical Generation Failed", e);
        setGenerationError("Analysis failed. Please try again or use Chat for questions.");
      } finally {
        setChaptersLoading(false);
      }
    })();
  }, [mode, fileBase64, fileMimeType, uploadedFile, chapters.length, chaptersLoading, sessionId, generationError]);


  const startListening = () => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput((prev) => prev + (prev ? " " : "") + transcript);
      };
      recognition.start();
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;

        const isFileMode = mode === "file";
        const recSidParam = new URLSearchParams(window.location.search).get("recording_session_id");

        if (isFileMode && sessionId) {
          await supabase.from("file_sessions").upsert({
            id: sessionId,
            user_id: user.id,
            file_name: uploadedFile || "Uploaded File",
            mime_type: fileMimeType || "video/mp4",
            last_visited: new Date().toISOString()
          });
          
          updateRecentSession({
            userId: user.id,
            sessionId: sessionId,
            type: 'file',
            title: uploadedFile || "Uploaded File",
            subtitle: 'file upload',
            href: `/content/${sessionId}?mode=file&file=${encodeURIComponent(uploadedFile || '')}&session_id=${sessionId}`,
          });
          
          const [chatHistory, cachedChapters, cachedStudyData] = await Promise.all([
            loadChatMessages(sessionId, false),
            loadCachedChaptersAndTranscripts(sessionId, false),
            loadCachedData(sessionId, false),
          ]);
          
          console.log("[Hydration] Loaded from cache:", { 
            chat: chatHistory.length, 
            chapters: cachedChapters.chapters.length, 
            summary: !!cachedStudyData.summary 
          });

          if (chatHistory.length) setChatMessages(chatHistory);
          if (cachedChapters.chapters.length) setChapters(cachedChapters.chapters);
          if (cachedChapters.transcripts.length) setTranscripts(cachedChapters.transcripts);
          if (cachedStudyData.summary) setSummary(cachedStudyData.summary);
          if (cachedStudyData.quizQuestions.length) setQuizQuestions(cachedStudyData.quizQuestions);
          if (cachedStudyData.flashcards.length) setFlashcards(cachedStudyData.flashcards);

          
        } else if (sessionId && !recSidParam) {
          await supabase.from("youtube_sessions").update({ last_visited: new Date().toISOString() }).eq("id", sessionId);
          
          // Also update unified recent_sessions table
          updateRecentSession({
            userId: user.id,
            sessionId: sessionId,
            type: 'youtube',
            title: videoTitle || url.replace("https://", "").replace("www.", "").slice(0, 70),
            subtitle: 'youtube',
            href: `/content/${sessionId}?url=${encodeURIComponent(url)}&session_id=${sessionId}`,
            videoId: extractVideoId(url) ?? undefined,
          });
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
        } else if (recSidParam) {
          await supabase.from("recording_sessions").update({ last_visited: new Date().toISOString() }).eq("id", recSidParam);
          setRecordingSessionId(recSidParam);
          
          updateRecentSession({
            userId: user.id,
            sessionId: recSidParam,
            type: 'recording',
            title: videoTitle || `Recording — ${mode === "browsertab" ? "Browser Tab" : "Microphone"}`,
            subtitle: mode,
            href: `/content/${recSidParam}?mode=${mode}&recording_session_id=${recSidParam}`,
          });
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
        } else if (mode === "chat" && sessionId) {
          updateRecentSession({
            userId: user.id,
            sessionId: sessionId,
            type: 'chat',
            title: initialQuery || "Chat Session",
            subtitle: 'AI Assistant',
            href: `/content/${sessionId}?mode=chat&session_id=${sessionId}`,
          });
          const chatHistory = await loadChatMessages(sessionId, false);
          if (chatHistory.length) setChatMessages(chatHistory);
        }
        setIsHydrated(true);
      } else {
        setIsHydrated(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, mode]);

  useEffect(() => {
    if (!recordingSessionId || !userIdRef.current) return;
    if (chapters.length > 0 || transcripts.length > 0) {
      persistChaptersAndTranscripts(recordingSessionId, userIdRef.current, chapters, transcripts, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingSessionId]);

  useEffect(() => {
    if (!sessionId || !videoTitle || !userIdRef.current) return;
    supabase.from("youtube_sessions").update({ video_title: videoTitle }).eq("id", sessionId).then(() => { });
  }, [videoTitle, sessionId]);

  useEffect(() => {
    // PREVENT AUTO-GENERATION IF HYDRATION IS STILL PENDING OR IF CHAPTERS ALREADY EXIST
    if (!isHydrated || !url || isRecording || isChat || (chapters && chapters.length > 0) || chaptersLoading) return;
    
    // Check if we already have chapters in DB just to be absolutely sure
    (async () => {
      if (sessionId) {
        const cached = await loadCachedChaptersAndTranscripts(sessionId, false);
        if (cached.chapters.length > 0) {
          setChapters(cached.chapters);
          setTranscripts(cached.transcripts);
          return;
        }
      }

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
        const aiTitle = data.title || "";
        if (aiTitle) setVideoTitle(aiTitle);

        if (sessionId && userIdRef.current) {
          await persistChaptersAndTranscripts(sessionId, userIdRef.current, fetchedChapters, fetchedTranscripts, false);
          
          // Sync AI-generated title back to DB if it's currently generic
          if (aiTitle) {
            await supabase.from("youtube_sessions").update({ video_title: aiTitle }).eq("id", sessionId);
            updateRecentSession({
              userId: userIdRef.current,
              sessionId: sessionId,
              type: 'youtube',
              title: aiTitle,
              subtitle: 'youtube',
              href: `/content/${sessionId}?url=${encodeURIComponent(url)}&session_id=${sessionId}`,
              videoId: extractVideoId(url) ?? undefined,
            });
          }
        }
      } catch {
      } finally {
        setChaptersLoading(false);
      }
    })();
  }, [url]);

  const handleToolClick = useCallback(
    async (tool: ActiveTool, ignoreConfirm = false) => {
      // ── Confirmation Logic ───────────────────────────────────────────────────
      if (!ignoreConfirm && tool && ["summary", "quiz", "flashcards"].includes(tool)) {
        let exists = false;
        if (tool === "summary" && summary) exists = true;
        if (tool === "quiz" && quizQuestions.length > 0) exists = true;
        if (tool === "flashcards" && flashcards.length > 0) exists = true;

        if (exists) {
          setPendingTool(tool);
          setShowConfirmModal(true);
          return;
        }
      }

      if (tool === "exams" || (ignoreConfirm && (tool === "quiz" || tool === "flashcards"))) {
        const userId = userIdRef.current;
        if (isRecording) {
          if (!recordingAudioRef.current?.base64 && !transcripts.length) return;
          try {
            sessionStorage.setItem("rec_study_audio", recordingAudioRef.current?.base64 ?? "");
            sessionStorage.setItem("rec_study_mimeType", recordingAudioRef.current?.mimeType ?? "");
            sessionStorage.setItem("rec_study_transcript", transcripts.map((t) => `[${t.time}] ${t.text}`).join("\n"));
          } catch { /* sessionStorage might be full */ }
          
          if (tool === "exams") router.push("/dashboard/exam-mode?source=recording");
          else if (tool === "quiz") router.push("/quiz/new?source=recording");
          else if (tool === "flashcards") router.push("/flashcards/new?source=recording");
        } else if (mode === "file" && fileBase64 && fileMimeType) {
          // Store file data in sessionStorage for file-based generation
          try {
            sessionStorage.setItem("file_study_base64", fileBase64);
            sessionStorage.setItem("file_study_mimeType", fileMimeType);
            sessionStorage.setItem("file_study_name", uploadedFile || "document");
          } catch { /* sessionStorage might be full */ }
          
          if (tool === "exams") router.push("/dashboard/exam-mode?source=file");
          else if (tool === "quiz") router.push("/quiz/new?source=file");
          else if (tool === "flashcards") router.push("/flashcards/new?source=file");
        } else {
          const baseUrl = tool === "exams" ? "/dashboard/exam-mode" : tool === "quiz" ? "/quiz/new" : "/flashcards/new";
          const destination = url
            ? `${baseUrl}?url=${encodeURIComponent(url)}&source=youtube`
            : baseUrl;
          router.push(destination);
        }
        return;
      }

      if (tool === "visualizations" || tool === "podcast") {
        setActiveTool(tool);
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
            // Check cache first
            if (recordingSessionId) {
              const cached = await supabase.from("content_summaries").select("summary").eq("recording_session_id", recordingSessionId).maybeSingle();
              if (cached.data?.summary) {
                setSummary(cached.data.summary);
                setSummaryLoading(false);
                return;
              }
            }

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
            if (recordingSessionId) {
              const cached = await loadCachedData(recordingSessionId, true);
              if (cached.quizQuestions.length > 0) {
                setQuizQuestions(cached.quizQuestions);
                setQuizLoading(false);
                return;
              }
            }
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
            if (recordingSessionId) {
              const cached = await loadCachedData(recordingSessionId, true);
              if (cached.flashcards.length > 0) {
                setFlashcards(cached.flashcards);
                setFlashcardsLoading(false);
                return;
              }
            }
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

      // Handle file mode
      if (mode === "file") {
        if (!fileBase64 || !fileMimeType) {
          if (tool === "summary") setSummaryError("No file available for summary generation.");
          if (tool === "quiz") setQuizError("No file available for quiz generation.");
          if (tool === "flashcards") setFlashcardsError("No file available for flashcard generation.");
          return;
        }

        // Convert base64 back to binary blob for FormData
        const base64Data = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
        const cleaned = base64Data.replace(/\s/g, "");
        const byteChars = atob(cleaned);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteArr[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArr], { type: fileMimeType });
        const fileName = uploadedFile || "document.pdf";

        if (tool === "summary" && !summary && !summaryLoading) {
          setSummaryLoading(true);
          setSummaryError("");
          try {
            // Check cache first
            if (sessionId) {
              const cached = await supabase.from("content_summaries").select("summary").eq("session_id", sessionId).maybeSingle();
              if (cached.data?.summary) {
                setSummary(cached.data.summary);
                setSummaryLoading(false);
                return;
              }
            }

            // For summary, we need to upload to Gemini first and then generate
            const form = new FormData();
            form.append("file", blob, fileName);
            
            const uploadRes = await fetch("/api/upload-to-gemini", {
              method: "POST",
              body: form,
            });

            if (!uploadRes.ok) {
              const err = await uploadRes.json();
              throw new Error(err.error || "File upload to AI failed.");
            }

            const { fileUri, mimeType: uploadedMime } = await uploadRes.json();

            // Now generate summary using the file URI
            const summaryRes = await fetch("/api/generate-summary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: fileUri }),
            });

            if (!summaryRes.ok) {
              const e = await summaryRes.json();
              throw new Error(e.error || "Failed to generate summary");
            }

            const data = await summaryRes.json();
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
            if (sessionId) {
              const cached = await loadCachedData(sessionId, false);
              if (cached.quizQuestions.length > 0) {
                setQuizQuestions(cached.quizQuestions);
                setQuizLoading(false);
                return;
              }
            }
            const form = new FormData();
            form.append("file", blob, fileName);
            
            const res = await fetch("/api/generate-quiz", {
              method: "POST",
              body: form,
            });

            if (!res.ok) {
              const e = await res.json();
              throw new Error(e.error || "Failed to generate quiz");
            }

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
            if (sessionId) {
              const cached = await loadCachedData(sessionId, false);
              if (cached.flashcards.length > 0) {
                setFlashcards(cached.flashcards);
                setFlashcardsLoading(false);
                return;
              }
            }
            const form = new FormData();
            form.append("file", blob, fileName);
            
            const res = await fetch("/api/generate-flashcards", {
              method: "POST",
              body: form,
            });

            if (!res.ok) {
              const e = await res.json();
              throw new Error(e.error || "Failed to generate flashcards");
            }

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

        return;
      }

      // Handle YouTube mode (existing logic)
      if (!url) return;

      if (tool === "summary" && !summary && !summaryLoading) {
        setSummaryLoading(true);
        setSummaryError("");
        try {
          // Double check database first
          const activeSid = isRec ? recordingSessionId : sessionId;
          if (activeSid) {
            const cached = await supabase.from("content_summaries").select("summary").eq(isRec ? "recording_session_id" : "session_id", activeSid).maybeSingle();
            if (cached.data?.summary) {
              setSummary(cached.data.summary);
              setSummaryLoading(false);
              return;
            }
          }

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
          if (sessionId) {
            const cached = await loadCachedData(sessionId, false);
            if (cached.quizQuestions.length > 0) {
              setQuizQuestions(cached.quizQuestions);
              setQuizLoading(false);
              return;
            }
          }
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
          if (sessionId) {
            const cached = await loadCachedData(sessionId, false);
            if (cached.flashcards.length > 0) {
              setFlashcards(cached.flashcards);
              setFlashcardsLoading(false);
              return;
            }
          }
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
    [url, mode, fileBase64, fileMimeType, uploadedFile, isRecording, transcripts, recordingSessionId, summary, summaryLoading, quizQuestions.length, quizLoading, flashcards.length, flashcardsLoading, sessionId, router],
  );

  const confirmRegeneration = () => {
    if (pendingTool) {
      handleToolClick(pendingTool, true);
    }
    setShowConfirmModal(false);
    setPendingTool(null);
  };

  const handleChatSend = useCallback(async () => {
    let q = chatInput.trim();
    if (!q || chatLoading) return;
    
    if (selectedContext?.id === "mindmap") {
      q = `[Requested Mind Map format] ${q}`;
      setSelectedContext(null); // consume the context
    }
    
    const userId = userIdRef.current;
    const activeSid = isRec ? recordingSessionId : sessionId;

    setChatMessages((prev) => [...prev, { role: "user", message: q }]);
    setChatInput("");
    setChatLoading(true);

    // PERSIST USER MESSAGE IMMEDIATELY
    if (activeSid && userId) {
      persistChatMessage(activeSid, userId, "user", q, isRec).catch(console.error);
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
        const chatUrl = (mode === "file" && fileUri) ? fileUri : url;
        if (!chatUrl) throw new Error(mode === "file" ? "File analysis is still processing. Please wait." : "No source URL available.");
        const res = await fetch("/api/chat-youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: chatUrl, question: q, history: chatMessages.slice(-6) }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
        const data = await res.json();
        answer = data.answer;
      }

      setChatMessages((prev) => [...prev, { role: "ai", message: answer }]);

      if (activeSid && userId) {
        // PERSIST AI RESPONSE
        await persistChatMessage(activeSid, userId, "ai", answer, isRec);
        
        // Update recent session entry
        updateRecentSession({
          userId,
          sessionId: activeSid,
          type: isRec ? 'recording' : (mode === 'file' ? 'file' : 'youtube'),
          title: videoTitle || title,
          subtitle: isRec ? 'recording' : (mode === 'file' ? 'file' : 'youtube'),
          href: window.location.pathname + window.location.search,
          videoId: (isRec || mode === 'file') ? undefined : extractVideoId(url) ?? undefined,
        }).catch(console.error);
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
  }, [chatInput, url, isRecording, isRec, recordingSessionId, chatMessages, chatLoading, sessionId, transcripts, mode, fileUri, videoTitle]);


  const handleTitleEdit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditingTitle(false);
      const activeSid = isRec ? recordingSessionId : sessionId;
      const userId = userIdRef.current;
      if (!activeSid || !userId || !videoTitle) return;

      const tableMap: Record<string, string> = {
        youtube: "youtube_sessions",
        recording: "recording_sessions",
        file: "file_sessions",
        chat: "chat_sessions",
      };
      const fieldMap: Record<string, string> = {
        youtube: "video_title",
        recording: "title",
        file: "file_name",
        chat: "title",
      };
      
      const sessionType = isRec ? 'recording' : mode;
      const table = tableMap[sessionType] || "youtube_sessions";
      const field = fieldMap[sessionType] || "video_title";

      try {
        await supabase.from(table).update({ [field]: videoTitle }).eq("id", activeSid);
        await supabase.from("recent_sessions").update({ title: videoTitle }).eq("session_id", activeSid);
      } catch (err) {
        console.error("Failed to update title:", err);
      }
    }
  };

  if (isChat) {
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden ml-[90px] min-w-0">
          <ChatView initialQuery={initialQuery} uploadedFile={uploadedFile} sessionId={sessionId} setIsHydrated={setIsHydrated} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <header className="h-12 flex items-center justify-between px-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0 pl-1 group">
          {isEditingTitle ? (
            <input
              autoFocus
              className="text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 w-full max-w-xs"
              value={videoTitle || title}
              onChange={(e) => setVideoTitle(e.target.value)}
              onKeyDown={handleTitleEdit}
              onBlur={() => setIsEditingTitle(false)}
            />
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
              <span className="text-sm font-medium text-gray-700 truncate">{videoTitle || title}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                title="Edit title"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
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
          {!isRecording && !isChat && mode !== "file" && (
            <YoutubeView url={url} chapters={chapters} transcripts={transcripts} chaptersLoading={chaptersLoading} error={generationError} />
          )}

          {mode === "file" && (
            (() => {
              const fileName = uploadedFile || "Document";
              const isVideo = fileName.match(/\.(mp4|webm|ogg|mov)$/i) || fileMimeType.includes("video");
              const isAudio = fileName.match(/\.(mp3|wav|ogg|m4a)$/i) || fileMimeType.includes("audio");

              if (isVideo) {
                 return <VideoHub 
                   file={fileName} 
                   chapters={chapters} 
                   transcripts={transcripts} 
                   processing={chaptersLoading} 
                   base64={fileBase64} 
                   mimeType={fileMimeType} 
                   thumbnail={fileThumbnail}
                   error={generationError}
                   nativeFile={nativeFile}
                 />;
              }
              if (isAudio) {
                 return <AudioHub 
                   file={fileName} 
                   chapters={chapters} 
                   transcripts={transcripts} 
                   processing={chaptersLoading} 
                   base64={fileBase64} 
                   mimeType={fileMimeType} 
                   nativeFile={nativeFile}
                 />;
              }
              return <FileView file={fileName} base64={fileBase64} mimeType={fileMimeType} />;
            })()
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
            onFileUpload={handleFileUpload}
            onFeedback={async (message, type, note) => {
              const userId = userIdRef.current;
              const sid = isRec ? recordingSessionId : sessionId;
              if (userId && sid) await persistFeedback(userId, message, type, note, sid, isRec);
            }}
            onMenuAction={(action) => {
              handleToolClick(action as any, true);
            }}
            contextMenuOpen={contextMenuOpen}
            setContextMenuOpen={setContextMenuOpen}
            selectedContext={selectedContext}
            setSelectedContext={setSelectedContext}
            uploadMenuOpen={uploadMenuOpen}
            setUploadMenuOpen={setUploadMenuOpen}
            videoTitle={videoTitle}
          />
        )}
      </div>
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-6 pb-2">
              <h3 className="text-xl font-bold text-gray-900 leading-tight">
                Regenerate {pendingTool === 'summary' ? 'Summary' : pendingTool === 'quiz' ? 'Quiz' : 'Flashcards'}
              </h3>
              <button 
                onClick={() => { setShowConfirmModal(false); setPendingTool(null); }}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-8">
              <p className="text-gray-600 text-[15px] leading-relaxed">
                {pendingTool === 'summary' && "A summary already exists for this session. Generating a new one will replace your current version—would you like to proceed?"}
                {pendingTool === 'quiz' && "A quiz has already been created. Would you like to generate a fresh set of questions based on your latest study materials?"}
                {pendingTool === 'flashcards' && "A flashcard deck already exists. Generating a new one will create a fresh set of cards for you. Do you want to proceed?"}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-8 pb-8 pt-2">
              <button
                onClick={() => { setShowConfirmModal(false); setPendingTool(null); }}
                className="px-6 py-3 text-sm font-bold text-gray-600 bg-gray-50 border border-transparent rounded-2xl hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmRegeneration}
                className="px-8 py-3 text-sm font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-200"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
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
  console.log("Persisting Chapters & Transcripts for session:", sessionId, "isRec:", isRec);
  const col = sessionCol(sessionId, isRec);
  try {
    await Promise.all([
      sessionFilter(supabase.from("content_chapters").delete(), sessionId, isRec),
      sessionFilter(supabase.from("content_transcripts").delete(), sessionId, isRec),
    ]);
    const chapterRows = chapters.map((c, i) => ({ ...col, user_id: userId, chapter_order: i + 1, time: c.time, title: c.title, text: c.text }));
    const transcriptRows = transcripts.map((t, i) => ({ ...col, user_id: userId, transcript_order: i + 1, time: t.time, text: t.text }));
    const results = await Promise.all([
      chapterRows.length ? supabase.from("content_chapters").insert(chapterRows) : Promise.resolve({ error: null }),
      transcriptRows.length ? supabase.from("content_transcripts").insert(transcriptRows) : Promise.resolve({ error: null }),
    ]);
    if (results[0].error) console.error("Error inserting chapters:", JSON.stringify(results[0].error, null, 2));
    if (results[1].error) console.error("Error inserting transcripts:", JSON.stringify(results[1].error, null, 2));
    console.log("Persistence complete.");
  } catch (e) {
    console.error("Critical error in persistChaptersAndTranscripts:", e);
  }
}

async function loadCachedChaptersAndTranscripts(sessionId: string, isRec = false) {
  const col = isRec ? "recording_session_id" : "session_id";
  console.log("Loading cached chapters & transcripts for:", sessionId, "col:", col);
  const [chaptersRes, transcriptsRes] = await Promise.all([
    supabase.from("content_chapters").select("time, title, text").eq(col, sessionId).order("chapter_order", { ascending: true }),
    supabase.from("content_transcripts").select("time, text").eq(col, sessionId).order("transcript_order", { ascending: true }),
  ]);
  if (chaptersRes.error) console.error("Load Chapters Error:", chaptersRes.error);
  if (transcriptsRes.error) console.error("Load Transcripts Error:", transcriptsRes.error);

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

function VisualizationsContent() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Interactive Visualizations</h3>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
        Unlock elite pedagogical insights with dynamic 3D chemical structures, molecular reactions, and complex algorithmic concept maps—all generated in seconds from your content.
      </p>
      <div className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg animate-pulse">
        Coming Soon
      </div>
    </div>
  );
}
