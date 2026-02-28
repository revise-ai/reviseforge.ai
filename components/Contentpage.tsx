// File path: app/content/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

type Mode = "youtube" | "microphone" | "browsertab";
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

interface ChapterItem { time: string; title: string; text: string; }
interface TranscriptItem { time: string; text: string; }

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
          return <h3 key={i} className="text-sm font-semibold text-gray-900 mt-5 mb-1 first:mt-0">{line.replace("## ", "")}</h3>;
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

function SummaryContent({ summary, loading, error }: { summary: string; loading: boolean; error: string }) {
  if (loading) return <Spinner label="Analysing video and generating summary…" />;
  if (error) return <div className="px-5 py-6 text-center"><p className="text-xs text-red-400">{error}</p></div>;
  if (!summary) return null;
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <RenderMd text={summary} />
    </div>
  );
}

function QuizContent({ questions, loading, error }: { questions: QuizQuestion[]; loading: boolean; error: string }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);

  if (loading) return <Spinner label="Generating quiz from video…" />;
  if (error) return <div className="px-5 py-6 text-center"><p className="text-xs text-red-400">{error}</p></div>;
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
              <circle cx="40" cy="40" r="34" stroke={ringColor} strokeWidth="8" fill="none"
                strokeDasharray={`${circ}`}
                strokeDashoffset={`${circ * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease" }}
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
                  {correct
                    ? <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-2.5 h-2.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  }
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
                }`}>{key}</span>
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
              onClick={() => {
                if (current < questions.length - 1) setCurrent((c) => c + 1);
                else setDone(true);
              }}
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

