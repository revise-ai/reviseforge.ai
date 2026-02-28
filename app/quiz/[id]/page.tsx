"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────
interface QuizQuestion {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  category: string;
  difficulty: string;
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const ChevronLeft = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const ChevronRight = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
        <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Generating quiz{".".repeat(dots)}
        </h2>
        <p className="text-sm text-gray-400">Analyzing <span className="font-medium text-gray-600">{fileName}</span></p>
        <p className="text-xs text-gray-400 mt-1">Building 30 difficult MCQs from your document</p>
      </div>
      <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full animate-[loading_2s_ease-in-out_infinite]" />
      </div>
      <style>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
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
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${isCorrect ? "bg-green-50 border-b border-green-100" : "bg-red-50 border-b border-red-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
              {isCorrect ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-semibold text-sm ${isCorrect ? "text-green-800" : "text-red-800"}`}>
                {isCorrect ? "Correct!" : "Incorrect"}
              </p>
              {!isCorrect && (
                <p className="text-xs text-red-600 mt-0.5">
                  Correct answer: <span className="font-bold">{question.correctAnswer}. {question.options[question.correctAnswer]}</span>
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition cursor-pointer p-1 rounded-lg hover:bg-white/60">
            <CloseIcon />
          </button>
        </div>

        {/* Explanation */}
        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Explanation
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">{question.explanation}</p>
        </div>

        <div className="px-6 pb-5">
          <button
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

// ── Results Screen ─────────────────────────────────────────────────────────────
function ResultsScreen({
  questions,
  answers,
  fileName,
  onRetry,
}: {
  questions: QuizQuestion[];
  answers: Record<number, "A" | "B" | "C" | "D">;
  fileName: string;
  onRetry: () => void;
}) {
  const correct = questions.filter((q) => answers[q.id] === q.correctAnswer).length;
  const total = questions.length;
  const pct = Math.round((correct / total) * 100);

  const grade =
    pct >= 90 ? { label: "Excellent", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" } :
    pct >= 75 ? { label: "Good", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" } :
    pct >= 60 ? { label: "Needs Work", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" } :
    { label: "Try Again", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Score card */}
        <div className={`bg-white rounded-3xl border ${grade.border} shadow-sm p-8 text-center mb-6`}>
          <div className={`w-20 h-20 rounded-full ${grade.bg} flex items-center justify-center mx-auto mb-4`}>
            <span className={`text-2xl font-bold ${grade.color}`}>{pct}%</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">{grade.label}</h2>
          <p className="text-gray-400 text-sm">{correct} out of {total} questions correct</p>

          {/* Progress bar */}
          <div className="mt-6 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                pct >= 75 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Quick review */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Question Review</h3>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
            {questions.map((q, i) => {
              const correct = answers[q.id] === q.correctAnswer;
              return (
                <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs text-gray-400 shrink-0 w-5">{i + 1}</span>
                  <p className="text-xs text-gray-600 truncate flex-1">{q.question}</p>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${correct ? "bg-green-100" : "bg-red-100"}`}>
                    {correct ? (
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onRetry}
            className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold transition cursor-pointer active:scale-95">
            Try Again
          </button>
          <Link href="/dashboard"
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition text-center active:scale-95">
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
    if (!answered || selectedAnswer !== key) {
      // Not yet answered or not this option
      if (selectedAnswer === key && !answered) {
        return "border-blue-400 bg-blue-50 text-gray-800";
      }
      return "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700 cursor-pointer";
    }
    // Answered
    if (key === question.correctAnswer) {
      return "border-green-500 bg-green-50 text-green-800 ring-2 ring-green-200";
    }
    if (key === selectedAnswer) {
      return "border-red-500 bg-red-50 text-red-800 ring-2 ring-red-200";
    }
    return "border-gray-200 bg-white text-gray-400";
  };

  const getOptionIcon = (key: "A" | "B" | "C" | "D") => {
    if (!answered) return null;
    if (key === question.correctAnswer) {
      return (
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    if (key === selectedAnswer) {
      return (
        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 px-4 py-10">
      {/* Category badge */}
      <div className="mb-4">
        <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          {question.category}
        </span>
      </div>

      {/* Question card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-gray-200 shadow-sm">
        {/* Question number + difficulty */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Question {current + 1}
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium uppercase tracking-wide">
            Hard
          </span>
        </div>

        {/* Question text */}
        <div className="px-6 pt-4 pb-5">
          <p className="text-lg font-medium text-gray-900 leading-relaxed">
            {question.question}
          </p>
        </div>

        {/* Options */}
        <div className="px-6 pb-6 space-y-3">
          {optionKeys.map((key) => (
            <button
              key={key}
              onClick={() => !answered && onSelect(key)}
              disabled={answered}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 ${getOptionStyle(key)}`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                answered && key === question.correctAnswer ? "bg-green-500 text-white" :
                answered && key === selectedAnswer && key !== question.correctAnswer ? "bg-red-500 text-white" :
                "bg-gray-100 text-gray-500"
              }`}>
                {key}
              </span>
              <span className="text-sm flex-1">{question.options[key]}</span>
              {getOptionIcon(key)}
            </button>
          ))}
        </div>

        {/* Explain button — only shows after answering */}
        {answered && (
          <div className="px-6 pb-6">
            <button
              onClick={onShowExplanation}
              className="w-full py-2.5 border-2 border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Correct Answer Explained
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-6 mt-8">
        <button
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
            onClick={onFinish}
            disabled={!answered}
            className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 flex items-center justify-center text-white transition cursor-pointer shadow-sm disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={current === total - 1}
            className="w-12 h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {/* Total count below navigation */}
      <p className="mt-3 text-xs text-gray-400 font-medium">
        {total} questions total
      </p>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-4 flex-wrap justify-center max-w-xs">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === current ? "bg-blue-600" :
              i < current ? "bg-gray-400" :
              "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const storedFile = sessionStorage.getItem("quiz_file");
    const storedName = sessionStorage.getItem("quiz_filename");
    if (storedFile && storedName) {
      setFileName(storedName);
      generateQuiz(storedFile, storedName);
      sessionStorage.removeItem("quiz_file");
      sessionStorage.removeItem("quiz_filename");
    }
  }, []);

  const generateQuiz = async (base64File: string, name: string) => {
    setLoading(true);
    setError("");
    try {
      const byteString = atob(base64File.split(",")[1] ?? base64File);
      const mimeType = base64File.startsWith("data:") ? base64File.split(":")[1].split(";")[0] : "application/pdf";
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeType });
      const file = new File([blob], name, { type: mimeType });
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/generate-quiz", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate quiz");
      }
      const data = await res.json();
      setQuestions(data.questions);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (opt: "A" | "B" | "C" | "D") => {
    const q = questions[currentIndex];
    if (answers[q.id]) return;
    setAnswers((prev) => ({ ...prev, [q.id]: opt }));
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setShowExplanation(false);
  };

  if (loading) return <LoadingScreen fileName={fileName} />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Something went wrong</h2>
        <p className="text-sm text-gray-500 text-center max-w-sm">{error}</p>
        <Link href="/dashboard" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Go back to dashboard
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-sm">No quiz yet. Upload a file from the dashboard.</p>
        <Link href="/dashboard" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (showResults) {
    return <ResultsScreen questions={questions} answers={answers} fileName={fileName} onRetry={handleRetry} />;
  }

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id] ?? null;
  const answered = selectedAnswer !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition cursor-pointer">
          <ChevronLeft />
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 truncate max-w-xs hidden sm:block">{fileName}</span>
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
            {questions.length} questions
          </span>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            {Object.keys(answers).length} / {questions.length} answered
          </span>
        </div>
      </header>

      {/* Question */}
      <QuestionCard
        question={currentQuestion}
        current={currentIndex}
        total={questions.length}
        selectedAnswer={selectedAnswer}
        answered={answered}
        onSelect={handleSelect}
        onShowExplanation={() => setShowExplanation(true)}
        onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        onNext={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
        onFinish={() => setShowResults(true)}
      />

      {/* Explanation popup */}
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