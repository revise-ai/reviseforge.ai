"use client";

import {
  useState,
  useEffect,
  ChangeEvent,
  DragEvent,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FlashcardsForm from "@/components/FlashcardsForm";
import QuizForm from "@/components/QuizForms";
import OnboardingModal from "@/components/OnboardingModal";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import AddContextPopup, { ContextChip, type ContextSelection } from "@/components/AddContextPopup";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalType = "quiz" | "flashcards" | "recording" | "youtube" | null;

interface UploadedFile {
  id: number;
  name: string;
  ext: string;
  progress: number;
  done: boolean;
}

// ─── Recent session types ─────────────────────────────────────────────────────

interface RecentItem {
  id: string;
  type: "youtube" | "recording" | "quiz" | "flashcard" | "exam";
  title: string;
  subtitle: string;
  last_visited: string;
  href: string;
  videoId?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExt(name: string) {
  return name.split(".").pop()?.toUpperCase() ?? "FILE";
}

function extColor(ext: string) {
  if (["PDF"].includes(ext)) return { bg: "bg-red-100", text: "text-red-500" };
  if (["DOC", "DOCX"].includes(ext))
    return { bg: "bg-blue-100", text: "text-blue-500" };
  if (["PPT", "PPTX"].includes(ext))
    return { bg: "bg-orange-100", text: "text-orange-500" };
  if (["MP3", "WAV", "M4A", "OGG", "WEBM"].includes(ext))
    return { bg: "bg-purple-100", text: "text-purple-500" };
  return { bg: "bg-gray-100", text: "text-gray-500" };
}

function simulateUpload(
  id: number,
  color: string,
  setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
) {
  let current = 0;
  const interval = setInterval(() => {
    current += Math.floor(Math.random() * 15) + 4;
    if (current >= 100) {
      current = 100;
      clearInterval(interval);
      setter((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, progress: 100, done: true } : f,
        ),
      );
    } else {
      setter((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: current } : f)),
      );
    }
  }, 280);
}

// ─── Supabase session helper ──────────────────────────────────────────────────
// Creates or reuses a youtube_session row and returns its UUID.
// Falls back to a random ID if the user is not logged in.
async function getOrCreateYoutubeSession(url: string): Promise<string> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Math.random().toString(36).slice(2, 18);

    // Check for existing session with this URL
    const { data: existing } = await supabase
      .from("youtube_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("url", url)
      .single();

    if (existing?.id) {
      // Reuse — update last_visited
      await supabase
        .from("youtube_sessions")
        .update({ last_visited: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("user_id", user.id);
      return existing.id;
    }

    // Create new session
    const { data: created, error } = await supabase
      .from("youtube_sessions")
      .insert({ user_id: user.id, url })
      .select("id")
      .single();

    if (error || !created) throw error;
    return created.id;
  } catch {
    return Math.random().toString(36).slice(2, 18);
  }
}

// Creates a general chat_session row and returns its UUID.
async function createChatSession(title: string): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Math.random().toString(36).slice(2, 18);

    const { data: created, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title, last_visited: new Date().toISOString() })
      .select("id")
      .single();

    if (error || !created) throw error;
    return created.id;
  } catch {
    return Math.random().toString(36).slice(2, 18);
  }
}

// Creates a session for a generic website link.
async function createWebSession(url: string, title: string): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Math.random().toString(36).slice(2, 18);

    const { data: created, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        title: title || "Website Content",
        last_visited: new Date().toISOString()
      })
      .select("id")
      .single();

    if (error || !created) throw error;
    return created.id;
  } catch {
    return Math.random().toString(36).slice(2, 18);
  }
}

// ─── Progress Panel ───────────────────────────────────────────────────────────

