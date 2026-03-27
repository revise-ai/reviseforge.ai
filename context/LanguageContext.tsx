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

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>("English (United States)");

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
