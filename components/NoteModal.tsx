"use client";

interface NoteModalProps {
  show: boolean;
  noteName: string;
  onNoteNameChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

export default function NoteModal({
  show,
  noteName,
  onNoteNameChange,
  onClose,
  onCreate,
}: NoteModalProps) {
  if (!show) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-60 cursor-default"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-70 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Modal header */}
          <div className="px-7 pt-7 pb-4">
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-xl font-semibold text-gray-800">
                Create a New Note
              </h2>
              <button
                onClick={onClose}
                className="cursor-pointer text-gray-400 hover:text-gray-600 transition mt-0.5"
              >
                <svg
                  className="w-5 h-5"
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
            <p className="text-sm text-gray-400">
              Notes are personal study spaces where you can organise your
              thoughts, summaries, and materials for any subject.
            </p>
          </div>

          {/* Info box */}
          <div className="mx-7 mb-5 border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  className="w-4 h-4 text-gray-500"
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
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  About notes
                </p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Notes help you capture ideas and key concepts from your study
                  sessions.
                </p>
              </div>
            </div>
          </div>

          {/* Name input */}
          <div className="mx-7 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={noteName}
              onChange={(e) => onNoteNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
              placeholder="e.g. GEOD 305"
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
            />
          </div>

          {/* Create button */}
          <div className="px-7 pb-7">
            <button
              type="button"
              onClick={onCreate}
              disabled={!noteName.trim()}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                noteName.trim()
                  ? "cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                  : "cursor-not-allowed bg-gray-100 text-gray-400"
              }`}
            >
              Create Note
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
