// File path: app/flashcards/new/page.tsx
"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function NewFlashcardLoader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const source = searchParams.get("source");

  useEffect(() => {
    async function createSession() {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("flashcard_sessions")
        .insert({
          user_id: user?.id,
          status: "generating",
          file_name: source === "youtube" ? "YouTube Video" : source === "recording" ? "Recording" : "New Flashcards"
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating flashcard session:", error);
        router.push("/dashboard");
        return;
      }

      const params = new URLSearchParams();
      if (url) params.set("url", url);
      if (source) params.set("source", source);
      
      router.replace(`/flashcards/${data.id}?${params.toString()}`);
    }

    createSession();
  }, [router, url, source]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 font-medium">Preparing your flashcards...</p>
    </div>
  );
}

export default function NewFlashcardPage() {
  return (
    <Suspense>
      <NewFlashcardLoader />
    </Suspense>
  );
}
