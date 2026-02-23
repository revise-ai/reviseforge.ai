"use client";

import { useState } from "react";

interface CreateChannelModalProps {
  show: boolean;
  onClose: () => void;
  onChannelCreated: (channel: {
    id: string;
    name: string;
    members: number;
  }) => void;
}

export default function CreateChannelModal({
  show,
  onClose,
  onChannelCreated,
}: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState("");

  if (!show) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    onChannelCreated({
      id: Date.now().toString(),
      name: channelName.trim(),
      members: 1,
    });
    setChannelName("");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Create a Channel
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Channels are shared spaces where your group can study and
                collaborate together.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors ml-4 shrink-0"
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

          {/* Info box — matches "About notes" style */}
          <div className="mx-6 mb-5 border border-gray-200 rounded-xl p-4 flex gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                About Channels
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Invite classmates, share notes, and study smarter together in a
                focused space.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Name of Channel
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="e.g. Biology 101, Calculus Study..."
              autoFocus
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm text-gray-900 placeholder-gray-400 transition-all"
            />

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 cursor-pointer px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!channelName.trim()}
                className="flex-1 cursor-pointer px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create Channel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
