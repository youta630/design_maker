-- Create increment_monthly_usage function for usage counting
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_monthly_usage(p_user_id UUID, p_month TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO usage_monthly (user_id, month, count, limit_count)
  VALUES (p_user_id, p_month, 1, 50)
  ON CONFLICT (user_id, month)
  DO UPDATE SET count = usage_monthly.count + 1
  RETURNING count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function created successfully
-- Test with actual authenticated user only