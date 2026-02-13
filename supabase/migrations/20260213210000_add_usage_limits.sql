CREATE TABLE IF NOT EXISTS usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  date date NOT NULL,
  scan_count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own usage"
ON usage_limits
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
