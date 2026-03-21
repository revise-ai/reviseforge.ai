"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface InviteInfo {
  id: string;
  channel_id: string;
  channel_name: string;
  expires_at: string;
  use_count: number;
  max_uses: number | null;
  is_revoked: boolean;
}

export default function JoinPage({
  params,
}: {
  params: Promise<{ invite_code: string }>;
}) {
  const { invite_code } = use(params);
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [invalidReason, setInvalidReason] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  function nameToSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-");
  }

  useEffect(() => {
    (async () => {
      console.log("🔍 Looking up invite_code:", invite_code);

      // 1. Fetch invite — select * so we see all columns regardless of naming
      const { data: inviteData, error: inviteError } = await supabase
        .from("channel_invites")
        .select("*")
        .eq("invite_code", invite_code)
        .maybeSingle();

      console.log("📦 Invite data:", inviteData);
      console.log("❌ Invite error:", inviteError);

      if (inviteError || !inviteData) {
        setInvalidReason("Invite not found in database.");
        setInvalid(true);
        setLoading(false);
        return;
      }

      // Check revoked
      if (inviteData.is_revoked) {
        setInvalidReason("This invite has been revoked.");
        setInvalid(true);
        setLoading(false);
        return;
      }

      // Check expiry
      const now = new Date();
      const expiresAt = new Date(inviteData.expires_at);
      console.log("⏰ Now:", now.toISOString(), "Expires:", expiresAt.toISOString());

      if (expiresAt < now) {
        setInvalidReason("This invite has expired.");
        setInvalid(true);
        setLoading(false);
        return;
      }

      // Check max uses
      if (
        inviteData.max_uses !== null &&
        inviteData.use_count >= inviteData.max_uses
      ) {
        setInvalidReason("This invite has reached its maximum uses.");
        setInvalid(true);
        setLoading(false);
        return;
      }

      // 2. Fetch channel name
      const { data: channelData, error: channelError } = await supabase
        .from("channels")
        .select("name")
        .eq("id", inviteData.channel_id)
        .single();

      console.log("📺 Channel data:", channelData, "error:", channelError);

      setInvite({
        id: inviteData.id,
        channel_id: inviteData.channel_id,
        channel_name: channelData?.name ?? "Unknown Channel",
        expires_at: inviteData.expires_at,
        use_count: inviteData.use_count,
        max_uses: inviteData.max_uses,
        is_revoked: inviteData.is_revoked,
      });

      // 3. Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("👤 Current user:", user?.id ?? "not logged in");

      if (!user) {
        sessionStorage.setItem("pendingInviteCode", invite_code);
        const hasVisited = localStorage.getItem("rf_has_visited");
        if (hasVisited) {
          router.replace(`/signin?invite=${invite_code}`);
        } else {
          localStorage.setItem("rf_has_visited", "true");
          router.replace(`/signup?invite=${invite_code}`);
        }
        return;
      }

      setCurrentUser({ id: user.id });

      // 4. Check if already a member
      const { data: memberData } = await supabase
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", inviteData.channel_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberData) {
        setAlreadyMember(true);
      }

      setLoading(false);
    })();
  }, [invite_code]);

  const handleJoin = async () => {
    if (!invite || !currentUser) return;
    setJoining(true);

    const { error } = await supabase.from("channel_members").insert({
      channel_id: invite.channel_id,
      user_id: currentUser.id,
      role: "member",
    });

    if (error && error.code !== "23505") {
      console.error("Join error:", error);
      setJoining(false);
      return;
    }

    await supabase
      .from("channel_invites")
      .update({ use_count: invite.use_count + 1 })
      .eq("id", invite.id);

    setJoined(true);
    setJoining(false);

    setTimeout(() => {
      router.replace(
        `/dashboard/channel/${nameToSlug(invite.channel_name)}?joined=true`,
      );
    }, 1200);
  };

  const handleCancel = () => {
    router.replace("/dashboard");
  };

  const handleGoToChannel = () => {
    if (!invite) return;
    router.replace(`/dashboard/channel/${nameToSlug(invite.channel_name)}`);
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Checking invite…</p>
        </div>
      </div>
    );
  }

  // ── Invalid ──────────────────────────────────────────────
  if (invalid || !invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-red-500"
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
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Invalid Invite Link
          </h2>
          <p className="text-sm text-gray-500 mb-2">{invalidReason}</p>
          <p className="text-xs text-gray-400 font-mono break-all">
            Code: {invite_code}
          </p>
        </div>
      </div>
    );
  }

  // ── Already a member ─────────────────────────────────────
  if (alreadyMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-blue-600"
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
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            You're already a member!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            You already belong to{" "}
            <span className="font-semibold text-gray-700">
              #{invite.channel_name}
            </span>
            .
          </p>
          <button
            onClick={handleGoToChannel}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Go to Channel
          </button>
        </div>
      </div>
    );
  }

  // ── Joined success ───────────────────────────────────────
  if (joined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-green-600"
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
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Joined successfully!
          </h2>
          <p className="text-sm text-gray-500">
            Taking you to{" "}
            <span className="font-semibold text-gray-700">
              #{invite.channel_name}
            </span>
            …
          </p>
        </div>
      </div>
    );
  }

  // ── Join prompt ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded" />
          </div>
          <span className="text-lg font-bold">
            <span className="text-gray-900">Study</span>
            <span className="text-blue-600">Forge</span>
          </span>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-3">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-xs text-gray-400 mb-1">You've been invited to join</p>
          <h2 className="text-xl font-bold text-gray-900">
            #{invite.channel_name}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {joining ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Join Now
              </>
            )}
          </button>
          <button
            onClick={handleCancel}
            className="w-full py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
          By joining, you agree to follow the channel's rules and guidelines.
        </p>
      </div>
    </div>
  );
}