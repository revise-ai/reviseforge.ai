"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Top-left nav logo */}
      <div className="px-6 py-5 flex items-center gap-2">
        <button className="text-gray-500 hover:text-gray-800 transition-colors">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {/* Logo mark */}
        <div className="flex items-end gap-0.5 ml-1">
          <span className="w-2 h-5 bg-gray-900 rounded-sm" />
          <span className="w-2 h-3 bg-gray-900 rounded-sm" />
          <span className="w-1 h-1.5 bg-gray-900 rounded-full mb-0.5" />
        </div>
      </div>

      {/* Centered form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[420px] flex flex-col items-center">

          {/* Logo mark centered */}
          <div className="flex items-end gap-0.5 mb-8">
            <span className="w-3 h-7 bg-gray-900 rounded-sm" />
            <span className="w-3 h-4 bg-gray-900 rounded-sm" />
            <span className="w-1.5 h-2 bg-gray-900 rounded-full mb-0.5" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Create an account</h1>
          <p className="text-gray-400 text-sm mb-8">Start studying smarter today.</p>

          {/* Google button */}
          <button className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-3.5 px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 shadow-sm transition-all active:scale-[0.99] mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="w-full flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Full name */}
          <input
            type="text"
            placeholder="Full name"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition mb-3"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition mb-3"
          />

          {/* Password with eye */}
          <div className="relative w-full mb-5">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
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

          {/* Create account button */}
          <button className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.99] shadow-sm mb-4 cursor-pointer">
            Create Account
          </button>

          {/* Terms */}
          <p className="text-xs text-gray-400 text-center mb-4">
            By signing up you agree to our{" "}
            <Link href="/terms" className="text-blue-500 hover:underline">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>
          </p>

          {/* Bottom link */}
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/signin" className="text-gray-900 font-semibold hover:text-blue-600 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}