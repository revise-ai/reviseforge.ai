"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { translations, LanguageCode } from "@/lib/translations";
import { translateText } from "@/lib/gemini";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string) => string;
  aiTranslate: (text: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const COOKIE_NAME = "reviseforge_locale";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    return (getCookie(COOKIE_NAME) as LanguageCode) || "English (United States)";
  });

  const fetchLanguage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", user.id)
        .single();
      
      if (profile?.language) {
        setLanguageState(profile.language);
      }
    }
  }, []);

  useEffect(() => {
    fetchLanguage();
  }, [fetchLanguage]);

  const setLanguage = async (newLang: LanguageCode) => {
    setLanguageState(newLang);
    document.cookie = `${COOKIE_NAME}=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ language: newLang })
        .eq("id", user.id);
    }
  };

  const t = (key: string): string => {
    const langTranslations = translations[language] || translations["English (United States)"];
    return langTranslations[key] || translations["English (United States)"][key] || key;
  };

  const aiTranslate = async (text: string): Promise<string> => {
    if (language === "English (United States)") return text;
    return await translateText(text, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, aiTranslate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
