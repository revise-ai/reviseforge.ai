"use client";
import React, { useState, useRef, useEffect } from "react";

export interface ContextSelection {
  id: string;
  label: string;
}

interface ContextItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const STUDY_TOOLS: ContextItem[] = [
  {
    id: "video",
    label: "Video",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "interactive",
    label: "Interactive",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "mindmap",
    label: "Mind Map",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" d="M12 9V4m0 16v-5m-3 .5l-3 3m9-3l3 3M9 9.5l-3-3m9 3l3-3" />
      </svg>
    ),
  },
  {
    id: "podcast",
    label: "Podcast",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (item: ContextSelection) => void;
}

export default function AddContextPopup({ open, onClose, onSelect }: Props) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={popupRef}
      className="absolute bottom-full mb-3 left-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100/50 p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ width: 190 }}
    >
      <div className="flex flex-col gap-0.5">
        {STUDY_TOOLS.map(item => (
          <button
            key={item.id}
            onClick={() => {
              onSelect({ id: item.id, label: item.label });
              onClose();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left hover:bg-black/5 group cursor-pointer"
          >
            <span className="text-gray-400 group-hover:text-black transition-colors shrink-0">
              {item.icon}
            </span>
            <span className="text-[14px] font-semibold text-gray-700 group-hover:text-black transition-colors">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Context Chip — rendered inside the input bar ──────────────────────────── */
export function ContextChip({
  selection,
  onRemove,
}: {
  selection: ContextSelection;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold px-2.5 py-1 rounded-full">
        <span>@{selection.label}</span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-blue-400 hover:text-blue-700 cursor-pointer leading-none transition-colors"
          aria-label="Remove context"
        >
          ×
        </button>
      </span>
    </div>
  );
}
