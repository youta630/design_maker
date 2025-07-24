-- Supabase Storage Setup for Design Spec Generator
-- 作成日: 2025-07-24
-- 説明: ファイル保存用のストレージバケットとポリシー設定

-- ===================================
-- 1. ストレージバケット作成
-- ===================================

-- design-files バケット: アップロードされた画像・動画
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'design-files', 
  'design-files', 
  true,
  52428800, -- 50MB制限
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'video/avi']
) ON CONFLICT (id) DO NOTHING;

-- thumbnails バケット: 動画サムネイル
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'thumbnails', 
  'thumbnails', 
  true,
  5242880, -- 5MB制限
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ===================================
-- 2. ストレージアクセスポリシー設定
-- ===================================

-- design-files バケットのポリシー
CREATE POLICY "Users can view own design files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'design-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own design files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'design-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own design files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'design-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own design files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'design-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- thumbnails バケットのポリシー
CREATE POLICY "Users can view own thumbnails" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'thumbnails' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own thumbnails" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'thumbnails' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own thumbnails" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'thumbnails' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===================================
-- 3. 公開アクセス用のポリシー（表示用）
-- ===================================

-- 認証されたユーザーは他のユーザーの公開ファイルも閲覧可能（履歴共有用）
CREATE POLICY "Authenticated users can view public design files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'design-files' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view public thumbnails" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'thumbnails' AND 
    auth.role() = 'authenticated'
  );

-- ===================================
-- 4. テーブル更新（ストレージURL追加）
-- ===================================

-- analysis_history テーブルにストレージURL列を追加
ALTER TABLE analysis_history 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_storage_path TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_analysis_history_file_url ON analysis_history(file_url);

-- ===================================
-- 5. 便利な関数作成
-- ===================================

-- ファイルURL生成関数
CREATE OR REPLACE FUNCTION get_file_public_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://' || current_setting('app.settings.supabase_url', true) || '/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザー固有のファイルパス生成関数
CREATE OR REPLACE FUNCTION generate_user_file_path(user_uuid UUID, file_name TEXT, file_extension TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN user_uuid::text || '/' || extract(epoch from now())::bigint || '_' || file_name || '.' || file_extension;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- クリーンアップ関数（古いファイルを削除）
CREATE OR REPLACE FUNCTION cleanup_old_files(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- 30日以上古い分析履歴を削除（カスケードでファイルも削除される想定）
  DELETE FROM analysis_history 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_file_public_url(TEXT, TEXT) IS 'ストレージファイルの公開URLを生成';
COMMENT ON FUNCTION generate_user_file_path(UUID, TEXT, TEXT) IS 'ユーザー固有のファイルパスを生成';
COMMENT ON FUNCTION cleanup_old_files(INTEGER) IS '指定日数以上古いファイルを削除';

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'Supabase Storage setup completed successfully!';
  RAISE NOTICE 'Created buckets: design-files, thumbnails';
  RAISE NOTICE 'Applied Row Level Security policies';
  RAISE NOTICE 'Added storage columns to analysis_history table';
END $$;