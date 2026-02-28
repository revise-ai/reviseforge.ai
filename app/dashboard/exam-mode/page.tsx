// File path: app/dashboard/exam-mode/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ExamModeModal from "@/components/ExamModeModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MCQQuestion {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  category: string;
}

interface FillQuestion {
  id: number;
  question: string;
  correctAnswer: string;
  explanation: string;
  category: string;
}

interface WrittenQuestion {
  id: number;
  question: string;
  modelAnswer: string;
  keyPoints: string[];
  category: string;
}

interface ExamData {
  mcq: MCQQuestion[];
  fillInBlank: FillQuestion[];
  written: WrittenQuestion[];
}

type Section = "mcq" | "fill" | "written";
type Phase = "modal" | "loading" | "ready" | "active" | "done";

const TOTAL_SECONDS = 45 * 60;

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const CheckIcon = ({ cls = "w-3 h-3" }: { cls?: string }) => (
  <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);
const XIcon = ({ cls = "w-3 h-3" }: { cls?: string }) => (
  <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const ClockIcon = ({ cls = "w-4 h-4" }: { cls?: string }) => (
  <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const WarnIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const ChevronR = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const ChevronL = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen({ fileName }: { fileName: string }) {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
        <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Building your exam{".".repeat(dots)}
        </h2>
        <p className="text-sm text-gray-400 mb-1">
          Analysing <span className="font-medium text-gray-600 max-w-xs truncate inline-block align-bottom">{fileName}</span>
        </p>
        <p className="text-xs text-gray-400">Generating 20 MCQ · 15 Fill-in · 15 Written questions</p>
      </div>
      <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full" style={{ animation: "loadbar 2s ease-in-out infinite" }} />
      </div>
      <style>{`
        @keyframes loadbar {
          0%   { width: 0%;  margin-left: 0% }
          50%  { width: 60%; margin-left: 20% }
          100% { width: 0%;  margin-left: 100% }
        }
      `}</style>
    </main>
  );
}

// ─── Ready Screen ─────────────────────────────────────────────────────────────

function ReadyScreen({ fileName, onStart }: { fileName: string; onStart: () => void }) {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Ready for your Exam?</h1>
        <p className="text-gray-400 text-sm mb-1 font-medium truncate px-8">{fileName}</p>
        <p className="text-gray-400 text-sm mb-8">Take a deep breath. Once you start, the timer begins immediately.</p>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { value: "20", label: "MCQ" },
            { value: "15", label: "Fill-in" },
            { value: "15", label: "Written" },
            { value: "45m", label: "Time" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-2xl p-5 mb-8 text-left">
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <WarnIcon />
            Exam Rules
          </p>
          <ul className="space-y-2">
            {[
              "You must answer each question before moving to the next — no skipping",
              "MCQ: select an option. Fill-in: type the exact term. Written: write at least one sentence",
              "The 45-minute countdown starts the moment you click Start",
              "If time expires, your answers are submitted automatically",
              "No hints. No explanations. Results shown only after you finish",
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-gray-300">
                <span className="text-gray-600 shrink-0 font-mono mt-0.5 text-[10px]">{String(i + 1).padStart(2, "0")}</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onStart}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-semibold text-base rounded-2xl shadow-md cursor-pointer"
        >
          Start Exam →
        </button>
        <Link href="/dashboard" className="block mt-4 text-sm text-gray-400 hover:text-gray-600 transition cursor-pointer">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen({ exam, mcqAnswers, fillAnswers, writtenAnswers, timeUsed, timedOut, onRetake, sourceUrl }: {
  exam: ExamData;
  mcqAnswers: Record<number, "A" | "B" | "C" | "D">;
  fillAnswers: Record<number, string>;
  writtenAnswers: Record<number, string>;
  timeUsed: number;
  timedOut: boolean;
  onRetake: () => void;
  sourceUrl?: string;
}) {
  const mcqCorrect = exam.mcq.filter((q) => mcqAnswers[q.id] === q.correctAnswer).length;
  const fillCorrect = exam.fillInBlank.filter((q) =>
    (fillAnswers[q.id] ?? "").trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
  ).length;
  const writtenAttempted = exam.written.filter((q) => (writtenAnswers[q.id] ?? "").trim().length > 10).length;

  const objTotal = exam.mcq.length + exam.fillInBlank.length;
  const objScore = mcqCorrect + fillCorrect;
  const pct = Math.round((objScore / objTotal) * 100);

  const grade =
    pct >= 85 ? { label: "Distinction", color: "text-blue-600" } :
    pct >= 70 ? { label: "Merit",       color: "text-green-600" } :
    pct >= 55 ? { label: "Pass",        color: "text-yellow-600" } :
                { label: "Fail",        color: "text-red-600" };

  const ringColor = pct >= 70 ? "#2563EB" : pct >= 55 ? "#EAB308" : "#EF4444";
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const [openWritten, setOpenWritten] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          {timedOut && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium mb-4">
              <ClockIcon cls="w-4 h-4" />
              Time ran out — answers submitted automatically
            </div>
          )}
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">Exam Results</h1>
          <p className="text-gray-400 text-sm">Time used: <span className="font-medium text-gray-600">{fmt(timeUsed)}</span></p>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 text-center mb-6">
          <div className="relative w-36 h-36 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} stroke="#F3F4F6" strokeWidth="10" fill="none" />
              <circle cx="50" cy="50" r={radius}
                stroke={ringColor} strokeWidth="10" fill="none"
                strokeDasharray={`${circ}`}
                strokeDashoffset={`${circ * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${grade.color}`}>{pct}%</span>
              <span className="text-xs text-gray-400">Score</span>
            </div>
          </div>
          <h2 className={`text-2xl font-semibold ${grade.color} mb-1`}>{grade.label}</h2>
          <p className="text-gray-400 text-sm">Objective score: {objScore} / {objTotal}</p>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div><p className="text-xl font-bold text-gray-900">{mcqCorrect}/{exam.mcq.length}</p><p className="text-xs text-gray-400">MCQ</p></div>
            <div><p className="text-xl font-bold text-gray-900">{fillCorrect}/{exam.fillInBlank.length}</p><p className="text-xs text-gray-400">Fill-in</p></div>
            <div><p className="text-xl font-bold text-gray-900">{writtenAttempted}/{exam.written.length}</p><p className="text-xs text-gray-400">Written</p></div>
          </div>
        </div>

        {/* MCQ Review */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Section 1 — Multiple Choice</p>
              <p className="text-xs text-gray-400">{mcqCorrect} of {exam.mcq.length} correct</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {exam.mcq.map((q, i) => {
              const userAns = mcqAnswers[q.id];
              const correct = userAns === q.correctAnswer;
              return (
                <div key={q.id} className="px-5 py-4 flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${correct ? "bg-green-100" : "bg-red-100"}`}>
                    {correct ? <CheckIcon cls="w-3 h-3 text-green-600" /> : <XIcon cls="w-3 h-3 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 font-medium mb-1">{i + 1}. {q.question}</p>
                    {!correct && (
                      <div className="space-y-1">
                        {userAns && <p className="text-xs text-red-500">Your answer: <span className="font-medium">{userAns}. {q.options[userAns]}</span></p>}
                        <p className="text-xs text-green-600 font-medium">Correct: {q.correctAnswer}. {q.options[q.correctAnswer]}</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fill-in Review */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Section 2 — Fill in the Blank</p>
              <p className="text-xs text-gray-400">{fillCorrect} of {exam.fillInBlank.length} correct</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {exam.fillInBlank.map((q, i) => {
              const userAns = (fillAnswers[q.id] ?? "").trim();
              const correct = userAns.toLowerCase() === q.correctAnswer.trim().toLowerCase();
              return (
                <div key={q.id} className="px-5 py-4 flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${correct ? "bg-green-100" : "bg-red-100"}`}>
                    {correct ? <CheckIcon cls="w-3 h-3 text-green-600" /> : <XIcon cls="w-3 h-3 text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-700 font-medium mb-1">{i + 1}. {q.question.replace("[BLANK]", `[ ${userAns || "—"} ]`)}</p>
                    {!correct && (
                      <div className="space-y-1">
                        {userAns && <p className="text-xs text-red-500">Your answer: "{userAns}"</p>}
                        <p className="text-xs text-green-600 font-medium">Correct: "{q.correctAnswer}"</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Written Review */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Section 3 — Written Answers</p>
              <p className="text-xs text-gray-400">{writtenAttempted} of {exam.written.length} attempted</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {exam.written.map((q, i) => {
              const userAns = (writtenAnswers[q.id] ?? "").trim();
              const attempted = userAns.length > 10;
              return (
                <div key={q.id} className="px-5 py-4 flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${attempted ? "bg-blue-100" : "bg-gray-100"}`}>
                    {attempted ? <CheckIcon cls="w-3 h-3 text-blue-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-700 font-medium mb-2">{i + 1}. {q.question}</p>
                    {attempted && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-2">
                        <p className="text-[10px] text-gray-400 font-semibold mb-0.5 uppercase tracking-wide">Your answer</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{userAns}</p>
                      </div>
                    )}
                    <button onClick={() => setOpenWritten(openWritten === q.id ? null : q.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition cursor-pointer">
                      {openWritten === q.id ? "Hide model answer ↑" : "View model answer ↓"}
                    </button>
                    {openWritten === q.id && (
                      <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <p className="text-xs font-semibold text-blue-800 mb-1">Model Answer</p>
                        <p className="text-xs text-blue-700 leading-relaxed mb-3">{q.modelAnswer}</p>
                        <p className="text-xs font-semibold text-blue-800 mb-1">Key Points Required</p>
                        <ul className="space-y-1">
                          {q.keyPoints.map((pt, pi) => (
                            <li key={pi} className="flex items-start gap-1.5 text-xs text-blue-600">
                              <span className="text-blue-300 shrink-0 mt-0.5">•</span>{pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onRetake}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-semibold rounded-xl text-sm cursor-pointer">
            New Exam
          </button>
          {sourceUrl ? (
            <Link href={`/content?mode=youtube&url=${encodeURIComponent(sourceUrl)}`}
              className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-xl text-sm text-center transition-all cursor-pointer">
              Back to Video
            </Link>
          ) : (
            <Link href="/dashboard"
              className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-xl text-sm text-center transition-all cursor-pointer">
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExamModePage() {
  const searchParams = useSearchParams();

  // Detect if we came from a YouTube video in the content page
  const youtubeUrl = searchParams.get("url") ?? "";
  const source = searchParams.get("source") ?? "";
  const isYoutubeSource = source === "youtube" && !!youtubeUrl;

  const [phase, setPhase] = useState<Phase>(isYoutubeSource ? "loading" : "modal");
  const [exam, setExam] = useState<ExamData | null>(null);
  const [fileName, setFileName] = useState(isYoutubeSource ? youtubeUrl : "");
  const [error, setError] = useState("");

  const [mcqAnswers, setMcqAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [fillAnswers, setFillAnswers] = useState<Record<number, string>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>({});

  const [section, setSection] = useState<Section>("mcq");
  const [qIndex, setQIndex] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [timeUsed, setTimeUsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(TOTAL_SECONDS);

  const submitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeUsed(TOTAL_SECONDS - timeLeftRef.current);
    setPhase("done");
  }, []);

  // ── Auto-generate from YouTube URL on mount ──────────────────────────────
  useEffect(() => {
    if (!isYoutubeSource) return;

    const generateFromYoutube = async () => {
      setPhase("loading");
      setError("");
      // Display a friendly name instead of the full URL
      const displayName = youtubeUrl.replace("https://", "").replace("www.", "").slice(0, 60);
      setFileName(displayName);

      try {
        const res = await fetch("/api/generate-exam-youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate exam from video");
        }
        const data = await res.json();
        setExam(data.exam);
        setPhase("ready");
      } catch (err: any) {
        setError(err.message || "Something went wrong. Please try again.");
        setPhase("modal"); // Fall back to modal if generation fails
      }
    };

    generateFromYoutube();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only run once on mount

  // ── Generate exam from uploaded file (modal path) ──────────────────────
  const generateExam = async (file: File) => {
    setFileName(file.name);
    setPhase("loading");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/generate-exam", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate exam");
      }
      const data = await res.json();
      setExam(data.exam);
      setPhase("ready");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setPhase("modal");
    }
  };

  const startExam = () => {
    setPhase("active");
    setSection("mcq");
    setQIndex(0);
    setMcqAnswers({});
    setFillAnswers({});
    setWrittenAnswers({});
    setBlocked(false);
    setTimedOut(false);

    timeLeftRef.current = TOTAL_SECONDS;
    setTimeLeft(TOTAL_SECONDS);
    setTimeUsed(0);

    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerRef.current!);
        setTimedOut(true);
        submitExam();
      }
    }, 1000);
  };

  const retakeExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // If came from YouTube, re-generate; otherwise go back to modal
    if (isYoutubeSource) {
      setPhase("loading");
      setExam(null);
      setError("");
      const displayName = youtubeUrl.replace("https://", "").replace("www.", "").slice(0, 60);
      setFileName(displayName);

      fetch("/api/generate-exam-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      })
        .then((r) => r.json())
        .then((data) => { setExam(data.exam); setPhase("ready"); })
        .catch(() => { setError("Failed to regenerate exam."); setPhase("modal"); });
    } else {
      setPhase("modal");
      setExam(null);
      setError("");
    }
  };

  const isAnswered = (): boolean => {
    if (!exam) return false;
    if (section === "mcq") return mcqAnswers[exam.mcq[qIndex]?.id] !== undefined;
    if (section === "fill") return (fillAnswers[exam.fillInBlank[qIndex]?.id] ?? "").trim().length > 0;
    if (section === "written") return (writtenAnswers[exam.written[qIndex]?.id] ?? "").trim().length > 10;
    return false;
  };

  const handleNext = () => {
    if (!isAnswered()) {
      setBlocked(true);
      setTimeout(() => setBlocked(false), 3000);
      return;
    }
    setBlocked(false);
    if (!exam) return;
    if (section === "mcq") {
      if (qIndex < exam.mcq.length - 1) setQIndex(qIndex + 1);
      else { setSection("fill"); setQIndex(0); }
    } else if (section === "fill") {
      if (qIndex < exam.fillInBlank.length - 1) setQIndex(qIndex + 1);
      else { setSection("written"); setQIndex(0); }
    } else {
      if (qIndex < exam.written.length - 1) setQIndex(qIndex + 1);
      else submitExam();
    }
  };

  const handlePrev = () => {
    setBlocked(false);
    if (!exam) return;
    if (section === "mcq" && qIndex > 0) setQIndex(qIndex - 1);
    else if (section === "fill") {
      if (qIndex > 0) setQIndex(qIndex - 1);
      else { setSection("mcq"); setQIndex(exam.mcq.length - 1); }
    } else if (section === "written") {
      if (qIndex > 0) setQIndex(qIndex - 1);
      else { setSection("fill"); setQIndex(exam.fillInBlank.length - 1); }
    }
  };

  const totalQ = exam ? exam.mcq.length + exam.fillInBlank.length + exam.written.length : 50;
  const overallIndex = !exam ? 0
    : section === "mcq" ? qIndex
    : section === "fill" ? exam.mcq.length + qIndex
    : exam.mcq.length + exam.fillInBlank.length + qIndex;

  const answeredCount =
    Object.keys(mcqAnswers).length +
    Object.keys(fillAnswers).length +
    Object.keys(writtenAnswers).length;

  const isLastQ = exam ? section === "written" && qIndex === exam.written.length - 1 : false;
  const timerDanger = timeLeft < 5 * 60;
  const timerWarn = timeLeft < 10 * 60 && !timerDanger;

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (phase === "modal") return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium shadow-lg">
          <XIcon cls="w-4 h-4 text-red-500" />
          {error}
        </div>
      )}
      <ExamModeModal
        show={true}
        onClose={() => {}}
        onReady={(file) => generateExam(file)}
      />
    </>
  );

  if (phase === "loading") return <LoadingScreen fileName={fileName} />;
  if (phase === "ready") return <ReadyScreen fileName={fileName} onStart={startExam} />;
  if (phase === "done" && exam) return (
    <ResultsScreen
      exam={exam}
      mcqAnswers={mcqAnswers}
      fillAnswers={fillAnswers}
      writtenAnswers={writtenAnswers}
      timeUsed={timeUsed}
      timedOut={timedOut}
      onRetake={retakeExam}
      sourceUrl={isYoutubeSource ? youtubeUrl : undefined}
    />
  );

  // Active exam
  if (phase === "active" && exam) {
    const sectionLabel = section === "mcq" ? "Multiple Choice" : section === "fill" ? "Fill in the Blank" : "Written Answer";
    const sectionBadgeClass = section === "mcq" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600";

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full shrink-0 ${sectionBadgeClass}`}>{sectionLabel}</span>
            <span className="text-sm text-gray-400 font-medium shrink-0">
              {overallIndex + 1}<span className="text-gray-300 mx-0.5">/</span>{totalQ}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">{answeredCount} answered</span>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm tabular-nums transition-colors ${
              timerDanger ? "bg-red-100 text-red-600 animate-pulse" :
              timerWarn   ? "bg-yellow-50 text-yellow-600" :
                            "bg-gray-100 text-gray-700"
            }`}>
              <ClockIcon />
              {fmt(timeLeft)}
            </div>
            <button onClick={submitExam}
              className="text-xs px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-lg transition cursor-pointer hidden sm:block">
              Submit
            </button>
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-0.5 bg-gray-200">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((overallIndex + 1) / totalQ) * 100}%` }} />
        </div>

        {/* Blocked warning */}
        {blocked && (
          <div className="max-w-2xl mx-auto mt-4 px-4">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              <WarnIcon />
              You must answer this question before moving to the next one.
            </div>
          </div>
        )}

        {/* Question area */}
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${sectionBadgeClass}`}>{sectionLabel}</span>
            <span className="text-xs text-gray-400">
              {section === "mcq" && exam.mcq[qIndex]?.category}
              {section === "fill" && exam.fillInBlank[qIndex]?.category}
              {section === "written" && exam.written[qIndex]?.category}
            </span>
          </div>

          {/* MCQ */}
          {section === "mcq" && (() => {
            const q = exam.mcq[qIndex];
            const sel = mcqAnswers[q.id];
            return (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Question {qIndex + 1} of {exam.mcq.length}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-semibold uppercase tracking-wide">Hard</span>
                </div>
                <div className="px-6 pb-3">
                  <p className="text-lg font-medium text-gray-900 leading-relaxed">{q.question}</p>
                </div>
                <div className="px-6 pb-7 space-y-3">
                  {(["A", "B", "C", "D"] as const).map((key) => (
                    <button key={key}
                      onClick={() => setMcqAnswers((p) => ({ ...p, [q.id]: key }))}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        sel === key ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                      }`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        sel === key ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                      }`}>{key}</span>
                      <span className="text-sm">{q.options[key]}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Fill in the Blank */}
          {section === "fill" && (() => {
            const q = exam.fillInBlank[qIndex];
            const val = fillAnswers[q.id] ?? "";
            const parts = q.question.split("[BLANK]");
            return (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Question {exam.mcq.length + qIndex + 1} of {totalQ}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-semibold uppercase tracking-wide">Hard</span>
                </div>
                <div className="px-6 pb-3">
                  <p className="text-lg font-medium text-gray-900 leading-relaxed">
                    {parts[0]}
                    <span className="inline-block mx-1.5 px-3 py-0.5 bg-blue-50 border-b-2 border-blue-400 text-blue-700 rounded text-base font-semibold min-w-[80px] text-center">
                      {val || "___"}
                    </span>
                    {parts[1]}
                  </p>
                </div>
                <div className="px-6 pb-7">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Answer</label>
                  <input type="text" value={val}
                    onChange={(e) => setFillAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    placeholder="Type the exact term or phrase..."
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-blue-500 rounded-xl text-sm text-gray-900 outline-none transition placeholder-gray-300"
                    autoFocus />
                  <p className="text-xs text-gray-400 mt-1.5">Press Enter to advance when ready</p>
                </div>
              </div>
            );
          })()}

          {/* Written */}
          {section === "written" && (() => {
            const q = exam.written[qIndex];
            const val = writtenAnswers[q.id] ?? "";
            const words = val.trim().split(/\s+/).filter(Boolean).length;
            return (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Question {exam.mcq.length + exam.fillInBlank.length + qIndex + 1} of {totalQ}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-semibold uppercase tracking-wide">Written</span>
                </div>
                <div className="px-6 pb-3">
                  <p className="text-lg font-medium text-gray-900 leading-relaxed">{q.question}</p>
                </div>
                <div className="px-6 pb-7">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Answer</label>
                    <span className={`text-xs font-medium ${words >= 30 ? "text-green-600" : "text-gray-400"}`}>
                      {words} {words === 1 ? "word" : "words"}
                    </span>
                  </div>
                  <textarea value={val}
                    onChange={(e) => setWrittenAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                    rows={9}
                    placeholder="Write a thorough, detailed answer. Aim for at least 3–5 sentences..."
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-blue-500 rounded-xl text-sm text-gray-900 outline-none transition resize-none placeholder-gray-300 leading-relaxed"
                    autoFocus />
                  <p className="text-xs text-gray-400 mt-1.5">Minimum one sentence required to proceed</p>
                </div>
              </div>
            );
          })()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button onClick={handlePrev}
              disabled={section === "mcq" && qIndex === 0}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer">
              <ChevronL />
              Previous
            </button>

            {/* Progress dots */}
            <div className="flex gap-1 flex-wrap justify-center max-w-[180px]">
              {Array.from({ length: totalQ }).map((_, i) => {
                const isCurrent = i === overallIndex;
                const isAns = i < exam.mcq.length
                  ? mcqAnswers[exam.mcq[i]?.id] !== undefined
                  : i < exam.mcq.length + exam.fillInBlank.length
                  ? (fillAnswers[exam.fillInBlank[i - exam.mcq.length]?.id] ?? "").trim().length > 0
                  : (writtenAnswers[exam.written[i - exam.mcq.length - exam.fillInBlank.length]?.id] ?? "").trim().length > 10;
                return (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${
                    isCurrent ? "w-3 bg-blue-600" : isAns ? "w-1.5 bg-gray-400" : "w-1.5 bg-gray-200"
                  }`} />
                );
              })}
            </div>

            <button onClick={handleNext}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                isAnswered() ? "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-400"
              }`}>
              {isLastQ ? <><CheckIcon cls="w-4 h-4" /> Submit Exam</> : <>Next <ChevronR /></>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}