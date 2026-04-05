-- 1. Ensure all session tables have last_visited and use consistent UUIDs
DO $$ 
BEGIN 
    -- youtube_sessions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='youtube_sessions' AND column_name='last_visited') THEN
        ALTER TABLE youtube_sessions ADD COLUMN last_visited TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- recording_sessions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recording_sessions' AND column_name='last_visited') THEN
        ALTER TABLE recording_sessions ADD COLUMN last_visited TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- chat_sessions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='last_visited') THEN
        ALTER TABLE chat_sessions ADD COLUMN last_visited TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- quiz_sessions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quiz_sessions' AND column_name='last_visited') THEN
        ALTER TABLE quiz_sessions ADD COLUMN last_visited TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- flashcard_sessions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='flashcard_sessions' AND column_name='last_visited') THEN
        ALTER TABLE flashcard_sessions ADD COLUMN last_visited TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- exam_sessions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_sessions' AND column_name='last_visited') THEN
        ALTER TABLE exam_sessions ADD COLUMN last_visited TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Create file_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS file_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_url TEXT,
  last_visited TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for file_sessions
ALTER TABLE file_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own file_sessions" ON file_sessions;
CREATE POLICY "Users can manage their own file_sessions" ON file_sessions FOR ALL USING (auth.uid() = user_id);

-- 3. Create/Update recent_sessions (Unified History table)
CREATE TABLE IF NOT EXISTS recent_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, 
  title TEXT NOT NULL,
  subtitle TEXT,
  last_visited TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  href TEXT NOT NULL,
  video_id TEXT,
  session_id UUID NOT NULL
);

-- Ensure unique constraint for UPSERT (one entry per user per specific session)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_session') THEN
        ALTER TABLE recent_sessions ADD CONSTRAINT unique_user_session UNIQUE(user_id, session_id);
    END IF;
END $$;

-- Enable RLS for recent_sessions
ALTER TABLE recent_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own recent_sessions" ON recent_sessions;
CREATE POLICY "Users can manage their own recent_sessions" ON recent_sessions FOR ALL USING (auth.uid() = user_id);

-- 4. Ensure all content tables have BOTH session_id and recording_session_id to avoid "disappearing" on refresh
-- This allows the app to query by either depending on the mode.

DO $$ 
BEGIN 
    -- content_summaries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_summaries' AND column_name='session_id') THEN
        ALTER TABLE content_summaries ADD COLUMN session_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_summaries' AND column_name='recording_session_id') THEN
        ALTER TABLE content_summaries ADD COLUMN recording_session_id UUID;
    END IF;

    -- content_chapters
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_chapters' AND column_name='session_id') THEN
        ALTER TABLE content_chapters ADD COLUMN session_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_chapters' AND column_name='recording_session_id') THEN
        ALTER TABLE content_chapters ADD COLUMN recording_session_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_chapters' AND column_name='chapter_order') THEN
        ALTER TABLE content_chapters ADD COLUMN chapter_order INTEGER;
    END IF;

    -- content_transcripts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_transcripts' AND column_name='session_id') THEN
        ALTER TABLE content_transcripts ADD COLUMN session_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_transcripts' AND column_name='recording_session_id') THEN
        ALTER TABLE content_transcripts ADD COLUMN recording_session_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_transcripts' AND column_name='transcript_order') THEN
        ALTER TABLE content_transcripts ADD COLUMN transcript_order INTEGER;
    END IF;

    -- content_quizzes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_quizzes' AND column_name='session_id') THEN
        ALTER TABLE content_quizzes ADD COLUMN session_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_quizzes' AND column_name='recording_session_id') THEN
        ALTER TABLE content_quizzes ADD COLUMN recording_session_id UUID;
    END IF;

    -- content_flashcards
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_flashcards' AND column_name='session_id') THEN
        ALTER TABLE content_flashcards ADD COLUMN session_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_flashcards' AND column_name='recording_session_id') THEN
        ALTER TABLE content_flashcards ADD COLUMN recording_session_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_flashcards' AND column_name='card_order') THEN
        ALTER TABLE content_flashcards ADD COLUMN card_order INTEGER;
    END IF;

    -- content_chat_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_chat_messages' AND column_name='session_id') THEN
        ALTER TABLE content_chat_messages ADD COLUMN session_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='content_chat_messages' AND column_name='recording_session_id') THEN
        ALTER TABLE content_chat_messages ADD COLUMN recording_session_id UUID;
    END IF;
END $$;
