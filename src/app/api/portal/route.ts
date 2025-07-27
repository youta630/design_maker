/**
 * Polar Customer Portal API Route
 * ユーザーが課金情報を管理するポータル
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: Polar SDK インポートをPolarダッシュボード設定後に有効化
// import { CustomerPortal } from '@polar-sh/nextjs';
import { createClient } from '@/lib/supabase/server';
// import { getPolarCustomerId } from '@/lib/polar';

// Runtime configuration
export const runtime = 'nodejs';

/**
 * Polar Customer Portal（環境変数設定後に有効化）
 */
export async function GET(_request: NextRequest) {
  // TODO: 環境変数設定後にPolar Customer Portalを有効化
  if (!process.env.POLAR_ACCESS_TOKEN || process.env.POLAR_ACCESS_TOKEN === 'xxxx') {
    return NextResponse.json(
      { error: 'Polar configuration pending. Please set POLAR_ACCESS_TOKEN.' },
      { status: 503 }
    );
  }
  
  // TODO: Polar設定完了後にコメントアウト解除
  /*
  return CustomerPortal({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
    server: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    getCustomerId: async (req: NextRequest) => {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { customerId, error } = await getPolarCustomerId(userId);
      if (error || !customerId) {
        throw new Error('Polar customer not found. Please complete a purchase first.');
      }
      
      return customerId;
    },
  })(request);
  */
  
  return NextResponse.json(
    { error: 'Customer portal implementation pending' },
    { status: 503 }
  );
}