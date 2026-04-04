// File path: app/quiz/new/page.tsx
"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function NewQuizLoader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const source = searchParams.get("source");

  useEffect(() => {
    async function createSession() {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("quiz_sessions")
        .insert({
          user_id: user?.id,
          status: "generating",
          file_name: source === "youtube" ? "YouTube Video" : source === "recording" ? "Recording" : "New Quiz"
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating quiz session:", error);
        router.push("/dashboard");
        return;
      }

      // Preserve query params for the target page to handle generation
      const params = new URLSearchParams();
      if (url) params.set("url", url);
      if (source) params.set("source", source);
      
      router.replace(`/quiz/${data.id}?${params.toString()}`);
    }

    createSession();
  }, [router, url, source]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 font-medium">Initializing your study session...</p>
    </div>
  );
}

export default function NewQuizPage() {
  return (
    <Suspense>
      <NewQuizLoader />
    </Suspense>
  );
}
