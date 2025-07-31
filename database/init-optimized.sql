-- =====================================================
-- 統一SQL: Design Spec Generator 完全クリーンアップ版（修正版）
-- =====================================================
-- 画像専用、シンプル構成、完全一致保証
-- 実際のSupabase構成に合わせた設計
-- Supabase互換のSQL構文に修正
-- =====================================================

-- =====================================================
-- ⚠️  完全クリーンアップ（既存データ削除）
-- =====================================================

-- 既存ストレージポリシーを削除
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Users can manage their own specs" ON specs;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON user_usage;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON user_usage;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_usage;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_usage;

-- 既存テーブルを削除
DROP TABLE IF EXISTS gemini_files CASCADE;
DROP TABLE IF EXISTS user_usage CASCADE;
DROP TABLE IF EXISTS usage_monthly CASCADE;
DROP TABLE IF EXISTS specs CASCADE;

-- 既存インデックスを削除（念のため）
DROP INDEX IF EXISTS idx_specs_user_id_created;
DROP INDEX IF EXISTS idx_specs_modality;
DROP INDEX IF EXISTS idx_user_usage_user_id;
DROP INDEX IF EXISTS idx_user_usage_last_reset_date;

-- =====================================================
-- 1. 使用量管理テーブル（コードと一致：usage_monthly）
-- =====================================================

CREATE TABLE usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 月次使用量管理
  month TEXT NOT NULL, -- 'YYYY-MM' 形式
  count INTEGER DEFAULT 0 CHECK (count >= 0),
  limit_count INTEGER DEFAULT 50 CHECK (limit_count > 0),
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約：ユーザー+月の組み合わせは一意
  CONSTRAINT unique_user_month UNIQUE (user_id, month)
);

-- インデックス
CREATE INDEX idx_usage_monthly_user_id ON usage_monthly(user_id);
CREATE INDEX idx_usage_monthly_month ON usage_monthly(month);
CREATE INDEX idx_usage_monthly_user_month ON usage_monthly(user_id, month);

-- RLS設定
ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own usage data" ON usage_monthly
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =====================================================
-- 2. 画像専用仕様テーブル（シンプル化）
-- =====================================================

CREATE TABLE specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 画像専用
  modality TEXT NOT NULL DEFAULT 'image' CHECK (modality = 'image'),
  
  -- メタデータ（imageUrl含む）
  source_meta JSONB NOT NULL DEFAULT '{}',
  
  -- MEDS仕様データ
  spec JSONB NOT NULL,
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス（最適化）
CREATE INDEX idx_specs_user_created ON specs(user_id, created_at DESC);
CREATE INDEX idx_specs_source_meta_gin ON specs USING GIN (source_meta);

-- RLS設定
ALTER TABLE specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own specs" ON specs
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =====================================================
-- 3. updated_at自動更新トリガー
-- =====================================================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usage_monthly_updated_at
  BEFORE UPDATE ON usage_monthly
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. ストレージポリシー設定（design-files統一）
-- =====================================================

-- design-files バケット設定確認
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-files',
  'design-files', 
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ストレージRLSポリシー（個別に作成）
CREATE POLICY "Users can upload their own images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'design-files' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE POLICY "Users can view their own images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'design-files' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'design-files' AND (storage.foldername(name))[1] = (select auth.uid()::text));

-- パブリック読み取り許可（画像表示用）
CREATE POLICY "Public can view images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'design-files');

-- =====================================================
-- 5. 移行ログ記録
-- =====================================================

-- バージョン情報テーブル
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO migration_log (migration_name) 
VALUES ('unified-migration-v1.0-image-only-fixed');

-- =====================================================
-- 6. 動作確認クエリ
-- =====================================================

-- テーブル作成確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usage_monthly', 'specs', 'migration_log');

-- ストレージバケット確認
SELECT name, public FROM storage.buckets WHERE name = 'design-files';

-- =====================================================
-- 完了メッセージ
-- =====================================================
-- 
-- ✅ 統一マイグレーション完了（修正版）
-- 
-- 変更点:
-- 1. Supabase互換のSQL構文に修正
-- 2. CREATE POLICY IF NOT EXISTS → 個別CREATE POLICY
-- 3. ストレージポリシーの先行削除を追加
-- 4. 動作確認クエリを追加
-- 
-- 次のステップ:
-- 1. このSQLを実行
-- 2. npm install
-- 3. npm run dev で画像表示確認
-- 
-- =====================================================


-- Fix Supabase Storage 400 error by simplifying RLS policies
-- This SQL should be run in Supabase SQL Editor

-- 1. Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;  
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- 2. Ensure bucket is public and RLS-free for maximum compatibility
UPDATE storage.buckets 
SET public = true
WHERE id = 'design-files';

-- 3. Create simple, permissive policies
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'design-files');

CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'design-files');

CREATE POLICY "Allow authenticated users to delete their own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'design-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Alternative: Disable RLS entirely for this bucket (most permissive)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
-- Uncomment above line if you still get 400 errors