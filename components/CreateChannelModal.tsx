"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = channelName.trim();
    if (!trimmedName) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in to create a channel.");
        setLoading(false);
        return;
      }

      // 2. Insert channel into Supabase
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .insert({
          name: trimmedName,
          created_by: user.id,
        })
        .select("id, name")
        .single();

      if (channelError || !channel) {
        setError(channelError?.message ?? "Failed to create channel.");
        setLoading(false);
        return;
      }

      // 3. Add creator as admin member
      const { error: memberError } = await supabase
        .from("channel_members")
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) {
        setError(memberError.message);
        setLoading(false);
        return;
      }

      // 4. Notify parent
      onChannelCreated({
        id: channel.id,
        name: channel.name,
        members: 1,
      });

      setChannelName("");
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
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

          {/* Info box */}
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

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

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
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm text-gray-900 placeholder-gray-400 transition-all disabled:opacity-50"
            />

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 cursor-pointer px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!channelName.trim() || loading}
                className="flex-1 cursor-pointer px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create Channel"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}