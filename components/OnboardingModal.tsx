"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";

interface OnboardingModalProps {
  show: boolean;
  userId: string;
  onComplete: () => void;
}

const LANGUAGES = [
  { code: "US", name: "English (United States)" },
  { code: "FR", name: "Français (France)" },
  { code: "DE", name: "Deutsch (Deutschland)" },
  { code: "IN", name: "हिन्दी (भारत)" },
  { code: "ID", name: "Indonesia (Indonesia)" },
  { code: "IT", name: "Italiano (Italia)" },
  { code: "JP", name: "日本語 (日本)" },
  { code: "KR", name: "한국어 (대한민국)" },
  { code: "BR", name: "Português (Brasil)" },
  { code: "MX", name: "Español (Latinoamérica)" },
  { code: "ES", name: "Español (España)" },
];

const USE_CASES = ["Work", "Study", "Personal", "Teaching"];
const GOALS = ["Exam Prep", "Coursework Support", "Research Projects", "Other"];
const SOURCES = [
  "Search Engine (Google)",
  "Instagram",
  "Facebook",
  "TikTok",
  "YouTube",
  "Twitter / X",
  "LinkedIn",
  "Other",
];

export default function OnboardingModal({ show, userId, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState("English (United States)");
  const [useCase, setUseCase] = useState("");
  const [goal, setGoal] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);

  const { setLanguage } = useLanguage();

  const totalSteps = 4;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Save to user_onboarding table
      const { error: onboardingError } = await supabase.from("user_onboarding").insert({
        user_id: userId,
        language: lang,
        use_case: useCase,
        goal: goal,
        referral_source: source,
      });

      if (onboardingError) {
        console.error("Onboarding error:", onboardingError);
      } else {
        // 2. Sync with global LanguageContext (which also updates profiles table)
        await setLanguage(lang);
        onComplete();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl flex flex-col items-center">
        {/* Progress Bar */}
        <div className="w-full max-w-xs flex gap-1 mb-12">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? "bg-blue-600" : "bg-gray-100"
              }`}
            />
          ))}
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          {step === 1 && "Kickstart your personalized learning experience"}
          {step === 2 && "What describes your primary use case?"}
          {step === 3 && "What is your top learning objective?"}
          {step === 4 && "Where did you first discover ReviseForge?"}
        </h2>
        <p className="text-gray-400 text-sm mb-8 text-center">
          Help us tailor the experience just for you.
        </p>

        {/* Step Content */}
        <div className="w-full max-w-md space-y-3">
          {step === 1 && (
            <div className="space-y-4">
               <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">
                Preferred Language
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.name}
                    onClick={() => { setLang(l.name); }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all cursor-pointer ${
                      lang === l.name
                        ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                        : "border-gray-100 hover:border-gray-200 text-gray-600"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-gray-400 font-mono text-xs w-6">{l.code}</span>
                      <span className="text-sm">{l.name}</span>
                    </span>
                    {lang === l.name && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-3">
              {USE_CASES.map((uc) => (
                <button
                  key={uc}
                  onClick={() => setUseCase(uc)}
                  className={`w-full px-5 py-4 rounded-2xl border text-sm transition-all text-left cursor-pointer ${
                    useCase === uc
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                      : "border-gray-100 hover:border-gray-200 text-gray-600"
                  }`}
                >
                  {uc}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`w-full px-5 py-4 rounded-2xl border text-sm transition-all text-left cursor-pointer ${
                    goal === g
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                      : "border-gray-100 hover:border-gray-200 text-gray-600"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              {SOURCES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`w-full px-4 py-4 rounded-2xl border text-xs transition-all text-left cursor-pointer ${
                    source === s
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                      : "border-gray-100 hover:border-gray-200 text-gray-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="w-full max-w-md mt-10">
          <button
            onClick={() => {
              if (step < totalSteps) setStep(step + 1);
              else handleSubmit();
            }}
            disabled={
              loading ||
              (step === 2 && !useCase) ||
              (step === 3 && !goal) ||
              (step === 4 && !source)
            }
            className="w-full py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              step === totalSteps ? "Finish Setup" : "Continue"
            )}
          </button>
          
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-full mt-3 py-3 text-sm text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              Go back
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
      `}</style>
    </div>
  );
}
