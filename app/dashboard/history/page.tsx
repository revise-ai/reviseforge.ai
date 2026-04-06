// File path: app/dashboard/history/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SessionType = "youtube" | "recording" | "quiz" | "flashcard" | "exam" | "chat" | "file";
type FilterType =
  | "all"
  | "youtube"
  | "recording"
  | "quiz"
  | "flashcard"
  | "exam"
  | "chat"
  | "file";
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
    const menuHeight = 135; // Approximate height of 3 items
    const spaceBelow = window.innerHeight - rect.bottom;
    
    let top = rect.bottom + 4;
    // If not enough space below, show above the button
    if (spaceBelow < menuHeight) {
      top = rect.top - menuHeight - 4;
    }
    
    setPos({ top, right: window.innerWidth - rect.right });
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

// ── List-style Session Row ───────────────────────────────────────────────────
function SessionRow({
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
  const thumb = item.videoId
    ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`
    : null;

  const handleRowClick = (e: React.MouseEvent) => {
    // If the click is on a button or link inside the row, don't navigate twice
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    router.push(item.href);
  };

  return (
    <div 
      onClick={handleRowClick}
      className="group flex items-center gap-4 px-6 py-5 hover:bg-gray-50/50 transition-all border-b border-gray-100/60 last:border-0 cursor-pointer"
    >
      {/* Name/Identifier section */}
      <div className="flex items-center gap-5 min-w-0 flex-[2.5]">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
          {thumb ? (
            <img src={thumb} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-300" alt="" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center rounded-lg ${
              item.type === "youtube" ? "bg-red-50/50 text-red-400" :
              item.type === "recording" ? "bg-purple-50/50 text-purple-400" :
              item.type === "quiz" ? "bg-green-50/50 text-green-400" :
              item.type === "flashcard" ? "bg-orange-50/50 text-orange-400" :
              item.type === "chat" ? "bg-sky-50/50 text-sky-400" :
              "bg-gray-50 text-gray-400"
            }`}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {item.type === "youtube" ? <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" /> : 
                item.type === "recording" ? <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /> :
                item.type === "quiz" ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> :
                item.type === "flashcard" ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2" /> :
                item.type === "chat" ? <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /> :
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />}
              </svg>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-[15px] font-medium text-gray-900 group-hover:text-blue-500 transition-colors truncate">{item.title}</h4>
        </div>
      </div>

      {/* Date section */}
      <div className="hidden md:flex flex-col flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-600">{new Date(item.last_visited).toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <p className="text-[11px] text-gray-400 font-normal mt-0.5">At {new Date(item.last_visited).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {/* Type section */}
      <div className="hidden sm:flex flex-1 min-w-0">
        <span className={`text-[12px] font-medium px-4 py-1.5 rounded-xl capitalize tracking-tight ${
          item.type === "youtube" ? "text-red-500" :
          item.type === "recording" ? "text-purple-500" :
          item.type === "quiz" ? "text-green-500" :
          item.type === "flashcard" ? "text-orange-500" :
          item.type === "exam" ? "text-rose-500" :
          item.type === "chat" ? "text-sky-500" :
          "text-indigo-500"
        }`}>
          {item.type}
        </span>
      </div>

      {/* Actions section */}
      <div 
        className="flex items-center gap-4 w-36 justify-end shrink-0"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Link 
          href={item.href}
          className="px-5 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all cursor-pointer shadow-sm"
        >
          Details
        </Link>
        <div>
          <CardMenu
            item={item}
            onShare={() => onShare(item)}
            onRename={() => onRename(item)}
            onDelete={() => onDelete(item)}
          />
        </div>
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
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("Fetching unified history from 'recent_sessions'...");
      const { data, error } = await supabase
        .from("recent_sessions")
        .select("id, session_id, type, title, subtitle, href, video_id, last_visited, created_at")
        .eq("user_id", user.id)
        .order("last_visited", { ascending: false })
        .limit(200);

      if (error) {
        console.warn("Unified history table 'recent_sessions' not available or error:", error.message);
        throw error;
      }

      const all: HistoryItem[] = (data ?? []).map((i: any) => ({
        id: `${i.type}-${i.session_id}`,
        type: (i.type as SessionType) || "recording",
        title: i.title || "Untitled Session",
        subtitle: i.subtitle || i.type,
        last_visited: i.last_visited || i.created_at,
        created_at: i.created_at,
        badges: [],
        href: i.href || "#",
        videoId: i.video_id ?? undefined,
      }));

      console.log(`Loaded ${all.length} sessions from unified history.`);
      setItems(all);
    } catch (e: any) {
      console.error("Primary history load failed, triggering legacy fallback:", e?.message || e);
      await loadHistoryFallback();
    } finally {
      setLoading(false);
    }
  }

  async function loadHistoryFallback() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("Loading legacy history fallback (individual tables)...");
      const [yt, rec, fl, qz, fc, ch, ex] = await Promise.all([
        supabase.from("youtube_sessions").select("id, video_title, url, created_at, last_visited").eq("user_id", user.id),
        supabase.from("recording_sessions").select("id, title, created_at, last_visited").eq("user_id", user.id),
        supabase.from("file_sessions").select("id, file_name, created_at, last_visited, mime_type").eq("user_id", user.id),
        supabase.from("quiz_sessions").select("id, file_name, created_at, last_visited").eq("user_id", user.id),
        supabase.from("flashcard_sessions").select("id, file_name, created_at, last_visited").eq("user_id", user.id),
        supabase.from("chat_sessions").select("id, title, created_at, last_visited").eq("user_id", user.id),
        supabase.from("exam_sessions").select("id, source_label, created_at, last_visited").eq("user_id", user.id),
      ]);

      if (yt.error) console.error("YT legacy error:", yt.error.message);
      if (rec.error) console.error("Rec legacy error:", rec.error.message);
      if (fl.error) console.error("File legacy error:", fl.error.message);
      if (qz.error) console.error("Quiz legacy error:", qz.error.message);
      if (fc.error) console.error("Flash legacy error:", fc.error.message);
      if (ch.error) console.error("Chat legacy error:", ch.error.message);
      if (ex.error) console.error("Exam legacy error:", ex.error.message);

      const all: HistoryItem[] = [];

      if (yt.data) yt.data.forEach((i: any) => all.push({
        id: `youtube-${i.id}`, type: "youtube",
        title: i.video_title || "YouTube Video", subtitle: "youtube",
        last_visited: i.last_visited || i.created_at, created_at: i.created_at,
        badges: [],
        href: `/content/${i.id}?url=${encodeURIComponent(i.url || "")}&session_id=${i.id}`,
        videoId: i.video_id,
      }));

      if (rec.data) rec.data.forEach((i: any) => all.push({
        id: `recording-${i.id}`, type: "recording",
        title: i.title || "Audio Recording", subtitle: "recording",
        last_visited: i.last_visited || i.created_at, created_at: i.created_at,
        badges: [],
        href: `/content/${i.id}?mode=microphone&recording_session_id=${i.id}`,
      }));

      if (fl.data) fl.data.forEach((i: any) => all.push({
        id: `file-${i.id}`, type: "file",
        title: i.file_name || "Uploaded File", subtitle: "file",
        last_visited: i.last_visited || i.created_at, created_at: i.created_at,
        badges: [],
        href: `/content/${i.id}?mode=file&file=${encodeURIComponent(i.file_name || "")}&session_id=${i.id}`,
      }));

      if (qz.data) qz.data.forEach((i: any) => all.push({
        id: `quiz-${i.id}`, type: "quiz",
        title: i.file_name || "Interactive Quiz", subtitle: "quiz",
        last_visited: i.last_visited || i.created_at, created_at: i.created_at,
        badges: [],
        href: `/quiz/${i.id}`,
      }));

      if (fc.data) fc.data.forEach((i: any) => all.push({
        id: `flashcard-${i.id}`, type: "flashcard",
        title: i.file_name || "Vocabulary Cards", subtitle: "flashcard",
        last_visited: i.last_visited || i.created_at, created_at: i.created_at,
        badges: [],
        href: `/flashcards/${i.id}`,
      }));

      if (ch.data) ch.data.forEach((i: any) => all.push({
        id: `chat-${i.id}`, type: "chat",
        title: i.title || "AI Chat Session", subtitle: "chat",
        last_visited: i.last_visited || i.created_at, created_at: i.created_at,
        badges: [],
        href: `/content/${i.id}?mode=chat&session_id=${i.id}`,
      }));

      if (ex.data) ex.data.forEach((i: any) => all.push({
        id: `exam-${i.id}`, type: "exam",
        title: i.source_label || "Exam Practice", subtitle: "exam",
        last_visited: i.last_visited || i.created_at, created_at: i.created_at,
        badges: [],
        href: `/exam/${i.id}`,
      }));

      all.sort((a, b) => {
        const dateA = a.last_visited ? new Date(a.last_visited).getTime() : 0;
        const dateB = b.last_visited ? new Date(b.last_visited).getTime() : 0;
        return dateB - dateA;
      });

      console.log(`Fallback complete: loaded ${all.length} legacy sessions.`);
      setItems(all);
    } catch (e: any) {
      console.error("Critical failure in history fallback logic:", e?.message || e);
    }
  }

  async function handleDelete(id: string, type: SessionType) {
    try {
      // Strip the type prefix (e.g. "youtube-abc" → "abc")
      const rawId = id.includes("-") ? id.slice(id.indexOf("-") + 1) : id;
      const t: Record<SessionType, string> = {
        youtube: "youtube_sessions",
        recording: "recording_sessions",
        quiz: "quiz_sessions",
        flashcard: "flashcard_sessions",
        exam: "exam_sessions",
        chat: "chat_sessions",
        file: "file_sessions",
      };

      // 1. Delete from the specific source table
      const { error: sourceError } = await supabase.from(t[type]).delete().eq("id", rawId);
      if (sourceError) console.error(`Error deleting from ${t[type]}:`, sourceError.message);

      // 2. Explicitly delete from the unified recent_sessions table
      const { error: historyError } = await supabase.from("recent_sessions").delete().eq("session_id", rawId);
      if (historyError) console.warn("Note: session might not have existed in recent_sessions or error occurred:", historyError.message);

      // 3. Update local state
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      console.error("Critical failure during deletion:", err.message);
    }
  }


  async function handleRename(id: string, type: SessionType, newTitle: string) {
    // Strip the type prefix to get the raw DB UUID
    const rawId = id.includes("-") ? id.slice(id.indexOf("-") + 1) : id;
    const tableMap: Record<SessionType, string> = {
      youtube: "youtube_sessions",
      recording: "recording_sessions",
      quiz: "quiz_sessions",
      flashcard: "flashcard_sessions",
      exam: "exam_sessions",
      chat: "chat_sessions",
      file: "file_sessions",
    };
    const fieldMap: Record<SessionType, string> = {
      youtube: "video_title",
      recording: "title",
      quiz: "file_name",
      flashcard: "file_name",
      exam: "source_label",
      chat: "title",
      file: "file_name",
    };
    await supabase
      .from(tableMap[type])
      .update({ [fieldMap[type]]: newTitle })
      .eq("id", rawId);
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
              { v: "chat", l: "Chats" },
              { v: "file", l: "Files" },
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
        </div>
      ) : (
        <>
          {/* History List */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 rounded-[28px] border-2 border-dashed border-gray-100 bg-gray-50/30">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-900">No matching sessions</p>
              <p className="text-xs text-gray-400 mt-1">Try a different filter or search term</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-[28px] shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="flex items-center gap-4 px-6 py-4 bg-gray-50/40 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] flex-[2.5]">Name</span>
                <span className="hidden md:block text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] flex-1">Last Visited</span>
                <span className="hidden sm:block text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] flex-1">Session Type</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] w-32 text-right">Action</span>
              </div>
              
              <div className="flex flex-col">
                {filtered.map((item) => (
                  <SessionRow
                    key={item.id}
                    item={item}
                    onShare={setShareItem}
                    onRename={setRenameItem}
                    onDelete={setDeleteItem}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
