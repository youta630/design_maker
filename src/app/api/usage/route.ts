import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Runtime configuration for Node.js environment
export const runtime = 'nodejs';

/**
 * 月次使用量取得API (新設計: usage_monthly テーブル)
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

    // 現在月のキー (YYYY-MM 形式)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // 月次使用量データを取得
    const { data: monthlyUsage, error: usageError } = await supabase
      .from('usage_monthly')
      .select('count, limit_count')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single();

    let usageCount = 0;
    
    if (usageError) {
      if (usageError.code === 'PGRST116') {
        // 当月のレコードが存在しない場合は0回
        usageCount = 0;
      } else {
        console.error('Usage query error:', usageError);
        return NextResponse.json(
          { error: 'Failed to fetch usage data' }, 
          { status: 500 }
        );
      }
    } else {
      usageCount = monthlyUsage?.count || 0;
    }

    return NextResponse.json({
      usageCount,
      monthlyLimit: monthlyUsage?.limit_count || 50,
      currentMonth
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
 * 月次使用量増加API (extract成功時のみ呼び出し)
 * upsert によるアトミックな増加処理
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

    // 現在月のキー (YYYY-MM 形式)
    const currentMonth = new Date().toISOString().slice(0, 7);

    // アトミックな upsert による使用量増加
    const { data, error: upsertError } = await supabase
      .rpc('increment_monthly_usage', {
        p_user_id: user.id,
        p_month: currentMonth
      });

    if (upsertError) {
      console.error('Failed to increment usage count:', upsertError);
      
      // Fallback: 手動でupsert処理
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('usage_monthly')
          .insert({
            user_id: user.id,
            month: currentMonth,
            count: 1,
            limit_count: 50
          })
          .select('count, limit_count')
          .single();

        if (insertError) {
          if (insertError.code === '23505') { // Unique constraint violation
            // 既存レコードをupdate (現在の値を取得してからインクリメント)
            const { data: currentData, error: fetchError } = await supabase
              .from('usage_monthly')
              .select('count, limit_count')
              .eq('user_id', user.id)
              .eq('month', currentMonth)
              .single();

            if (fetchError) {
              throw fetchError;
            }

            const { data: updateData, error: updateError } = await supabase
              .from('usage_monthly')
              .update({ count: (currentData.count || 0) + 1 })
              .eq('user_id', user.id)
              .eq('month', currentMonth)
              .select('count, limit_count')
              .single();

            if (updateError) {
              console.error('Failed to update usage count:', updateError);
              return NextResponse.json(
                { error: 'Failed to update usage' }, 
                { status: 500 }
              );
            }

            return NextResponse.json({
              usageCount: updateData.count,
              monthlyLimit: updateData.limit_count || 50,
              currentMonth
            });
          } else {
            throw insertError;
          }
        }

        return NextResponse.json({
          usageCount: insertData.count,
          monthlyLimit: insertData.limit_count || 50,
          currentMonth
        });

      } catch (fallbackError) {
        console.error('Fallback upsert failed:', fallbackError);
        return NextResponse.json(
          { error: 'Failed to update usage' }, 
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      usageCount: data,
      monthlyLimit: 50,
      currentMonth
    });

  } catch (error) {
    console.error('Usage increment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}