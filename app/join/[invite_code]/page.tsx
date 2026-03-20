"use client";

// app/join/[invite_code]/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface InviteInfo {
  channel_name: string;
  member_count: number;
  expires_at: string;
  use_count: number;
  max_uses: number | null;
  is_revoked: boolean;
}

function daysLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Expired";
  if (days === 1) return "Expires in 1 day";
  return `Expires in ${days} days`;
}

export default function JoinPage({
  params,
}: {
  params: { invite_code: string };
}) {
  const router = useRouter();
  const { invite_code } = params;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  // ── Load invite info ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      // Fetch invite + channel info
      const { data: invite, error: invErr } = await supabase
        .from("channel_invites")
        .select(
          `
          expires_at,
          use_count,
          max_uses,
          is_revoked,
          channels (name, id)
        `,
        )
        .eq("invite_code", invite_code)
        .single();

      if (invErr || !invite) {
        setError("This invite link is invalid.");
        setLoadingInfo(false);
        return;
      }

      if (invite.is_revoked) {
        setError("This invite link has been revoked by the admin.");
        setLoadingInfo(false);
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setError("This invite link has expired.");
        setLoadingInfo(false);
        return;
      }

      if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
        setError("This invite link has reached its maximum number of uses.");
        setLoadingInfo(false);
        return;
      }

      // Get member count
      const { count } = await supabase
        .from("channel_members")
        .select("*", { count: "exact", head: true })
        .eq("channel_id", (invite.channels as any).id);

      setInviteInfo({
        channel_name: (invite.channels as any).name,
        member_count: count ?? 0,
        expires_at: invite.expires_at,
        use_count: invite.use_count,
        max_uses: invite.max_uses,
        is_revoked: invite.is_revoked,
      });

      setLoadingInfo(false);

      // If already logged in, auto-join immediately
      if (session) {
        await joinChannel();
      }
    })();
  }, [invite_code]);

  // ── Join ──────────────────────────────────────────────────
  const joinChannel = async () => {
    setJoining(true);
    const { data, error: joinErr } = await supabase.rpc(
      "join_channel_by_invite",
      {
        p_invite_code: invite_code,
      },
    );

    if (joinErr || data?.error) {
      setError(joinErr?.message ?? data?.error ?? "Failed to join.");
      setJoining(false);
      return;
    }

    setJoined(true);
    setTimeout(
      () => router.replace(`/dashboard/channel/${data.channel_id}`),
      1000,
    );
  };

  // ── Not logged in — show branded preview, redirect to signin ──
  const handleJoinClick = () => {
    sessionStorage.setItem("pending_invite", invite_code);
    router.push("/signin");
  };

  // ── Loading ───────────────────────────────────────────────
  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-[#1a1b1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading invite…</p>
        </div>
      </div>
    );
  }

  // ── Joining spinner ───────────────────────────────────────
  if (joining && !joined) {
    return (
      <div className="min-h-screen bg-[#1a1b1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Joining channel…</p>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────
  if (joined) {
    return (
      <div className="min-h-screen bg-[#1a1b1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-400"
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
          </div>
          <div>
            <p className="text-white font-bold text-lg">
              You joined #{inviteInfo?.channel_name}!
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Redirecting you to the channel…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1b1e] flex items-center justify-center px-4">
        <div className="bg-[#2b2d31] rounded-2xl p-8 max-w-sm w-full text-center border border-white/10">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Invite Invalid</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Main branded invite page (Discord-style) ──────────────
  return (
    <div className="min-h-screen bg-[#1a1b1e] flex items-center justify-center px-4">
      <div className="bg-[#2b2d31] rounded-2xl w-full max-w-sm border border-white/10 overflow-hidden shadow-2xl">
        {/* Top banner */}
        <div className="h-24 bg-gradient-to-br from-blue-600 to-blue-800 relative">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        {/* Channel avatar */}
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 border-4 border-[#2b2d31] flex items-center justify-center shrink-0 shadow-lg">
              <span className="text-white text-xl font-bold">
                {inviteInfo?.channel_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="pb-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                You've been invited to join
              </p>
            </div>
          </div>

          {/* Channel name */}
          <h1 className="text-white text-2xl font-bold mb-1">
            # {inviteInfo?.channel_name}
          </h1>

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-gray-300">
                {inviteInfo?.member_count} member
                {inviteInfo?.member_count !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-600" />
            <span className="text-sm text-gray-400">
              {inviteInfo ? daysLeft(inviteInfo.expires_at) : ""}
            </span>
            {inviteInfo?.max_uses && (
              <>
                <div className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-sm text-gray-400">
                  {inviteInfo.use_count}/{inviteInfo.max_uses} uses
                </span>
              </>
            )}
          </div>

          {/* CTA */}
          {isLoggedIn ? (
            <button
              onClick={joinChannel}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Accept Invite & Join Channel
            </button>
          ) : (
            <>
              <button
                onClick={handleJoinClick}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors mb-3"
              >
                Join Channel
              </button>
              <p className="text-xs text-gray-500 text-center">
                You'll be asked to sign in or create a free account
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center justify-center gap-2">
          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-white rounded-sm" />
          </div>
          <span className="text-xs text-gray-400">
            <span className="text-white font-semibold">Study</span>
            <span className="text-blue-400 font-semibold">Forge</span>
            <span className="ml-1">· Study smarter together</span>
          </span>
        </div>
      </div>
    </div>
  );
}
