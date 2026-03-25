"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

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

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-400" };
  if (score <= 2) return { score, label: "Fair", color: "bg-yellow-400" };
  if (score <= 3) return { score, label: "Good", color: "bg-blue-400" };
  return { score, label: "Strong", color: "bg-green-500" };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const showToast = (message: string, type: "error" | "success") => setToast({ message, type });
  const strength = getStrength(password);

  const handleReset = async () => {
    if (password.length < 8) {
      showToast("Password must be at least 8 characters.", "error");
      return;
    }
    if (strength.score < 2) {
      showToast("Please choose a stronger password.", "error");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast("Password reset successfully! Redirecting to sign in...", "success");
        setTimeout(() => router.replace("/signin"), 3000);
      }
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="px-6 py-5 flex items-center gap-2">
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

          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Reset password</h1>
          <p className="text-gray-400 text-sm mb-8 text-center">
            Enter your new password below.
          </p>

          {/* New Password */}
          <div className="relative w-full mb-2">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* Password Strength Bar */}
          {password.length > 0 && (
            <div className="w-full mb-4">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      i <= strength.score ? strength.color : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${
                strength.label === "Weak" ? "text-red-400" :
                strength.label === "Fair" ? "text-yellow-500" :
                strength.label === "Good" ? "text-blue-400" : "text-green-500"
              }`}>
                {strength.label} password
              </p>
            </div>
          )}

          {/* Confirm Password */}
          <div className="relative w-full mb-5">
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleReset(); }}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 pr-12 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              {showConfirm ? (
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

          <button
            onClick={handleReset}
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.99] shadow-sm mb-4 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>

          <p className="text-sm text-gray-400">
            Remember your password?{" "}
            <Link href="/signin" className="text-gray-900 font-semibold hover:text-blue-600 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}