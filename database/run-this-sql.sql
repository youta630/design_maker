-- =====================================================
-- DESIGN SPEC GENERATOR - セキュア無料版スキーマ
-- =====================================================
-- セキュリティと保守性を最優先にした設計
-- RLS (Row Level Security) 完全適用
-- 無料アプリ用：課金機能削除、月50回制限
-- =====================================================

-- =====================================================
-- 1. 既存テーブルのクリーンアップ
-- =====================================================

-- 不要な課金関連テーブルを削除（存在する場合のみ）
DROP TABLE IF EXISTS payment_history CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS pricing_plans CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;

-- =====================================================
-- 2. user_usage テーブルの最適化
-- =====================================================

-- 既存のuser_usageテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 使用量管理（月50回制限）
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  monthly_limit INTEGER DEFAULT 50 CHECK (monthly_limit > 0),
  last_reset_date DATE DEFAULT CURRENT_DATE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約：ユーザーごとに1レコードのみ
  CONSTRAINT unique_user_usage UNIQUE (user_id)
);

-- 不要なカラムを削除（存在する場合）
DO $$
BEGIN
  -- Stripe関連カラム削除
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE user_usage DROP COLUMN stripe_customer_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE user_usage DROP COLUMN stripe_subscription_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'plan_id') THEN
    ALTER TABLE user_usage DROP COLUMN plan_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'subscription_id') THEN
    ALTER TABLE user_usage DROP COLUMN subscription_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'subscription_status') THEN
    ALTER TABLE user_usage DROP COLUMN subscription_status;
  END IF;
  
  -- プロフィール関連カラム削除（不要になったため）
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'display_name') THEN
    ALTER TABLE user_usage DROP COLUMN display_name;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'country') THEN
    ALTER TABLE user_usage DROP COLUMN country;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'profile_completed') THEN
    ALTER TABLE user_usage DROP COLUMN profile_completed;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'terms_accepted_at') THEN
    ALTER TABLE user_usage DROP COLUMN terms_accepted_at;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'billing_email') THEN
    ALTER TABLE user_usage DROP COLUMN billing_email;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'billing_address') THEN
    ALTER TABLE user_usage DROP COLUMN billing_address;
  END IF;
  
  -- 日次制限関連カラム削除（月次制限に統一）
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'daily_usage_count') THEN
    ALTER TABLE user_usage DROP COLUMN daily_usage_count;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'user_usage' AND column_name = 'last_usage_date') THEN
    ALTER TABLE user_usage DROP COLUMN last_usage_date;
  END IF;
END $$;

-- 必要なカラムを追加（存在しない場合のみ）
DO $$
BEGIN
  -- usage_count カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'usage_count') THEN
    ALTER TABLE user_usage ADD COLUMN usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0);
  END IF;
  
  -- monthly_limit カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'monthly_limit') THEN
    ALTER TABLE user_usage ADD COLUMN monthly_limit INTEGER DEFAULT 50 CHECK (monthly_limit > 0);
  END IF;
  
  -- last_reset_date カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'last_reset_date') THEN
    ALTER TABLE user_usage ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE;
  END IF;
  
  -- last_used_at カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'last_used_at') THEN
    ALTER TABLE user_usage ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_last_reset_date ON user_usage(last_reset_date);
CREATE INDEX IF NOT EXISTS idx_user_usage_last_used_at ON user_usage(last_used_at);

-- RLS有効化
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "user_usage_policy" ON user_usage;
DROP POLICY IF EXISTS "user_usage_select_policy" ON user_usage;
DROP POLICY IF EXISTS "user_usage_insert_policy" ON user_usage;
DROP POLICY IF EXISTS "user_usage_update_policy" ON user_usage;
DROP POLICY IF EXISTS "user_usage_delete_policy" ON user_usage;

-- 厳格なRLSポリシー作成
-- SELECT: 自分のデータのみ参照可能
CREATE POLICY "user_usage_select_policy" ON user_usage
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT: 自分のデータのみ作成可能
CREATE POLICY "user_usage_insert_policy" ON user_usage
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分のデータのみ更新可能
CREATE POLICY "user_usage_update_policy" ON user_usage
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: 自分のデータのみ削除可能
CREATE POLICY "user_usage_delete_policy" ON user_usage
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. Gemini Files API キャッシュテーブル
-- =====================================================

-- 既存テーブルの確認とクリーンアップ
DROP TABLE IF EXISTS gemini_files CASCADE;

CREATE TABLE gemini_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Gemini Files API 情報
  uri TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type ~ '^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$'),
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  file_hash TEXT NOT NULL CHECK (length(file_hash) >= 10),
  expiration_time TIMESTAMP WITH TIME ZONE NOT NULL CHECK (expiration_time > NOW()),
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT unique_user_file_hash UNIQUE (user_id, file_hash),
  CONSTRAINT unique_gemini_name UNIQUE (name)
);

