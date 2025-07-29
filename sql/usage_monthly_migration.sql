-- Usage Monthly テーブル作成とRPC関数設定
-- 実行前に既存のuser_usageテーブルからのデータ移行を検討してください

-- 1) usage_monthly テーブル作成
CREATE TABLE IF NOT EXISTS usage_monthly (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month text NOT NULL, -- YYYY-MM 形式
  count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  PRIMARY KEY (user_id, month)
);

-- 2) インデックス作成
CREATE INDEX IF NOT EXISTS idx_usage_monthly_user_id ON usage_monthly(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_monthly_month ON usage_monthly(month);

-- 3) RLS (Row Level Security) 有効化
ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;

-- 4) RLSポリシー作成
DROP POLICY IF EXISTS "Users can manage their own usage data" ON usage_monthly;
CREATE POLICY "Users can manage their own usage data" ON usage_monthly
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) アトミックな使用量増加用のRPC関数
CREATE OR REPLACE FUNCTION increment_monthly_usage(
  p_user_id uuid,
  p_month text
) RETURNS integer AS $$
DECLARE
  result_count integer;
BEGIN
  -- upsert 処理: 存在しない場合は1で作成、存在する場合は+1
  INSERT INTO usage_monthly (user_id, month, count, created_at, updated_at)
  VALUES (p_user_id, p_month, 1, now(), now())
  ON CONFLICT (user_id, month) 
  DO UPDATE SET 
    count = usage_monthly.count + 1,
    updated_at = now()
  RETURNING count INTO result_count;
  
  RETURN result_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) 現在のuser_usageテーブルからのデータ移行 (オプション)
-- 注意: 実行前にバックアップを取ることを推奨
-- この部分は手動で実行するかコメントアウトしてください

/*
-- 既存データを移行 (2024年以降のデータを想定)
INSERT INTO usage_monthly (user_id, month, count, created_at, updated_at) 
SELECT 
  user_id,
  to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
  usage_count,
  created_at,
  updated_at
FROM user_usage 
WHERE usage_count > 0
ON CONFLICT (user_id, month) DO NOTHING;
*/

-- 7) 不要になったテーブルの削除 (慎重に実行)
-- DROP TABLE IF EXISTS user_usage CASCADE;

-- 8) 結果確認用のクエリ
-- SELECT 
--   u.email,
--   um.month,
--   um.count,
--   um.created_at
-- FROM usage_monthly um
-- JOIN auth.users u ON u.id = um.user_id
-- ORDER BY um.month DESC, u.email;