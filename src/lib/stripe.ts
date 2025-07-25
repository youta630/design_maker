/**
 * Stripe サーバーサイド設定ユーティリティ
 * 本番環境対応：セキュリティ・エラーハンドリング強化
 */

import Stripe from 'stripe';

// Stripeクライアント初期化（サーバーサイドのみ）
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
  appInfo: {
    name: 'SNAP2SPEC',
    version: '1.0.0',
    url: 'https://snap2spec.com',
  },
});

/**
 * Stripeカスタマー作成（セキュア版）
 */
export async function createStripeCustomer(
  email: string,
  userId: string,
  metadata?: Record<string, string>
): Promise<{ customer: Stripe.Customer | null; error?: string }> {
  try {
    // 入力検証
    if (!email || !userId) {
      return { customer: null, error: 'Email and userId are required' };
    }

    // メールアドレス形式検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { customer: null, error: 'Invalid email format' };
    }

    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
        ...metadata,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Stripe customer created:', {
        customerId: customer.id,
        email: customer.email,
        userId
      });
    }

    return { customer };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Stripe customer creation error:', {
      email,
      userId,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return { 
      customer: null, 
      error: `Customer creation failed: ${errorMessage}` 
    };
  }
}

/**
 * Stripeサブスクリプション作成（セキュア版）
 */
export async function createStripeSubscription(
  customerId: string,
  priceId: string,
  metadata?: Record<string, string>
): Promise<{ subscription: Stripe.Subscription | null; error?: string }> {
  try {
    // 入力検証
    if (!customerId || !priceId) {
      return { subscription: null, error: 'Customer ID and Price ID are required' };
    }

    // カスタマー存在確認
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return { subscription: null, error: 'Customer has been deleted' };
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        ...metadata,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Stripe subscription created:', {
        subscriptionId: subscription.id,
        customerId,
        priceId,
        status: subscription.status
      });
    }

    return { subscription };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Stripe subscription creation error:', {
      customerId,
      priceId,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return { 
      subscription: null, 
      error: `Subscription creation failed: ${errorMessage}` 
    };
  }
}

/**
 * Stripe請求ポータルセッション作成（セキュア版）
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url?: string; error?: string }> {
  try {
    // 入力検証
    if (!customerId || !returnUrl) {
      return { error: 'Customer ID and return URL are required' };
    }

    // URL形式検証
    try {
      new URL(returnUrl);
    } catch {
      return { error: 'Invalid return URL format' };
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Billing portal session created:', {
        customerId,
        sessionUrl: portalSession.url
      });
    }

    return { url: portalSession.url };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Billing portal session creation error:', {
      customerId,
      returnUrl,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return { 
      error: `Portal session creation failed: ${errorMessage}` 
    };
  }
}

/**
 * Webhookイベント署名検証（セキュア版）
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): { event: Stripe.Event | null; error?: string } {
  try {
    if (!payload || !signature || !secret) {
      return { event: null, error: 'Missing required parameters for webhook verification' };
    }

    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Webhook signature verified:', {
        eventType: event.type,
        eventId: event.id
      });
    }

    return { event };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Webhook signature verification error:', {
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return { 
      event: null, 
      error: `Webhook verification failed: ${errorMessage}` 
    };
  }
}

/**
 * Stripe価格情報取得（セキュア版）
 */
export async function getStripePrice(priceId: string): Promise<{ price: Stripe.Price | null; error?: string }> {
  try {
    if (!priceId) {
      return { price: null, error: 'Price ID is required' };
    }

    const price = await stripe.prices.retrieve(priceId);

    return { price };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Stripe price retrieval error:', {
      priceId,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return { 
      price: null, 
      error: `Price retrieval failed: ${errorMessage}` 
    };
  }
}

// 支援関数：金額をフォーマット
export function formatCurrency(amount: number, currency: string = 'jpy'): string {
  const formatter = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: currency === 'jpy' ? 0 : 2,
  });

  return formatter.format(amount / (currency === 'jpy' ? 1 : 100));
}

// 支援関数：価格IDからプラン名を判定
export function getPlanFromPriceId(priceId: string): string {
  if (priceId.includes('monthly') || priceId.includes('month')) {
    return 'monthly';
  } else if (priceId.includes('yearly') || priceId.includes('year')) {
    return 'yearly';
  }
  return 'unknown';
}