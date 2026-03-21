"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "error" | "success";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-5 right-5 z-[200] w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${type === "error" ? "bg-red-500" : "bg-green-500"}`} />
          <span className="text-sm font-semibold text-gray-700">
            {type === "error" ? "Error" : "Success"}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full ${type === "error" ? "bg-red-400" : "bg-green-400"}`}
          style={{ animation: "shrink 4s linear forwards" }}
        />
      </div>
      <style>{`
        @keyframes shrink { from { width: 100%; } to { width: 0%; } }
        .animate-in { animation: slideIn 0.2s ease-out; }
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

function SigninInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const showToast = (message: string, type: "error" | "success") => setToast({ message, type });
  const closeToast = () => setToast(null);

  const getInviteCode = () =>
    searchParams.get("invite") ?? sessionStorage.getItem("pendingInviteCode");

  const redirectAfterAuth = () => {
    const inviteCode = getInviteCode();
    if (inviteCode) {
      sessionStorage.removeItem("pendingInviteCode");
      router.replace(`/join/${inviteCode}`);
    } else {
      router.replace("/dashboard");
    }
  };

  const handleEmailSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("invalid login") || error.message.toLowerCase().includes("invalid credentials")) {
          showToast("Incorrect email or password. Please try again.", "error");
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          showToast("Please confirm your email before signing in.", "error");
        } else if (error.message.toLowerCase().includes("user not found") || error.message.toLowerCase().includes("no user")) {
          showToast("No account found with this email. Please sign up first.", "error");
        } else {
          showToast(error.message, "error");
        }
      } else {
        redirectAfterAuth();
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignin = async () => {
    setGoogleLoading(true);
    try {
      const inviteCode = getInviteCode();
      const callbackUrl = inviteCode
        ? `${window.location.origin}/auth/callback?invite=${inviteCode}`
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      if (error) showToast(error.message, "error");
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <div className="px-6 py-5 flex items-center gap-2">
        <button className="text-gray-500 hover:text-gray-800 transition-colors">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-end gap-0.5 ml-1">
          <span className="w-2 h-5 bg-gray-900 rounded-sm" />
          <span className="w-2 h-3 bg-gray-900 rounded-sm" />
          <span className="w-1 h-1.5 bg-gray-900 rounded-full mb-0.5" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          <div className="flex items-end gap-0.5 mb-8">
            <span className="w-3 h-7 bg-gray-900 rounded-sm" />
            <span className="w-3 h-4 bg-gray-900 rounded-sm" />
            <span className="w-1.5 h-2 bg-gray-900 rounded-full mb-0.5" />
          </div>

          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-8">Let's continue your learning journey.</p>

          <button
            onClick={handleGoogleSignin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-3.5 px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 shadow-sm transition-all active:scale-[0.99] mb-4 disabled:opacity-60 cursor-pointer"
          >
            {googleLoading ? (
              <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="w-full flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition mb-3"
          />

          <div className="relative w-full mb-2">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleEmailSignin(e as any); }}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 pr-12 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              {showPassword ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          <div className="w-full flex justify-end mb-5">
            <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-blue-600 transition">
              Forgot password?
            </Link>
          </div>

          <button
            onClick={handleEmailSignin}
            disabled={loading || !email || !password}
            className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.99] shadow-sm mb-6 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <p className="text-sm text-gray-400">
            Don't have an account?{" "}
            <Link href="/signup" className="text-gray-900 font-semibold hover:text-blue-600 transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

// ── Wrap in Suspense — required for useSearchParams in Next.js 15 ──
export default function SigninPage() {
  return (
    <Suspense>
      <SigninInner />
    </Suspense>
  );
}