"use client";

import {
  useState,
  useEffect,
  ChangeEvent,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import FlashcardsForm from "@/components/FlashcardsForm";
import QuizForm from "@/components/QuizForms";
import OnboardingModal from "@/components/OnboardingModal";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import AddContextPopup, { ContextChip, type ContextSelection } from "@/components/AddContextPopup";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalType = "quiz" | "flashcards" | "recording" | "youtube" | "gdrive" | "zoom" | "connectors" | "notion" | null;

interface UploadedFile {
  id: number;
  name: string;
  ext: string;
  progress: number;
  done: boolean;
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

// ─── Supabase session helpers ──────────────────────────────────────────────────

async function getOrCreateYoutubeSession(url: string): Promise<string> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Math.random().toString(36).slice(2, 18);

    const { data: existing } = await supabase
      .from("youtube_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("url", url)
      .single();

    if (existing?.id) {
      await supabase
        .from("youtube_sessions")
        .update({ last_visited: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("user_id", user.id);
      return existing.id;
    }

    const { data: created, error } = await supabase
      .from("youtube_sessions")
      .insert({ user_id: user.id, url })
      .select("id")
      .single();

    if (error || !created) throw error;
    return created.id;
  } catch {
    return crypto.randomUUID();
  }
}

async function createChatSession(title: string): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return crypto.randomUUID();

    const { data: created, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title, last_visited: new Date().toISOString() })
      .select("id")
      .single();

    if (error || !created) throw error;
    return created.id;
  } catch {
    return crypto.randomUUID();
  }
}

