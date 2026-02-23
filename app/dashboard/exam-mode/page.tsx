"use client";

import React, { useState } from "react";
import Link from "next/link";
import ExamModeModal from "@/components/ExamModeModal";

type ExamStatus = "idle" | "active" | "complete";

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: number;
}

const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "What is the primary purpose of mitochondria in a cell?",
    options: ["Protein synthesis", "Energy production (ATP)", "DNA replication", "Cell division"],
    answer: 1,
  },
  {
    id: 2,
    question: "Which of the following is NOT a primary color of light?",
    options: ["Red", "Green", "Yellow", "Blue"],
    answer: 2,
  },
  {
    id: 3,
    question: "In which year did World War II end?",
    options: ["1943", "1944", "1945", "1946"],
    answer: 2,
  },
  {
    id: 4,
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    answer: 2,
  },
  {
    id: 5,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Jupiter", "Saturn", "Mars"],
    answer: 3,
  },
];

const EXAM_DURATION_SECONDS = 10 * 60;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ExamModePage() {
  // Modal auto-opens the moment the page loads
  const [showModal, setShowModal] = useState(true);
  const [examReady, setExamReady] = useState(false);

  const [status, setStatus] = useState<ExamStatus>("idle");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [timerRef, setTimerRef] = useState<NodeJS.Timeout | null>(null);

  const questions = MOCK_QUESTIONS;
  const totalQ = questions.length;

  // User uploaded files and clicked "Start Exam" inside the modal
  const handleModalReady = () => {
    setShowModal(false);
    setExamReady(true);
  };

  // User dismissed modal without uploading
  const handleModalClose = () => {
    setShowModal(false);
  };

  const startExam = () => {
    setStatus("active");
    setCurrent(0);
    setAnswers({});
    setTimeLeft(EXAM_DURATION_SECONDS);

    const ref = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(ref);
          setStatus("complete");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerRef(ref);
  };

  const selectAnswer = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questions[current].id]: optionIndex }));
  };

  const goNext = () => {
    if (current < totalQ - 1) {
      setCurrent((c) => c + 1);
    } else {
      if (timerRef) clearInterval(timerRef);
      setStatus("complete");
    }
  };

  const goPrev = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const score = questions.filter((q) => answers[q.id] === q.answer).length;
  const pct = Math.round((score / totalQ) * 100);
  const timerDanger = timeLeft < 60;

  return (
    <>
      {/* Modal auto-shown on page load */}
      <ExamModeModal
        show={showModal}
        onClose={handleModalClose}
        onReady={handleModalReady}
      />

      {/* No material uploaded — user closed modal without files */}
      {!showModal && !examReady && (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No material uploaded</h2>
            <p className="text-gray-400 text-sm mb-6">Upload your study material to generate an exam.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-medium rounded-xl text-sm cursor-pointer"
              >
                Upload Material
              </button>
              <Link href="/dashboard" className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium rounded-xl text-sm text-center transition-all">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </main>
      )}

      {/* IDLE — files uploaded, exam not yet started */}
      {!showModal && examReady && status === "idle" && (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-xl text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-gray-800 mb-2">Ready for your Exam?</h1>
            <p className="text-gray-400 text-sm mb-8">
              Your study material has been processed. Take a deep breath and begin when you're ready.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: "Questions", value: `${totalQ}`, icon: "📝" },
                { label: "Duration", value: "10 min", icon: "⏱️" },
                { label: "Feedback", value: "Instant", icon: "⚡" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <p className="text-xl font-bold text-gray-800">{item.value}</p>
                  <p className="text-xs text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={startExam}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-semibold text-base rounded-2xl shadow-md cursor-pointer"
            >
              Start Exam →
            </button>
            <Link href="/dashboard" className="block mt-4 text-sm text-gray-400 hover:text-gray-600 transition">
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      )}

      {/* ACTIVE — exam in progress */}
      {!showModal && examReady && status === "active" && (() => {
        const q = questions[current];
        const selectedAnswer = answers[q.id];
        const progress = ((current + 1) / totalQ) * 100;
        return (
          <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-start px-4 py-10">
            <div className="w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-gray-400 font-medium">Question {current + 1} of {totalQ}</span>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-semibold text-sm transition-colors ${
                  timerDanger ? "bg-red-100 text-red-600" : "bg-indigo-100 text-blue-700"
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div className="h-1.5 bg-gray-200 rounded-full mb-8 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
                <p className="text-lg font-semibold text-gray-800 leading-relaxed mb-6">{q.question}</p>
                <div className="space-y-3">
                  {q.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectAnswer(idx)}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 text-sm font-medium cursor-pointer
                        ${selectedAnswer === idx
                          ? "border-blue-500 bg-indigo-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-gray-50"
                        }`}
                    >
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 transition-colors ${
                        selectedAnswer === idx ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={goPrev}
                  disabled={current === 0}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  ← Previous
                </button>
                <div className="flex gap-1.5">
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        i === current ? "bg-blue-500 w-4" : answers[questions[i].id] !== undefined ? "bg-indigo-200 w-2" : "bg-gray-200 w-2"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={goNext}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white rounded-xl text-sm font-medium cursor-pointer"
                >
                  {current === totalQ - 1 ? "Submit Exam" : "Next →"}
                </button>
              </div>
            </div>
          </main>
        );
      })()}

      {/* COMPLETE — results */}
      {!showModal && examReady && status === "complete" && (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-xl text-center">
            <div className="relative w-36 h-36 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="#E5E7EB" strokeWidth="10" fill="none" />
                <circle
                  cx="50" cy="50" r="42"
                  stroke={pct >= 70 ? "#6366F1" : pct >= 50 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="10" fill="none"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">{pct}%</span>
                <span className="text-xs text-gray-400">Score</span>
              </div>
            </div>

            <h1 className="text-2xl font-semibold text-gray-800 mb-1">
              {pct >= 70 ? "Great work! " : pct >= 50 ? "Good effort! " : "Keep studying! "}
            </h1>
            <p className="text-gray-400 text-sm mb-8">
              You answered {score} out of {totalQ} questions correctly
            </p>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 text-left space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Review</h3>
              {questions.map((q, i) => {
                const userAns = answers[q.id];
                const isCorrect = userAns === q.answer;
                return (
                  <div key={q.id} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCorrect ? "bg-green-100" : "bg-red-100"}`}>
                      {isCorrect ? (
                        <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 font-medium">{i + 1}. {q.question}</p>
                      {!isCorrect && (
                        <p className="text-xs text-green-600 mt-0.5">Correct: {q.options[q.answer]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={startExam}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-semibold rounded-xl text-sm cursor-pointer"
              >
                Retake Exam
              </button>
              <Link href="/dashboard" className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-xl text-sm text-center transition-all">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </main>
      )}
    </>
  );
}