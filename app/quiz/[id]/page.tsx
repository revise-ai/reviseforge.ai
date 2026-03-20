"use client";

// app/quiz/[id]/page.tsx

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────
interface QuizQuestion {
  id: number;
  dbId?: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  category: string;
  difficulty: string;
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <svg
    className="w-5 h-5"
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
const ChevronRight = () => (
  <svg
    className="w-5 h-5"
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
const CloseIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// ── Loading Screen ─────────────────────────────────────────────────────────────
function LoadingScreen({ fileName }: { fileName: string }) {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Generating quiz{".".repeat(dots)}
        </h2>
        <p className="text-sm text-gray-400">
          Analyzing{" "}
          <span className="font-medium text-gray-600">{fileName}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Building 30 difficult MCQs from your document
        </p>
      </div>
      <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full animate-[loading_2s_ease-in-out_infinite]" />
      </div>
      <style>{`
        @keyframes loading {
          0%   { width: 0%;  margin-left: 0;    }
          50%  { width: 70%; margin-left: 15%;  }
          100% { width: 0%;  margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

// ── Explanation Popup ──────────────────────────────────────────────────────────
function ExplanationPopup({
  question,
  selectedAnswer,
  onClose,
}: {
  question: QuizQuestion;
  selectedAnswer: "A" | "B" | "C" | "D";
  onClose: () => void;
}) {
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div
          className={`px-6 py-4 flex items-center justify-between ${isCorrect ? "bg-green-50 border-b border-green-100" : "bg-red-50 border-b border-red-100"}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${isCorrect ? "bg-green-500" : "bg-red-500"}`}
            >
              {isCorrect ? (
                <svg
                  className="w-4 h-4 text-white"
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
              ) : (
                <svg
                  className="w-4 h-4 text-white"
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
            <div>
              <p
                className={`font-semibold text-sm ${isCorrect ? "text-green-800" : "text-red-800"}`}
              >
                {isCorrect ? "Correct!" : "Incorrect"}
              </p>
              {!isCorrect && (
                <p className="text-xs text-red-600 mt-0.5">
                  Correct answer:{" "}
                  <span className="font-bold">
                    {question.correctAnswer}.{" "}
                    {question.options[question.correctAnswer]}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer p-1 rounded-lg hover:bg-white/60"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Explanation
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {question.explanation}
          </p>
        </div>

        <div className="px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer active:scale-95"
          >
            Got it — Next Question
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────
function ResultsScreen({
  questions,
  answers,
  onRetry,
}: {
  questions: QuizQuestion[];
  answers: Record<number, "A" | "B" | "C" | "D">;
  onRetry: () => void;
}) {
  const correct = questions.filter(
    (q) => answers[q.id] === q.correctAnswer,
  ).length;
  const incorrect = questions.filter(
    (q) => answers[q.id] && answers[q.id] !== q.correctAnswer,
  ).length;
  const skipped = questions.filter((q) => !answers[q.id]).length;
  const total = questions.length;
  const pct = Math.round((correct / total) * 100);

  const grade =
    pct >= 90
      ? { label: "Outstanding!", color: "text-green-600", ring: "#16a34a" }
      : pct >= 75
        ? { label: "Great Work!", color: "text-blue-600", ring: "#2563eb" }
        : pct >= 60
          ? { label: "Keep Going!", color: "text-yellow-600", ring: "#d97706" }
          : pct >= 40
            ? {
                label: "Don't Give Up!",
                color: "text-orange-600",
                ring: "#ea580c",
              }
            : { label: "Try Again!", color: "text-red-600", ring: "#dc2626" };

  const radius = 54;
  const circ = 2 * Math.PI * radius;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
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
                {correct} out of {total} questions correct
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-2xl p-4 text-center">
                  <p className="text-xl font-bold text-green-600">{correct}</p>
                  <p className="text-xs text-green-500 mt-1">Correct</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4 text-center">
                  <p className="text-xl font-bold text-red-500">{incorrect}</p>
                  <p className="text-xs text-red-400 mt-1">Incorrect</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-xl font-bold text-gray-500">{skipped}</p>
                  <p className="text-xs text-gray-400 mt-1">Skipped</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              Question Review
            </h3>
            <span className="text-xs text-gray-400">{total} questions</span>
          </div>
          <div className="divide-y divide-gray-50">
            {questions.map((q, i) => {
              const sel = answers[q.id];
              const answered = sel !== undefined;
              const isCorrect = answered && sel === q.correctAnswer;
              return (
                <div key={q.id} className="px-6 py-4">
                  {/* Question header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCorrect ? "bg-green-100" : answered ? "bg-red-100" : "bg-gray-100"}`}
                    >
                      {isCorrect ? (
                        <svg
                          className="w-3.5 h-3.5 text-green-600"
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
                      ) : answered ? (
                        <svg
                          className="w-3.5 h-3.5 text-red-500"
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
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">
                          —
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-400">
                          Q{i + 1}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          {q.category}
                        </span>
                        {!answered && (
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">
                            Skipped
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {q.question}
                      </p>
                    </div>
                  </div>
                  {/* Options */}
                  <div className="pl-9 space-y-1.5">
                    {(["A", "B", "C", "D"] as const).map((key) => {
                      const isCorr = key === q.correctAnswer;
                      const isSel = key === sel;
                      let cls = "border-gray-100 bg-white text-gray-400";
                      if (isCorr)
                        cls = "border-green-400 bg-green-50 text-green-800";
                      else if (isSel)
                        cls = "border-red-400 bg-red-50 text-red-700";
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 ${cls}`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${isCorr ? "bg-green-500 text-white" : isSel ? "bg-red-400 text-white" : "bg-gray-100 text-gray-400"}`}
                          >
                            {key}
                          </span>
                          <span className="text-xs flex-1">
                            {q.options[key]}
                          </span>
                          {isCorr && (
                            <svg
                              className="w-3.5 h-3.5 text-green-600 shrink-0"
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
                          {isSel && !isCorr && (
                            <svg
                              className="w-3.5 h-3.5 text-red-500 shrink-0"
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
                  {/* Explanation */}
                  {q.explanation && (
                    <div className="pl-9 mt-3">
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
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 py-4 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl text-sm font-semibold transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="flex-1 py-4 text-white rounded-2xl text-sm font-semibold transition text-center active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: grade.ring }}
          >
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Question Card ──────────────────────────────────────────────────────────────
function QuestionCard({
  question,
  current,
  total,
  selectedAnswer,
  answered,
  onSelect,
  onShowExplanation,
  onPrev,
  onNext,
  onFinish,
}: {
  question: QuizQuestion;
  current: number;
  total: number;
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  answered: boolean;
  onSelect: (opt: "A" | "B" | "C" | "D") => void;
  onShowExplanation: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const optionKeys: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
  const isLast = current === total - 1;

  const getOptionStyle = (key: "A" | "B" | "C" | "D") => {
    if (!answered) {
      return selectedAnswer === key
        ? "border-blue-400 bg-blue-50 text-gray-800"
        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700 cursor-pointer";
    }
    if (key === question.correctAnswer)
      return "border-green-500 bg-green-50 text-green-800 ring-2 ring-green-200";
    if (key === selectedAnswer)
      return "border-red-500 bg-red-50 text-red-800 ring-2 ring-red-200";
    return "border-gray-200 bg-white text-gray-400";
  };

  const getOptionIcon = (key: "A" | "B" | "C" | "D") => {
    if (!answered) return null;
    if (key === question.correctAnswer)
      return (
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg
            className="w-3 h-3 text-white"
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
        </div>
      );
    if (key === selectedAnswer)
      return (
        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <svg
            className="w-3 h-3 text-white"
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
        </div>
      );
    return null;
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 px-4 py-10">
      <div className="mb-4">
        <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          {question.category}
        </span>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-3xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Question {current + 1}
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium uppercase tracking-wide">
            Hard
          </span>
        </div>

        <div className="px-6 pt-4 pb-5">
          <p className="text-lg font-medium text-gray-900 leading-relaxed">
            {question.question}
          </p>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {optionKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => !answered && onSelect(key)}
              disabled={answered}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 ${getOptionStyle(key)}`}
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  answered && key === question.correctAnswer
                    ? "bg-green-500 text-white"
                    : answered &&
                        key === selectedAnswer &&
                        key !== question.correctAnswer
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-500"
                }`}
              >
                {key}
              </span>
              <span className="text-sm flex-1">{question.options[key]}</span>
              {getOptionIcon(key)}
            </button>
          ))}
        </div>

        {answered && (
          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={onShowExplanation}
              className="w-full py-2.5 border-2 border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
            >
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Correct Answer Explained
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 mt-8">
        <button
          type="button"
          onClick={onPrev}
          disabled={current === 0}
          className="w-12 h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
        >
          <ChevronLeft />
        </button>

        <span className="text-sm text-gray-500 font-medium min-w-[60px] text-center">
          {current + 1} / {total}
        </span>

        {isLast ? (
          <button
            type="button"
            onClick={onFinish}
            disabled={!answered}
            className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 flex items-center justify-center text-white transition cursor-pointer shadow-sm disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={current === total - 1}
            className="w-12 h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
          >
            <ChevronRight />
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400 font-medium">
        {total} questions total
      </p>

      <div className="flex gap-1.5 mt-4 flex-wrap justify-center max-w-xs">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === current
                ? "bg-blue-600"
                : i < current
                  ? "bg-gray-400"
                  : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function QuizPage() {
  const params = useParams();
  const urlSessionId = params?.id as string;

  // useRef to prevent Strict Mode double-firing the generate call
  const hasRun = useRef(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>(
    {},
  );
  const [showExplanation, setShowExplanation] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // ✅ Strict Mode guard — only run once even in dev double-invoke
    if (hasRun.current) return;
    hasRun.current = true;

    if (!urlSessionId) {
      setError(
        "No quiz session found. Please start a new quiz from the dashboard.",
      );
      setLoading(false);
      return;
    }

    const b64File = sessionStorage.getItem("quiz_file");
    const name = sessionStorage.getItem("quiz_filename");

    if (name) setFileName(name);

    if (b64File && name) {
      // Fresh quiz — file data is in sessionStorage
      // Don't remove it yet; generateAndPersist will clear it on success
      generateAndPersist(b64File, name, urlSessionId);
    } else {
      // Page refreshed or revisited — load from DB
      loadQuestionsFromDB(urlSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSessionId]);

  // ── Load from DB ──────────────────────────────────────────────────────────
  const loadQuestionsFromDB = async (sid: string) => {
    setLoading(true);
    try {
      const { data: session, error: sessionErr } = await supabase
        .from("quiz_sessions")
        .select("status, file_name")
        .eq("id", sid)
        .single();

      if (sessionErr) throw new Error("Quiz session not found.");
      if (session.status === "generating")
        throw new Error(
          "Quiz is still being generated. Please wait and refresh.",
        );
      if (session.status === "error")
        throw new Error(
          "Quiz generation failed. Please go back and try again.",
        );
      if (session.file_name) setFileName(session.file_name);
      // Bump last_visited so this session appears at top of history/recent
      await supabase
        .from("quiz_sessions")
        .update({ last_visited: new Date().toISOString() })
        .eq("id", sid);

      const { data, error: dbErr } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("session_id", sid)
        .order("question_order", { ascending: true });

      if (dbErr) throw dbErr;
      if (!data || data.length === 0)
        throw new Error("No questions found for this session.");

      const mappedQs = mapRows(data);
      setQuestions(mappedQs);

      // ── Restore previously saved answers so user can review their work ────
      const { data: savedAnswers } = await supabase
        .from("quiz_answers")
        .select("question_id, given_answer")
        .eq("session_id", sid);

      if (savedAnswers && savedAnswers.length > 0) {
        // Map question DB uuid → given_answer
        const answerByDbId: Record<string, "A" | "B" | "C" | "D"> = {};
        savedAnswers.forEach((a: any) => {
          answerByDbId[a.question_id] = a.given_answer;
        });

        // Map local question id (question_order) → given_answer
        const restored: Record<number, "A" | "B" | "C" | "D"> = {};
        mappedQs.forEach((q) => {
          if (q.dbId && answerByDbId[q.dbId]) {
            restored[q.id] = answerByDbId[q.dbId];
          }
        });
        if (Object.keys(restored).length > 0) {
          setAnswers(restored);
          // If all questions were answered before, go straight to results
          if (
            Object.keys(restored).length === mappedQs.length &&
            session.status === "finished"
          ) {
            setShowResults(true);
          }
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load quiz.");
    } finally {
      setLoading(false);
    }
  };

  // ── Generate via API then persist ─────────────────────────────────────────
  const generateAndPersist = async (
    base64File: string,
    name: string,
    sid: string,
  ) => {
    setLoading(true);
    setError("");
    try {
      // ✅ Deduplication guard: if the session is already ready or finished
      //    (e.g. Strict Mode second call), skip generation and load from DB.
      const { data: existing } = await supabase
        .from("quiz_sessions")
        .select("status")
        .eq("id", sid)
        .single();

      if (existing?.status === "ready" || existing?.status === "finished") {
        clearSessionStorage();
        await loadQuestionsFromDB(sid);
        return;
      }

      // Call the generate API
      const qs = await callGenerateAPI(base64File, name);

      // Persist questions to DB
      const rows = qs.map((q, i) => ({
        session_id: sid,
        question_order: i + 1,
        question: q.question,
        option_a: q.options.A,
        option_b: q.options.B,
        option_c: q.options.C,
        option_d: q.options.D,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        category: q.category,
        difficulty: q.difficulty,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from("quiz_questions")
        .insert(rows)
        .select("id, question_order");

      if (insertErr) throw insertErr;

      // Map DB UUIDs back onto questions
      const dbIdMap: Record<number, string> = {};
      (inserted ?? []).forEach((row) => {
        dbIdMap[row.question_order] = row.id;
      });

      setQuestions(qs.map((q, i) => ({ ...q, dbId: dbIdMap[i + 1] })));

      // Mark session as ready and bump last_visited
      await supabase
        .from("quiz_sessions")
        .update({
          status: "ready",
          total: qs.length,
          last_visited: new Date().toISOString(),
        })
        .eq("id", sid);

      // ✅ Only clear sessionStorage after successful generation
      clearSessionStorage();
    } catch (err: any) {
      setError(err.message || "Something went wrong generating the quiz.");
      await supabase
        .from("quiz_sessions")
        .update({ status: "error" })
        .eq("id", sid);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearSessionStorage = () => {
    sessionStorage.removeItem("quiz_file");
    sessionStorage.removeItem("quiz_filename");
    sessionStorage.removeItem("quiz_session_id");
  };

  const mapRows = (data: any[]): QuizQuestion[] =>
    data.map((row) => ({
      id: row.question_order,
      dbId: row.id,
      question: row.question,
      options: {
        A: row.option_a,
        B: row.option_b,
        C: row.option_c,
        D: row.option_d,
      },
      correctAnswer: row.correct_answer as "A" | "B" | "C" | "D",
      explanation: row.explanation,
      category: row.category,
      difficulty: row.difficulty,
    }));

  const callGenerateAPI = async (
    base64File: string,
    name: string,
  ): Promise<QuizQuestion[]> => {
    const byteString = atob(base64File.split(",")[1] ?? base64File);
    const mimeType = base64File.startsWith("data:")
      ? base64File.split(":")[1].split(";")[0]
      : "application/pdf";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++)
      ia[i] = byteString.charCodeAt(i);
    const file = new File([new Blob([ab], { type: mimeType })], name, {
      type: mimeType,
    });

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/generate-quiz", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate quiz");
    }
    const data = await res.json();
    return data.questions as QuizQuestion[];
  };

  // ── Answer handler ─────────────────────────────────────────────────────────
  const handleSelect = async (opt: "A" | "B" | "C" | "D") => {
    const q = questions[currentIndex];
    if (answers[q.id]) return;

    const isCorrect = opt === q.correctAnswer;
    setAnswers((prev) => ({ ...prev, [q.id]: opt }));

    if (urlSessionId && q.dbId) {
      await supabase.from("quiz_answers").upsert(
        {
          session_id: urlSessionId,
          question_id: q.dbId,
          given_answer: opt,
          is_correct: isCorrect,
        },
        { onConflict: "session_id,question_id" },
      );
    }
  };

  // ── Finish handler ─────────────────────────────────────────────────────────
  const handleFinish = async () => {
    const correct = questions.filter(
      (q) => answers[q.id] === q.correctAnswer,
    ).length;
    if (urlSessionId) {
      await supabase
        .from("quiz_sessions")
        .update({
          score: correct,
          total: questions.length,
          finished_at: new Date().toISOString(),
          status: "finished",
        })
        .eq("id", urlSessionId);
    }
    setShowResults(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setShowExplanation(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen fileName={fileName} />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 text-center max-w-sm">{error}</p>
        <Link
          href="/dashboard"
          className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          Go back to dashboard
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-sm">
          No quiz yet. Upload a file from the dashboard.
        </p>
        <Link
          href="/dashboard"
          className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (showResults) {
    return (
      <ResultsScreen
        questions={questions}
        answers={answers}
        onRetry={handleRetry}
      />
    );
  }

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id] ?? null;
  const answered = selectedAnswer !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition cursor-pointer"
        >
          <ChevronLeft />
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 truncate max-w-xs hidden sm:block">
            {fileName}
          </span>
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
            {questions.length} questions
          </span>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            {Object.keys(answers).length} / {questions.length} answered
          </span>
        </div>
      </header>

      <QuestionCard
        question={currentQuestion}
        current={currentIndex}
        total={questions.length}
        selectedAnswer={selectedAnswer}
        answered={answered}
        onSelect={handleSelect}
        onShowExplanation={() => setShowExplanation(true)}
        onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        onNext={() =>
          setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
        }
        onFinish={handleFinish}
      />

      {showExplanation && answered && (
        <ExplanationPopup
          question={currentQuestion}
          selectedAnswer={selectedAnswer!}
          onClose={() => {
            setShowExplanation(false);
            if (currentIndex < questions.length - 1) {
              setCurrentIndex((i) => i + 1);
            }
          }}
        />
      )}
    </div>
  );
}
