import { supabase } from './supabase';
import sharp from 'sharp';

// ストレージ設定
export const STORAGE_BUCKETS = {
  DESIGN_FILES: 'design-files',
  THUMBNAILS: 'thumbnails'
} as const;

// サポートされるファイル形式
export const SUPPORTED_MIME_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  VIDEO: ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi']
} as const;

// ファイルアップロード関数
export async function uploadFile(
  file: File, 
  userId: string,
  bucket: string = STORAGE_BUCKETS.DESIGN_FILES
): Promise<{ path: string; publicUrl: string; error?: string }> {
  try {
    // ファイル名とパスを生成
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const timestamp = Date.now();
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // 拡張子を除去
    const filePath = `${userId}/${timestamp}_${fileName}.${fileExtension}`;

    console.log('Uploading file:', {
      originalName: file.name,
      filePath,
      size: file.size,
      type: file.type
    });

    // ファイルをSupabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { path: '', publicUrl: '', error: error.message };
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('File uploaded successfully:', {
      path: data.path,
      publicUrl: publicUrlData.publicUrl
    });

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl
    };

  } catch (error) {
    console.error('Upload function error:', error);
    return { 
      path: '', 
      publicUrl: '', 
      error: error instanceof Error ? error.message : 'Unknown upload error' 
    };
  }
}

// 動画サムネイル生成・アップロード関数
export async function generateAndUploadThumbnail(
  videoBuffer: Buffer,
  userId: string,
  originalFileName: string
): Promise<{ path: string; publicUrl: string; error?: string }> {
  try {
    // 動画の最初のフレームをサムネイルとして生成（仮実装）
    // 実際にはffmpegを使用してサムネイル生成
    const timestamp = Date.now();
    const baseName = originalFileName.replace(/\.[^/.]+$/, '');
    const thumbnailPath = `${userId}/${timestamp}_${baseName}_thumbnail.jpg`;

    // TODO: ffmpegを使用して実際のサムネイル生成
    // 現在はプレースホルダー画像を生成
    const placeholderThumbnail = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: { r: 100, g: 100, b: 100 }
      }
    })
    .jpeg({ quality: 80 })
    .toBuffer();

    // サムネイルをアップロード
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.THUMBNAILS)
      .upload(thumbnailPath, placeholderThumbnail, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Thumbnail upload error:', error);
      return { path: '', publicUrl: '', error: error.message };
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKETS.THUMBNAILS)
      .getPublicUrl(thumbnailPath);

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl
    };

  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return { 
      path: '', 
      publicUrl: '', 
      error: error instanceof Error ? error.message : 'Unknown thumbnail error' 
    };
  }
}

// ファイル削除関数
export async function deleteFile(
  filePath: string,
  bucket: string = STORAGE_BUCKETS.DESIGN_FILES
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('File deletion error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete function error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown deletion error' 
    };
  }
}

// ファイル存在確認関数
export async function fileExists(
  filePath: string,
  bucket: string = STORAGE_BUCKETS.DESIGN_FILES
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      });

    return !error && data && data.length > 0;
  } catch (error) {
    console.error('File existence check error:', error);
    return false;
  }
}

// ファイルサイズとタイプの検証
export function validateFile(file: File): { valid: boolean; error?: string } {
  // ファイルサイズチェック（50MB制限）
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 50MB limit' };
  }

  // MIMEタイプチェック
  const allSupportedTypes = [
    ...SUPPORTED_MIME_TYPES.IMAGE,
    ...SUPPORTED_MIME_TYPES.VIDEO
  ];

  if (!allSupportedTypes.includes(file.type as any)) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.type}. Supported types: ${allSupportedTypes.join(', ')}` 
    };
  }

  return { valid: true };
}

// バケット情報取得
export async function getBucketInfo(bucket: string) {
  try {
    const { data, error } = await supabase.storage.getBucket(bucket);
    
    if (error) {
      console.error('Bucket info error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get bucket info error:', error);
    return null;
  }
}