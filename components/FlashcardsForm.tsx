"use client";

import { useState, DragEvent, ChangeEvent } from "react";

export default function FlashcardsForm() {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [open, setOpen] = useState<boolean>(true);

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!open) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <button
          onClick={() => setOpen(true)}
          className="px-6 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
        >
          Open Modal
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              Add Resources
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Choose files to be sourced for your flashcards
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-8 pb-8">
          {/* Selected files list */}
          {files.length > 0 && (
            <div className="mb-4 space-y-2 max-h-36 overflow-y-auto">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 text-sm text-gray-700"
                >
                  <span className="truncate max-w-xs">{file.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-gray-400 hover:text-red-500 transition ml-4"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Drop zone */}
          <div className="max-w-full w-full text-sm">
            <label
              htmlFor="fileInput"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dotted p-10 mt-2 flex flex-col items-center gap-4 cursor-pointer transition rounded-lg ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-400 hover:border-blue-500"
              }`}
            >
              <svg
                width="31"
                height="31"
                viewBox="0 0 31 31"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18.085 2.583H7.75a2.583 2.583 0 0 0-2.583 2.584v20.666a2.583 2.583 0 0 0 2.583 2.584h15.5a2.583 2.583 0 0 0 2.584-2.584v-15.5m-7.75-7.75 7.75 7.75m-7.75-7.75v7.75h7.75M15.5 23.25V15.5m-3.875 3.875h7.75"
                  stroke="#2563EB"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-gray-500">Drag files here to upload</p>
              <p className="text-gray-400">
                Or <span className="text-blue-500 underline">click here</span>{" "}
                to select a file
              </p>
              <input
                id="fileInput"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-9 py-2 border border-gray-500/50 bg-white hover:bg-blue-100/30 active:scale-95 transition-all text-gray-500 rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={files.length === 0}
              className={`px-6 py-2 active:scale-95 transition-all text-white rounded ${
                files.length === 0
                  ? "bg-indigo-300 cursor-not-allowed"
                  : "bg-indigo-500 hover:bg-indigo-600"
              }`}
            >
              {files.length === 0
                ? "Add Resources First"
                : `Upload ${files.length} File${files.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
