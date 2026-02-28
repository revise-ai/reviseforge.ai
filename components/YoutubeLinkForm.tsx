// File path: components/YoutubeLinkForm.tsx
"use client";

import { useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

interface YoutubeEntry {
  url: string;
  thumbnail: string;
  title: string;
}

function getYoutubeThumbnail(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/default.jpg` : "";
}

function isValidYoutubeUrl(url: string): boolean {
  const pattern =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/;
  return pattern.test(url);
}

export default function YoutubeLinkForm() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState<string>("");
  const [entries, setEntries] = useState<YoutubeEntry[]>([]);
  const [error, setError] = useState<string>("");

  const handleAdd = () => {
    const url = inputValue.trim();
    if (!url) { setError("Please enter a YouTube link."); return; }
    if (!isValidYoutubeUrl(url)) { setError("Please enter a valid YouTube URL."); return; }
    if (entries.some((e) => e.url === url)) { setError("This link has already been added."); return; }
    setEntries((prev) => [...prev, { url, thumbnail: getYoutubeThumbnail(url), title: url }]);
    setInputValue("");
    setError("");
  };

  const handleRemove = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  // Navigate to content page with the first YouTube URL
  const handleUse = () => {
    if (entries.length === 0) return;
    const firstUrl = entries[0].url;
    router.push(`/content?mode=youtube&url=${encodeURIComponent(firstUrl)}`);
  };

  return (
    <div className="max-w-md w-full p-6 bg-white rounded-lg border border-gray-500/30 shadow-[0px_1px_15px_0px] shadow-black/10 text-sm">
      {/* Added links list */}
      {entries.length > 0 && (
        <div className="mb-4 space-y-2 max-h-44 overflow-y-auto">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <img src={entry.thumbnail} alt="thumbnail" className="w-12 h-8 object-cover rounded shrink-0" />
              <span className="truncate flex-1 text-gray-600 text-xs">{entry.url}</span>
              <button onClick={() => handleRemove(i)} className="text-gray-400 hover:text-red-500 transition shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Drop-zone styled input area */}
      <div className="border-2 border-dotted border-gray-400 hover:border-red-400 transition rounded-lg p-8 mt-2 flex flex-col items-center gap-4">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="#EF4444" xmlns="http://www.w3.org/2000/svg">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        <p className="text-gray-500">Paste a YouTube link below</p>
        <p className="text-gray-400">
          Supports <span className="text-red-400">youtube.com</span> and{" "}
          <span className="text-red-400">youtu.be</span> links
        </p>
        <div className="w-full flex gap-2">
          <input
            type="url"
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setInputValue(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`flex-1 px-4 py-2 text-sm border rounded-lg outline-none transition text-gray-700 placeholder-gray-300 ${error ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-red-400"}`}
          />
          <button type="button" onClick={handleAdd} className="px-4 py-2 bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white text-sm rounded-lg shrink-0">
            Add
          </button>
        </div>
        {error && <p className="text-red-400 text-xs self-start -mt-2">{error}</p>}
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-4">
        <button type="button" onClick={() => setEntries([])} className="px-9 py-2 border border-gray-500/50 bg-white hover:bg-blue-100/30 active:scale-95 transition-all text-gray-500 rounded">
          Clear
        </button>
        <button
          type="button"
          onClick={handleUse}
          disabled={entries.length === 0}
          className={`px-6 py-2 active:scale-95 transition-all text-white rounded ${entries.length === 0 ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-600"}`}
        >
          {entries.length === 0 ? "Add Link First" : `Use ${entries.length} Link${entries.length > 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}