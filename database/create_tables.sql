-- Design Spec Generator Database Schema
-- 作成日: 2025-07-24
-- 説明: ユーザー使用回数管理と分析履歴保存のためのテーブル

-- ===================================
-- 1. user_usage テーブル
-- 用途: ユーザーの月間使用回数と制限管理
-- ===================================

CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  monthly_limit INTEGER DEFAULT 7 CHECK (monthly_limit > 0),
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  UNIQUE(user_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_reset_date ON user_usage(reset_date);

-- ===================================
-- 2. analysis_history テーブル  
-- 用途: デザイン分析結果の履歴保存
-- ===================================

CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (length(file_name) > 0),
  file_size INTEGER CHECK (file_size > 0),
  mime_type TEXT NOT NULL CHECK (length(mime_type) > 0),
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  specification TEXT NOT NULL CHECK (length(specification) > 0),
  thumbnail_url TEXT, -- 動画の場合のサムネイル（オプション）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CHECK (
    (media_type = 'video' AND thumbnail_url IS NOT NULL) OR 
    (media_type = 'image' AND thumbnail_url IS NULL) OR
    thumbnail_url IS NULL
  )
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_history_media_type ON analysis_history(media_type);

-- ===================================
-- 3. Row Level Security (RLS) 設定
-- セキュリティ: ユーザーは自分のデータのみアクセス可能
-- ===================================

-- RLS有効化
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

-- user_usage のポリシー
CREATE POLICY "Users can view own usage data" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage data" ON user_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage data" ON user_usage
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- analysis_history のポリシー
CREATE POLICY "Users can view own analysis history" ON analysis_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis history" ON analysis_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis history" ON analysis_history
  FOR DELETE USING (auth.uid() = user_id);

-- ===================================
-- 4. 便利な関数作成
-- ===================================

-- 使用回数リセット関数
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_usage 
  SET 
    usage_count = 0,
    reset_date = NOW() + INTERVAL '1 month',
    updated_at = NOW()
  WHERE reset_date <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 使用回数増加関数
CREATE OR REPLACE FUNCTION increment_usage(user_uuid UUID)
RETURNS boolean AS $$
DECLARE
  current_usage INTEGER;
  current_limit INTEGER;
BEGIN
  -- 現在の使用回数と制限を取得
  SELECT usage_count, monthly_limit 
  INTO current_usage, current_limit
  FROM user_usage 
  WHERE user_id = user_uuid;
  
  -- レコードが存在しない場合は作成
  IF current_usage IS NULL THEN
    INSERT INTO user_usage (user_id, usage_count) 
    VALUES (user_uuid, 1);
    RETURN true;
  END IF;
  
  -- 制限チェック
  IF current_usage >= current_limit THEN
    RETURN false;
  END IF;
  
  -- 使用回数増加
  UPDATE user_usage 
  SET 
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 5. テストデータ挿入（オプション）
-- ===================================

-- 注意: 実際のユーザーIDが必要なため、認証後に手動で実行
-- INSERT INTO user_usage (user_id) VALUES (auth.uid());

COMMENT ON TABLE user_usage IS 'ユーザーの月間使用回数と制限を管理';
COMMENT ON TABLE analysis_history IS 'デザイン分析結果の履歴を保存';
COMMENT ON FUNCTION increment_usage(UUID) IS 'ユーザーの使用回数を安全に増加させる';
COMMENT ON FUNCTION reset_monthly_usage() IS '月間使用回数をリセット（cron job用）';