function FlashcardsContent({ cards, loading, error }: { cards: Flashcard[]; loading: boolean; error: string }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  if (loading) return <Spinner label="Generating flashcards from video…" />;
  if (error) return <div className="px-5 py-6 text-center"><p className="text-xs text-red-400">{error}</p></div>;
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
        <button onClick={() => go(-1)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Prev
        </button>
        <div className="flex gap-1">
          {cards.map((_, i) => (
            <div key={i} onClick={() => { setIdx(i); setFlipped(false); setShowHint(false); }}
              className={`h-1.5 rounded-full cursor-pointer transition-all ${i === idx ? "w-3 bg-orange-400" : "w-1.5 bg-gray-200"}`} />
          ))}
        </div>
        <button onClick={() => go(1)} className="flex items-center gap-1.5 px-3 py-2 bg-orange-400 hover:bg-orange-500 rounded-xl text-xs text-white font-semibold transition cursor-pointer">
          Next
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

function RightSidebar({
  open, onToggle, mode, isChat, activeTool, onToolClick, onBack,
  summary, summaryLoading, summaryError,
  quizQuestions, quizLoading, quizError,
  flashcards, flashcardsLoading, flashcardsError,
  chatInput, setChatInput, onChatSend, chatLoading,
}: {
  open: boolean; onToggle: () => void; mode: Mode; isChat: boolean;
  activeTool: ActiveTool; onToolClick: (tool: ActiveTool) => void; onBack: () => void;
  summary: string; summaryLoading: boolean; summaryError: string;
  quizQuestions: QuizQuestion[]; quizLoading: boolean; quizError: string;
  flashcards: Flashcard[]; flashcardsLoading: boolean; flashcardsError: string;
  chatInput: string; setChatInput: (v: string) => void; onChatSend: () => void; chatLoading: boolean;
}) {
  const isRecording = mode === "microphone" || mode === "browsertab";
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoice = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e: any) => { setChatInput(e.results[0][0].transcript); setIsListening(false); };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start(); recognitionRef.current = rec; setIsListening(true);
  };

  const toolTitle =
    activeTool === "summary" ? "Summary" :
    activeTool === "quiz" ? "Quiz" :
    activeTool === "flashcards" ? "Flashcards" : "";

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
            {/* Header */}
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
              {activeTool && (
                <button
                  onClick={onBack}
                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 transition cursor-pointer shrink-0 mr-1"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-sm font-medium text-gray-700">
                {activeTool ? toolTitle : "StudyForge"}
              </span>
            </div>

            {!activeTool && (
              <div className="px-5 pt-4 pb-3 shrink-0">
                <p className="text-xs text-gray-400 font-medium tracking-wide">Generate</p>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {!activeTool && (
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
                        {panels.map((p) => (
                          <div key={p.label} className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl border border-gray-100 bg-white opacity-40">
                            <span className="shrink-0">{p.icon}</span>
                            <span className="text-sm text-gray-500 font-medium leading-tight">{p.label}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 px-1 pt-1">Finish a recording to generate study tools</p>
                    </div>
                  )}
                </div>
              )}

              {activeTool === "summary" && <SummaryContent summary={summary} loading={summaryLoading} error={summaryError} />}
              {activeTool === "quiz" && <QuizContent questions={quizQuestions} loading={quizLoading} error={quizError} />}
              {activeTool === "flashcards" && <FlashcardsContent cards={flashcards} loading={flashcardsLoading} error={flashcardsError} />}
              {/* NOTE: "exams" is NOT handled here — it redirects to /dashboard/exam-mode instead */}
            </div>

            {/* Bottom chat input */}
            {!isChat && (
              <div className="px-4 py-4 border-t border-gray-100 shrink-0">
                <div className={`flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border transition-colors ${chatLoading ? "border-blue-200" : "border-gray-200 focus-within:border-gray-300"}`}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onChatSend()}
                    placeholder="Ask anything about this video…"
                    className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                    disabled={chatLoading}
                  />
                  {chatLoading ? (
                    <svg className="w-4 h-4 animate-spin text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24">
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

function YoutubeView({ url, chapters, transcripts, chaptersLoading }: {
  url: string; chapters: ChapterItem[]; transcripts: TranscriptItem[]; chaptersLoading: boolean;
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
          <button onClick={() => setActiveTab("chapters")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "chapters" ? "text-gray-800" : "text-gray-400 hover:text-gray-600"}`}>
            {activeTab === "chapters" && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
            Chapters
          </button>
          <button onClick={() => setActiveTab("transcripts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "transcripts" ? "text-gray-800" : "text-gray-400 hover:text-gray-600"}`}>
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
          ) : <div className="flex items-center justify-center h-full"><p className="text-xs text-gray-400">No chapters available for this video</p></div>
        ) : (
          transcripts.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {transcripts.map((item, i) => (
                <div key={i} className="px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                  <p className="text-xs font-mono text-gray-400 mb-1">{item.time}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          ) : <div className="flex items-center justify-center h-full"><p className="text-xs text-gray-400">No transcript available for this video</p></div>
        )}
      </div>
    </div>
  );
}

function RecordingView({ mode }: { mode: "microphone" | "browsertab" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<"chapters" | "transcripts">("chapters");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animRef = useRef<NodeJS.Timeout | null>(null);
  const [bars, setBars] = useState<number[]>(Array(60).fill(2));
  const isBrowserTab = mode === "browsertab";

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      animRef.current = setInterval(() => { setBars(Array(60).fill(0).map(() => Math.random() * 28 + 2)); }, 120);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animRef.current) clearInterval(animRef.current);
      setBars(Array(60).fill(2));
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); if (animRef.current) clearInterval(animRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const handleStartStop = async () => {
    if (!isRecording && isBrowserTab) {
      try { await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true }); } catch { return; }
    }
    if (isRecording) setElapsed(0);
    setIsRecording((r) => !r);
  };

  const mockTranscript = [
    { time: "00:00", text: "Recording started. Listening for audio..." },
    { time: "00:08", text: "Welcome everyone, today we're going to cover the fundamentals of neural networks and deep learning." },
    { time: "00:25", text: "We'll start with the basics of how neurons work and build up from there to understand backpropagation." },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={handleStartStop} className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all active:scale-95 cursor-pointer shrink-0">
            {isRecording
              ? <><span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />Stop Recording</>
              : <><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />{isBrowserTab ? "Start Recording Tab" : "Start Recording"}</>
            }
          </button>
          <div className="flex items-end gap-px flex-1 h-9 overflow-hidden">
            {bars.map((h, i) => (
              <div key={i} className={`w-1 rounded-full shrink-0 transition-all duration-100 ${isRecording ? "bg-gray-700" : "bg-gray-200"}`} style={{ height: `${h}px` }} />
            ))}
          </div>
          <span className="text-sm font-mono text-gray-500 shrink-0">{formatTime(elapsed)}</span>
        </div>
      </div>
      <div className="px-5 py-2 shrink-0">
        <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          Help
        </button>
      </div>
      <div className="flex items-center justify-between px-5 py-2 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={() => setActiveTab("chapters")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "chapters" ? "text-gray-800" : "text-gray-400 hover:text-gray-600"}`}>
            {activeTab === "chapters" && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
            Chapters
          </button>
          <button onClick={() => setActiveTab("transcripts")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeTab === "transcripts" ? "text-gray-800" : "text-gray-400 hover:text-gray-600"}`}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" /></svg>
            Transcripts
          </button>
        </div>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          Auto Scroll
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chapters" ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <p className="text-sm text-gray-400">{isRecording ? "Recording… chapters will appear here" : "Start recording to view chapters"}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {isRecording ? mockTranscript.map((item, i) => (
              <div key={i} className="px-5 py-3">
                <p className="text-xs font-mono text-gray-400 mb-1">{item.time}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-40 text-center px-8">
                <p className="text-sm text-gray-400">Start recording to see live transcription</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatView({ initialQuery, uploadedFile }: { initialQuery: string; uploadedFile: string }) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>(() => {
    const msgs: { role: "user" | "ai"; text: string }[] = [];
    if (uploadedFile) {
      msgs.push({ role: "user", text: `Uploaded: ${uploadedFile}` });
      msgs.push({ role: "ai", text: `I've received your file **${uploadedFile}**. What would you like to do?` });
    } else if (initialQuery) {
      msgs.push({ role: "user", text: initialQuery });
      msgs.push({ role: "ai", text: `Hi! I'm your AI study assistant. You said: "${initialQuery}". How can I help you study this topic?` });
    } else {
      msgs.push({ role: "ai", text: "Hi! I'm your AI study assistant. Paste a YouTube link, upload a document, or ask me anything to get started." });
    }
    return msgs;
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev,
      { role: "user", text },
      { role: "ai", text: `Got it! Working on: "${text}". This is where the AI response will appear once connected to your backend.` },
    ]);
    setInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((prev) => [...prev,
      { role: "user", text: `Uploaded: ${file.name}` },
      { role: "ai", text: `I've received **${file.name}**. What would you like to do?` },
    ]);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
            {msg.role === "ai" && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-gray-900 text-white rounded-tr-sm" : "bg-gray-50 border border-gray-100 text-gray-700 rounded-tl-sm"}`}>
              {msg.text}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-300 transition-colors">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.mp3,.wav,.m4a" className="hidden" onChange={handleFileUpload} />
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Ask anything, or paste a YouTube link..." className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none" />
          <button type="button" onClick={sendMessage} disabled={!input.trim()} className="w-8 h-8 shrink-0 rounded-xl bg-blue-600 disabled:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Contentpages() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = (params.get("mode") as Mode) ?? "youtube";
  const url = params.get("url") ?? "";
  const initialQuery = params.get("q") ?? "";
  const uploadedFile = params.get("file") ?? "";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isRecording = mode === "microphone" || mode === "browsertab";
  const isChat = mode === "chat";

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
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!url || isRecording || isChat) return;
    (async () => {
      setChaptersLoading(true);
      try {
        const res = await fetch("/api/generate-chapters", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setChapters(data.chapters ?? []);
        setTranscripts(data.transcripts ?? []);
        setVideoTitle(data.title ?? "");
      } catch { } finally { setChaptersLoading(false); }
    })();
  }, [url]);

  const handleToolClick = useCallback(async (tool: ActiveTool) => {
    // ── EXAM MODE: redirect straight to exam page, passing the YouTube URL ──
    if (tool === "exams") {
      const destination = url
        ? `/dashboard/exam-mode?url=${encodeURIComponent(url)}&source=youtube`
        : "/dashboard/exam-mode";
      router.push(destination);
      return;
    }

    setActiveTool(tool);
    if (!url) return;

    if (tool === "summary" && !summary && !summaryLoading) {
      setSummaryLoading(true); setSummaryError("");
      try {
        const res = await fetch("/api/generate-summary", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
        const data = await res.json(); setSummary(data.summary);
      } catch (e: any) { setSummaryError(e.message || "Failed to generate summary"); }
      finally { setSummaryLoading(false); }
    }

    if (tool === "quiz" && !quizQuestions.length && !quizLoading) {
      setQuizLoading(true); setQuizError("");
      try {
        const res = await fetch("/api/generate-quiz-youtube", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
        const data = await res.json(); setQuizQuestions(data.questions ?? []);
      } catch (e: any) { setQuizError(e.message || "Failed to generate quiz"); }
      finally { setQuizLoading(false); }
    }

    if (tool === "flashcards" && !flashcards.length && !flashcardsLoading) {
      setFlashcardsLoading(true); setFlashcardsError("");
      try {
        const res = await fetch("/api/generate-flashcards-youtube", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
        const data = await res.json(); setFlashcards(data.flashcards ?? []);
      } catch (e: any) { setFlashcardsError(e.message || "Failed to generate flashcards"); }
      finally { setFlashcardsLoading(false); }
    }
  }, [url, summary, summaryLoading, quizQuestions.length, quizLoading, flashcards.length, flashcardsLoading, router]);

  const handleChatSend = useCallback(async () => {
    const q = chatInput.trim();
    if (!q || !url || chatLoading) return;
    setChatInput(""); setChatLoading(true);
    setActiveTool("summary"); setSummary(""); setSummaryLoading(true); setSummaryError("");
    try {
      const res = await fetch("/api/generate-summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, userQuery: q }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      const data = await res.json(); setSummary(data.summary);
    } catch (e: any) { setSummaryError(e.message || "Failed to get answer"); }
    finally { setSummaryLoading(false); setChatLoading(false); }
  }, [chatInput, url, chatLoading]);

  const title = isRecording
    ? `Recording at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : isChat ? (initialQuery || uploadedFile || "Chat")
    : url ? url.replace("https://", "").replace("www.", "").slice(0, 70) : "Content";

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
          {isRecording && <RecordingView mode={mode as "microphone" | "browsertab"} />}
          {isChat && <ChatView initialQuery={initialQuery} uploadedFile={uploadedFile} />}
        </div>

        <RightSidebar
          open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)}
          mode={mode} isChat={isChat}
          activeTool={activeTool} onToolClick={handleToolClick} onBack={() => setActiveTool(null)}
          summary={summary} summaryLoading={summaryLoading} summaryError={summaryError}
          quizQuestions={quizQuestions} quizLoading={quizLoading} quizError={quizError}
          flashcards={flashcards} flashcardsLoading={flashcardsLoading} flashcardsError={flashcardsError}
          chatInput={chatInput} setChatInput={setChatInput} onChatSend={handleChatSend} chatLoading={chatLoading}
        />
      </div>
    </div>
  );
}