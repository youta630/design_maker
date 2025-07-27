/**
 * Polar Webhook API Route
 * 決済・サブスクリプションイベントの処理
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: Polar SDK インポートをPolarダッシュボード設定後に有効化
// import { Webhooks } from '@polar-sh/nextjs';
// import { updateUserSubscriptionStatus, savePolarCustomerId } from '@/lib/polar';
import { createClient } from '@/lib/supabase/server';

// Runtime configuration
export const runtime = 'nodejs';

/**
 * Polar Webhook処理（環境変数設定後に有効化）
 * イベント別にユーザーの課金状態を更新
 */
export async function POST(request: NextRequest) {
  // TODO: 環境変数設定後にPolar Webhookを有効化
  if (!process.env.POLAR_WEBHOOK_SECRET || process.env.POLAR_WEBHOOK_SECRET === 'xxxx') {
    return NextResponse.json(
      { error: 'Polar webhook configuration pending. Please set POLAR_WEBHOOK_SECRET.' },
      { status: 503 }
    );
  }
  
  // TODO: Polar設定完了後にコメントアウト解除
  /*
  return Webhooks({
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
    onOrderPaid: async (payload) => {
      // Order paid implementation
    },
    onSubscriptionActive: async (payload) => {
      // Subscription active implementation
    },
    onSubscriptionCanceled: async (payload) => {
      // Subscription canceled implementation
    },
    onPayload: async (payload) => {
      // Generic payload handler
    },
  })(request);
  */
  
  return NextResponse.json(
    { error: 'Webhook implementation pending' },
    { status: 503 }
  );
}


