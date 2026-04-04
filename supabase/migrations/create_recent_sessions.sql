-- Unified table for activity tracking across all session types
CREATE TABLE IF NOT EXISTS recent_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('youtube', 'recording', 'quiz', 'flashcard', 'exam', 'chat')),
  title TEXT NOT NULL,
  subtitle TEXT,
  last_visited TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  href TEXT NOT NULL,
  video_id TEXT, -- Optional, for YouTube sessions
  session_id UUID NOT NULL -- Reference to the original session ID
);

-- Index for fast lookup by user and most recent visit
CREATE INDEX IF NOT EXISTS recent_sessions_user_id_last_visited_idx ON recent_sessions(user_id, last_visited DESC);

-- Unique constraint to allow UPSERT (one entry per user per specific session)
ALTER TABLE recent_sessions ADD CONSTRAINT unique_user_session UNIQUE(user_id, session_id);
