"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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

  const handleCreateNote = (name: string) => {
    const newNote = { id: Date.now().toString(), name };
    setNotes((prev) => [...prev, newNote]);
  };

  const handleDeleteNote = (id: string) => {
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
