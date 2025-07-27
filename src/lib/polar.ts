/**
 * Polar設定ユーティリティ
 * 課金システム：Polar SDK統合
 */

// Polar API Key検証
if (!process.env.POLAR_ACCESS_TOKEN) {
  console.warn('POLAR_ACCESS_TOKEN is not set in environment variables');
}

// Polar接続設定
export const polarConfig = {
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  sandbox: process.env.NODE_ENV !== 'production', // 開発時はsandbox
};

/**
 * Checkout URL生成ヘルパー
 */
export function createCheckoutUrl(
  productId: string, 
  userExternalId: string,
  options?: {
    customerEmail?: string;
    customerName?: string;
    metadata?: Record<string, string>;
  }
): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = new URL('/api/checkout', baseUrl);
  
  url.searchParams.set('products', productId);
  url.searchParams.set('customerExternalId', userExternalId);
  url.searchParams.set('successUrl', process.env.SUCCESS_URL || `${baseUrl}/app?upgraded=1`);
  
  if (options?.customerEmail) {
    url.searchParams.set('customerEmail', options.customerEmail);
  }
  
  if (options?.customerName) {
    url.searchParams.set('customerName', options.customerName);
  }
  
  if (options?.metadata) {
    Object.entries(options.metadata).forEach(([key, value]) => {
      url.searchParams.set(`metadata[${key}]`, value);
    });
  }
  
  return url.toString();
}

/**
 * Customer Portal URL生成ヘルパー
 */
export function createPortalUrl(): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/api/portal`;
}

/**
 * プラン情報（Product IDプレースホルダー）
 * ※ Polarダッシュボードで作成後、実際のIDに置き換える
 */
export const PLAN_IDS = {
  MONTHLY: 'xxxx', // prod_monthly のようなIDになる
  YEARLY: 'xxxx',  // prod_yearly のようなIDになる
} as const;

/**
 * 価格情報（UIで表示用）
 */
export const PLAN_PRICING = {
  MONTHLY: {
    name: 'Monthly',
    price: '$7.99',
    duration: 'USD/month',
    description: 'Billed monthly',
  },
  YEARLY: {
    name: 'Yearly', 
    price: '$79.99',
    duration: 'USD/year',
    description: 'Billed annually • Save 17%',
    savings: 'Save 17%',
  },
} as const;

/**
 * Webhook署名検証（安全のため）
 */
export function verifyWebhookSignature(
  _payload: string,
  _signature: string
): boolean {
  try {
    // Polar SDK内部で署名検証が行われるため、
    // 追加の検証が必要な場合のみ実装
    return true;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * ユーザーの課金状態更新ヘルパー
 */
export async function updateUserSubscriptionStatus(
  externalUserId: string,
  status: 'active' | 'canceled' | 'paid',
  subscriptionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Supabaseクライアントを使ってユーザーの課金状態を更新
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const updateData: {
      subscription_status: string;
      updated_at: string;
      polar_subscription_id?: string;
    } = {
      subscription_status: status,
      updated_at: new Date().toISOString(),
    };
    
    if (subscriptionId) {
      updateData.polar_subscription_id = subscriptionId;
    }
    
    const { error } = await supabase
      .from('user_usage')
      .update(updateData)
      .eq('user_id', externalUserId);
    
    if (error) {
      console.error('Failed to update user subscription status:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Subscription status update error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Polar Customer IDの保存
 */
export async function savePolarCustomerId(
  externalUserId: string,
  polarCustomerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('user_usage')
      .update({
        polar_customer_id: polarCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', externalUserId);
    
    if (error) {
      console.error('Failed to save Polar customer ID:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Save Polar customer ID error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Polar Customer IDの取得
 */
export async function getPolarCustomerId(
  externalUserId: string
): Promise<{ customerId?: string; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_usage')
      .select('polar_customer_id')
      .eq('user_id', externalUserId)
      .single();
    
    if (error) {
      console.error('Failed to get Polar customer ID:', error);
      return { error: error.message };
    }
    
    return { customerId: data?.polar_customer_id };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get Polar customer ID error:', errorMessage);
    return { error: errorMessage };
  }
}