"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Mode = "youtube" | "microphone" | "browsertab";

// ─── Sidebar panel data (same for both YouTube and Recording) ──────────────────

const panels = [
 
  {
    label: "Summary",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#4B9CF5" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: "Quiz",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#E05252" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Flashcards",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#E07B39" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
 {
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

// ─── Right Sidebar ─────────────────────────────────────────────────────────────

function RightSidebar({
  open,
  onToggle,
  mode,
  isChat,
}: {
  open: boolean;
  onToggle: () => void;
  mode: Mode;
  isChat: boolean;
}) {
  const isRecording = mode === "microphone" || mode === "browsertab";

  return (
    <>
      {/* When closed: floating open button on right edge */}
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

      {/* Sidebar panel */}
      <div
        className={`relative flex flex-col border-l border-gray-200 bg-white transition-all duration-300 ease-in-out shrink-0 ${open ? "w-130" : "w-0 overflow-hidden"}`}
      >
        {/* Toggle button when open */}
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
            {/* Header — "Learn Tab" with green dot */}
            <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-gray-100">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-sm font-medium text-gray-700">StudyForge</span>
             
            </div>

            {/* Generate label */}
            <div className="px-5 pt-4 pb-3">
              <p className="text-xs text-gray-400 font-medium tracking-wide">Generate</p>
            </div>

            {/* Tool grid — 2 columns, same for both modes */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {!isRecording ? (
                // YouTube: full clickable cards
                <div className="grid grid-cols-2 gap-2">
                  {panels.map((p) => (
                    <button
                      key={p.label}
                      className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer text-left group"
                    >
                      <span className="shrink-0">{p.icon}</span>
                      <span className="text-sm text-gray-700 font-medium leading-tight">
                        {p.label}
                       
                      </span>
                      <span className="ml-auto text-gray-300 group-hover:text-gray-400 shrink-0">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                // Recording: dimmed icon grid + message
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {panels.map((p) => (
                      <div
                        key={p.label}
                        className="flex items-center gap-2.5 px-3 py-3.5 rounded-xl border border-gray-100 bg-white opacity-40"
                      >
                        <span className="shrink-0">{p.icon}</span>
                        <span className="text-sm text-gray-500 font-medium leading-tight">
                          {p.label}
                          
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 px-1 pt-1">Finish a recording to generate study tools</p>
                </div>
              )}
            </div>

            {/* Bottom input — only for YouTube and Recording, not chat */}
            {!isChat && (
            <div className="px-4 py-4 border-t border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 focus-within:border-gray-300 transition-colors">
                <input
                  type="text"
                  placeholder="Learn anything"
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                />
                <button className="shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer transition">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── YouTube View ──────────────────────────────────────────────────────────────

function YoutubeView({ url }: { url: string }) {
  const [activeTab, setActiveTab] = useState<"chapters" | "transcripts">("chapters");
  const videoId = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1] ?? "";

  const mockChapters = [
    { time: "00:00", title: "Introduction to Vibe Code", text: "In the inaugural episode of 'Vibe Code with me the right way,' the host introduces a beginner-friendly AI coding series aimed at developers looking to modernise their workflow using AI tools." },
    { time: "05:22", title: "Setting Up Your Environment", text: "Walk through installing all the necessary tools and configuring your development environment from scratch." },
    { time: "12:40", title: "Building the Core Features", text: "Start building the main features of the app, focusing on clean architecture and AI-assisted code generation." },
    { time: "24:15", title: "Connecting the Database", text: "Set up and connect a database, covering schema design and basic queries." },
    { time: "35:50", title: "Deploying the Application", text: "Deploy the finished app to production, covering environment variables, build steps, and hosting." },
  ];

  const mockTranscripts = [
    { time: "00:00", text: "Hey everyone, welcome back. Today we're going to be building something really exciting — a full stack app using AI tools the right way." },
    { time: "00:18", text: "A lot of people vibe code but they don't have the right foundations. So in this series I'm going to show you how to do it properly." },
    { time: "00:42", text: "We're going to be using Next.js, Supabase, and Cursor as our main tools throughout this entire series." },
    { time: "01:10", text: "By the end of this episode you're going to have a working scaffold and understand the project structure we'll be building on." },
    { time: "02:05", text: "Let's start by setting up our Next.js project. I'll walk you through every step so don't worry if you're new to this." },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Video — padded and rounded */}
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

      {/* Tabs + controls */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chapters" ? (
          <div className="divide-y divide-gray-50">
            {mockChapters.map((item, i) => (
              <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <p className="text-xs text-gray-400 font-mono mb-1">{item.time}</p>
                <p className="text-sm font-semibold text-gray-800 mb-1">{item.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {mockTranscripts.map((item, i) => (
              <div key={i} className="px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                <p className="text-xs font-mono text-gray-400 mb-1">{item.time}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Recording View ────────────────────────────────────────────────────────────

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleStartStop = async () => {
    if (!isRecording && isBrowserTab) {
      try {
        await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      } catch (e) {
        return;
      }
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
      {/* Recording bar */}
      <div className="px-5 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleStartStop}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {isRecording ? (
              <>
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />
                Stop Recording
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                {isBrowserTab ? "Start Recording Tab" : "Start Recording"}
              </>
            )}
          </button>

          {/* Waveform */}
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

      {/* Help */}
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

      {/* Tabs */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chapters" ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <p className="text-sm text-gray-400">
              {isRecording ? "Recording… chapters will appear here" : "Start recording to view chapters"}
            </p>
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


// ─── Chat View ─────────────────────────────────────────────────────────────────

function ChatView({ initialQuery, uploadedFile }: { initialQuery: string; uploadedFile: string }) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>(() => {
    const msgs: { role: "user" | "ai"; text: string }[] = [];
    if (uploadedFile) {
      msgs.push({ role: "user", text: `Uploaded: ${uploadedFile}` });
      msgs.push({ role: "ai", text: `I've received your file **${uploadedFile}**. I can summarize it, generate flashcards, create a quiz, or answer questions about it. What would you like to do?` });
    } else if (initialQuery) {
      msgs.push({ role: "user", text: initialQuery });
      msgs.push({ role: "ai", text: `Hi! I'm your AI study assistant. You said: "${initialQuery}". How can I help you study this topic? I can create flashcards, generate a quiz, summarize content, or just chat about it.` });
    } else {
      msgs.push({ role: "ai", text: "Hi! I'm your AI study assistant. Paste a YouTube link, upload a document, or ask me anything to get started." });
    }
    return msgs;
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "ai", text: `Got it! Working on: "${text}". This is where the AI response will appear once connected to your backend.` },
    ]);
    setInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: `Uploaded: ${file.name}` },
      { role: "ai", text: `I've received **${file.name}**. I can summarize it, generate flashcards, create a quiz, or answer questions about it. What would you like to do?` },
    ]);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Messages */}
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
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gray-900 text-white rounded-tr-sm"
                  : "bg-gray-50 border border-gray-100 text-gray-700 rounded-tl-sm"
              }`}
            >
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

      {/* Input bar */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-300 transition-colors">
          {/* Upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            title="Upload file"
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
            placeholder="Ask anything, or paste a YouTube link..."
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
          />
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
        </div>
      </div>
    </div>
  );
}

// ─── Main ContentPage ──────────────────────────────────────────────────────────

export default function Contentpages() {
  const params = useSearchParams();
  const mode = (params.get("mode") as Mode) ?? "youtube";
  const url = params.get("url") ?? "";
  const initialQuery = params.get("q") ?? "";
  const uploadedFile = params.get("file") ?? "";

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isRecording = mode === "microphone" || mode === "browsertab";
  const isChat = mode === "chat";

  const title = isRecording
    ? `Recording at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : isChat
    ? (initialQuery || uploadedFile || "Chat")
    : url
    ? url.replace("https://", "").replace("www.", "").slice(0, 70)
    : "Content";

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">

      {/* Top Nav */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 cursor-pointer transition-colors shrink-0">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700 truncate">{title}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard">
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer transition-all">
              ← Dashboard
            </button>
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main */}
        <div className="flex-1 overflow-hidden min-w-0">
          {!isRecording && !isChat && <YoutubeView url={url} />}
          {isRecording && <RecordingView mode={mode as "microphone" | "browsertab"} />}
          {isChat && <ChatView initialQuery={initialQuery} uploadedFile={uploadedFile} />}
        </div>

        {/* Right sidebar */}
        <RightSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          mode={mode}
          isChat={isChat}
        />
      </div>
    </div>
  );
}