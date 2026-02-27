"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Flashcard {
  id: number;
  term: string;
  definition: string;
  hint: string;
  category: string;
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const HintIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-5 h-5" fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

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

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const GridIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
        <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Generating flashcards{".".repeat(dots)}
        </h2>
        <p className="text-sm text-gray-400">Analyzing <span className="font-medium text-gray-600">{fileName}</span></p>
        <p className="text-xs text-gray-400 mt-1">Gemini is reading your document and creating cards</p>
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

// ── Edit Mode ──────────────────────────────────────────────────────────────────
function EditMode({
  cards,
  onSave,
  onBack,
}: {
  cards: Flashcard[];
  onSave: (cards: Flashcard[]) => void;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState<Flashcard[]>(cards.map((c) => ({ ...c })));

  const updateCard = (id: number, field: keyof Flashcard, value: string) => {
    setEditing((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const addCard = () => {
    const newId = Math.max(...editing.map((c) => c.id)) + 1;
    setEditing((prev) => [...prev, { id: newId, term: "", definition: "", hint: "", category: "General" }]);
    setTimeout(() => {
      document.getElementById(`card-${newId}`)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const deleteCard = (id: number) => {
    if (editing.length <= 1) return;
    setEditing((prev) => prev.filter((c) => c.id !== id));
  };

  const addBelow = (afterId: number) => {
    const idx = editing.findIndex((c) => c.id === afterId);
    const newId = Math.max(...editing.map((c) => c.id)) + 1;
    const newCards = [...editing];
    newCards.splice(idx + 1, 0, { id: newId, term: "", definition: "", hint: "", category: "General" });
    setEditing(newCards);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition cursor-pointer">
          <ChevronLeft />
          Go Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={addCard}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-xl text-sm font-medium transition cursor-pointer"
          >
            <PlusIcon />
            Add Card
          </button>
          <button
            onClick={() => onSave(editing)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            <DownloadIcon />
            Save
          </button>
        </div>
      </header>

      {/* Cards */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {editing.map((card, idx) => (
          <div key={card.id} id={`card-${card.id}`}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">Card {idx + 1}</span>
                <StarIcon />
                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">{card.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => addBelow(card.id)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-blue-50">
                  <PlusIcon />
                  Add below
                </button>
                <button className="p-1.5 rounded-lg hover:bg-gray-200 transition cursor-pointer text-gray-400">
                  <GridIcon />
                </button>
                <button onClick={() => deleteCard(card.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition cursor-pointer">
                  <TrashIcon />
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Term <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={card.term}
                  onChange={(e) => updateCard(card.id, "term", e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition resize-none"
                  placeholder="Question or term..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Definition <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={card.definition}
                  onChange={(e) => updateCard(card.id, "definition", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition resize-none"
                  placeholder="Answer or definition..."
                />
              </div>
              <div>
                <button className="text-xs text-gray-400 hover:text-blue-600 transition cursor-pointer">
                  Show more options
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add card button at bottom */}
        <button
          onClick={addCard}
          className="w-full py-4 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-2xl text-sm text-gray-400 hover:text-blue-600 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <PlusIcon />
          Add another card
        </button>
      </div>
    </div>
  );
}

// ── Study Card ─────────────────────────────────────────────────────────────────
function StudyCard({
  card,
  current,
  total,
  starred,
  onStar,
  onPrev,
  onNext,
  onEdit,
}: {
  card: Flashcard;
  current: number;
  total: number;
  starred: boolean;
  onStar: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEdit: () => void;
}) {
  const [showHint, setShowHint] = useState(false);
  const [flipped, setFlipped] = useState(false);

  // Reset when card changes
  useEffect(() => {
    setShowHint(false);
    setFlipped(false);
  }, [card.id]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 px-4 py-10">
      {/* Category badge */}
      <div className="mb-4">
        <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          {card.category}
        </span>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped((f) => !f)}
        className="w-full max-w-2xl bg-white rounded-3xl border border-gray-200 shadow-sm cursor-pointer select-none"
        style={{ minHeight: "340px" }}
      >
        {/* Card top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowHint((v) => !v); }}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition cursor-pointer"
          >
            <HintIcon />
            Hint
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onStar(); }}
              className={`cursor-pointer transition ${starred ? "text-yellow-400" : "text-gray-300 hover:text-gray-500"}`}
            >
              <StarIcon filled={starred} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="text-gray-300 hover:text-gray-600 transition cursor-pointer"
            >
              <EditIcon />
            </button>
          </div>
        </div>

        {/* Card content */}
        <div className="flex flex-col items-center justify-center px-10 py-12 text-center min-h-[240px]">
          {!flipped ? (
            <>
              <p className="text-xl font-medium text-gray-900 leading-relaxed">
                {card.term}
              </p>
              {showHint && card.hint && (
                <p className="mt-6 text-sm text-gray-500 italic">
                  Hint: {card.hint}
                </p>
              )}
            </>
          ) : (
            <p className="text-lg text-gray-700 leading-relaxed">
              {card.definition}
            </p>
          )}
        </div>

        {/* Flip indicator */}
        <div className="pb-4 flex justify-center">
          <span className="text-xs text-gray-300">
            {flipped ? "Showing answer — click to see question" : "Click card to reveal answer"}
          </span>
        </div>
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

        <button
          onClick={onNext}
          disabled={current === total - 1}
          className="w-12 h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-4 flex-wrap justify-center max-w-xs">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === current ? "bg-blue-600" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [starred, setStarred] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"study" | "edit">("study");

  // Read file from sessionStorage (set by DashboardPage before navigating here)
  useEffect(() => {
    const storedFile = sessionStorage.getItem("flashcard_file");
    const storedName = sessionStorage.getItem("flashcard_filename");

    if (storedFile && storedName) {
      setFileName(storedName);
      generateFlashcards(storedFile, storedName);
      sessionStorage.removeItem("flashcard_file");
      sessionStorage.removeItem("flashcard_filename");
    }
  }, []);

  const generateFlashcards = async (base64File: string, name: string) => {
    setLoading(true);
    setError("");
    try {
      // Convert base64 back to blob
      const byteString = atob(base64File.split(",")[1] ?? base64File);
      const mimeType = base64File.startsWith("data:") ? base64File.split(":")[1].split(";")[0] : "application/pdf";
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType });
      const file = new File([blob], name, { type: mimeType });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate flashcards");
      }

      const data = await res.json();
      setCards(data.flashcards);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = (id: number) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-sm">No flashcards yet. Upload a file from the dashboard.</p>
        <Link href="/dashboard" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <EditMode
        cards={cards}
        onSave={(updated) => { setCards(updated); setMode("study"); }}
        onBack={() => setMode("study")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition">
          <ChevronLeft />
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{fileName}</span>
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{cards.length} cards</span>
          <button
            onClick={() => setMode("edit")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm text-gray-600 transition cursor-pointer"
          >
            <EditIcon />
            Edit all
          </button>
        </div>
      </header>

      {/* Study card */}
      <StudyCard
        card={cards[currentIndex]}
        current={currentIndex}
        total={cards.length}
        starred={starred.has(cards[currentIndex].id)}
        onStar={() => toggleStar(cards[currentIndex].id)}
        onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        onNext={() => setCurrentIndex((i) => Math.min(cards.length - 1, i + 1))}
        onEdit={() => setMode("edit")}
      />
    </div>
  );
}