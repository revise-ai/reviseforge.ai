"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import NoteEditor from "@/components/NoteEditor";

interface Note {
  id: string;
  name: string;
}

export default function NotePage() {
  const params = useParams();
  const noteName = decodeURIComponent(params.name as string);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("notes")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("name", noteName)
        .single();

      if (!error && data) setNote(data as Note);
      setLoading(false);
    };
    fetchNote();
  }, [noteName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-sm text-gray-400">Note not found.</p>
      </div>
    );
  }

  return <NoteEditor noteId={note.id} initialName={note.name} />;
}