import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * セキュアな使用量取得API
 * フロントエンドからの直接DB操作を防ぐために作成
 */
export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' }, 
        { status: 401 }
      );
    }

    // 使用量データを取得（必要最小限のデータのみ）
    const { data: userUsage, error: usageError } = await supabase
      .from('user_usage')
      .select('usage_count, monthly_limit, subscription_status')
      .eq('user_id', user.id)
      .single();

    if (usageError) {
      if (usageError.code === 'PGRST116') {
        // ユーザーレコードが存在しない場合は作成
        const { data: newUsage, error: createError } = await supabase
          .from('user_usage')
          .insert({
            user_id: user.id,
            usage_count: 0,
            monthly_limit: 7,
            subscription_status: 'free'
          })
          .select('usage_count, monthly_limit, subscription_status')
          .single();

        if (createError) {
          console.error('Failed to create user usage record:', createError);
          return NextResponse.json(
            { error: 'Failed to initialize user account' }, 
            { status: 500 }
          );
        }

        return NextResponse.json({
          usageCount: newUsage.usage_count,
          monthlyLimit: newUsage.monthly_limit,
          subscriptionStatus: newUsage.subscription_status
        });
      }

      console.error('Usage query error:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' }, 
        { status: 500 }
      );
    }

    // セキュアなレスポンス（最小限のデータのみ）
    return NextResponse.json({
      usageCount: userUsage.usage_count,
      monthlyLimit: userUsage.monthly_limit,
      subscriptionStatus: userUsage.subscription_status
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

/**
 * 使用量更新API（analyze-design から呼び出される内部API）
 */
export async function PATCH(request: NextRequest) {
  try {
    // 認証確認
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' }, 
        { status: 401 }
      );
    }

    // 現在の使用量を取得してから更新
    const { data: currentUsage, error: fetchError } = await supabase
      .from('user_usage')
      .select('usage_count, monthly_limit')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch current usage:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' }, 
        { status: 500 }
      );
    }

    // 使用量を1増加
    const { data, error: updateError } = await supabase
      .from('user_usage')
      .update({ 
        usage_count: currentUsage.usage_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select('usage_count, monthly_limit')
      .single();

    if (updateError) {
      console.error('Failed to update usage count:', updateError);
      return NextResponse.json(
        { error: 'Failed to update usage' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      usageCount: data.usage_count,
      monthlyLimit: data.monthly_limit
    });

  } catch (error) {
    console.error('Usage update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}