CREATE TABLE IF NOT EXISTS ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  function_name text NOT NULL,
  duration_ms integer,
  token_usage integer,
  error text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own logs"
ON ai_logs
FOR SELECT
USING (auth.uid() = user_id);
