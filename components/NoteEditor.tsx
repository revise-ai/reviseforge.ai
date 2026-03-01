"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface NoteEditorProps {
  noteId?: string;
  initialName?: string;
}

// ── Polish mode type ──
type PolishMode = "choose" | "polish-only" | "polish-resource" | "result";

export default function NoteEditor({
  noteId,
  initialName = "Untitled Note",
}: NoteEditorProps) {
  const [noteName, setNoteName] = useState(initialName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savedStatus, setSavedStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [secondsSaved, setSecondsSaved] = useState(0);

  // ── AI Polish state ──
  const [showAIModal, setShowAIModal] = useState(false);
  const [polishStep, setPolishStep] = useState<PolishMode>("choose");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");

  // ── Resource upload state ──
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceType, setResourceType] = useState<"file" | "youtube" | null>(null);
  const [youtubeLink, setYoutubeLink] = useState("");
  const resourceInputRef = useRef<HTMLInputElement>(null);

  // ── Voice state ──
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  const triggerSave = useCallback(() => {
    setSavedStatus("saving");
    setSecondsSaved(0);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSavedStatus("saved");
      setSecondsSaved(0);
    }, 1200);
  }, []);

  useEffect(() => {
    savedTickRef.current = setInterval(() => {
      if (savedStatus === "saved") setSecondsSaved((s) => s + 1);
    }, 1000);
    return () => { if (savedTickRef.current) clearInterval(savedTickRef.current); };
  }, [savedStatus]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => { return () => { recognitionRef.current?.stop(); }; }, []);

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    triggerSave();
  };

  const handleLink = () => {
    const url = prompt("Enter URL:");
    if (url) execCmd("createLink", url);
  };

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
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript + " ";
      }
      if (finalTranscript && editorRef.current) {
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
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    editorRef.current?.focus();
  };

  // ── Open the AI modal ──
  const handleAIPolish = () => {
    setShowAIModal(true);
    setPolishStep("choose");
    setAiResult("");
    setAiError("");
    setResourceFile(null);
    setResourceType(null);
    setYoutubeLink("");
  };

  // ── POLISH ONLY — prompt lives in /api/gemini-polish ──
  const runPolishOnly = async () => {
    const noteContent = editorRef.current?.innerText || "";
    if (!noteContent.trim()) {
      setAiError("Your note is empty. Write something first.");
      return;
    }
    setPolishStep("result");
    setAiLoading(true);
    setAiResult("");
    setAiError("");

    try {
      const response = await fetch("/api/gemini-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "polish-only",
          noteContent,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to polish");
      const text = data.result || "";
      if (!text) throw new Error("Empty response");
      setAiResult(text);
    } catch (err: any) {
      setAiError(err.message || "Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // ── POLISH WITH RESOURCE — prompt lives in /api/gemini-polish ──
  const runPolishWithResource = async () => {
    const noteContent = editorRef.current?.innerText || "";
    if (!noteContent.trim()) {
      setAiError("Your note is empty. Write something first.");
      return;
    }
    if (!resourceFile && !youtubeLink.trim()) return;

    setPolishStep("result");
    setAiLoading(true);
    setAiResult("");
    setAiError("");

    try {
      let resourceParts: any[] = [];

      if (resourceType === "youtube") {
        resourceParts = [{ fileData: { fileUri: youtubeLink.trim() } }];
      } else if (resourceFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(resourceFile);
        });
        resourceParts = [{
          inlineData: {
            mimeType: resourceFile.type || "application/pdf",
            data: base64,
          },
        }];
      }

      const response = await fetch("/api/gemini-polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "polish-resource",
          noteContent,
          resourceParts,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to polish with resource");
      setAiResult(data.result || "");
    } catch (err: any) {
      setAiError(err.message || "Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Apply result to editor ──
  const applyAIResult = () => {
    if (editorRef.current && aiResult) {
      editorRef.current.innerText = aiResult;
      triggerSave();
    }
    closeModal();
  };

  const closeModal = () => {
    if (aiLoading) return;
    setShowAIModal(false);
    setPolishStep("choose");
    setAiResult("");
    setAiError("");
    setResourceFile(null);
    setResourceType(null);
    setYoutubeLink("");
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
          {voiceSupported && (
            <button
              onClick={handleVoice}
              title={isListening ? "Stop voice input" : "Dictate with voice"}
              className={`cursor-pointer flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95 shadow-sm ${
                isListening ? "bg-red-500 hover:bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {isListening ? (
                <>
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-50 animate-ping" />
                    <svg className="w-3.5 h-3.5 relative" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
                    </svg>
                  </span>
                  Stop
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
                  </svg>
                  Voice
                </>
              )}
            </button>
          )}

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

      {/* ════════════════════════════════════════════
          AI POLISH MODAL
      ════════════════════════════════════════════ */}
      {showAIModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={closeModal} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>

              {/* Modal Header */}
              <div className="px-7 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Polish with AI</p>
                    <p className="text-xs text-gray-400">
                      {polishStep === "choose" && "Choose how you want to polish your note"}
                      {polishStep === "polish-only" && "Clean up your writing with AI"}
                      {polishStep === "polish-resource" && "Enrich your note using a resource"}
                      {polishStep === "result" && (aiLoading ? "Polishing your note..." : "Your polished note is ready")}
                    </p>
                  </div>
                </div>
                {!aiLoading && (
                  <button onClick={closeModal} className="cursor-pointer text-gray-400 hover:text-gray-600 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* ── STEP 1: Choose mode ── */}
              {polishStep === "choose" && (
                <div className="px-7 py-6 space-y-3">
                  <button
                    onClick={() => setPolishStep("polish-only")}
                    className="cursor-pointer w-full text-left border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl px-5 py-4 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                        <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Polish only</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                          AI cleans and improves what you've already written — fixes spelling, grammar, clarity and flow. No resource needed.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPolishStep("polish-resource")}
                    className="cursor-pointer w-full text-left border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl px-5 py-4 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                        <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Polish with resource</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                          Upload a PDF, audio file, or paste a YouTube link — AI enriches and expands your note using the resource without deleting anything you wrote.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* ── STEP 2a: Polish Only confirm ── */}
              {polishStep === "polish-only" && (
                <div className="px-7 py-6">
                  <div className="bg-gray-50 rounded-xl px-5 py-4 mb-5">
                    <p className="text-xs font-semibold text-gray-700 mb-2">What AI will do:</p>
                    <ul className="space-y-1.5">
                      {[
                        "Fix all spelling and grammar mistakes",
                        "Improve sentence clarity and flow",
                        "Make the writing more structured and readable",
                        "Keep all your original content — nothing gets deleted",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPolishStep("choose")}
                      className="cursor-pointer px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-sm text-gray-500 rounded-xl transition-all">
                      ← Back
                    </button>
                    <button onClick={runPolishOnly}
                      className="cursor-pointer flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95">
                      Polish my note
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2b: Polish with Resource ── */}
              {polishStep === "polish-resource" && (
                <div className="px-7 py-6">
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    Upload your study resource and AI will use it to expand and enrich your note — adding detail, definitions, and explanations from the resource without removing your existing content.
                  </p>

                  <div className="flex gap-2 mb-4">
                    {[
                      { type: "file" as const, label: "PDF / Audio", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                      { type: "youtube" as const, label: "YouTube", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                    ].map((opt) => (
                      <button key={opt.type}
                        onClick={() => { setResourceType(opt.type); setResourceFile(null); setYoutubeLink(""); }}
                        className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all ${
                          resourceType === opt.type
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opt.icon} />
                        </svg>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {resourceType === "file" && (
                    <div
                      onClick={() => resourceInputRef.current?.click()}
                      className="cursor-pointer border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl px-5 py-6 flex flex-col items-center gap-2 transition-all mb-4"
                    >
                      {resourceFile ? (
                        <>
                          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-xs font-semibold text-gray-700 text-center truncate max-w-xs">{resourceFile.name}</p>
                          <p className="text-[10px] text-gray-400">Click to change file</p>
                        </>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <p className="text-xs text-gray-500 font-medium">Click to upload PDF or audio file</p>
                          <p className="text-[10px] text-gray-400">.pdf, .mp3, .mp4, .wav, .m4a supported</p>
                        </>
                      )}
                      <input
                        ref={resourceInputRef}
                        type="file"
                        accept=".pdf,.mp3,.mp4,.wav,.m4a,.ogg,.webm"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) setResourceFile(e.target.files[0]); }}
                      />
                    </div>
                  )}

                  {resourceType === "youtube" && (
                    <div className="mb-4">
                      <input
                        type="url"
                        value={youtubeLink}
                        onChange={(e) => setYoutubeLink(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full px-4 py-3 border border-gray-200 focus:border-blue-500 rounded-xl text-sm text-gray-800 outline-none transition placeholder-gray-300"
                      />
                    </div>
                  )}

                  {!resourceType && (
                    <div className="mb-4 h-24 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                      <p className="text-xs text-gray-300">Select a resource type above</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setPolishStep("choose")}
                      className="cursor-pointer px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-sm text-gray-500 rounded-xl transition-all">
                      ← Back
                    </button>
                    <button
                      onClick={runPolishWithResource}
                      disabled={!resourceType || (resourceType === "file" && !resourceFile) || (resourceType === "youtube" && !youtubeLink.trim())}
                      className="cursor-pointer flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
                    >
                      Polish with resource
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Result ── */}
              {polishStep === "result" && (
                <>
                  <div className="px-7 py-5">
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Polishing your notes...</p>
                      </div>
                    ) : aiError ? (
                      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-4 text-sm text-red-500">
                        {aiError}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-4 max-h-72 overflow-y-auto text-sm text-gray-700 leading-7 whitespace-pre-wrap" style={{ fontFamily: "Georgia, serif" }}>
                        {aiResult}
                      </div>
                    )}
                  </div>

                  {!aiLoading && (aiResult || aiError) && (
                    <div className="px-7 pb-6 flex gap-3">
                      {aiResult && (
                        <button onClick={applyAIResult}
                          className="cursor-pointer flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95">
                          Replace my note with this
                        </button>
                      )}
                      <button onClick={closeModal}
                        className="cursor-pointer px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 rounded-xl transition-all">
                        Keep original
                      </button>
                    </div>
                  )}
                </>
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