function ProgressPanel({
  files,
  accentColor,
  onRemove,
}: {
  files: UploadedFile[];
  accentColor: string;
  onRemove: (id: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const uploading = files.filter((f) => !f.done);

  if (files.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[200] w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            {uploading.length > 0 ? "Uploading files" : "Upload complete"}
          </span>
          {uploading.length > 0 && (
            <svg
              className="w-4 h-4 animate-spin text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
          {files.map((file) => {
            const { bg, text } = extColor(file.ext);
            return (
              <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${bg} ${text} shrink-0`}
                >
                  {file.ext}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{file.name}</p>
                  <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${file.progress}%`,
                        backgroundColor: accentColor,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {file.done ? (
                    <button
                      onClick={() => onRemove(file.id)}
                      className="text-gray-300 hover:text-red-400 transition cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400">
                      {file.progress}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function ModalShell({
  title,
  subtitle,
  onClose,
  onSave,
  saveLabel,
  saveDisabled,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  saveDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 cursor-pointer hover:text-gray-600 transition text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="px-8 pb-4">{children}</div>
        <div className="px-8 pb-8 mt-4 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-9 py-2 cursor-pointer border border-gray-500/50 bg-white hover:bg-gray-50 active:scale-95 transition-all text-gray-500 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className={`px-6 cursor-pointer py-2 active:scale-95 transition-all text-white rounded-lg ${saveDisabled ? "bg-gray-200 cursor-not-allowed text-gray-400" : "bg-indigo-500 hover:bg-indigo-600"}`}
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── File Upload Area ─────────────────────────────────────────────────────────

function FileUploadArea({
  files,
  onAdd,
  onRemove,
  accept,
  borderHover,
  accentColor,
  icon,
  label,
  sublabel,
  extraInputId,
}: {
  files: UploadedFile[];
  onAdd: (newFiles: File[]) => void;
  onRemove: (id: number) => void;
  accept: string;
  borderHover: string;
  accentColor: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  extraInputId?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputId = useRef(`fi-${Math.random().toString(36).slice(2)}`).current;
  const donFiles = files.filter((f) => f.done);
  const uploadingFiles = files.filter((f) => !f.done);

  return (
    <div className="space-y-3">
      <label
        htmlFor={extraInputId ?? inputId}
        onDragOver={(e: DragEvent<HTMLLabelElement>) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e: DragEvent<HTMLLabelElement>) => {
          e.preventDefault();
          setIsDragging(false);
          onAdd(Array.from(e.dataTransfer.files));
        }}
        className={`border-2 border-dotted p-8 flex flex-col items-center gap-3 cursor-pointer transition rounded-xl
          ${isDragging ? `${borderHover} bg-gray-50` : `border-gray-300 ${borderHover.replace("border-", "hover:border-")}`}`}
      >
        <div className="opacity-70">{icon}</div>
        {donFiles.length > 0 && (
          <div className="w-full space-y-1.5">
            {donFiles.map((f) => {
              const { bg, text } = extColor(f.ext);
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
                >
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${bg} ${text} shrink-0`}
                  >
                    {f.ext}
                  </span>
                  <span className="text-xs text-gray-700 truncate flex-1">
                    {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onRemove(f.id);
                    }}
                    className="text-gray-300 cursor-pointer hover:text-red-400 transition shrink-0"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-gray-400 text-xs text-center">{sublabel}</p>
        <input
          id={extraInputId ?? inputId}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files) onAdd(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </label>
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((f) => {
            const { bg, text } = extColor(f.ext);
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5"
              >
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${bg} ${text} shrink-0`}
                >
                  {f.ext}
                </span>
                <span className="text-xs text-gray-700 truncate flex-1">
                  {f.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">Uploading</span>
                  <svg
                    className="w-3.5 h-3.5 animate-spin text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(f.id)}
                  className="text-gray-300 cursor-pointer hover:text-red-400 transition shrink-0"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── useFileUpload ─────────────────────────────────────────────────────────────

function useFileUpload(accentColor: string) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const newEntries: UploadedFile[] = incoming.map((f) => ({
        id: Date.now() + Math.random(),
        name: f.name,
        ext: getExt(f.name),
        progress: 0,
        done: false,
      }));
      setFiles((prev) => [...prev, ...newEntries]);
      newEntries.forEach((entry) =>
        simulateUpload(entry.id, accentColor, setFiles),
      );
    },
    [accentColor],
  );

  const removeFile = useCallback((id: number) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const reset = useCallback(() => setFiles([]), []);

  return { files, addFiles, removeFile, reset };
}

// ─── Quiz Modal ───────────────────────────────────────────────────────────────

function QuizModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (files: UploadedFile[]) => void;
}) {
  const { files, addFiles, removeFile } = useFileUpload("#EAB308");
  const doneCount = files.filter((f) => f.done).length;

  return (
    <>
      <ProgressPanel
        files={files}
        accentColor="#EAB308"
        onRemove={removeFile}
      />
      <ModalShell
        title="Start a Quiz"
        subtitle="Upload your reading material — we'll generate the quiz for you"
        onClose={onClose}
        onSave={() => {
          if (doneCount > 0) {
            onSave(files);
            onClose();
          }
        }}
        saveLabel={doneCount === 0 ? "Add Resources First" : "Generate Quiz"}
        saveDisabled={doneCount === 0}
      >
        <FileUploadArea
          files={files}
          onAdd={addFiles}
          onRemove={removeFile}
          accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
          borderHover="border-yellow-400"
          accentColor="#EAB308"
          label="Drag your reading material here"
          sublabel="PDF, Word, PowerPoint, or plain text — we'll handle the rest"
          icon={
            <svg
              width="34"
              height="34"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#EAB308"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
        />
      </ModalShell>
    </>
  );
}

// ─── YouTube Modal ────────────────────────────────────────────────────────────

interface YoutubeUpload {
  id: number;
  url: string;
  progress: number;
  done: boolean;
}

function YoutubeModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (url: string) => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [uploads, setUploads] = useState<YoutubeUpload[]>([]);

  function extractVideoId(url: string): string | null {
    const m = url.match(
      /(?:v=|youtu\.be\/|\/shorts\/|\/live\/|\/embed\/)([\w-]{11})/,
    );
    return m ? m[1] : null;
  }

  function isValid(url: string): boolean {
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) return false;
    return extractVideoId(url) !== null;
  }

  function getThumbnail(url: string): string {
    const id = extractVideoId(url);
    return id ? `https://img.youtube.com/vi/${id}/default.jpg` : "";
  }

  const validInput = isValid(input.trim());
  const thumbnail = validInput ? getThumbnail(input.trim()) : "";
  const anyDone = uploads.some((u) => u.done);
  const firstDoneUrl = uploads.find((u) => u.done)?.url ?? "";

  const handleProcess = () => {
    if (!validInput) {
      setError("Please enter a valid YouTube URL.");
      return;
    }
    const id = Date.now();
    const url = input.trim();
    setUploads((p) => [...p, { id, url, progress: 0, done: false }]);
    setInput("");
    setError("");

    let current = 0;
    const iv = setInterval(() => {
      current += Math.floor(Math.random() * 15) + 4;
      if (current >= 100) {
        clearInterval(iv);
        setUploads((p) =>
          p.map((u) => (u.id === id ? { ...u, progress: 100, done: true } : u)),
        );
      } else {
        setUploads((p) =>
          p.map((u) => (u.id === id ? { ...u, progress: current } : u)),
        );
      }
    }, 280);
  };

  return (
    <>
      {uploads.length > 0 && (
        <div className="fixed top-5 right-5 z-[200] w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">
                {uploads.some((u) => !u.done) ? "Processing video" : "Ready"}
              </span>
              {uploads.some((u) => !u.done) && (
                <svg
                  className="w-4 h-4 animate-spin text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {uploads.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#EF4444">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">
                    {u.url.replace("https://", "").replace("www.", "")}
                  </p>
                  <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-red-500"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0">
                  {u.done ? (
                    <button
                      onClick={() =>
                        setUploads((p) => p.filter((x) => x.id !== u.id))
                      }
                      className="text-gray-300 cursor-pointer hover:text-red-400 transition"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400">
                      {u.progress}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ModalShell
        title="Paste a YouTube Link"
        subtitle="Turn any video into study material"
        onClose={onClose}
        // ✅ onSave now passes the URL up — the parent handles session creation
        onSave={() => {
          onSave(firstDoneUrl);
          onClose();
        }}
        saveLabel={!anyDone ? "Process a Video First" : "Continue"}
        saveDisabled={!anyDone}
      >
        <div className="text-sm">
          <div className="border-2 border-dotted border-gray-300 hover:border-red-400 transition rounded-xl p-8 flex flex-col items-center gap-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#EF4444">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>

            {uploads
              .filter((u) => u.done)
              .map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 w-full bg-white border border-red-100 rounded-lg px-3 py-2"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="#EF4444"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span className="text-xs text-gray-700 truncate flex-1">
                    {u.url.replace("https://", "").replace("www.", "")}
                  </span>
                  <button
                    onClick={() =>
                      setUploads((p) => p.filter((x) => x.id !== u.id))
                    }
                    className="text-gray-300 cursor-pointer hover:text-red-400 transition"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}

            {uploads
              .filter((u) => !u.done)
              .map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="#EF4444"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span className="text-xs text-gray-700 truncate flex-1">
                    {u.url.replace("https://", "").replace("www.", "")}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    Processing
                  </span>
                  <svg
                    className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                </div>
              ))}

            {thumbnail && uploads.length === 0 && (
              <div className="flex items-center gap-3 w-full bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <img
                  src={thumbnail}
                  alt="thumb"
                  className="w-14 h-10 object-cover rounded shrink-0"
                />
                <span className="truncate text-gray-600 text-xs flex-1">
                  {input.trim()}
                </span>
              </div>
            )}

            <p className="text-gray-500">Paste a YouTube link below</p>

            <input
              type="url"
              value={input}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setInput(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleProcess()}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`w-full px-4 py-2.5 text-sm border rounded-lg outline-none transition text-gray-700 placeholder-gray-300 ${error ? "border-red-400" : "border-gray-300 focus:border-red-400"}`}
            />
            {error && (
              <p className="text-red-400 text-xs self-start -mt-2">{error}</p>
            )}

            <button
              type="button"
              onClick={handleProcess}
              disabled={!validInput}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${validInput ? "bg-red-500 hover:bg-red-600 text-white cursor-pointer" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              Process Video
            </button>

            <p className="text-gray-400 text-xs">
              Supports youtube.com and youtu.be · Press Enter to process
            </p>
          </div>
        </div>
      </ModalShell>
    </>
  );
}

// ─── Recording Modal ──────────────────────────────────────────────────────────

function RecordingModal({
  onClose,
  onMicrophone,
  onBrowserTab,
}: {
  onClose: () => void;
  onMicrophone: () => void;
  onBrowserTab: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-semibold text-gray-800">
            Record Lecture
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 cursor-pointer hover:text-gray-600 transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-3">
          <button
            onClick={onMicrophone}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
              <svg
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Microphone</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Record your voice or class
              </p>
            </div>
          </button>

          <button
            onClick={onBrowserTab}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
              <svg
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Browser Tab</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Capture audio playing in a browser tab
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Recent card with three-dot ──────────────────────────────────────────────

function RecentCard({
  item,
  onDelete,
  onRename,
}: {
  item: RecentItem;
  onDelete: (id: string, type: RecentItem["type"]) => Promise<void>;
  onRename: (
    id: string,
    type: RecentItem["type"],
    title: string,
  ) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [renameVal, setRenameVal] = useState(item.title);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
      {/* Rename modal */}
      {showRename && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRename(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-2">
              <h3 className="text-base font-semibold text-gray-900">Rename</h3>
            </div>
            <div className="px-6 py-4">
              <input
                type="text"
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    setSaving(true);
                    await onRename(item.id, item.type, renameVal.trim());
                    setSaving(false);
                    setShowRename(false);
                  }
                }}
                className="w-full px-3 py-2.5 text-sm text-gray-800 border border-gray-200 rounded-xl outline-none focus:border-blue-400 transition"
                autoFocus
              />
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setShowRename(false)}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSaving(true);
                  await onRename(item.id, item.type, renameVal.trim());
                  setSaving(false);
                  setShowRename(false);
                }}
                disabled={saving || !renameVal.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {saving && (
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete modal */}
      {showDelete && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDelete(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-2">
              <h3 className="text-base font-semibold text-gray-900">
                Delete session?
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                This cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-5 pt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  await onDelete(item.id, item.type);
                  setDeleting(false);
                  setShowDelete(false);
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {deleting && (
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <div
        className="relative w-full bg-gray-100 overflow-hidden cursor-pointer"
        style={{ aspectRatio: "16/9" }}
        onClick={() => router.push(item.href)}
      >
        {item.videoId ? (
          <img
            src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${
              item.type === "quiz"
                ? "bg-yellow-50"
                : item.type === "flashcard"
                  ? "bg-orange-50"
                  : item.type === "exam"
                    ? "bg-indigo-50"
                    : "bg-blue-50"
            }`}
          >
            {item.type === "quiz" ? (
              <svg
                width="28"
                height="28"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#EAB308"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            ) : item.type === "flashcard" ? (
              <svg
                width="28"
                height="28"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#F97316"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            ) : item.type === "exam" ? (
              <svg
                width="28"
                height="28"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#6366F1"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
            ) : (
              <svg
                width="28"
                height="28"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#3B82F6"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              item.type === "youtube"
                ? "bg-red-500 text-white"
                : item.type === "quiz"
                  ? "bg-yellow-500 text-white"
                  : item.type === "flashcard"
                    ? "bg-orange-500 text-white"
                    : item.type === "exam"
                      ? "bg-indigo-500 text-white"
                      : "bg-blue-500 text-white"
            }`}
          >
            {item.type === "youtube"
              ? "YT"
              : item.type === "quiz"
                ? "QZ"
                : item.type === "flashcard"
                  ? "FC"
                  : item.type === "exam"
                    ? "EX"
                    : "REC"}
          </span>
        </div>
      </div>

      {/* Info + three-dot */}
      <div className="px-3 py-2 flex items-start justify-between gap-1">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => router.push(item.href)}
        >
          <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-1">
            {item.title}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {timeAgo(item.last_visited)}
          </p>
        </div>
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            ref={menuRef as any}
            onClick={(e) => {
              e.stopPropagation();
              if (menuRef.current) {
                const r = (
                  menuRef.current as HTMLElement
                ).getBoundingClientRect();
                setMenuPos({
                  top: r.bottom + 4,
                  right: window.innerWidth - r.right,
                });
              }
              setMenuOpen((o) => !o);
            }}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <div
              style={{
                position: "fixed",
                top: menuPos.top,
                right: menuPos.right,
                zIndex: 9999,
              }}
              className="w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setRenameVal(item.title);
                  setShowRename(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setShowDelete(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-gray-50 cursor-pointer"
              >
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [youtubeLink, setYoutubeLink] = useState("");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<ContextSelection | null>(null);
  // ── File staging ──────────────────────────────────────────────────────────
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0); // 0 = idle, 1-99 = loading, 100 = done
  const [uploadToastVisible, setUploadToastVisible] = useState(false);

  const closeModal = () => setActiveModal(null);

  // ─── Check Onboarding ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data, error } = await supabase
          .from("user_onboarding")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (error && error.code === "PGRST116") {
          setShowOnboarding(true);
        }
      }
    })();
  }, []);

  // ── Load 6 most recent sessions on mount ────────────────────────────────
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const queries = await Promise.all([
        supabase.from("youtube_sessions").select("id, video_title, url, created_at, video_id").eq("user_id", user.id).order('created_at', {ascending: false}).limit(6),
        supabase.from("recording_sessions").select("id, title, created_at").eq("user_id", user.id).order('created_at', {ascending: false}).limit(6),
        supabase.from("quiz_sessions").select("id, file_name, created_at").eq("user_id", user.id).order('created_at', {ascending: false}).limit(6),
        supabase.from("flashcard_sessions").select("id, file_name, created_at").eq("user_id", user.id).order('created_at', {ascending: false}).limit(6),
        supabase.from("exam_sessions").select("id, source_label, created_at").eq("user_id", user.id).order('created_at', {ascending: false}).limit(6),
        supabase.from("chat_sessions").select("id, title, created_at").eq("user_id", user.id).order('created_at', {ascending: false}).limit(6),
      ]);

      const [yt, rec, qz, fc, ex, ch] = queries;
      let all: RecentItem[] = [];

      if (yt.data) yt.data.forEach((i: any) => all.push({ id: i.id, type: 'youtube', title: i.video_title || 'YouTube Video', subtitle: 'youtube', last_visited: i.created_at, href: `/content/${i.id}?url=${encodeURIComponent(i.url || '')}&session_id=${i.id}`, videoId: i.video_id }));
      if (rec.data) rec.data.forEach((i: any) => all.push({ id: i.id, type: 'recording', title: i.title || 'Audio Recording', subtitle: 'recording', last_visited: i.created_at, href: `/content/${i.id}?mode=recording&session_id=${i.id}` }));
      if (qz.data) qz.data.forEach((i: any) => all.push({ id: i.id, type: 'quiz', title: i.file_name || 'Quiz', subtitle: 'quiz', last_visited: i.created_at, href: `/dashboard/quizzes/${i.id}` }));
      if (fc.data) fc.data.forEach((i: any) => all.push({ id: i.id, type: 'flashcard', title: i.file_name || 'Flashcard', subtitle: 'flashcard', last_visited: i.created_at, href: `/dashboard/flashcards/${i.id}` }));
      if (ex.data) ex.data.forEach((i: any) => all.push({ id: i.id, type: 'exam', title: i.source_label || 'Exam', subtitle: 'exam', last_visited: i.created_at, href: `/dashboard/exam-mode/${i.id}` }));
      if (ch.data) ch.data.forEach((i: any) => all.push({ id: i.id, type: 'chat', title: i.title || 'Chat Session', subtitle: 'chat', last_visited: i.created_at, href: `/content/${i.id}?mode=chat&session_id=${i.id}` }));

      all.sort((a,b) => new Date(b.last_visited).getTime() - new Date(a.last_visited).getTime());
      
      setRecentItems(all.slice(0, 6));
      setRecentLoading(false);
    })();
  }, []);

  // ✅ handleSubmit: handles file staging OR YouTube/chat navigation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If a file is staged, navigate with it
    if (pendingFile) {
      await navigateWithFile(pendingFile, youtubeLink.trim());
      setPendingFile(null);
      setYoutubeLink("");
      return;
    }

    const text = youtubeLink.trim();
    if (!text) return;
    setYoutubeLink("");

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    const firstUrl = urls?.[0];
    const remainingText = text.replace(urlRegex, "").trim();

    if (firstUrl) {
      const restricted = ["wa.me", "t.me", "web.whatsapp.com", "telegram.org", "facebook.com", "instagram.com"];
      if (restricted.some(domain => firstUrl.includes(domain))) {
        alert("Sorry, we don't support social media links yet.");
        return;
      }
      const id = firstUrl.includes("youtube.com") || firstUrl.includes("youtu.be")
        ? await getOrCreateYoutubeSession(firstUrl)
        : await createWebSession(firstUrl, remainingText || "Website Content");
      const mode = (firstUrl.includes("youtube.com") || firstUrl.includes("youtu.be")) ? "youtube" : "web";
      let targetPath = `/content/${id}?mode=${mode}&url=${encodeURIComponent(firstUrl)}&session_id=${id}`;
      if (remainingText) targetPath += `&q=${encodeURIComponent(remainingText)}`;
      router.push(targetPath);
    } else {
      const id = await createChatSession(text.slice(0, 50));
      router.push(`/content/${id}?mode=chat&q=${encodeURIComponent(text)}&session_id=${id}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Stage the file — show chip in input bar, show upload progress toast
    setPendingFile(file);
    setUploadProgress(0);
    setUploadToastVisible(true);

    // Simulate reading progress for UX feedback
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 90));
      }
    };
    reader.onload = () => {
      setUploadProgress(100);
      // Hide toast after 2s
      setTimeout(() => setUploadToastVisible(false), 2000);
    };
    reader.readAsDataURL(file);
  };

  // Navigate when user submits with a pending file
  const navigateWithFile = async (file: File, extraQuery: string) => {
    const isAudio = ["mp3", "wav", "m4a"].some(ext => file.name.toLowerCase().endsWith(`.${ext}`));
    const isVideo = ["mp4", "mov", "webm", "mkv", "avi", "m4v"].some(ext => file.name.toLowerCase().endsWith(`.${ext}`));

    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        const mimeType = file.type || (isVideo ? "video/mp4" : isAudio ? "audio/mpeg" : "application/octet-stream");
        let thumbnail = "";

        if (isVideo) {
          try {
            const video = document.createElement("video");
            video.src = URL.createObjectURL(file);
            video.load();
            video.currentTime = 1;
            await new Promise<void>((res) => {
              video.onseeked = () => {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth || 1280;
                canvas.height = video.videoHeight || 720;
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                thumbnail = canvas.toDataURL("image/jpeg");
                URL.revokeObjectURL(video.src);
                res();
              };
              video.onerror = () => res();
            });
          } catch (_) {}
        }

        const { saveMediaToDB } = await import("@/lib/idb");
        await saveMediaToDB({ base64, mimeType, fileName: file.name, thumbnail });

        const id = await createChatSession(`File: ${file.name}`);
        let mode = isVideo ? "file" : isAudio ? "recording" : "file";
        let target = `/content/${id}?mode=${mode}&file=${encodeURIComponent(file.name)}&session_id=${id}`;
        if (extraQuery) target += `&q=${encodeURIComponent(extraQuery)}`;
        router.push(target);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  const stopRecordingAndTranscribe = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      setIsListening(false);
      setIsProcessingVoice(true);

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];
        try {
          const res = await fetch("/api/note-voice-transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64Audio, mimeType: "audio/webm" }),
          });
          const data = await res.json();
          if (data.transcript) {
            setYoutubeLink((prev) => prev + (prev ? " " : "") + data.transcript);
          }
        } catch (err) {
          console.error("Transcription failed", err);
        } finally {
          setIsProcessingVoice(false);
        }
      };
    };
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        setIsListening(false);
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.stop();
    }
  };

  const toggleVoice = async () => {
    if (isListening) {
      await stopRecordingAndTranscribe();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsListening(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access to use dictation.");
    }
  };

  const tools = [
    {
      id: "quiz" as ModalType,
      label: t('tool_quiz'),
      description: t('tool_quiz_desc'),
      bg: "bg-yellow-100",
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-500",
      icon: (
        <svg
          className="w-7 h-7"
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
      ),
    },
    {
      id: "flashcards" as ModalType,
      label: t('tool_flashcards'),
      description: t('tool_flashcards_desc'),
      bg: "bg-green-100",
      iconBg: "bg-green-100",
      iconColor: "text-green-500",
      icon: (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      id: "recording" as ModalType,
      label: t('tool_recording'),
      description: t('tool_recording_desc'),
      bg: "bg-sky-100",
      iconBg: "bg-sky-100",
      iconColor: "text-sky-400",
      icon: (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      ),
    },
    {
      id: "youtube" as ModalType,
      label: t('tool_youtube'),
      description: t('tool_youtube_desc'),
      bg: "bg-rose-100",
      iconBg: "bg-rose-100",
      iconColor: "text-rose-500",
      icon: (
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-start px-4 py-16">
      {/* Upload Progress Toast */}
      {uploadToastVisible && (
        <div className="fixed top-5 right-5 z-[300] w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-right-4">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            {uploadProgress < 100 ? (
              <svg className="w-4 h-4 animate-spin text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="text-sm font-semibold text-gray-700">
              {uploadProgress < 100 ? "Uploading..." : "Ready!"}
            </span>
            <span className="text-xs text-gray-400 ml-auto">{uploadProgress}%</span>
          </div>
          <div className="px-4 py-2">
            <p className="text-xs text-gray-500 truncate">{pendingFile?.name}</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%`, backgroundColor: uploadProgress === 100 ? "#22c55e" : "#3b82f6" }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <svg
          className="w-10 h-10 text-blue-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <h1 className="text-3xl font-semibold text-gray-800 text-center">
          {t('dashboard_welcome')}
        </h1>
        <p className="text-gray-400 mt-2 text-sm">{t('dashboard_subtitle')}</p>
      </div>

      {/* Tool Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-10">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveModal(tool.id)}
            className={`flex cursor-pointer items-center gap-4 p-5 rounded-2xl border border-gray-100 ${tool.bg} hover:shadow-md transition-all duration-200 text-left group`}
          >
            <div
              className={`w-14 h-14 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
            >
              {tool.icon}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-base">
                {tool.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-2xl bg-white border rounded-[32px] shadow-sm hover:border-gray-200 transition-all duration-300 min-h-[60px] justify-center flex flex-col ${isListening ? "border-black ring-4 ring-black/5" : "border-gray-200 focus-within:border-teal-500/30 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:border-teal-500"}`}
      >
        <div className="flex-1 flex flex-col justify-center px-6 py-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
            onChange={handleFileUpload}
          />
          
          {isProcessingVoice ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-gray-500 text-[15px] italic py-4">
              <svg className="w-5 h-5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Transcribing message…
            </div>
          ) : isListening ? (
            <div className="flex-1 flex flex-col justify-between gap-6 py-2">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex gap-1.5 items-center h-5">
                  {[0.1, 0.3, 0.2, 0.4, 0.25, 0.45, 0.2, 0.35, 0.15, 0.4].map((d, i) => (
                    <div key={i} className="w-[3px] bg-black rounded-full animate-[voiceWave_1s_infinite_ease-in-out]" style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${d}s` }}></div>
                  ))}
                </div>
                <span className="text-[15px] font-medium text-gray-400 tracking-tight">Recording...</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={cancelRecording} className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Cancel">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button type="button" onClick={stopRecordingAndTranscribe} className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg" title="Transcribe">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 flex flex-col min-h-[28px]">
                {/* Context chip */}
                {selectedContext && (
                  <ContextChip
                    selection={selectedContext}
                    onRemove={() => setSelectedContext(null)}
                  />
                )}
                {/* Pending file chip */}
                {pendingFile && (
                  <div className="flex items-center gap-2 mb-1.5 px-3 py-1.5 bg-gray-100 rounded-xl w-fit max-w-full">
                    <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {["mp4","mov","webm","mkv","avi","m4v"].some(e => pendingFile.name.toLowerCase().endsWith(`.${e}`)) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      )}
                    </svg>
                    <span className="text-xs text-gray-700 font-medium truncate max-w-[200px]">{pendingFile.name}</span>
                    {uploadProgress < 100 && (
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden shrink-0">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}
                    {uploadProgress === 100 && (
                      <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <button
                      type="button"
                      onClick={() => { setPendingFile(null); setUploadProgress(0); setUploadToastVisible(false); }}
                      className="text-gray-400 hover:text-red-400 transition cursor-pointer shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <textarea
                  rows={1}
                  value={youtubeLink}
                  onChange={(e) => {
                    setYoutubeLink(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                  placeholder={pendingFile ? "Add a note (optional) then press Send..." : "Ask anything, or paste a YouTube link..."}
                  className="w-full bg-transparent text-[17px] text-gray-800 placeholder-gray-400 outline-none resize-none overflow-hidden py-0.5"
                  style={{ minHeight: '28px', maxHeight: '200px' }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-3">
                  {/* @ Add Context (Rounded Button) — with popup */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setContextMenuOpen(o => !o)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer shrink-0 shadow-sm ${contextMenuOpen ? "border-blue-300 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"}`}
                      title="Add Context"
                    >
                      <span className={`text-[13px] font-bold ${contextMenuOpen ? "text-blue-600" : "text-gray-400"}`}>@</span>
                      <span className={`text-[10px] font-bold uppercase tracking-tight ${contextMenuOpen ? "text-blue-600" : "text-gray-400"}`}>Add Context</span>
                    </button>
                    <AddContextPopup
                      open={contextMenuOpen}
                      onClose={() => setContextMenuOpen(false)}
                      onSelect={(item) => setSelectedContext(item)}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 ml-1">
                    {/* Upload (Clip) */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1.5"
                      title="Upload Document"
                    >
                      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>

                    {/* Dictate (Mic) */}
                    <button
                      type="button"
                      onClick={toggleVoice}
                      className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1.5"
                      title="Dictate"
                    >
                      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Voice / Send Button */}
                <div className="flex items-center">
                  {(youtubeLink.trim() || pendingFile) ? (
                    <button
                      type="submit"
                      className="w-11 h-11 cursor-pointer rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-all active:scale-90 shadow-lg"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m-7 7l7-7 7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const id = Math.random().toString(36).slice(2, 18);
                        router.push(`/content/${id}?mode=microphone`);
                      }}
                      className="w-11 h-11 cursor-pointer rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-all active:scale-95 shadow-md"
                    >
                      <div className="flex gap-[2.5px] items-center">
                        <div className="w-[3px] h-4 bg-white rounded-full animate-[pulse_1s_infinite_0s]"></div>
                        <div className="w-[3px] h-5.5 bg-white rounded-full animate-[pulse_1s_infinite_0.2s]"></div>
                        <div className="w-[3px] h-3 bg-white rounded-full animate-[pulse_1s_infinite_0.4s]"></div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </form>

      {/* Recent section - full left-aligned container */}
      <div className="w-full max-w-4xl mt-8 mb-1">
        {/* Header row: Recent left, View all right */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-base font-semibold text-gray-800">{t('dashboard_recent')}</span>
          </div>
          <Link
            href="/dashboard/history"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors duration-200"
          >
            <span>{t('dashboard_view_all')}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
        </div>

        {/* Cards grid */}
        {recentLoading ? (
          <div className="flex flex-col items-center justify-center py-10 mb-8 gap-3">
            <svg className="w-5 h-5 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm text-gray-400">Loading recent sessions…</p>
          </div>
        ) : (
          recentItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {recentItems.map((item) => (
              <RecentCard
                key={item.id}
                item={item}
                onDelete={async (id, type) => {
                  const t: Record<string, string> = {
                    youtube: "youtube_sessions",
                    recording: "recording_sessions",
                    quiz: "quiz_sessions",
                    flashcard: "flashcard_sessions",
                    exam: "exam_sessions",
                  };
                  await supabase
                    .from(t[type])
                    .delete()
                    .eq("id", id)
                    .eq("user_id", userId || "none");
                  setRecentItems((prev) => prev.filter((i) => i.id !== id));
                }}
                onRename={async (id, type, newTitle) => {
                  const t: Record<string, string> = {
                    youtube: "youtube_sessions",
                    recording: "recording_sessions",
                    quiz: "quiz_sessions",
                    flashcard: "flashcard_sessions",
                    exam: "exam_sessions",
                  };
                  const f: Record<string, string> = {
                    youtube: "video_title",
                    recording: "title",
                    quiz: "file_name",
                    flashcard: "file_name",
                    exam: "source_label",
                  };
                  await supabase
                    .from(t[type])
                    .update({ [f[type]]: newTitle })
                    .eq("id", id)
                    .eq("user_id", userId || "none");
                  setRecentItems((prev) =>
                    prev.map((i) =>
                      i.id === id ? { ...i, title: newTitle } : i,
                    ),
                  );
                }}
              />
            ))}
            </div>
          )
        )}
      </div>


      {/* Modals */}
      {activeModal === "quiz" && <QuizForm onClose={closeModal} />}
      {activeModal === "flashcards" && <FlashcardsForm onClose={closeModal} />}
      
      {showOnboarding && userId && (
        <OnboardingModal 
          show={showOnboarding} 
          userId={userId} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}

      {activeModal === "youtube" && (
        <YoutubeModal
          onClose={closeModal}
          // ✅ Creates Supabase session then navigates with session_id in URL
          onSave={async (url) => {
            const id = await getOrCreateYoutubeSession(url);
            router.push(
              `/content/${id}?url=${encodeURIComponent(url)}&session_id=${id}`,
            );
          }}
        />
      )}

      {activeModal === "recording" && (
        <RecordingModal
          onClose={closeModal}
          onMicrophone={() => {
            closeModal();
            const id = Math.random().toString(36).slice(2, 18);
            router.push(`/content/${id}?mode=microphone`);
          }}
          onBrowserTab={() => {
            closeModal();
            const id = Math.random().toString(36).slice(2, 18);
            router.push(`/content/${id}?mode=browsertab`);
          }}
        />
      )}
    </main>
  );
}
