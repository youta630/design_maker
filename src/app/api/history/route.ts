import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { MEDSSpec } from '@/lib/validation/medsSchema';

// Runtime configuration for Node.js environment
export const runtime = 'nodejs';

/**
 * セキュアな履歴取得API
 * ユーザーの解析履歴をDBから取得
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

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // 最大100件
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // UI仕様履歴をDBから取得（新しい順）
    const { data: historyData, error: historyError } = await supabase
      .from('specs')
      .select(`
        id,
        modality,
        source_meta,
        spec,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (historyError) {
      console.error('Failed to fetch history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch history data' }, 
        { status: 500 }
      );
    }

    // レスポンス形式を統一（JSON直接返却）
    const formattedHistory = (historyData || []).map(item => {
      try {
        // source_meta から元のファイル情報を取得
        const sourceMeta = item.source_meta as Record<string, unknown>;
        const fileName = (sourceMeta?.fileName as string) || 'Unknown';
        
        // 画像URLを取得 (source_metaに保存されたURL)
        const imageUrl = (sourceMeta?.imageUrl as string) || undefined;
        
        return {
          id: item.id,
          fileName,
          fileSize: (sourceMeta?.fileSize as number) || 0,
          mimeType: (sourceMeta?.mimeType as string) || `${item.modality}/*`,
          spec: item.spec as MEDSSpec, // JSON直接返却
          createdAt: item.created_at,
          imageUrl, // 実際の画像URL
          modality: item.modality
        };
      } catch (error) {
        console.error('Failed to process history item:', item.id, error);
        return {
          id: item.id,
          fileName: 'Error',
          fileSize: 0,
          mimeType: 'unknown',
          spec: null,
          createdAt: item.created_at,
          imageUrl: undefined,
          modality: item.modality
        };
      }
    });

    // 総数を取得（ページネーション用）
    const { count, error: countError } = await supabase
      .from('specs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Failed to fetch history count:', countError);
      // 総数の取得に失敗してもデータは返す
    }

    return NextResponse.json({
      history: formattedHistory,
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    });

  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

/**
 * 履歴削除API
 */
export async function DELETE(request: NextRequest) {
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

    // リクエストボディから削除対象のIDを取得
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'History ID is required' }, 
        { status: 400 }
      );
    }

    // セキュリティ: 自分の仕様のみ削除可能
    const { error: deleteError } = await supabase
      .from('specs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // 重要：ユーザーIDも条件に含める

    if (deleteError) {
      console.error('Failed to delete history:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete history item' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('History delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}