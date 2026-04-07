"use client";
import React, { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onAddFile: () => void; // triggers the real file picker
}

export default function UploadPopup({ open, onClose, onAddFile }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const items = [
    {
      id: "file",
      label: "Add file",
      sublabel: "Import from your computer",
      onClick: () => { onAddFile(); onClose(); },
      real: true,
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      ),
    },
    {
      id: "gdrive",
      label: "Add from Google Drive",
      sublabel: "Coming soon",
      onClick: () => {},
      real: false,
      icon: (
        <svg viewBox="0 0 87.3 78" className="w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
      ),
    },
    {
      id: "github",
      label: "Add from GitHub",
      sublabel: "Coming soon",
      onClick: () => {},
      real: false,
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
        </svg>
      ),
    },
  ];

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ width: 270 }}
    >
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={!item.real}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-left group
              ${item.real
                ? "hover:bg-gray-50 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
              }`}
          >
            <span className={`shrink-0 ${item.real ? "text-gray-500 group-hover:text-gray-800" : "text-gray-400"} transition-colors`}>
              {item.icon}
            </span>
            <div className="flex flex-col">
              <span className={`text-[13.5px] font-medium ${item.real ? "text-gray-700 group-hover:text-gray-900" : "text-gray-500"} transition-colors leading-tight`}>
                {item.label}
              </span>
              {!item.real && (
                <span className="text-[11px] text-gray-400 mt-0.5">{item.sublabel}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
