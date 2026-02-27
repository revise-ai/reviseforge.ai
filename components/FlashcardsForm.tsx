"use client";

import { useState, useRef, DragEvent, ChangeEvent, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UploadingFile {
  id: number;
  file: File;
  name: string;
  ext: string;
  progress: number;
  done: boolean;
}

function getExt(name: string) {
  return name.split(".").pop()?.toUpperCase() ?? "FILE";
}

function extColor(ext: string) {
  if (ext === "PDF") return { bg: "bg-red-100", text: "text-red-500" };
  if (["DOC", "DOCX"].includes(ext)) return { bg: "bg-blue-100", text: "text-blue-500" };
  if (["PPT", "PPTX"].includes(ext)) return { bg: "bg-orange-100", text: "text-orange-500" };
  if (ext === "TXT") return { bg: "bg-gray-100", text: "text-gray-500" };
  return { bg: "bg-gray-100", text: "text-gray-500" };
}

function simulateProgress(
  id: number,
  setter: React.Dispatch<React.SetStateAction<UploadingFile[]>>
) {
  let current = 0;
  const interval = setInterval(() => {
    current += Math.floor(Math.random() * 18) + 6;
    if (current >= 100) {
      current = 100;
      clearInterval(interval);
      setter((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: 100, done: true } : f))
      );
    } else {
      setter((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: current } : f))
      );
    }
  }, 250);
}

export default function FlashcardsForm({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const doneFiles = uploadingFiles.filter((f) => f.done);
  const inProgressFiles = uploadingFiles.filter((f) => !f.done);
  const hasDone = doneFiles.length > 0;

  const addFiles = useCallback((incoming: File[]) => {
    const newEntries: UploadingFile[] = incoming.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      ext: getExt(file.name),
      progress: 0,
      done: false,
    }));
    setUploadingFiles((prev) => [...prev, ...newEntries]);
    newEntries.forEach((entry) => simulateProgress(entry.id, setUploadingFiles));
  }, []);

  const removeFile = (id: number) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleGenerate = () => {
    if (!hasDone) return;
    const firstDone = doneFiles[0];
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      sessionStorage.setItem("flashcard_file", base64);
      sessionStorage.setItem("flashcard_filename", firstDone.name);
      const id = Math.random().toString(36).slice(2, 18);
      onClose?.();
      router.push(`/flashcards/${id}`);
    };
    reader.readAsDataURL(firstDone.file);
  };

  return (
    <>
      {/* ── Upload Progress Panel (top-right, like the original) ── */}
      {uploadingFiles.length > 0 && (
        <div className="fixed top-5 right-5 z-[200] w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">
                {inProgressFiles.length > 0 ? "Uploading files" : "Upload complete"}
              </span>
              {inProgressFiles.length > 0 && (
                <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
            </div>
            <button
              onClick={() => setPanelCollapsed((c) => !c)}
              className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              <svg
                className={`w-4 h-4 transition-transform ${panelCollapsed ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          {!panelCollapsed && (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {uploadingFiles.map((f) => {
                const { bg, text } = extColor(f.ext);
                return (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${bg} ${text}`}>
                      {f.ext}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate">{f.name}</p>
                      <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-green-500"
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0">
                      {f.done ? (
                        <button
                          onClick={() => removeFile(f.id)}
                          className="text-gray-300 hover:text-red-400 transition cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400">{f.progress}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Make Flashcards</h2>
              <p className="text-gray-400 text-sm mt-1">
                Upload your reading material — we'll generate the flashcards for you
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition text-xl leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-8 pb-8">
            {/* Drop zone — files appear INSIDE it when done */}
            <label
              htmlFor="flashcard-file-input"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dotted p-8 flex flex-col items-center gap-3 cursor-pointer transition rounded-xl ${
                isDragging
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 hover:border-green-400"
              }`}
            >
              {/* Icon */}
              <svg className="w-9 h-9 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>

              {/* Done files shown inside dropzone */}
              {doneFiles.length > 0 && (
                <div className="w-full space-y-1.5 mt-1">
                  {doneFiles.map((f) => {
                    const { bg, text } = extColor(f.ext);
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${bg} ${text}`}>
                          {f.ext}
                        </span>
                        <span className="text-xs text-gray-700 truncate flex-1">{f.name}</span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {(f.file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); removeFile(f.id); }}
                          className="text-gray-300 hover:text-red-400 transition cursor-pointer shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* In-progress files shown inside dropzone */}
              {inProgressFiles.length > 0 && (
                <div className="w-full space-y-1.5">
                  {inProgressFiles.map((f) => {
                    const { bg, text } = extColor(f.ext);
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${bg} ${text}`}>
                          {f.ext}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">{f.name}</p>
                          <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300 bg-green-400"
                              style={{ width: `${f.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0">{f.progress}%</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-gray-500 text-sm">Drag your reading material here</p>
              <p className="text-gray-400 text-xs text-center">
                PDF, Word, PowerPoint, or plain text — we'll handle the rest
              </p>

              <input
                id="flashcard-file-input"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-9 py-2 cursor-pointer border border-gray-500/50 bg-white hover:bg-gray-50 active:scale-95 transition-all text-gray-500 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!hasDone || loading}
                className={`px-6 py-2 active:scale-95 transition-all text-white rounded-lg flex items-center gap-2 ${
                  !hasDone || loading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                }`}
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Preparing...
                  </>
                ) : !hasDone ? (
                  "Add Resources First"
                ) : (
                  "Generate Flashcards"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}