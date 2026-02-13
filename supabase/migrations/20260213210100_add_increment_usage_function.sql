CREATE OR REPLACE FUNCTION increment_usage_scan(p_user_id uuid, p_date date)
RETURNS void AS $$
BEGIN
  UPDATE usage_limits
  SET scan_count = scan_count + 1
  WHERE user_id = p_user_id
    AND date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
