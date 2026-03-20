"use client";

// SharePopup.tsx — drop this in your components folder
// Import and use inside your channel page and sidebar

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface SharePopupProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

interface InviteData {
  id: string;
  invite_code: string;
  expires_at: string;
  use_count: number;
  max_uses: number | null;
  is_revoked: boolean;
}

function daysLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "⚠️ Expired";
  if (days === 1) return "Expires in 1 day";
  return `Expires in ${days} days`;
}

export default function SharePopup({
  channelId,
  channelName,
  onClose,
}: SharePopupProps) {
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const inviteUrl = invite
    ? `${window.location.origin}/join/${invite.invite_code}`
    : "";

  useEffect(() => {
    fetchInvite();
  }, [channelId]);

  const fetchInvite = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;

    if (!uid) {
      setLoading(false);
      return;
    }

    // Check if admin
    const { data: membership } = await supabase
      .from("channel_members")
      .select("role")
      .eq("channel_id", channelId)
      .eq("user_id", uid)
      .single();

    setIsAdmin(membership?.role === "admin");

    // Get latest active invite for this channel
    const { data: inviteData } = await supabase
      .from("channel_invites")
      .select("id, invite_code, expires_at, use_count, max_uses, is_revoked")
      .eq("channel_id", channelId)
      .eq("is_revoked", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setInvite(inviteData ?? null);
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Revoke old invite and create a fresh one (admin only)
  const handleResetLink = async () => {
    if (!invite || !isAdmin) return;
    setResetting(true);

    // Revoke current invite
    await supabase
      .from("channel_invites")
      .update({ is_revoked: true })
      .eq("id", invite.id);

    // Create new one via RPC (secure — checks admin role server-side)
    const { data } = await supabase.rpc("create_channel_invite", {
      p_channel_id: channelId,
      p_max_uses: null,
      p_expire_days: 7,
    });

    if (data && !data.error) {
      await fetchInvite(); // reload
    }

    setResetting(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Invite people to #{channelName}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Share this link — anyone who opens it can join.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 cursor-pointer rounded-lg hover:bg-gray-100 text-gray-400 ml-3 shrink-0"
          >
            <svg
              className="w-4 h-4 cursor-pointer"
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

        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invite ? (
            <>
              {/* Link box */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3">
                <p className="text-[11px] font-mono text-gray-500 truncate">
                  {inviteUrl}
                </p>
              </div>

              {/* Expiry + uses info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5 text-amber-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-xs text-amber-600 font-medium">
                    {daysLeft(invite.expires_at)}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {invite.use_count}{" "}
                  {invite.max_uses ? `/ ${invite.max_uses}` : ""} uses
                </span>
              </div>

              {/* Copy button */}
              <button
                onClick={handleCopy}
                className={`w-full py-3 cursor-pointer rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mb-3 ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Link Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy Invite Link
                  </>
                )}
              </button>

              {/* Reset link (admin only) */}
              {isAdmin && (
                <button
                  onClick={handleResetLink}
                  disabled={resetting}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  {resetting ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Reset Invite Link
                    </>
                  )}
                </button>
              )}

              <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
                Link expires in 7 days · Anyone with the link can join
              </p>
            </>
          ) : (
            /* No active invite — create one */
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-4">
                No active invite link. Create one to invite people.
              </p>
              {isAdmin && (
                <button
                  onClick={async () => {
                    setResetting(true);
                    await supabase.rpc("create_channel_invite", {
                      p_channel_id: channelId,
                      p_max_uses: null,
                      p_expire_days: 7,
                    });
                    await fetchInvite();
                    setResetting(false);
                  }}
                  disabled={resetting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  {resetting ? "Creating…" : "Generate Invite Link"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
