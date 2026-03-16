"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AddNotePanel from "@/components/AddNotePanel";
import NoteEditor from "@/components/NoteEditor";

interface Note {
  id: string;
  name: string;
}

const NotePage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const pathname = usePathname();

  // Every time the sidebar clicks "Add Note" and lands on this page,
  // close the editor and show the panel
  useEffect(() => {
    setSelectedNote(null);
  }, [pathname]);

  // ── Load notes from Supabase on mount ──────────────────────
  useEffect(() => {
    const fetchNotes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setNotes(data as Note[]);
    };

    fetchNotes();
  }, []);

  // ── Create note in Supabase ─────────────────────────────────
  const handleCreateNote = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notes")
      .insert({ name, user_id: user.id, content: "" })
      .select("id, name")
      .single();

    if (!error && data) {
      setNotes((prev) => [data as Note, ...prev]);
    }
  };

  // ── Delete note from Supabase ───────────────────────────────
  const handleDeleteNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="h-screen bg-gray-50">
      <AddNotePanel
        show={!selectedNote}
        notes={notes}
        onClose={() => window.history.back()}
        onNoteSelected={(note) => setSelectedNote(note)}
        onNoteCreated={handleCreateNote}
        onNoteDeleted={handleDeleteNote}
      />

      {selectedNote && (
        <NoteEditor
          noteId={selectedNote.id}
          initialName={selectedNote.name}
          // NoteEditor handles back via window.history.back() or internal logic
        />
      )}
    </div>
  );
};

export default NotePage;