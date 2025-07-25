'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AuthCodeErrorPage() {
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    // URLパラメータからエラー詳細を取得
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    
    // ハッシュまたはクエリパラメータからエラー情報を抽出
    const error = searchParams.get('error') || 
                  (hash.includes('error=') ? new URLSearchParams(hash.slice(1)).get('error') : '');
    const errorDescription = searchParams.get('error_description') || 
                            (hash.includes('error_description=') ? new URLSearchParams(hash.slice(1)).get('error_description') : '');
    
    if (error || errorDescription) {
      setErrorDetails(`Error: ${error || 'Unknown'}\nDescription: ${errorDescription || 'No description available'}`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg 
              className="h-6 w-6 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          {/* Title & Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            認証エラー
          </h1>
          <p className="text-gray-600 mb-6">
            Googleサインインの処理中にエラーが発生しました。<br/>
            もう一度お試しください。
          </p>

          {/* Error Details (Development only) */}
          {errorDetails && process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-3 bg-gray-100 rounded text-left text-xs text-gray-700 whitespace-pre-wrap">
              <strong>Debug Info:</strong><br/>
              {errorDetails}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link 
              href="/landing"
              className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-black hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Googleでサインインを再試行
            </Link>
            
            <Link
              href="/"
              className="w-full inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              ホームに戻る  
            </Link>
          </div>

          {/* Help Text */}
          <p className="mt-6 text-sm text-gray-500">
            問題が続く場合は、ブラウザのキャッシュをクリアするか、<br/>
            プライベートブラウザでお試しください。
          </p>
        </div>
      </div>
    </div>
  );
}