// File path: app/dashboard/exam-mode/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ExamModeModal from "@/components/ExamModeModal";
import { supabase } from "@/lib/supabase";

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
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

const CheckIcon = ({ cls = "w-3 h-3" }: { cls?: string }) => (
  <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M5 13l4 4L19 7"
    />
  </svg>
);
const XIcon = ({ cls = "w-3 h-3" }: { cls?: string }) => (
  <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
const ClockIcon = ({ cls = "w-4 h-4" }: { cls?: string }) => (
  <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const WarnIcon = () => (
  <svg
    className="w-4 h-4 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);
const ChevronR = () => (
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
);
const ChevronL = () => (
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
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen({ label }: { label: string }) {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
        <svg
          className="w-8 h-8 text-white animate-pulse"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 14l9-5-9-5-9 5 9 5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
          />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Building your exam{".".repeat(dots)}
        </h2>
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className="text-xs text-gray-400">
          Generating 20 MCQ · 15 Fill-in · 15 Written questions
        </p>
      </div>
      <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full"
          style={{ animation: "loadbar 2s ease-in-out infinite" }}
        />
      </div>
      <style>{`@keyframes loadbar { 0%{width:0%;margin-left:0%} 50%{width:60%;margin-left:20%} 100%{width:0%;margin-left:100%} }`}</style>
    </main>
  );
}

// ─── Ready Screen ─────────────────────────────────────────────────────────────
function ReadyScreen({
  label,
  onStart,
}: {
  label: string;
  onStart: () => void;
}) {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 14l9-5-9-5-9 5 9 5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          Ready for your Exam?
        </h1>
        <p className="text-gray-400 text-sm mb-1 font-medium truncate px-8">
          {label}
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Take a deep breath. Once you start, the timer begins immediately.
        </p>
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { value: "20", label: "MCQ" },
            { value: "15", label: "Fill-in" },
            { value: "15", label: "Written" },
            { value: "45m", label: "Time" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
            >
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
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs text-gray-300"
              >
                <span className="text-gray-600 shrink-0 font-mono mt-0.5 text-[10px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
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
        <Link
          href="/dashboard"
          className="block mt-4 text-sm text-gray-400 hover:text-gray-600 transition cursor-pointer"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
function ResultsScreen({
  exam,
  mcqAnswers,
  fillAnswers,
  writtenAnswers,
  timeUsed,
  timedOut,
  onRetake,
  sourceUrl,
  isRecording,
}: {
  exam: ExamData;
  mcqAnswers: Record<number, "A" | "B" | "C" | "D">;
  fillAnswers: Record<number, string>;
  writtenAnswers: Record<number, string>;
  timeUsed: number;
  timedOut: boolean;
  onRetake: () => void;
  sourceUrl?: string;
  isRecording?: boolean;
}) {
  const mcqCorrect = exam.mcq.filter(
    (q) => mcqAnswers[q.id] === q.correctAnswer,
  ).length;
  const fillCorrect = exam.fillInBlank.filter(
    (q) =>
      (fillAnswers[q.id] ?? "").trim().toLowerCase() ===
      q.correctAnswer.trim().toLowerCase(),
  ).length;
  const writtenAttempted = exam.written.filter(
    (q) => (writtenAnswers[q.id] ?? "").trim().length > 10,
  ).length;
  const objTotal = exam.mcq.length + exam.fillInBlank.length;
  const objScore = mcqCorrect + fillCorrect;
  const pct = Math.round((objScore / objTotal) * 100);
  const grade =
    pct >= 85
      ? { label: "Distinction", color: "text-blue-600", ring: "#2563EB" }
      : pct >= 70
        ? { label: "Merit", color: "text-green-600", ring: "#16a34a" }
        : pct >= 55
          ? { label: "Pass", color: "text-yellow-600", ring: "#EAB308" }
          : { label: "Fail", color: "text-red-600", ring: "#EF4444" };
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const [tab, setTab] = useState<"mcq" | "fill" | "written">("mcq");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {timedOut && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium mb-4">
              <ClockIcon cls="w-4 h-4" />
              Time ran out — answers submitted automatically
            </div>
          )}
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">
            Exam Results
          </h1>
          <p className="text-gray-400 text-sm">
            Time used:{" "}
            <span className="font-medium text-gray-600">{fmt(timeUsed)}</span>
          </p>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 mb-5">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Ring */}
            <div className="relative shrink-0">
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                className="-rotate-90"
              >
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="12"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={grade.ring}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * circ} ${circ}`}
                  style={{ transition: "stroke-dasharray 1s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${grade.color}`}>
                  {pct}%
                </span>
                <span className="text-xs text-gray-400 mt-0.5">Score</span>
              </div>
            </div>
            {/* Stats */}
            <div className="flex-1 w-full">
              <h2 className={`text-2xl font-semibold ${grade.color} mb-1`}>
                {grade.label}
              </h2>
              <p className="text-sm text-gray-400 mb-5">
                Objective score: {objScore} / {objTotal}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {mcqCorrect}/{exam.mcq.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">MCQ</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {fillCorrect}/{exam.fillInBlank.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Fill-in</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {writtenAttempted}/{exam.written.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Written</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 mb-5">
          {[
            {
              v: "mcq" as const,
              l: `MCQ · ${mcqCorrect}/${exam.mcq.length} correct`,
            },
            {
              v: "fill" as const,
              l: `Fill-in · ${fillCorrect}/${exam.fillInBlank.length} correct`,
            },
            {
              v: "written" as const,
              l: `Written · ${writtenAttempted}/${exam.written.length} attempted`,
            },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${tab === t.v ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* MCQ review */}
        {tab === "mcq" && (
          <div className="space-y-4 mb-6">
            {exam.mcq.map((q, i) => {
              const sel = mcqAnswers[q.id];
              const answered = sel !== undefined;
              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-400">
                        Q{i + 1}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                        {q.category}
                      </span>
                      {answered ? (
                        sel === q.correctAnswer ? (
                          <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
                            ✓ Correct
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">
                            ✗ Wrong
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">
                          Skipped
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {(["A", "B", "C", "D"] as const).map((key) => {
                      const isCorrect = key === q.correctAnswer;
                      const isSelected = key === sel;
                      let cls = "border-gray-100 bg-white text-gray-400";
                      if (isCorrect)
                        cls = "border-green-400 bg-green-50 text-green-800";
                      else if (isSelected)
                        cls = "border-red-400 bg-red-50 text-red-700";
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${cls}`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect ? "bg-green-500 text-white" : isSelected ? "bg-red-400 text-white" : "bg-gray-100 text-gray-400"}`}
                          >
                            {key}
                          </span>
                          <span className="text-sm flex-1">
                            {q.options[key]}
                          </span>
                          {isCorrect && (
                            <svg
                              className="w-4 h-4 text-green-600 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                          {isSelected && !isCorrect && (
                            <svg
                              className="w-4 h-4 text-red-500 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="px-5 pb-4">
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                        <p className="text-xs font-semibold text-blue-800 mb-1">
                          Explanation
                        </p>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Fill-in review */}
        {tab === "fill" && (
          <div className="space-y-4 mb-6">
            {exam.fillInBlank.map((q, i) => {
              const given = (fillAnswers[q.id] ?? "").trim();
              const correct =
                given.toLowerCase() === q.correctAnswer.trim().toLowerCase();
              const answered = given.length > 0;
              const parts = q.question.split("[BLANK]");
              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-400">
                        Q{exam.mcq.length + i + 1}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                        {q.category}
                      </span>
                      {answered ? (
                        correct ? (
                          <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
                            ✓ Correct
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">
                            ✗ Wrong
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">
                          Skipped
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">
                      {parts[0]}
                      <span
                        className={`inline-block mx-1.5 px-3 py-0.5 rounded border-b-2 text-sm font-semibold min-w-[80px] text-center ${correct ? "bg-green-50 border-green-400 text-green-700" : answered ? "bg-red-50 border-red-400 text-red-700" : "bg-gray-50 border-gray-300 text-gray-400"}`}
                      >
                        {given || "___"}
                      </span>
                      {parts[1]}
                    </p>
                  </div>
                  <div className="px-5 py-3 space-y-2">
                    {!correct && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          Correct answer:
                        </span>
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          {q.correctAnswer}
                        </span>
                      </div>
                    )}
                    {q.explanation && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mt-1">
                        <p className="text-xs font-semibold text-blue-800 mb-1">
                          Explanation
                        </p>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Written review */}
        {tab === "written" && (
          <div className="space-y-4 mb-6">
            {exam.written.map((q, i) => {
              const given = writtenAnswers[q.id] ?? "";
              const attempted = given.trim().length > 10;
              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-400">
                        Q{exam.mcq.length + exam.fillInBlank.length + i + 1}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                        {q.category}
                      </span>
                      {attempted ? (
                        <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                          Attempted
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">
                          Skipped
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Your Answer
                      </p>
                      <div
                        className={`px-4 py-3 rounded-xl text-sm leading-relaxed border ${attempted ? "bg-gray-50 text-gray-700 border-gray-100" : "bg-gray-50 text-gray-400 italic border-gray-100"}`}
                      >
                        {given || "No answer provided"}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Model Answer
                      </p>
                      <div className="bg-green-50 border border-green-100 px-4 py-3 rounded-xl text-sm text-green-800 leading-relaxed">
                        {q.modelAnswer}
                      </div>
                    </div>
                    {q.keyPoints?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                          Key Points
                        </p>
                        <ul className="space-y-1">
                          {q.keyPoints.map((kp, ki) => (
                            <li
                              key={ki}
                              className="flex items-start gap-2 text-xs text-gray-600"
                            >
                              <span className="text-green-500 shrink-0">•</span>
                              {kp}
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
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-semibold rounded-2xl text-sm cursor-pointer"
          >
            New Exam
          </button>
          <Link
            href="/dashboard"
            className="flex-1 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-2xl text-sm text-center transition-all cursor-pointer flex items-center justify-center"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function ExamModeContent() {
  const searchParams = useSearchParams();
  const youtubeUrl = searchParams.get("url") ?? "";
  const source = searchParams.get("source") ?? "";
  const reviewSessionId = searchParams.get("session_id") ?? "";
  const isYoutubeSource = source === "youtube" && !!youtubeUrl;
  const isRecordingSource = source === "recording";
  const isReview = !!reviewSessionId;

  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(
    isYoutubeSource || isRecordingSource || isReview ? "loading" : "modal",
  );
  const [exam, setExam] = useState<ExamData | null>(null);
  const [label, setLabel] = useState(
    isYoutubeSource
      ? youtubeUrl.replace("https://", "").replace("www.", "").slice(0, 60)
      : isRecordingSource
        ? "Your recording"
        : "",
  );
  const [error, setError] = useState("");
  const examSessionIdRef = useRef<string>("");

  const [mcqAnswers, setMcqAnswers] = useState<
    Record<number, "A" | "B" | "C" | "D">
  >({});
  const [fillAnswers, setFillAnswers] = useState<Record<number, string>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>(
    {},
  );

  const [section, setSection] = useState<Section>("mcq");
  const [qIndex, setQIndex] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [timeUsed, setTimeUsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(TOTAL_SECONDS);

  const submitExam = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const used = TOTAL_SECONDS - timeLeftRef.current;
    setTimeUsed(used);
    setPhase("done");
    // Persist results to DB
    if (examSessionIdRef.current && exam) {
      const mcqC = exam.mcq.filter(
        (q) => mcqAnswers[q.id] === q.correctAnswer,
      ).length;
      const fillC = exam.fillInBlank.filter(
        (q) =>
          (fillAnswers[q.id] ?? "").trim().toLowerCase() ===
          q.correctAnswer.trim().toLowerCase(),
      ).length;
      const writA = exam.written.filter(
        (q) => (writtenAnswers[q.id] ?? "").trim().length > 10,
      ).length;
      await supabase
        .from("exam_sessions")
        .update({
          status: "done",
          mcq_score: mcqC,
          fill_score: fillC,
          written_attempted: writA,
          total_mcq: exam.mcq.length,
          total_fill: exam.fillInBlank.length,
          total_written: exam.written.length,
          time_used_secs: used,
          timed_out: timedOut,
          mcq_answers: mcqAnswers,
          fill_answers: fillAnswers,
          written_answers: writtenAnswers,
          last_visited: new Date().toISOString(),
        })
        .eq("id", examSessionIdRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, mcqAnswers, fillAnswers, writtenAnswers, timedOut]);

  // ── Load existing exam from DB (history/recent revisit) ─────────────────
  useEffect(() => {
    if (!isReview) return;
    (async () => {
      setPhase("loading");
      try {
        await supabase
          .from("exam_sessions")
          .update({ last_visited: new Date().toISOString() })
          .eq("id", reviewSessionId);
        const { data, error } = await supabase
          .from("exam_sessions")
          .select("*")
          .eq("id", reviewSessionId)
          .single();
        if (error || !data || !data.exam_data)
          throw new Error("Exam not found");
        examSessionIdRef.current = data.id;
        setLabel(data.source_label || "Exam");
        setExam(data.exam_data);
        // If already completed — restore answers and jump to results
        if (data.status === "done") {
          setMcqAnswers(data.mcq_answers ?? {});
          setFillAnswers(data.fill_answers ?? {});
          setWrittenAnswers(data.written_answers ?? {});
          setTimeUsed(data.time_used_secs ?? 0);
          setTimedOut(data.timed_out ?? false);
          setPhase("done");
        } else {
          setPhase("ready");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load exam.");
        setPhase("modal");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate from YouTube URL ─────────────────────────────────────────────
  useEffect(() => {
    if (!isYoutubeSource) return;
    (async () => {
      setPhase("loading");
      try {
        const res = await fetch("/api/generate-exam-youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl }),
        });
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error || "Failed");
        }
        const data = await res.json();
        setExam(data.exam);
        setPhase("ready");
        // Create exam session row for history
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const ytSid = searchParams.get("session_id") ?? undefined;
          const { data: sess } = await supabase
            .from("exam_sessions")
            .insert({
              user_id: user.id,
              source: "youtube",
              source_label: data.exam
                ? youtubeUrl
                    .replace("https://", "")
                    .replace("www.", "")
                    .slice(0, 60)
                : label,
              youtube_session_id: ytSid || null,
              exam_data: data.exam,
            })
            .select("id")
            .single();
          if (sess?.id) examSessionIdRef.current = sess.id;
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
        setPhase("modal");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate from Recording (audio stored in sessionStorage) ─────────────
  useEffect(() => {
    if (!isRecordingSource) return;
    (async () => {
      setPhase("loading");
      setLabel("Your recording");
      try {
        const audioBase64 = sessionStorage.getItem("rec_exam_audio") ?? "";
        const mimeType = sessionStorage.getItem("rec_exam_mimeType") ?? "";
        const transcript = sessionStorage.getItem("rec_exam_transcript") ?? "";

        if (!audioBase64 && !transcript)
          throw new Error(
            "No recording data found. Please go back and record first.",
          );

        const res = await fetch("/api/generate-exam-recording", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: audioBase64 || null,
            mimeType: mimeType || null,
            transcript,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          const msg = text.startsWith("{")
            ? JSON.parse(text).error
            : "Failed to generate exam from recording";
          throw new Error(msg);
        }
        const data = await res.json();
        setExam(data.exam);
        setPhase("ready");
        sessionStorage.removeItem("rec_exam_audio");
        sessionStorage.removeItem("rec_exam_mimeType");
        sessionStorage.removeItem("rec_exam_transcript");
        // Create exam session row for history
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const recSid =
            sessionStorage.getItem("rec_exam_session_id") ?? undefined;
          const { data: sess } = await supabase
            .from("exam_sessions")
            .insert({
              user_id: user.id,
              source: "recording",
              source_label: "Your recording",
              recording_session_id: recSid || null,
              exam_data: data.exam,
            })
            .select("id")
            .single();
          if (sess?.id) examSessionIdRef.current = sess.id;
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
        setPhase("modal");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate from uploaded file (modal path) ──────────────────────────────
  const generateExam = async (file: File) => {
    setLabel(file.name);
    setPhase("loading");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/generate-exam", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed");
      }
      const data = await res.json();
      setExam(data.exam);
      setPhase("ready");
      // Create exam session row for history
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: sess } = await supabase
          .from("exam_sessions")
          .insert({
            user_id: user.id,
            source: "file",
            source_label: file.name,
            exam_data: data.exam,
          })
          .select("id")
          .single();
        if (sess?.id) examSessionIdRef.current = sess.id;
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
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
    setPhase("modal");
    setExam(null);
    setError("");
  };

  const isAnswered = (): boolean => {
    if (!exam) return false;
    if (section === "mcq")
      return mcqAnswers[exam.mcq[qIndex]?.id] !== undefined;
    if (section === "fill")
      return (
        (fillAnswers[exam.fillInBlank[qIndex]?.id] ?? "").trim().length > 0
      );
    if (section === "written")
      return (
        (writtenAnswers[exam.written[qIndex]?.id] ?? "").trim().length > 10
      );
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
      else {
        setSection("fill");
        setQIndex(0);
      }
    } else if (section === "fill") {
      if (qIndex < exam.fillInBlank.length - 1) setQIndex(qIndex + 1);
      else {
        setSection("written");
        setQIndex(0);
      }
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
      else {
        setSection("mcq");
        setQIndex(exam.mcq.length - 1);
      }
    } else if (section === "written") {
      if (qIndex > 0) setQIndex(qIndex - 1);
      else {
        setSection("fill");
        setQIndex(exam.fillInBlank.length - 1);
      }
    }
  };

  const totalQ = exam
    ? exam.mcq.length + exam.fillInBlank.length + exam.written.length
    : 50;
  const overallIndex = !exam
    ? 0
    : section === "mcq"
      ? qIndex
      : section === "fill"
        ? exam.mcq.length + qIndex
        : exam.mcq.length + exam.fillInBlank.length + qIndex;
  const answeredCount =
    Object.keys(mcqAnswers).length +
    Object.keys(fillAnswers).length +
    Object.keys(writtenAnswers).length;
  const isLastQ = exam
    ? section === "written" && qIndex === exam.written.length - 1
    : false;
  const timerDanger = timeLeft < 5 * 60;
  const timerWarn = timeLeft < 10 * 60 && !timerDanger;

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (phase === "modal")
    return (
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

  if (phase === "loading")
    return (
      <LoadingScreen
        label={
          isRecordingSource
            ? "Analysing your recording…"
            : isYoutubeSource
              ? `Analysing ${label}`
              : "Building your exam…"
        }
      />
    );

  if (phase === "ready")
    return (
      <ReadyScreen
        label={isRecordingSource ? "Generated from your recording" : label}
        onStart={startExam}
      />
    );

  if (phase === "done" && exam)
    return (
      <ResultsScreen
        exam={exam}
        mcqAnswers={mcqAnswers}
        fillAnswers={fillAnswers}
        writtenAnswers={writtenAnswers}
        timeUsed={timeUsed}
        timedOut={timedOut}
        onRetake={retakeExam}
        sourceUrl={isYoutubeSource ? youtubeUrl : undefined}
        isRecording={isRecordingSource}
      />
    );

  // ── Active exam ───────────────────────────────────────────────────────────
  if (phase === "active" && exam) {
    const sectionLabel =
      section === "mcq"
        ? "Multiple Choice"
        : section === "fill"
          ? "Fill in the Blank"
          : "Written Answer";
    const sectionBadgeClass =
      section === "mcq"
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-600";
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full shrink-0 ${sectionBadgeClass}`}
            >
              {sectionLabel}
            </span>
            <span className="text-sm text-gray-400 font-medium shrink-0">
              {overallIndex + 1}
              <span className="text-gray-300 mx-0.5">/</span>
              {totalQ}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">
              {answeredCount} answered
            </span>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm tabular-nums transition-colors ${timerDanger ? "bg-red-100 text-red-600 animate-pulse" : timerWarn ? "bg-yellow-50 text-yellow-600" : "bg-gray-100 text-gray-700"}`}
            >
              <ClockIcon />
              {fmt(timeLeft)}
            </div>
            <button
              onClick={submitExam}
              className="text-xs px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-lg transition cursor-pointer hidden sm:block"
            >
              Submit
            </button>
          </div>
        </header>
        <div className="h-0.5 bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((overallIndex + 1) / totalQ) * 100}%` }}
          />
        </div>
        {blocked && (
          <div className="max-w-2xl mx-auto mt-4 px-4">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              <WarnIcon />
              You must answer this question before moving to the next one.
            </div>
          </div>
        )}
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-full ${sectionBadgeClass}`}
            >
              {sectionLabel}
            </span>
            <span className="text-xs text-gray-400">
              {section === "mcq" && exam.mcq[qIndex]?.category}
              {section === "fill" && exam.fillInBlank[qIndex]?.category}
              {section === "written" && exam.written[qIndex]?.category}
            </span>
          </div>
          {section === "mcq" &&
            (() => {
              const q = exam.mcq[qIndex];
              const sel = mcqAnswers[q.id];
              return (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between px-6 pt-5 pb-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Question {qIndex + 1} of {exam.mcq.length}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-semibold uppercase tracking-wide">
                      Hard
                    </span>
                  </div>
                  <div className="px-6 pb-3">
                    <p className="text-lg font-medium text-gray-900 leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                  <div className="px-6 pb-7 space-y-3">
                    {(["A", "B", "C", "D"] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() =>
                          setMcqAnswers((p) => ({ ...p, [q.id]: key }))
                        }
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${sel === key ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700"}`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${sel === key ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}
                        >
                          {key}
                        </span>
                        <span className="text-sm">{q.options[key]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          {section === "fill" &&
            (() => {
              const q = exam.fillInBlank[qIndex];
              const val = fillAnswers[q.id] ?? "";
              const parts = q.question.split("[BLANK]");
              return (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between px-6 pt-5 pb-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Question {exam.mcq.length + qIndex + 1} of {totalQ}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-semibold uppercase tracking-wide">
                      Hard
                    </span>
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
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Your Answer
                    </label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        setFillAnswers((p) => ({
                          ...p,
                          [q.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleNext()}
                      placeholder="Type the exact term or phrase..."
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-blue-500 rounded-xl text-sm text-gray-900 outline-none transition placeholder-gray-300"
                      autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Press Enter to advance when ready
                    </p>
                  </div>
                </div>
              );
            })()}
          {section === "written" &&
            (() => {
              const q = exam.written[qIndex];
              const val = writtenAnswers[q.id] ?? "";
              const words = val.trim().split(/\s+/).filter(Boolean).length;
              return (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between px-6 pt-5 pb-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Question{" "}
                      {exam.mcq.length + exam.fillInBlank.length + qIndex + 1}{" "}
                      of {totalQ}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-semibold uppercase tracking-wide">
                      Written
                    </span>
                  </div>
                  <div className="px-6 pb-3">
                    <p className="text-lg font-medium text-gray-900 leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                  <div className="px-6 pb-7">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Your Answer
                      </label>
                      <span
                        className={`text-xs font-medium ${words >= 30 ? "text-green-600" : "text-gray-400"}`}
                      >
                        {words} {words === 1 ? "word" : "words"}
                      </span>
                    </div>
                    <textarea
                      value={val}
                      onChange={(e) =>
                        setWrittenAnswers((p) => ({
                          ...p,
                          [q.id]: e.target.value,
                        }))
                      }
                      rows={9}
                      placeholder="Write a thorough, detailed answer. Aim for at least 3–5 sentences..."
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-blue-500 rounded-xl text-sm text-gray-900 outline-none transition resize-none placeholder-gray-300 leading-relaxed"
                      autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Minimum one sentence required to proceed
                    </p>
                  </div>
                </div>
              );
            })()}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handlePrev}
              disabled={section === "mcq" && qIndex === 0}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronL />
              Previous
            </button>
            <div className="flex gap-1 flex-wrap justify-center max-w-[180px]">
              {Array.from({ length: totalQ }).map((_, i) => {
                const isCurrent = i === overallIndex;
                const isAns =
                  i < exam.mcq.length
                    ? mcqAnswers[exam.mcq[i]?.id] !== undefined
                    : i < exam.mcq.length + exam.fillInBlank.length
                      ? (
                          fillAnswers[
                            exam.fillInBlank[i - exam.mcq.length]?.id
                          ] ?? ""
                        ).trim().length > 0
                      : (
                          writtenAnswers[
                            exam.written[
                              i - exam.mcq.length - exam.fillInBlank.length
                            ]?.id
                          ] ?? ""
                        ).trim().length > 10;
                return (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${isCurrent ? "w-3 bg-blue-600" : isAns ? "w-1.5 bg-gray-400" : "w-1.5 bg-gray-200"}`}
                  />
                );
              })}
            </div>
            <button
              onClick={handleNext}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${isAnswered() ? "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-400"}`}
            >
              {isLastQ ? (
                <>
                  <CheckIcon cls="w-4 h-4" />
                  Submit Exam
                </>
              ) : (
                <>
                  Next <ChevronR />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function ExamModePage() {
  return (
    <Suspense fallback={<LoadingScreen label="Initialising exam mode..." />}>
      <ExamModeContent />
    </Suspense>
  );
}
