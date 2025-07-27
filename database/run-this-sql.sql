-- =====================================================
-- SNAP2SPEC 課金システム統合 - 安全版スキーマ
-- =====================================================
-- 段階的実行用：エラー回避を優先した設計
-- Files API キャッシュ機能を追加
-- =====================================================

-- =====================================================
-- 1. プラン管理テーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER DEFAULT 0,
  price_yearly INTEGER DEFAULT 0,
  usage_limit INTEGER DEFAULT 7,
  features JSONB DEFAULT '{}',
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "pricing_plans_select_policy" ON pricing_plans;
CREATE POLICY "pricing_plans_select_policy" ON pricing_plans
  FOR SELECT USING (is_active = true);

-- =====================================================
-- 2. サブスクリプション管理テーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_id UUID REFERENCES pricing_plans(id),
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS有効化
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "subscriptions_user_policy" ON subscriptions;
CREATE POLICY "subscriptions_user_policy" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 3. 支払い履歴テーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'jpy',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method_type TEXT,
  failure_reason TEXT,
  receipt_url TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);

-- RLS有効化
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "payment_history_user_policy" ON payment_history;
CREATE POLICY "payment_history_user_policy" ON payment_history
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 4. Webhook イベントログテーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processing_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  event_data JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- =====================================================
-- 5. 既存user_usageテーブルの拡張
-- =====================================================

-- 新しいカラム追加（存在しない場合のみ）
DO $$
BEGIN
  -- plan_id カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'plan_id') THEN
    ALTER TABLE user_usage ADD COLUMN plan_id UUID REFERENCES pricing_plans(id);
  END IF;

  -- subscription_id カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'subscription_id') THEN
    ALTER TABLE user_usage ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
  END IF;

  -- stripe_customer_id カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE user_usage ADD COLUMN stripe_customer_id TEXT;
  END IF;

  -- billing_email カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'billing_email') THEN
    ALTER TABLE user_usage ADD COLUMN billing_email TEXT;
  END IF;

  -- billing_address カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'billing_address') THEN
    ALTER TABLE user_usage ADD COLUMN billing_address JSONB DEFAULT '{}';
  END IF;

  -- polar_customer_id カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'polar_customer_id') THEN
    ALTER TABLE user_usage ADD COLUMN polar_customer_id TEXT;
  END IF;

  -- polar_subscription_id カラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_usage' AND column_name = 'polar_subscription_id') THEN
    ALTER TABLE user_usage ADD COLUMN polar_subscription_id TEXT;
  END IF;
END $$;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_user_usage_plan_id ON user_usage(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_subscription_id ON user_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_polar_customer_id ON user_usage(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_polar_subscription_id ON user_usage(polar_subscription_id);

-- =====================================================
-- 6. 初期データ挿入
-- =====================================================

-- プランデータ挿入（個別実行）
INSERT INTO pricing_plans (plan_name, display_name, description, price_monthly, price_yearly, usage_limit, features, sort_order) 
SELECT 'free', 'Free Plan', 'Basic plan for testing', 0, 0, 7, '{"max_file_size": "50MB"}'::jsonb, 1
WHERE NOT EXISTS (SELECT 1 FROM pricing_plans WHERE plan_name = 'free');

INSERT INTO pricing_plans (plan_name, display_name, description, price_monthly, price_yearly, usage_limit, features, sort_order) 
SELECT 'monthly', 'Monthly Premium', 'Unlimited monthly access', 199000, 0, -1, '{"max_file_size": "100MB"}'::jsonb, 2
WHERE NOT EXISTS (SELECT 1 FROM pricing_plans WHERE plan_name = 'monthly');

INSERT INTO pricing_plans (plan_name, display_name, description, price_monthly, price_yearly, usage_limit, features, sort_order) 
SELECT 'yearly', 'Yearly Premium', 'Best value with yearly discount', 0, 1990000, -1, '{"max_file_size": "100MB"}'::jsonb, 3
WHERE NOT EXISTS (SELECT 1 FROM pricing_plans WHERE plan_name = 'yearly');

-- 既存ユーザーにデフォルトプラン設定
UPDATE user_usage 
SET plan_id = (SELECT id FROM pricing_plans WHERE plan_name = 'free') 
WHERE plan_id IS NULL AND EXISTS (SELECT 1 FROM pricing_plans WHERE plan_name = 'free');

-- =====================================================
-- 7. 基本的なストレージ設定
-- =====================================================

-- バケット作成（存在チェック付き）
INSERT INTO storage.buckets (id, name, public) 
SELECT 'design-files', 'design-files', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'design-files');

INSERT INTO storage.buckets (id, name, public) 
SELECT 'thumbnails', 'thumbnails', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'thumbnails');

-- ストレージRLSポリシー
DROP POLICY IF EXISTS "design_files_user_policy" ON storage.objects;
CREATE POLICY "design_files_user_policy" ON storage.objects
  FOR ALL USING (bucket_id = 'design-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "thumbnails_user_policy" ON storage.objects;
CREATE POLICY "thumbnails_user_policy" ON storage.objects
  FOR ALL USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- 8. Gemini Files API キャッシュテーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS gemini_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uri TEXT NOT NULL,
  name TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  expiration_time TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_gemini_files_user_id ON gemini_files(user_id);
CREATE INDEX IF NOT EXISTS idx_gemini_files_file_hash ON gemini_files(file_hash);
CREATE INDEX IF NOT EXISTS idx_gemini_files_expiration ON gemini_files(expiration_time);
CREATE INDEX IF NOT EXISTS idx_gemini_files_user_hash ON gemini_files(user_id, file_hash);

-- RLS有効化
ALTER TABLE gemini_files ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "gemini_files_user_policy" ON gemini_files;
CREATE POLICY "gemini_files_user_policy" ON gemini_files
  FOR ALL USING (auth.uid() = user_id);

-- 期限切れファイル自動削除のためのトリガー関数
CREATE OR REPLACE FUNCTION delete_expired_gemini_files()
RETURNS void AS $$
BEGIN
  DELETE FROM gemini_files 
  WHERE expiration_time < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 期限切れファイル削除の定期実行（手動実行用）
-- Supabaseの場合、pg_cronを利用可能な場合に使用
-- SELECT cron.schedule('delete-expired-gemini-files', '0 */6 * * *', 'SELECT delete_expired_gemini_files();');

-- =====================================================
-- 9. 完了メッセージ
-- =====================================================

SELECT 'SNAP2SPEC 課金システム基盤とFiles APIキャッシュの作成が完了しました。' as message;