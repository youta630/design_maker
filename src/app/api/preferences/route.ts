import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * セキュアなユーザー設定取得API
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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' }, 
        { status: 401 }
      );
    }

    // ユーザー設定を取得
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('primary_button_color')
      .eq('user_id', user.id)
      .single();

    if (preferencesError) {
      if (preferencesError.code === 'PGRST116') {
        // レコードが存在しない場合はデフォルト設定を作成
        const { data: newPreferences, error: createError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            primary_button_color: '#000000'
          })
          .select('primary_button_color')
          .single();

        if (createError) {
          console.error('Failed to create user preferences:', createError);
          return NextResponse.json(
            { error: 'Failed to initialize user preferences' }, 
            { status: 500 }
          );
        }

        return NextResponse.json({
          primaryButtonColor: newPreferences.primary_button_color
        });
      }

      console.error('Preferences query error:', preferencesError);
      return NextResponse.json(
        { error: 'Failed to fetch user preferences' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      primaryButtonColor: preferences.primary_button_color
    });

  } catch (error) {
    console.error('Preferences API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

/**
 * ユーザー設定更新API
 */
export async function POST(request: NextRequest) {
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

    // リクエストボディを取得
    const body = await request.json();
    const { primaryButtonColor } = body;

    // 入力検証
    if (!primaryButtonColor || typeof primaryButtonColor !== 'string') {
      return NextResponse.json(
        { error: 'Primary button color is required' }, 
        { status: 400 }
      );
    }

    // HEXカラーコードの検証
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(primaryButtonColor)) {
      return NextResponse.json(
        { error: 'Invalid color format. Please use HEX format (e.g., #000000)' }, 
        { status: 400 }
      );
    }

    // 設定を更新（存在しない場合は作成）
    const { data: updatedPreferences, error: updateError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        primary_button_color: primaryButtonColor
      }, {
        onConflict: 'user_id'
      })
      .select('primary_button_color')
      .single();

    if (updateError) {
      console.error('Failed to update user preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences' }, 
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('User preferences updated:', {
        userId: user.id,
        primaryButtonColor: updatedPreferences.primary_button_color
      });
    }

    return NextResponse.json({
      primaryButtonColor: updatedPreferences.primary_button_color,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Preferences update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}