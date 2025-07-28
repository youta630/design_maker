import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Runtime configuration for Node.js environment
export const runtime = 'nodejs';

/**
 * セキュアな月次使用量取得API
 * 月50回制限での使用量管理
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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' }, 
        { status: 401 }
      );
    }

    // 月次使用量データを取得（月次リセット処理含む）
    const { data: userUsage, error: usageError } = await supabase
      .from('user_usage')
      .select('usage_count, monthly_limit, last_reset_date')
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
            monthly_limit: 50
          })
          .select('usage_count, monthly_limit')
          .single();

        if (createError) {
          console.error('Failed to create user usage record:', createError);
          return NextResponse.json(
            { error: 'Failed to initialize user account' }, 
            { status: 500 }
          );
        }

        return NextResponse.json({
          usageCount: newUsage.usage_count || 0,
          monthlyLimit: newUsage.monthly_limit || 50
        });
      }

      console.error('Usage query error:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' }, 
        { status: 500 }
      );
    }

    // 月次リセットチェック：現在月の開始日よりも古い場合はリセット
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    const lastResetDate = new Date(userUsage.last_reset_date);
    
    let finalUsageCount = userUsage.usage_count || 0;
    
    if (lastResetDate < currentMonthStart) {
      // 使用量をリセット
      const { data: resetData, error: resetError } = await supabase
        .from('user_usage')
        .update({ 
          usage_count: 0,
          last_reset_date: currentMonthStart.toISOString().split('T')[0], // YYYY-MM-DD format
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select('usage_count')
        .single();

      if (resetError) {
        console.error('Failed to reset monthly usage:', resetError);
        // リセットに失敗しても現在のデータを返す
      } else {
        finalUsageCount = resetData.usage_count || 0;
        if (process.env.NODE_ENV === 'development') {
          console.log('Monthly usage reset completed for user:', user.id);
        }
      }
    }

    return NextResponse.json({
      usageCount: finalUsageCount,
      monthlyLimit: userUsage.monthly_limit || 50
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
 * 月次使用量更新API（analyze-design から呼び出される内部API）
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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' }, 
        { status: 401 }
      );
    }

    // 現在の月次使用量を取得（リセット処理含む）
    const { data: currentUsage, error: fetchError } = await supabase
      .from('user_usage')
      .select('usage_count, monthly_limit, last_reset_date')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch current usage:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch usage data' }, 
        { status: 500 }
      );
    }

    // 月次リセットチェック：使用量増加前にリセットが必要か確認
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    const lastResetDate = new Date(currentUsage.last_reset_date);
    let baseUsageCount = currentUsage.usage_count || 0;
    
    if (lastResetDate < currentMonthStart) {
      // リセットが必要な場合は0から開始
      baseUsageCount = 0;
      if (process.env.NODE_ENV === 'development') {
        console.log('Resetting usage count for new month for user:', user.id);
      }
    }

    // 使用量を1増加（リセット同時処理）
    const { data, error: updateError } = await supabase
      .from('user_usage')
      .update({ 
        usage_count: baseUsageCount + 1,
        last_used_at: new Date().toISOString(),
        last_reset_date: lastResetDate < currentMonthStart ? currentMonthStart.toISOString().split('T')[0] : currentUsage.last_reset_date,
        updated_at: new Date().toISOString()
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