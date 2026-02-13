-- Create chat_sessions table if not exists
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  topic text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create chat_messages table if not exists
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy for chat_sessions
-- Users can only access their own sessions
CREATE POLICY "Users can access own sessions"
ON chat_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy for chat_messages
-- Users can only access messages from their own sessions
CREATE POLICY "Users can access own messages"
ON chat_messages
FOR ALL
USING (
  auth.uid() = (
    SELECT user_id FROM chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
  )
)
WITH CHECK (
  auth.uid() = (
    SELECT user_id FROM chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
  )
);