-- インデックス作成（検索パフォーマンス向上）
CREATE INDEX idx_gemini_files_user_id ON gemini_files(user_id);
CREATE INDEX idx_gemini_files_file_hash ON gemini_files(file_hash);
CREATE INDEX idx_gemini_files_expiration ON gemini_files(expiration_time);
CREATE INDEX idx_gemini_files_user_hash ON gemini_files(user_id, file_hash);
CREATE INDEX idx_gemini_files_created_at ON gemini_files(created_at);

-- RLS有効化
ALTER TABLE gemini_files ENABLE ROW LEVEL SECURITY;

-- 厳格なRLSポリシー作成
CREATE POLICY "gemini_files_select_policy" ON gemini_files
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "gemini_files_insert_policy" ON gemini_files
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gemini_files_update_policy" ON gemini_files
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gemini_files_delete_policy" ON gemini_files
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. ストレージ設定（セキュア）
-- =====================================================

-- バケット作成（存在チェック付き）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
SELECT 
  'design-files', 
  'design-files', 
  false,
  52428800, -- 50MB制限
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'design-files');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
SELECT 
  'thumbnails', 
  'thumbnails', 
  false,
  5242880, -- 5MB制限（サムネイル用）
  ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'thumbnails');

-- 既存のストレージRLSポリシーを削除
DROP POLICY IF EXISTS "design_files_user_policy" ON storage.objects;
DROP POLICY IF EXISTS "thumbnails_user_policy" ON storage.objects;
DROP POLICY IF EXISTS "design_files_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "design_files_insert_policy" ON storage.objects;

-- 厳格なストレージRLSポリシー作成
-- design-files バケット用ポリシー
CREATE POLICY "design_files_select_policy" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'design-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "design_files_insert_policy" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'design-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "design_files_update_policy" ON storage.objects
  FOR UPDATE 
  USING (
    bucket_id = 'design-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'design-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "design_files_delete_policy" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'design-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- thumbnails バケット用ポリシー
CREATE POLICY "thumbnails_select_policy" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "thumbnails_insert_policy" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "thumbnails_delete_policy" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- 5. セキュリティ強化関数
-- =====================================================

-- 期限切れファイル自動削除関数（セキュリティ強化）
CREATE OR REPLACE FUNCTION delete_expired_gemini_files()
RETURNS void AS $$
BEGIN
  -- セキュリティ：関数実行者の確認
  IF current_setting('role') != 'postgres' AND current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access to cleanup function';
  END IF;
  
  -- 期限切れファイルを削除
  DELETE FROM gemini_files 
  WHERE expiration_time < NOW();
  
  -- ログ出力
  RAISE NOTICE 'Expired Gemini files cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 月次使用量リセット関数
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  -- セキュリティ：関数実行者の確認
  IF current_setting('role') != 'postgres' AND current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access to reset function';
  END IF;
  
  -- 前月のデータをリセット（当月のみ保持）
  UPDATE user_usage 
  SET 
    usage_count = 0,
    last_reset_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE 
    last_reset_date < DATE_TRUNC('month', CURRENT_DATE);
  
  -- ログ出力
  RAISE NOTICE 'Monthly usage reset completed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. 初期データとデフォルト設定
-- =====================================================

-- 既存ユーザーのデフォルト設定更新
UPDATE user_usage 
SET 
  monthly_limit = 50,
  usage_count = COALESCE(usage_count, 0),
  last_reset_date = COALESCE(last_reset_date, CURRENT_DATE),
  updated_at = NOW()
WHERE monthly_limit IS NULL OR monthly_limit != 50;

-- =====================================================
-- 7. 定期実行設定（コメントアウト - 手動実行用）
-- =====================================================

-- Supabaseでpg_cronが利用可能な場合の設定例
-- 期限切れファイル削除（6時間ごと）
-- SELECT cron.schedule('delete-expired-gemini-files', '0 */6 * * *', 'SELECT delete_expired_gemini_files();');

-- 月次使用量リセット（毎月1日の午前2時）
-- SELECT cron.schedule('reset-monthly-usage', '0 2 1 * *', 'SELECT reset_monthly_usage();');

-- =====================================================
-- 8. セキュリティ最終チェック
-- =====================================================

-- すべてのテーブルでRLSが有効になっていることを確認
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('user_usage', 'gemini_files')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = table_record.schemaname
      AND c.relname = table_record.tablename
      AND c.relrowsecurity = true
    ) THEN
      RAISE WARNING 'RLS not enabled for table: %.%', table_record.schemaname, table_record.tablename;
    ELSE
      RAISE NOTICE 'RLS confirmed for table: %.%', table_record.schemaname, table_record.tablename;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 9. 完了メッセージ
-- =====================================================

SELECT 
  'DESIGN SPEC GENERATOR セキュア無料版スキーマの構築が完了しました。' as message,
  'RLS有効化、月50回制限、不要テーブル削除済み。' as status,
  NOW() as completed_at;