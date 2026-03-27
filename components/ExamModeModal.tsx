// File path: components/ExamModeModal.tsx
"use client";

import { useState, ChangeEvent, DragEvent, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: number;
  file: File; // real File stored here — passed to page on Start
  name: string;
  ext: string;
  progress: number;
  done: boolean;
}

interface ExamModeModalProps {
  show: boolean;
  onClose: () => void;
  onReady: (file: File) => void; // ← now passes the real File to the page
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExt(name: string) {
  return name.split(".").pop()?.toUpperCase() ?? "FILE";
}

function extColor(ext: string) {
  if (ext === "PDF") return { bg: "bg-red-100", text: "text-red-500" };
  if (["DOC", "DOCX"].includes(ext))
    return { bg: "bg-blue-100", text: "text-blue-500" };
  if (["PPT", "PPTX"].includes(ext))
    return { bg: "bg-orange-100", text: "text-orange-500" };
  return { bg: "bg-gray-100", text: "text-gray-500" };
}

function simulateUpload(
  id: number,
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

// ─── Progress Panel (top-right) ───────────────────────────────────────────────

function ProgressPanel({
  files,
  onRemove,
}: {
  files: UploadedFile[];
  onRemove: (id: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const uploading = files.filter((f) => !f.done);

  if (files.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-200 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            {uploading.length > 0 ? "Uploading files" : "Upload complete"}
          </span>
          {uploading.length > 0 && (
            <svg
              className="w-4 h-4 animate-spin text-blue-400"
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
                      className="h-full rounded-full transition-all duration-300 bg-blue-500"
                      style={{ width: `${file.progress}%` }}
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

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function ExamModeModal({
  show,
  onClose,
  onReady,
}: ExamModeModalProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doneFiles = files.filter((f) => f.done);
  const uploadingFiles = files.filter((f) => !f.done);
  const doneCount = doneFiles.length;

  const addFiles = useCallback((incoming: File[]) => {
    const newEntries: UploadedFile[] = incoming.map((f) => ({
      id: Date.now() + Math.random(),
      file: f,
      name: f.name,
      ext: getExt(f.name),
      progress: 0,
      done: false,
    }));
    setFiles((prev) => [...prev, ...newEntries]);
    newEntries.forEach((entry) => simulateUpload(entry.id, setFiles));
  }, []);

  const removeFile = useCallback((id: number) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleStartExam = () => {
    if (doneCount === 0) return;
    const firstDone = doneFiles[0];
    setFiles([]);
    onReady(firstDone.file); // pass real File to page
  };

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  if (!show) return null;

  return (
    <>
      {/* Progress Panel */}
      <ProgressPanel files={files} onRemove={removeFile} />

      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l9-5-9-5-9 5 9 5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  Enter Exam Mode
                </h2>
              </div>
              <p className="text-gray-400 text-sm">
                Upload your study material — we'll simulate a real exam
                experience for you
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 cursor-pointer hover:text-gray-600 transition p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-8 pb-4">
            {/* Info pills */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {[
                { label: "Timed sessions" },
                { label: "Auto-generated questions" },
                { label: "Instant score & feedback" },
              ].map((pill) => (
                <span
                  key={pill.label}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-blue-700 rounded-full text-xs font-medium"
                >
                  {pill.label}
                </span>
              ))}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dotted p-8 flex flex-col items-center gap-3 cursor-pointer transition rounded-xl
                ${isDragging ? "border-blue-400 bg-indigo-50" : "border-gray-300 hover:border-blue-400"}`}
            >
              <svg
                width="34"
                height="34"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#6366F1"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>

              {/* Completed files listed inside dropzone */}
              {doneFiles.length > 0 && (
                <div className="w-full space-y-1.5">
                  {doneFiles.map((f) => {
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
                            e.stopPropagation();
                            removeFile(f.id);
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

              <p className="text-gray-500 text-sm">
                Drag your study material here
              </p>
              <p className="text-gray-400 text-xs text-center">
                PDF, Word, PowerPoint, or plain text — we'll generate your exam
              </p>

              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {/* Uploading pills below drop zone */}
            {uploadingFiles.length > 0 && (
              <div className="mt-3 space-y-2">
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
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">
                          {f.name}
                        </p>
                        <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300 bg-blue-500"
                            style={{ width: `${f.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        Uploading
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 mt-4 flex justify-end gap-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-9 py-2 cursor-pointer border border-gray-500/50 bg-white hover:bg-gray-50 active:scale-95 transition-all text-gray-500 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartExam}
              disabled={doneCount === 0}
              className={`px-6 cursor-pointer py-2 active:scale-95 transition-all text-white rounded-lg ${
                doneCount === 0
                  ? "bg-gray-200 cursor-not-allowed text-gray-400"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {doneCount === 0 ? "Upload Material First" : "Start Exam →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
