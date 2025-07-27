/**
 * Polar Checkout API Route
 * 決済処理のエントリーポイント
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: Polar SDK インポートをPolarダッシュボード設定後に有効化
// import { Checkout } from '@polar-sh/nextjs';

// Runtime configuration
export const runtime = 'nodejs';

/**
 * Polar Checkout処理（環境変数設定後に有効化）
 * クエリパラメータ例:
 * ?products=prod_xxx&customerExternalId=user_123&successUrl=https://app.com/success
 */
export async function GET(_request: NextRequest) {
  // TODO: 環境変数設定後にPolar Checkoutを有効化
  if (!process.env.POLAR_ACCESS_TOKEN || process.env.POLAR_ACCESS_TOKEN === 'xxxx') {
    return NextResponse.json(
      { error: 'Polar configuration pending. Please set POLAR_ACCESS_TOKEN.' },
      { status: 503 }
    );
  }
  
  // TODO: Polar設定完了後にコメントアウト解除
  /*
  return Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    successUrl: process.env.SUCCESS_URL!,
    server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    theme: 'dark',
  })(request);
  */
  
  return NextResponse.json(
    { error: 'Checkout implementation pending' },
    { status: 503 }
  );
}