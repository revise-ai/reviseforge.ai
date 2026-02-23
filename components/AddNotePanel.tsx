"use client";

import { useState } from "react";
import Link from "next/link";
import NoteModal from "./NoteModal";

interface Note {
  id: string;
  name: string;
}

interface AddNotePanelProps {
  show: boolean;
  notes?: Note[];
  onClose: () => void;
  onNoteSelected?: (note: Note) => void;
  onNoteCreated?: (name: string) => void;
  onNoteDeleted?: (id: string) => void;
}

export default function AddNotePanel({
  show,
  notes: externalNotes,
  onClose,
  onNoteSelected,
  onNoteCreated,
  onNoteDeleted,
}: AddNotePanelProps) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteName, setNoteName] = useState("");
  const [internalNotes, setInternalNotes] = useState<Note[]>([]);

  // Use external notes if provided (NotePage), otherwise use internal state (Sidebar)
  const notes = externalNotes ?? internalNotes;

  const handleCreateNote = () => {
    if (!noteName.trim()) return;
    const newNote = { id: Date.now().toString(), name: noteName.trim() };
    if (onNoteCreated) {
      onNoteCreated(noteName.trim());
    } else {
      setInternalNotes((prev) => [...prev, newNote]);
    }
    setNoteName("");
    setShowNoteModal(false);
  };

  const handleDeleteNote = (id: string) => {
    if (onNoteDeleted) {
      onNoteDeleted(id);
    } else {
      setInternalNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-30 cursor-default"
        onClick={onClose}
      />

      {/* Expanded Panel */}
      <div className="fixed left-22.5 top-0 bottom-0 w-90 bg-white border-r border-gray-200 shadow-lg z-40 flex flex-col">
        {/* Header */}
        <div className="px-6 py-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <div className="w-5 h-5 bg-white rounded" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-gray-900">Study</span>
                <span className="text-blue-600">Forge</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 px-4 mt-6 overflow-y-auto">
          <h3 className="px-3 mb-2 text-sm font-medium text-gray-500">
            My Notes
          </h3>
          <div className="space-y-1">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <svg
                  className="w-4 h-4 text-gray-300 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <button
                  onClick={() => onNoteSelected && onNoteSelected(note)}
                  className="cursor-pointer flex-1 text-sm text-gray-700 truncate text-left"
                >
                  {note.name}
                </button>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="cursor-pointer opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                >
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add Note button */}
            <button
              onClick={() => setShowNoteModal(true)}
              className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm text-gray-600">Add Note</span>
            </button>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-100 p-4 shrink-0">
          <div className="flex items-center justify-between mb-1 px-3">
            <span className="text-xs text-gray-500">Current Plan</span>
            <span className="px-2 py-0.5 text-xs font-medium text-blue-600 bg-indigo-50 rounded">
              Free plan
            </span>
          </div>
          <Link
            href="/upgrade"
            className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">Upgrade plan</p>
              <p className="text-xs text-gray-500">
                Get more generations and more
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Note Modal */}
      <NoteModal
        show={showNoteModal}
        noteName={noteName}
        onNoteNameChange={setNoteName}
        onClose={() => {
          setShowNoteModal(false);
          setNoteName("");
        }}
        onCreate={handleCreateNote}
      />
    </>
  );
}
