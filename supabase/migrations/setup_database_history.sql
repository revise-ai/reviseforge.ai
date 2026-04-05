-- 1. Create file_sessions table so that uploaded files have a persistant session context in the database
CREATE TABLE IF NOT EXISTS file_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_url TEXT, -- In case you eventually use Supabase Storage instead of IndexedDB
  last_visited TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for file_sessions
ALTER TABLE file_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can fully manage their own file_sessions" ON file_sessions FOR ALL USING (auth.uid() = user_id);

-- 2. Modify recent_sessions schema to accommodate file uploads!
-- Since you don't have recent_sessions yet at all, this will create it perfectly.
CREATE TABLE IF NOT EXISTS recent_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('youtube', 'recording', 'quiz', 'flashcard', 'exam', 'chat', 'file')),
  title TEXT NOT NULL,
  subtitle TEXT,
  last_visited TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  href TEXT NOT NULL,
  video_id TEXT,
  session_id UUID NOT NULL
);

-- Index for fast lookup by user and most recent visit
CREATE INDEX IF NOT EXISTS recent_sessions_user_id_last_visited_idx ON recent_sessions(user_id, last_visited DESC);

-- Unique constraint to allow UPSERT (one entry per user per specific session)
ALTER TABLE recent_sessions ADD CONSTRAINT unique_user_session UNIQUE(user_id, session_id);

-- Enable RLS for recent_sessions
ALTER TABLE recent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can fully manage their own recent_sessions" ON recent_sessions FOR ALL USING (auth.uid() = user_id);
