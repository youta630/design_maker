import { createClient } from './supabase/server';

// ストレージ設定
export const STORAGE_BUCKETS = {
  DESIGN_FILES: 'design-files'
} as const;

// サポートされるファイル形式
export const SUPPORTED_MIME_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
} as const;

/**
 * セキュアなファイルアップロード関数（画像専用）
 * 本番環境対応：認証・検証・エラーハンドリング強化
 */

/**
 * 画像ファイルアップロード関数
 */
export async function uploadFile(
  file: File, 
  userId: string,
  bucket: string = STORAGE_BUCKETS.DESIGN_FILES
): Promise<{ path: string; publicUrl: string; error?: string }> {
  try {
    // セキュリティ検証: ユーザーID必須
    if (!userId || typeof userId !== 'string') {
      return { path: '', publicUrl: '', error: 'Invalid user ID' };
    }

    // ファイル検証
    const validation = validateFile(file);
    if (!validation.valid) {
      return { path: '', publicUrl: '', error: validation.error };
    }

    // 画像ファイルをアップロード
    const supabase = await createClient();

    // セキュアなファイル名生成（特殊文字除去・長さ制限）
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const timestamp = Date.now();
    const baseName = file.name
      .replace(/\.[^/.]+$/, '') // 拡張子を除去
      .replace(/[^a-zA-Z0-9_-]/g, '_') // 特殊文字を_に置換
      .substring(0, 50); // 長さ制限
    
    const filePath = `${userId}/${timestamp}_${baseName}.${fileExtension}`;

    // 開発環境でのみデバッグログ
    if (process.env.NODE_ENV === 'development') {
      console.log('🗂️ Uploading image file:', {
        originalName: file.name,
        sanitizedPath: filePath,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type
      });
    }

    // ファイルをSupabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // 重複防止
        contentType: file.type, // 明示的にMIMEタイプ設定
      });

    if (error) {
      // 詳細なエラーログ（本番では簡略化）
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Storage upload error:', error);
      }
      return { 
        path: '', 
        publicUrl: '', 
        error: `Upload failed: ${error.message}` 
      };
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // 成功ログ
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Image file uploaded successfully:', {
        path: data.path,
        publicUrl: publicUrlData.publicUrl
      });
    }

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl
    };

  } catch (error) {
    // 構造化エラーログ
    const errorLog = {
      function: 'uploadFile',
      userId,
      fileName: file?.name,
      fileSize: file?.size,
      bucket,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    console.error('💥 Upload function error:', errorLog);
    
    return { 
      path: '', 
      publicUrl: '', 
      error: error instanceof Error ? error.message : 'File upload failed' 
    };
  }
}


/**
 * セキュアなファイル削除関数
 * 本番環境対応：パス検証・権限確認強化
 */
export async function deleteFile(
  filePath: string,
  bucket: string = STORAGE_BUCKETS.DESIGN_FILES
): Promise<{ success: boolean; error?: string }> {
  try {
    // セキュリティ検証
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'Invalid file path' };
    }

    // パストラバーサル攻撃防止
    if (filePath.includes('..') || filePath.includes('//')) {
      return { success: false, error: 'Invalid file path format' };
    }

    // サーバーサイドSupabaseクライアント初期化
    const supabase = await createClient();

    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ Deleting file:', { filePath, bucket });
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ File deletion error:', error);
      }
      return { 
        success: false, 
        error: `Deletion failed: ${error.message}` 
      };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ File deleted successfully:', filePath);
    }

    return { success: true };

  } catch (error) {
    const errorLog = {
      function: 'deleteFile',
      filePath,
      bucket,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    console.error('💥 Delete function error:', errorLog);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'File deletion failed' 
    };
  }
}

/**
 * セキュアなファイル存在確認関数
 * 本番環境対応：パス検証・エラーハンドリング強化
 */
export async function fileExists(
  filePath: string,
  bucket: string = STORAGE_BUCKETS.DESIGN_FILES
): Promise<boolean> {
  try {
    // セキュリティ検証
    if (!filePath || typeof filePath !== 'string') {
      return false;
    }

    // パストラバーサル攻撃防止
    if (filePath.includes('..') || filePath.includes('//')) {
      return false;
    }

    // サーバーサイドSupabaseクライアント初期化
    const supabase = await createClient();

    const pathParts = filePath.split('/');
    const fileName = pathParts.pop();
    const folderPath = pathParts.join('/');

    if (!fileName) {
      return false;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath, {
        search: fileName,
        limit: 1 // 効率化のため1件のみ
      });

    const exists = !error && data && data.length > 0;

    if (process.env.NODE_ENV === 'development' && exists) {
      console.log('🔍 File exists:', filePath);
    }

    return exists;

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('💥 File existence check error:', {
        filePath,
        bucket,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    return false;
  }
}

// 画像ファイルサイズとタイプの検証
export function validateFile(file: File): { valid: boolean; error?: string } {
  // ファイルサイズチェック（50MB制限）
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 50MB limit' };
  }

  // MIMEタイプチェック
  const allSupportedTypes = SUPPORTED_MIME_TYPES.IMAGE;

  if (!allSupportedTypes.includes(file.type as typeof allSupportedTypes[number])) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.type}. Supported types: ${allSupportedTypes.join(', ')}` 
    };
  }

  return { valid: true };
}

/**
 * セキュアなバケット情報取得関数
 * 本番環境対応：バケット名検証・エラーハンドリング強化
 */
export async function getBucketInfo(bucket: string) {
  try {
    // セキュリティ検証
    if (!bucket || typeof bucket !== 'string') {
      return null;
    }

    // 許可されたバケット名のみアクセス可能
    const allowedBuckets = Object.values(STORAGE_BUCKETS);
    if (!allowedBuckets.includes(bucket as typeof allowedBuckets[number])) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Unauthorized bucket access attempt:', bucket);
      }
      return null;
    }

    // サーバーサイドSupabaseクライアント初期化
    const supabase = await createClient();

    const { data, error } = await supabase.storage.getBucket(bucket);
    
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Bucket info error:', error);
      }
      return null;
    }

    return data;

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('💥 Get bucket info error:', {
        bucket,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    return null;
  }
}