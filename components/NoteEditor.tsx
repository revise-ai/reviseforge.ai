"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface NoteEditorProps {
  noteId?: string;
  initialName?: string;
}

export default function NoteEditor({
  noteId,
  initialName = "Untitled Note",
}: NoteEditorProps) {
  const [noteName, setNoteName] = useState(initialName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savedStatus, setSavedStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [secondsSaved, setSecondsSaved] = useState(0);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  // ── Voice state ──
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check voice support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  // Auto-save simulation
  const triggerSave = useCallback(() => {
    setSavedStatus("saving");
    setSecondsSaved(0);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSavedStatus("saved");
      setSecondsSaved(0);
    }, 1200);
  }, []);

  // Tick seconds since saved
  useEffect(() => {
    savedTickRef.current = setInterval(() => {
      if (savedStatus === "saved") {
        setSecondsSaved((s) => s + 1);
      }
    }, 1000);
    return () => {
      if (savedTickRef.current) clearInterval(savedTickRef.current);
    };
  }, [savedStatus]);

  // Focus name input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    triggerSave();
  };

  const handleLink = () => {
    const url = prompt("Enter URL:");
    if (url) execCmd("createLink", url);
  };

  // ── Voice handler ──
  const handleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim = transcript;
        }
      }
      // Append final transcript to editor
      if (finalTranscript && editorRef.current) {
        // Insert text at cursor position or append
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(finalTranscript));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          editorRef.current.innerText = (editorRef.current.innerText || "") + finalTranscript;
        }
        finalTranscript = "";
        triggerSave();
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    editorRef.current?.focus();
  };

  const handleAIPolish = async () => {
    const content = editorRef.current?.innerText || "";
    if (!content.trim()) return;
    setShowAIModal(true);
    setAiLoading(true);
    setAiResult("");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `You are a study notes editor. Polish and improve the following note text. Fix grammar, improve clarity, enhance explanations, and make it more structured and readable. Keep the same information but make it better written and easier to understand as a study note. Return only the improved text, no preamble.\n\nNote:\n${content}`,
            },
          ],
        }),
      });
      const data = await response.json();
      const text =
        data.content
          ?.map((b: { type: string; text?: string }) => b.text || "")
          .join("") || "";
      setAiResult(text);
    } catch {
      setAiResult("Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAIResult = () => {
    if (editorRef.current && aiResult) {
      editorRef.current.innerText = aiResult;
      triggerSave();
    }
    setShowAIModal(false);
    setAiResult("");
  };

  const savedLabel =
    savedStatus === "saving"
      ? "Saving..."
      : secondsSaved < 5
        ? "Saved just now"
        : `Saved ${secondsSaved}s ago`;

  const toolbarButtons = [
    { cmd: "bold", icon: <span className="font-bold text-sm">B</span>, title: "Bold" },
    { cmd: "italic", icon: <span className="italic text-sm">I</span>, title: "Italic" },
    { cmd: "underline", icon: <span className="underline text-sm">U</span>, title: "Underline" },
    { cmd: "strikeThrough", icon: <span className="line-through text-sm">S</span>, title: "Strikethrough" },
  ];

  const listButtons = [
    {
      cmd: "insertUnorderedList", title: "Bullet List",
      icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>),
    },
    {
      cmd: "insertOrderedList", title: "Numbered List",
      icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>),
    },
  ];

  const alignButtons = [
    {
      cmd: "justifyLeft", title: "Align Left",
      icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" /></svg>),
    },
    {
      cmd: "justifyCenter", title: "Align Center",
      icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" /></svg>),
    },
    {
      cmd: "justifyRight", title: "Align Right",
      icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" /></svg>),
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="cursor-pointer flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="w-px h-5 bg-gray-200" />

          {isEditingName ? (
            <input
              ref={nameInputRef}
              value={noteName}
              onChange={(e) => setNoteName(e.target.value)}
              onBlur={() => { setIsEditingName(false); triggerSave(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setIsEditingName(false); triggerSave(); } }}
              className="text-sm font-medium text-gray-800 border-b border-blue-400 outline-none bg-transparent px-1 w-48"
            />
          ) : (
            <button onClick={() => setIsEditingName(true)} className="cursor-pointer flex items-center gap-1.5 group">
              <span className="text-sm font-medium text-gray-800">{noteName}</span>
              <svg className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            {savedStatus === "saving" ? (
              <svg className="w-3.5 h-3.5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {savedLabel}
          </div>

          <button
            onClick={() => window.print()}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-6 py-2 bg-white border-b border-gray-200 shrink-0 flex-wrap">
        <select
          onChange={(e) => execCmd("formatBlock", e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none focus:border-blue-400 cursor-pointer mr-1"
          defaultValue="p"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {toolbarButtons.map((btn) => (
          <button key={btn.cmd} onMouseDown={(e) => { e.preventDefault(); execCmd(btn.cmd); }} title={btn.title}
            className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
            {btn.icon}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {listButtons.map((btn) => (
          <button key={btn.cmd} onMouseDown={(e) => { e.preventDefault(); execCmd(btn.cmd); }} title={btn.title}
            className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
            {btn.icon}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {alignButtons.map((btn) => (
          <button key={btn.cmd} onMouseDown={(e) => { e.preventDefault(); execCmd(btn.cmd); }} title={btn.title}
            className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
            {btn.icon}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <button onMouseDown={(e) => { e.preventDefault(); handleLink(); }} title="Insert Link"
          className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <button onMouseDown={(e) => { e.preventDefault(); execCmd("undo"); }} title="Undo"
          className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
          </svg>
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd("redo"); }} title="Redo"
          className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6M21 10l-6-6" />
          </svg>
        </button>

        {/* ── Right side: Voice + AI Polish ── */}
        <div className="ml-auto flex items-center gap-2">

          {/* Voice button */}
          {voiceSupported && (
            <button
              onClick={handleVoice}
              title={isListening ? "Stop voice input" : "Dictate with voice"}
              className={`cursor-pointer flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95 shadow-sm ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {isListening ? (
                <>
                  {/* Animated mic — pulsing dot */}
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-50 animate-ping" />
                    <svg className="w-3.5 h-3.5 relative" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/>
                    </svg>
                  </span>
                  Stop
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z"/>
                  </svg>
                  Voice
                </>
              )}
            </button>
          )}

          {/* AI Polish button */}
          <button
            onClick={handleAIPolish}
            className="cursor-pointer flex items-center gap-2 px-4 py-1.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Polish with AI
          </button>
        </div>
      </div>

      {/* ── Editor Area ── */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Live voice indicator banner */}
          {isListening && (
            <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              Listening… speak now and your words will appear in the note
            </div>
          )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={triggerSave}
            className="min-h-150 bg-white rounded-2xl shadow-sm border border-gray-200 px-10 py-10 text-gray-800 text-sm leading-7 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            data-placeholder="Start typing your notes here… or click Voice to dictate"
          />
        </div>
      </div>

      {/* ── AI Polish Modal ── */}
      {showAIModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => { if (!aiLoading) setShowAIModal(false); }} />
          <div className="fixed inset-0 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="px-7 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Polish with AI</p>
                    <p className="text-xs text-gray-400">Improves grammar, clarity and structure</p>
                  </div>
                </div>
                {!aiLoading && (
                  <button onClick={() => setShowAIModal(false)} className="cursor-pointer text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="px-7 py-5">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Polishing your notes...</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 max-h-72 overflow-y-auto text-sm text-gray-700 leading-7 whitespace-pre-wrap" style={{ fontFamily: "Georgia, serif" }}>
                    {aiResult}
                  </div>
                )}
              </div>

              {!aiLoading && aiResult && (
                <div className="px-7 pb-6 flex gap-3">
                  <button onClick={applyAIResult} className="cursor-pointer flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95">
                    Replace my note with this
                  </button>
                  <button onClick={() => setShowAIModal(false)} className="cursor-pointer px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 rounded-xl transition-all">
                    Keep original
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}