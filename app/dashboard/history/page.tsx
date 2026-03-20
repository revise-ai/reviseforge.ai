// File path: app/dashboard/history/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SessionType = "youtube" | "recording" | "quiz" | "flashcard" | "exam";
type FilterType =
  | "all"
  | "youtube"
  | "recording"
  | "quiz"
  | "flashcard"
  | "exam";
interface ActivityBadge {
  label: string;
  color: string;
}
interface HistoryItem {
  id: string;
  type: SessionType;
  title: string;
  subtitle: string;
  last_visited: string;
  created_at: string;
  badges: ActivityBadge[];
  href: string;
  videoId?: string;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000),
    h = Math.floor(diff / 3600000),
    dy = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (dy < 30) return `${dy}d ago`;
  return new Date(d).toLocaleDateString();
}

function extractVideoId(url: string) {
  return (
    url.match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([\w-]{11})/)?.[1] ??
    null
  );
}

// ── Share Modal ───────────────────────────────────────────────────────────────
function ShareModal({
  item,
  onClose,
}: {
  item: HistoryItem;
  onClose: () => void;
}) {
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${item.href}`;
  const [access, setAccess] = useState<"restricted" | "anyone">("restricted");
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 truncate pr-4">
            Share "{item.title.slice(0, 40)}
            {item.title.length > 40 ? "…" : ""}"
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer transition shrink-0"
          >
            <svg
              width="18"
              height="18"
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

        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            General access
          </p>
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${access === "anyone" ? "bg-blue-100" : "bg-gray-100"}`}
            >
              {access === "anyone" ? (
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#3B82F6"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#6B7280"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <select
                value={access}
                onChange={(e) => setAccess(e.target.value as any)}
                className="w-full text-sm font-medium text-gray-800 bg-transparent outline-none cursor-pointer"
              >
                <option value="restricted">Restricted</option>
                <option value="anyone">Anyone with the link</option>
              </select>
              <p className="text-xs text-gray-400 mt-0.5">
                {access === "restricted"
                  ? "Only you can open this link"
                  : "Anyone with the link can view this session"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#9CA3AF"
              strokeWidth={2}
              className="shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <span className="flex-1 text-xs text-gray-500 truncate">
              {shareUrl}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rename Modal ──────────────────────────────────────────────────────────────
function RenameModal({
  item,
  onClose,
  onRename,
}: {
  item: HistoryItem;
  onClose: () => void;
  onRename: (id: string, type: SessionType, title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!title.trim() || title === item.title) {
      onClose();
      return;
    }
    setSaving(true);
    await onRename(item.id, item.type, title.trim());
    setSaving(false);
    onClose();
  };
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-full px-3 py-2.5 text-sm text-gray-800 border border-gray-200 rounded-xl outline-none focus:border-blue-400 transition"
            autoFocus
          />
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
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
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({
  item,
  onClose,
  onDelete,
}: {
  item: HistoryItem;
  onClose: () => void;
  onDelete: (id: string, type: SessionType) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const del = async () => {
    setDeleting(true);
    await onDelete(item.id, item.type);
    setDeleting(false);
    onClose();
  };
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
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
            This will permanently delete "{item.title.slice(0, 50)}" and all its
            generated content. This cannot be undone.
          </p>
        </div>
        <div className="px-6 pb-5 pt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={del}
            disabled={deleting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
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
  );
}

// ── Three-dot menu — uses fixed positioning so overflow:hidden never clips it ──
function CardMenu({
  item,
  onShare,
  onRename,
  onDelete,
}: {
  item: HistoryItem;
  onShare: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen((o) => !o);
  };

  const actions = [
    {
      label: "Share",
      icon: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
      action: onShare,
      cls: "text-gray-700",
    },
    {
      label: "Rename",
      icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
      action: onRename,
      cls: "text-gray-700",
    },
    {
      label: "Delete",
      icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
      action: onDelete,
      cls: "text-red-500",
    },
  ];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
      >
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: 9999,
          }}
          className="w-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1"
        >
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                a.action();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-gray-50 transition cursor-pointer ${a.cls}`}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
              </svg>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────
function SessionCard({
  item,
  onShare,
  onRename,
  onDelete,
}: {
  item: HistoryItem;
  onShare: (i: HistoryItem) => void;
  onRename: (i: HistoryItem) => void;
  onDelete: (i: HistoryItem) => void;
}) {
  const router = useRouter();
  const isYT = item.type === "youtube";
  const thumb = item.videoId
    ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`
    : null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
      <div
        className="relative w-full bg-gray-100 overflow-hidden cursor-pointer"
        style={{ aspectRatio: "16/9" }}
        onClick={() => router.push(item.href)}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${isYT ? "bg-red-50" : "bg-blue-50"}`}
          >
            {isYT ? (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#EF4444">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            ) : (
              <svg
                width="36"
                height="36"
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
        <div className="absolute top-2 left-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isYT ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}
          >
            {isYT ? "YouTube" : "Recording"}
          </span>
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => router.push(item.href)}
          >
            <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
              {item.title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {timeAgo(item.last_visited)}
            </p>
          </div>
          <CardMenu
            item={item}
            onShare={() => onShare(item)}
            onRename={() => onRename(item)}
            onDelete={() => onDelete(item)}
          />
        </div>
        {item.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.badges.map((b, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.color}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [shareItem, setShareItem] = useState<HistoryItem | null>(null);
  const [renameItem, setRenameItem] = useState<HistoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [ytRes, recRes, sumRes, quizRes, flashRes, chapRes] =
        await Promise.all([
          supabase
            .from("youtube_sessions")
            .select("id,url,video_title,created_at,last_visited")
            .eq("user_id", user.id)
            .order("last_visited", { ascending: false }),
          supabase
            .from("recording_sessions")
            .select("id,mode,title,created_at,last_visited")
            .eq("user_id", user.id)
            .order("last_visited", { ascending: false }),
          supabase
            .from("content_summaries")
            .select("session_id,recording_session_id")
            .eq("user_id", user.id),
          supabase
            .from("content_quizzes")
            .select("session_id,recording_session_id")
            .eq("user_id", user.id),
          supabase
            .from("content_flashcards")
            .select("session_id,recording_session_id")
            .eq("user_id", user.id),
          supabase
            .from("content_chapters")
            .select("session_id,recording_session_id")
            .eq("user_id", user.id),
        ]);

      const sYt = new Set(
        (sumRes.data ?? []).map((r: any) => r.session_id).filter(Boolean),
      );
      const sRe = new Set(
        (sumRes.data ?? [])
          .map((r: any) => r.recording_session_id)
          .filter(Boolean),
      );
      const qYt = new Set(
        (quizRes.data ?? []).map((r: any) => r.session_id).filter(Boolean),
      );
      const qRe = new Set(
        (quizRes.data ?? [])
          .map((r: any) => r.recording_session_id)
          .filter(Boolean),
      );
      const fYt = new Set(
        (flashRes.data ?? []).map((r: any) => r.session_id).filter(Boolean),
      );
      const fRe = new Set(
        (flashRes.data ?? [])
          .map((r: any) => r.recording_session_id)
          .filter(Boolean),
      );
      const cYt = new Set(
        (chapRes.data ?? []).map((r: any) => r.session_id).filter(Boolean),
      );
      const cRe = new Set(
        (chapRes.data ?? [])
          .map((r: any) => r.recording_session_id)
          .filter(Boolean),
      );

      const yB = (id: string): ActivityBadge[] => {
        const b: ActivityBadge[] = [];
        if (cYt.has(id))
          b.push({ label: "Chapters", color: "bg-gray-100 text-gray-600" });
        if (sYt.has(id))
          b.push({ label: "Summary", color: "bg-blue-50 text-blue-600" });
        if (qYt.has(id))
          b.push({ label: "Quiz", color: "bg-red-50 text-red-600" });
        if (fYt.has(id))
          b.push({
            label: "Flashcards",
            color: "bg-orange-50 text-orange-600",
          });
        return b;
      };
      const rB = (id: string): ActivityBadge[] => {
        const b: ActivityBadge[] = [];
        if (cRe.has(id))
          b.push({ label: "Chapters", color: "bg-gray-100 text-gray-600" });
        if (sRe.has(id))
          b.push({ label: "Summary", color: "bg-blue-50 text-blue-600" });
        if (qRe.has(id))
          b.push({ label: "Quiz", color: "bg-red-50 text-red-600" });
        if (fRe.has(id))
          b.push({
            label: "Flashcards",
            color: "bg-orange-50 text-orange-600",
          });
        return b;
      };

      const yt: HistoryItem[] = (ytRes.data ?? []).map((s: any) => ({
        id: s.id,
        type: "youtube" as SessionType,
        title:
          s.video_title ||
          s.url.replace("https://", "").replace("www.", "").slice(0, 60),
        subtitle: s.url,
        last_visited: s.last_visited,
        created_at: s.created_at,
        badges: yB(s.id),
        href: `/content/${s.id}?url=${encodeURIComponent(s.url)}&session_id=${s.id}`,
        videoId: extractVideoId(s.url) ?? undefined,
      }));
      const re: HistoryItem[] = (recRes.data ?? []).map((s: any) => ({
        id: s.id,
        type: "recording" as SessionType,
        title:
          s.title ||
          `Recording — ${s.mode === "browsertab" ? "Browser Tab" : "Microphone"}`,
        subtitle: s.mode,
        last_visited: s.last_visited,
        created_at: s.created_at,
        badges: rB(s.id),
        href: `/content/${s.id}?mode=${s.mode}&recording_session_id=${s.id}`,
      }));

      // ── Quiz sessions ────────────────────────────────────────────────────
      const { data: quizSessions } = await supabase
        .from("quiz_sessions")
        .select("id, file_name, status, total, score, created_at, last_visited")
        .eq("user_id", user.id)
        .in("status", ["ready", "finished"])
        .order("last_visited", { ascending: false });

      const qz: HistoryItem[] = (quizSessions ?? []).map((s: any) => {
        const pct =
          s.total && s.score != null
            ? Math.round((s.score / s.total) * 100)
            : null;
        const badges: ActivityBadge[] = [
          {
            label: `${s.total ?? 0} questions`,
            color: "bg-gray-100 text-gray-600",
          },
          ...(pct != null
            ? [
                {
                  label: `${pct}%`,
                  color:
                    pct >= 70
                      ? "bg-green-50 text-green-600"
                      : pct >= 50
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600",
                },
              ]
            : [{ label: "Not finished", color: "bg-gray-100 text-gray-400" }]),
        ];
        return {
          id: s.id,
          type: "quiz" as SessionType,
          title: s.file_name || "Quiz",
          subtitle: "quiz",
          last_visited: s.last_visited || s.created_at,
          created_at: s.created_at,
          badges,
          href: `/quiz/${s.id}`,
        };
      });

      // ── Flashcard sessions ───────────────────────────────────────────────
      const { data: flashSessions } = await supabase
        .from("flashcard_sessions")
        .select("id, file_name, status, total, created_at, last_visited")
        .eq("user_id", user.id)
        .eq("status", "ready")
        .order("last_visited", { ascending: false });

      const fl: HistoryItem[] = (flashSessions ?? []).map((s: any) => ({
        id: s.id,
        type: "flashcard" as SessionType,
        title: s.file_name || "Flashcards",
        subtitle: "flashcard",
        last_visited: s.last_visited || s.created_at,
        created_at: s.created_at,
        badges: [
          {
            label: `${s.total ?? 0} cards`,
            color: "bg-orange-50 text-orange-600",
          },
        ],
        href: `/flashcards/${s.id}`,
      }));

      // ── Exam sessions ────────────────────────────────────────────────────
      const { data: examSessions } = await supabase
        .from("exam_sessions")
        .select(
          "id, source, source_label, status, mcq_score, fill_score, total_mcq, total_fill, total_written, written_attempted, time_used_secs, timed_out, created_at, last_visited",
        )
        .eq("user_id", user.id)
        .order("last_visited", { ascending: false });

      const ex: HistoryItem[] = (examSessions ?? []).map((s: any) => {
        const objScore = (s.mcq_score ?? 0) + (s.fill_score ?? 0);
        const objTotal = (s.total_mcq ?? 0) + (s.total_fill ?? 0);
        const pct =
          objTotal > 0 ? Math.round((objScore / objTotal) * 100) : null;
        const isDone = s.status === "done";
        const badges: ActivityBadge[] = [
          {
            label:
              s.source === "youtube"
                ? "YouTube"
                : s.source === "recording"
                  ? "Recording"
                  : "File",
            color: "bg-gray-100 text-gray-600",
          },
          ...(isDone && pct != null
            ? [
                {
                  label: `${pct}%`,
                  color:
                    pct >= 70
                      ? "bg-green-50 text-green-600"
                      : pct >= 55
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600",
                },
              ]
            : []),
          ...(s.timed_out
            ? [{ label: "Timed out", color: "bg-red-50 text-red-500" }]
            : []),
          ...(!isDone
            ? [{ label: "Not finished", color: "bg-gray-100 text-gray-400" }]
            : []),
        ];
        return {
          id: s.id,
          type: "exam" as SessionType,
          title: s.source_label || "Exam",
          subtitle: s.source,
          last_visited: s.last_visited || s.created_at,
          created_at: s.created_at,
          badges,
          href: `/dashboard/exam-mode?session_id=${s.id}`,
        };
      });

      setItems(
        [...yt, ...re, ...qz, ...fl, ...ex].sort(
          (a, b) =>
            new Date(b.last_visited).getTime() -
            new Date(a.last_visited).getTime(),
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, type: SessionType) {
    const t: Record<SessionType, string> = {
      youtube: "youtube_sessions",
      recording: "recording_sessions",
      quiz: "quiz_sessions",
      flashcard: "flashcard_sessions",
      exam: "exam_sessions",
    };
    await supabase.from(t[type]).delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleRename(id: string, type: SessionType, newTitle: string) {
    const tableMap: Record<SessionType, string> = {
      youtube: "youtube_sessions",
      recording: "recording_sessions",
      quiz: "quiz_sessions",
      flashcard: "flashcard_sessions",
      exam: "exam_sessions",
    };
    const fieldMap: Record<SessionType, string> = {
      youtube: "video_title",
      recording: "title",
      quiz: "file_name",
      flashcard: "file_name",
      exam: "source_label",
    };
    await supabase
      .from(tableMap[type])
      .update({ [fieldMap[type]]: newTitle })
      .eq("id", id);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, title: newTitle } : i)),
    );
  }

  const filtered = items.filter((i) => {
    if (filter !== "all" && i.type !== filter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      {shareItem && (
        <ShareModal item={shareItem} onClose={() => setShareItem(null)} />
      )}
      {renameItem && (
        <RenameModal
          item={renameItem}
          onClose={() => setRenameItem(null)}
          onRename={handleRename}
        />
      )}
      {deleteItem && (
        <DeleteModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onDelete={handleDelete}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">History</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            All your study sessions
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-800 transition flex items-center gap-1.5"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 flex-wrap">
          {(
            [
              { v: "all", l: "All" },
              { v: "youtube", l: "YouTube" },
              { v: "recording", l: "Recordings" },
              { v: "quiz", l: "Quizzes" },
              { v: "flashcard", l: "Flashcards" },
              { v: "exam", l: "Exams" },
            ] as { v: FilterType; l: string }[]
          ).map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${filter === f.v ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            className="text-gray-400 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions…"
            className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none bg-transparent"
          />
        </div>
        <p className="text-xs text-gray-400 ml-auto">
          {filtered.length} session{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <svg
            className="w-5 h-5 animate-spin text-gray-300"
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
          <p className="text-sm text-gray-400">Loading history…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <svg
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#D1D5DB"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-gray-400">No sessions found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <SessionCard
              key={item.id}
              item={item}
              onShare={setShareItem}
              onRename={setRenameItem}
              onDelete={setDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
