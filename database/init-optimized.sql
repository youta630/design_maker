-- =====================================================
-- DESIGN SPEC GENERATOR - 最適化SQLスキーマ
-- =====================================================
-- Google OAuth認証、月50回制限、UI仕様生成機能
-- 最小限・最適化済みテーブル構成
-- =====================================================

-- =====================================================
-- 1. 使用量管理テーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 月次使用量管理
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  monthly_limit INTEGER DEFAULT 50 CHECK (monthly_limit > 0),
  last_reset_date DATE DEFAULT CURRENT_DATE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約：ユーザーごとに1レコード
  CONSTRAINT unique_user_usage UNIQUE (user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_last_reset_date ON user_usage(last_reset_date);

-- RLS設定
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON user_usage;
CREATE POLICY "Enable read access for users based on user_id" ON user_usage
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON user_usage;
CREATE POLICY "Enable insert for users based on user_id" ON user_usage
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_usage;
CREATE POLICY "Enable update for users based on user_id" ON user_usage
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_usage;
CREATE POLICY "Enable delete for users based on user_id" ON user_usage
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- 2. UI仕様テーブル（統一された唯一のデータストア）
-- =====================================================

CREATE TABLE IF NOT EXISTS specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modality TEXT NOT NULL CHECK (modality IN ('image', 'video')),
  source_meta JSONB,
  spec JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_specs_user_id_created ON specs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_specs_modality ON specs(modality);

-- RLS設定
ALTER TABLE specs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own specs" ON specs;
CREATE POLICY "Users can manage their own specs" ON specs
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =====================================================
-- 3. Gemini Files APIキャッシュテーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS gemini_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Gemini Files API情報
  uri TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  file_hash TEXT NOT NULL CHECK (length(file_hash) >= 10),
  expiration_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT unique_user_file_hash UNIQUE (user_id, file_hash),
  CONSTRAINT unique_gemini_name UNIQUE (name)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_gemini_files_user_id ON gemini_files(user_id);
CREATE INDEX IF NOT EXISTS idx_gemini_files_file_hash ON gemini_files(file_hash);
CREATE INDEX IF NOT EXISTS idx_gemini_files_expiration ON gemini_files(expiration_time);

-- RLS設定
ALTER TABLE gemini_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON gemini_files;
CREATE POLICY "Enable read access for users based on user_id" ON gemini_files
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON gemini_files;
CREATE POLICY "Enable insert for users based on user_id" ON gemini_files
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON gemini_files;
CREATE POLICY "Enable update for users based on user_id" ON gemini_files
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON gemini_files;
CREATE POLICY "Enable delete for users based on user_id" ON gemini_files
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- 4. ストレージバケット設定
-- =====================================================

-- design-filesバケット（画像・動画サムネイル用）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'design-files', 
  'design-files', 
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- ストレージRLSポリシー
DROP POLICY IF EXISTS "design_files_policy" ON storage.objects;
CREATE POLICY "design_files_policy" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'design-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'design-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- 5. 自動クリーンアップ関数
-- =====================================================

-- 期限切れGeminiファイル削除
CREATE OR REPLACE FUNCTION delete_expired_gemini_files()
RETURNS void AS $$
BEGIN
  DELETE FROM gemini_files WHERE expiration_time < NOW();
  RAISE NOTICE 'Expired Gemini files cleaned up at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 月次使用量リセット
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_usage 
  SET 
    usage_count = 0,
    last_reset_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE last_reset_date < DATE_TRUNC('month', CURRENT_DATE);
  
  RAISE NOTICE 'Monthly usage reset completed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. 旧テーブル削除（完全移行）
-- =====================================================

-- 旧analysis_historyテーブルを削除
DROP TABLE IF EXISTS analysis_history CASCADE;

-- =====================================================
-- 7. 権限設定
-- =====================================================

-- 必要な権限をauthenticatedロールに付与
GRANT ALL ON public.user_usage TO authenticated;
GRANT ALL ON public.specs TO authenticated;
GRANT ALL ON public.gemini_files TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- 8. 完了確認
-- =====================================================

SELECT 
  'Design Spec Generator 最適化完了' as message,
  '3テーブル（最小構成）+ RLS + ストレージ' as status,
  NOW() as completed_at;