async function createWebSession(url: string, title: string): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return crypto.randomUUID();

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
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
    <ModalShell
      title="Paste a YouTube Link"
      subtitle="Turn any video into study material"
      onClose={onClose}
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
                 <span className="text-xs text-gray-700 truncate flex-1">
                  {u.url.replace("https://", "").replace("www.", "")}
                </span>
                <button
                  onClick={() =>
                    setUploads((p) => p.filter((x) => x.id !== u.id))
                  }
                  className="text-gray-300 cursor-pointer hover:text-red-400 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                <span className="text-xs text-gray-700 truncate flex-1">
                  {u.url.replace("https://", "").replace("www.", "")}
                </span>
                <span className="text-xs text-gray-400 shrink-0">Processing {u.progress}%</span>
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
        </div>
      </div>
    </ModalShell>
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-8 pt-8 pb-3">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Capture Audio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-8 pb-8 pt-4 space-y-4">
          <button
            onClick={onMicrophone}
            className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer text-left group shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-[15px]">Voice & Ambient</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">Record your voice or a live lecture</p>
            </div>
          </button>

          <button
            onClick={onBrowserTab}
            className="w-full flex items-center gap-5 px-6 py-5 rounded-2xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer text-left group shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-[15px]">System Audio</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">Capture high-fidelity audio from a browser tab</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [youtubeLink, setYoutubeLink] = useState("");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
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
  
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadToastVisible, setUploadToastVisible] = useState(false);

  const closeModal = () => setActiveModal(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const restricted = ["wa.me", "t.me", "web.whatsapp.com", "telegram.org", "facebook.com", "instagram.com"];
    if (firstUrl) {
      if (restricted.some(domain => firstUrl.includes(domain))) {
        alert("Sorry, we don't support social media links yet.");
        return;
      }
      const id = firstUrl.includes("youtube.com") || firstUrl.includes("youtu.be")
        ? await getOrCreateYoutubeSession(firstUrl)
        : await createWebSession(firstUrl, remainingText || "Website Content");
      const mode = (firstUrl.includes("youtube.com") || firstUrl.includes("youtu.be")) ? "youtube" : "web";
      let targetPath = `/content/${id}?mode=${mode}&url=${encodeURIComponent(firstUrl)}&session_id=${id}`;
      let finalQuery = remainingText;
      if (selectedContext?.id === "mindmap") finalQuery = `[Requested Mind Map format] ${finalQuery}`;
      if (selectedContext?.id === "interactive") finalQuery = `[Requested Interactive diagram visualization format] ${finalQuery}`;
      
      if (finalQuery) targetPath += `&q=${encodeURIComponent(finalQuery)}`;
      router.push(targetPath);
    } else {
      const id = await createChatSession(text.slice(0, 50));
      let finalQuery = text;
      if (selectedContext?.id === "mindmap") finalQuery = `[Requested Mind Map format] ${finalQuery}`;
      if (selectedContext?.id === "interactive") finalQuery = `[Requested Interactive diagram visualization format] ${finalQuery}`;
      
      router.push(`/content/${id}?mode=chat&q=${encodeURIComponent(finalQuery)}&session_id=${id}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPendingFile(file);
    setUploadProgress(0);
    setUploadToastVisible(true);

    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 90));
      }
    };
    reader.onload = () => {
      setUploadProgress(100);
      setTimeout(() => setUploadToastVisible(false), 2000);
    };
    reader.readAsDataURL(file);
  };

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
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
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
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        <svg className="w-10 h-10 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h1 className="text-3xl font-semibold text-gray-800 text-center">{t('dashboard_welcome')}</h1>
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
            <div className={`w-14 h-14 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
              {tool.icon}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-base">{tool.label}</p>
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
          <input ref={fileInputRef} type="file" className="hidden" accept="video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={handleFileUpload} />
          
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
                <span className="text-[15px] font-medium text-gray-400 tracking-tight tracking-tight">Recording...</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={cancelRecording} className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button type="button" onClick={stopRecordingAndTranscribe} className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 flex flex-col min-h-[28px]">
                {selectedContext && <ContextChip selection={selectedContext} onRemove={() => setSelectedContext(null)} />}
                {pendingFile && (
                  <div className="flex items-center gap-2 mb-1.5 px-3 py-1.5 bg-gray-100 rounded-xl w-fit max-w-full">
                    <span className="text-xs text-gray-700 font-medium truncate max-w-[200px]">{pendingFile.name}</span>
                    <button type="button" onClick={() => { setPendingFile(null); setUploadProgress(0); setUploadToastVisible(false); }} className="text-gray-400 hover:text-red-400 transition cursor-pointer shrink-0">
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
                  <div className="relative">
                    <button type="button" onClick={() => setContextMenuOpen(o => !o)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer shrink-0 shadow-sm ${contextMenuOpen ? "border-blue-300 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"}`}>
                      <span className={`text-[13px] font-bold ${contextMenuOpen ? "text-blue-600" : "text-gray-400"}`}>@</span>
                      <span className={`text-[11px] font-medium tracking-wide ${contextMenuOpen ? "text-blue-600" : "text-gray-500"}`}>Add Source</span>
                    </button>
                    <AddContextPopup open={contextMenuOpen} onClose={() => setContextMenuOpen(false)} onSelect={(item) => setSelectedContext(item)} />
                  </div>
                  
                  {/* The unified Upload Button */}
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shrink-0 shadow-sm">
                    <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-[11px] font-medium tracking-wide">Upload</span>
                  </button>

                  <button type="button" onClick={toggleVoice} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1.5 ml-1">
                    <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center">
                  {(youtubeLink.trim() || pendingFile) ? (
                    <button type="submit" className="w-11 h-11 cursor-pointer rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-all active:scale-90 shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m-7 7l7-7 7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button type="button" onClick={async () => {
                      const { data } = await supabase.from("chat_sessions").insert({ user_id: userId, title: "New Voice Chat" }).select("id").single();
                      if (data) router.push(`/content/${data.id}?mode=microphone&session_id=${data.id}`);
                    }} className="w-11 h-11 cursor-pointer rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-all active:scale-95 shadow-md">
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
        
        {(!isListening && !isProcessingVoice) && (
          <button type="button" onClick={() => router.push("/dashboard/intergration")} className="w-full px-6 py-2.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between hover:bg-gray-100/80 transition-colors group cursor-pointer" style={{ borderBottomLeftRadius: '31px', borderBottomRightRadius: '31px' }}>
             <span className="text-[12px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Connect your tools to ReviseForge</span>
             <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity">
                {/* Google Drive */}
                <div className="w-[20px] h-[20px] rounded-[5px] bg-white border border-[#e5e7eb] flex items-center justify-center relative z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
                   <svg className="w-[12px] h-[12px]" viewBox="0 0 144 144" fill="none">
                      <path d="M48.24 10.42L16 66.08L48.24 121.75H112.72L80.48 66.08L48.24 10.42Z" fill="#FFC107"/><path d="M16 66.08L32.12 93.92L80.48 10.42H48.24L16 66.08Z" fill="#1976D2"/><path d="M112.72 121.75L128.84 93.92L80.48 10.42L64.36 38.25L112.72 121.75Z" fill="#4CAF50"/>
                   </svg>
                </div>
                {/* Zoom */}
                <div className="w-[20px] h-[20px] rounded-[5px] bg-[#2D8CFF] border border-[#2D8CFF] flex items-center justify-center -ml-1.5 relative z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
                   <svg className="w-[12px] h-[12px] ml-px" viewBox="0 0 24 24" fill="none">
                      <path d="M16 10.5V8.5C16 7.67 15.33 7 14.5 7H5.5C4.67 7 4 7.67 4 8.5V15.5C4 16.33 4.67 17 5.5 17H14.5C15.33 17 16 16.33 16 15.5V13.5L20 16V8L16 10.5Z" fill="white"/>
                   </svg>
                </div>
                {/* Notion */}
                <div className="w-[20px] h-[20px] rounded-[5px] bg-white border border-[#e5e7eb] flex items-center justify-center -ml-1.5 relative z-30 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
                   <span className="text-[12px] font-black font-serif text-black leading-none mt-px tracking-tighter">N</span>
                </div>
                {/* Google Chrome */}
                <div className="w-[20px] h-[20px] rounded-[5px] bg-white border border-[#e5e7eb] flex items-center justify-center -ml-1.5 relative z-40 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
                   <svg className="w-[12px] h-[12px]" viewBox="0 0 24 24" fill="none">
                     <circle cx="12" cy="12" r="10" fill="#F1C40F"/>
                     <path d="M12 2A10 10 0 002.5 15.2L7 7.4A5 5 0 0112 7H22A10 10 0 0012 2Z" fill="#E74C3C"/>
                     <path d="M22 12A10 10 0 0110.5 21.8L15 14A5 5 0 0012 7H22Z" fill="#2ECC71"/>
                     <circle cx="12" cy="12" r="4" fill="#3498DB" stroke="white" strokeWidth="2.5"/>
                   </svg>
                </div>
                
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-[14px] h-[14px] text-gray-400 ml-1.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
             </div>
          </button>
        )}
      </form>

      {/* Modals */}
      {activeModal === "quiz" && <QuizForm onClose={closeModal} />}
      {activeModal === "flashcards" && <FlashcardsForm onClose={closeModal} />}
      {showOnboarding && userId && <OnboardingModal show={showOnboarding} userId={userId} onComplete={() => setShowOnboarding(false)} />}
      {activeModal === "youtube" && <YoutubeModal onClose={closeModal} onSave={async (url) => { const id = await getOrCreateYoutubeSession(url); router.push(`/content/${id}?url=${encodeURIComponent(url)}&session_id=${id}`); }} />}
      {activeModal === "recording" && (
        <RecordingModal
          onClose={closeModal}
          onMicrophone={async () => {
            closeModal();
            const { data } = await supabase.from("recording_sessions").insert({ user_id: userId, title: `Microphone Recording — ${new Date().toLocaleDateString()}`, mode: 'microphone' }).select("id").single();
            if (data) router.push(`/content/${data.id}?mode=microphone&recording_session_id=${data.id}`);
          }}
          onBrowserTab={async () => {
            closeModal();
            const { data } = await supabase.from("recording_sessions").insert({ user_id: userId, title: `Browser Tab Recording — ${new Date().toLocaleDateString()}`, mode: 'browsertab' }).select("id").single();
            if (data) router.push(`/content/${data.id}?mode=browsertab&recording_session_id=${data.id}`);
          }}
        />
      )}
      {activeModal === "gdrive" && (
        <ModalShell title="Google Drive Integration" subtitle="Import documents straight from your drive" onClose={closeModal} onSave={closeModal} saveLabel="Close">
           <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center mb-4"><span className="text-[#0F9D58] font-black text-2xl">GD</span></div>
              <p className="text-sm text-gray-600 mb-4">Connect your Google Drive account to seamlessly import PDFs, Docs, and Slides directly into ReviseForge.</p>
              <button disabled className="px-6 py-2 bg-[#0F9D58]/10 text-[#0F9D58] font-bold rounded-lg border border-[#0F9D58]/20 cursor-not-allowed">Google OAuth Required</button>
           </div>
        </ModalShell>
      )}
      {activeModal === "zoom" && (
        <ModalShell title="Zoom Integration" subtitle="Auto-import your live lectures" onClose={closeModal} onSave={closeModal} saveLabel="Close">
           <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center mb-4"><span className="text-[#2D8CFF] font-black text-2xl">ZM</span></div>
              <p className="text-sm text-gray-600 mb-4">Connect your Zoom account to let ReviseForge automatically fetch and summarize your cloud recordings.</p>
              <button disabled className="px-6 py-2 bg-[#2D8CFF]/10 text-[#2D8CFF] font-bold rounded-lg border border-[#2D8CFF]/20 cursor-not-allowed">Zoom API Key Required</button>
           </div>
        </ModalShell>
      )}
      {activeModal === "notion" && (
        <ModalShell title="Notion Integration" subtitle="Import pages directly from Notion" onClose={closeModal} onSave={closeModal} saveLabel="Close">
           <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center mb-4"><span className="text-black font-black text-3xl">N</span></div>
              <p className="text-sm text-gray-600 mb-4">Connect your Notion workspace to effortlessly pull in text and turn it into flashcards and quizzes.</p>
              <button disabled className="px-6 py-2 bg-gray-200 text-gray-600 font-bold rounded-lg cursor-not-allowed">Notion OAuth Required</button>
           </div>
        </ModalShell>
      )}

      {/* Claude Style Connectors Directory Modal */}
      {activeModal === "connectors" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6 backdrop-blur-sm">
          <div className="bg-[#242424] text-gray-200 rounded-2xl shadow-2xl w-full max-w-[850px] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 border border-white/10">
             {/* Header */}
             <div className="flex items-center justify-between px-8 pt-8 pb-4">
                <h2 className="text-2xl font-serif text-white tracking-tight">Integrations</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             
             {/* Body */}
             <div className="flex flex-1 overflow-hidden px-4 pb-4">
                {/* Left Sidebar */}
                <div className="w-[180px] flex-shrink-0 flex flex-col gap-1 pr-4 py-2 border-r border-white/5">
                   <button className="text-left px-4 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium transition-colors flex items-center gap-3">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                     Connectors
                   </button>
                </div>
                
                {/* Main Content Area */}
                <div className="flex-1 pl-6 py-2 overflow-y-auto">
                   {/* Search */}
                   <div className="relative mb-6">
                     <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                     <input type="text" placeholder="Search connectors..." className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors" />
                   </div>
                   
                   {/* Filters */}
                   <div className="flex items-center justify-end mb-4">
                     <div className="flex gap-2">
                        <button className="bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 flex items-center gap-2 transition-colors">
                          Filter by <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button className="bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 flex items-center gap-2 transition-colors">
                          Sort by <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                     </div>
                   </div>
                   
                   {/* Cards Grid */}
                   <div className="grid grid-cols-2 gap-3 pb-8">
                      {/* Google Drive Card */}
                      <button onClick={() => setActiveModal("gdrive")} className="group bg-[#2A2A2A]/40 hover:bg-[#2A2A2A] border border-white/5 rounded-xl p-4 text-left transition-all relative overflow-hidden flex flex-col h-[115px]">
                         <div className="flex justify-between items-start w-full">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center shadow-sm border border-white/10">
                                   <svg viewBox="0 0 144 144" fill="none" className="w-[18px] h-[18px]">
                                      <path d="M48.24 10.42L16 66.08L48.24 121.75H112.72L80.48 66.08L48.24 10.42Z" fill="#FFC107"/><path d="M16 66.08L32.12 93.92L80.48 10.42H48.24L16 66.08Z" fill="#1976D2"/><path d="M112.72 121.75L128.84 93.92L80.48 10.42L64.36 38.25L112.72 121.75Z" fill="#4CAF50"/>
                                   </svg>
                               </div>
                               <span className="font-medium text-[13px] text-gray-200">Google Drive</span>
                            </div>
                            <div className="text-gray-500 group-hover:text-white transition-colors p-1"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg></div>
                         </div>
                         <p className="text-[12px] text-gray-500 mt-auto opacity-80 leading-snug pr-4">Access docs, slides, and study materials from Google Drive</p>
                      </button>

                      {/* Zoom Card */}
                      <button onClick={() => setActiveModal("zoom")} className="group bg-[#2A2A2A]/40 hover:bg-[#2A2A2A] border border-white/5 rounded-xl p-4 text-left transition-all relative overflow-hidden flex flex-col h-[115px]">
                         <div className="flex justify-between items-start w-full">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-[#2D8CFF] flex items-center justify-center p-1 shadow-sm border border-white/10">
                                  <svg className="w-5 h-5 ml-[-1px]" viewBox="0 0 24 24" fill="none">
                                    <path d="M16 10.5V8.5C16 7.67 15.33 7 14.5 7H5.5C4.67 7 4 7.67 4 8.5V15.5C4 16.33 4.67 17 5.5 17H14.5C15.33 17 16 16.33 16 15.5V13.5L20 16V8L16 10.5Z" fill="white"/>
                                  </svg>
                               </div>
                               <span className="font-medium text-[13px] text-gray-200">Zoom</span>
                            </div>
                            <div className="text-gray-500 group-hover:text-white transition-colors p-1"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg></div>
                         </div>
                         <p className="text-[12px] text-gray-500 mt-auto opacity-80 leading-snug pr-4">Automatically import and transcribe Zoom class recordings</p>
                      </button>

                      {/* Notion Card */}
                      <button onClick={() => setActiveModal("notion")} className="group bg-[#2A2A2A]/40 hover:bg-[#2A2A2A] border border-white/5 rounded-xl p-4 text-left transition-all relative overflow-hidden flex flex-col h-[115px]">
                         <div className="flex justify-between items-start w-full">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-white/10">
                                  <span className="text-[18px] font-black font-serif text-black leading-none mt-1">N</span>
                               </div>
                               <span className="font-medium text-[13px] text-gray-200">Notion <span className="ml-1.5 text-[9px] font-bold tracking-wider text-gray-400 bg-black/30 border border-white/10 px-1.5 py-0.5 rounded">OAUTH</span></span>
                            </div>
                            <div className="text-gray-500 group-hover:text-white transition-colors p-1"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg></div>
                         </div>
                         <p className="text-[12px] text-gray-500 mt-auto opacity-80 leading-snug pr-2">Search, access, and pull your private Notion study databases</p>
                      </button>

                      {/* Canvas Card */}
                      <button onClick={() => {}} className="group bg-[#2A2A2A]/40 hover:bg-[#2A2A2A] border border-white/5 rounded-xl p-4 text-left transition-all relative overflow-hidden flex flex-col h-[115px]">
                         <div className="flex justify-between items-start w-full">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-[#E72429] flex items-center justify-center shadow-sm border border-white/10">
                                  <span className="text-[12px] font-black text-white leading-none mt-[1px]">CV</span>
                               </div>
                               <span className="font-medium text-[13px] text-gray-200">Canvas LMS</span>
                            </div>
                            <div className="text-gray-500 group-hover:text-white transition-colors p-1"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg></div>
                         </div>
                         <p className="text-[12px] text-gray-500 mt-auto opacity-80 leading-snug pr-2">Sync assignments and extract PDF readings directly from Canvas LMS</p>
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </main>
  );
}
