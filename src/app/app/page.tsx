'use client';

import { useState, useEffect, useCallback } from 'react';
import MediaUpload from '@/components/MediaUpload';
import MEDSJsonViewer from '@/components/MEDSJsonViewer';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { EmotionExtraction, UIGeneration } from '@/lib/emotion/types';

interface AnalysisResult {
  id?: string;
  emotion: EmotionExtraction;
  ui: UIGeneration;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export default function AppPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [monthlyLimit] = useState<number>(50);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const checkAuthentication = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        // Redirect to landing if authentication fails
        window.location.href = '/landing';
        return;
      }

      if (!session) {
        console.log('No session found, redirecting to landing');
        setIsAuthenticated(false);
        window.location.href = '/landing';
        return;
      }

      // Valid session found
      setIsAuthenticated(true);
      console.log('Authentication verified for user:', session.user.email);
      
      // Load data only after authentication is confirmed
      loadUsageData();
      
    } catch (err) {
      console.error('Unexpected auth error:', err);
      setIsAuthenticated(false);
      window.location.href = '/landing';
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    // 認証状態をチェック
    checkAuthentication();
  }, [checkAuthentication]);

  const loadUsageData = async () => {
    try {
      // セキュアなAPI経由でデータ取得
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication token');
        return;
      }

      const response = await fetch('/api/usage', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to load usage data:', errorData.error);
        return;
      }

      const data = await response.json();
      setUsageCount(data.usageCount || 0);
      
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };


  const handleMediaUpload = async (file: File, screenType: string) => {
    // 月次使用制限確認
    if (usageCount >= monthlyLimit) {
      setError(`Monthly usage limit reached (${usageCount}/${monthlyLimit}). Try again next month or upgrade for unlimited access.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // セキュリティ強化: 認証ヘッダーを追加
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Step 1: Extract emotions from image
      console.log('🎨 Step 1: Extracting emotions...');
      const formData = new FormData();
      formData.append('file', file);

      const emotionResponse = await fetch('/api/emotion/extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!emotionResponse.ok) {
        const errorData = await emotionResponse.json();
        throw new Error(errorData.error || `Emotion extraction failed: ${emotionResponse.status}`);
      }

      const emotionData = await emotionResponse.json();
      console.log('✨ Emotion extracted:', emotionData.emotion);

      // Step 2: Generate UI from emotions
      console.log('🏗️ Step 2: Generating UI...');
      const uiResponse = await fetch('/api/ui/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emotion: emotionData.emotion,
          screenType: screenType
        }),
      });

      if (!uiResponse.ok) {
        const errorData = await uiResponse.json();
        throw new Error(errorData.error || `UI generation failed: ${uiResponse.status}`);
      }

      const uiData = await uiResponse.json();
      console.log('🎯 UI generated:', uiData.ui);
      
      // Create AnalysisResult with emotion + UI
      const analysisResult: AnalysisResult = {
        id: uiData.id,
        emotion: emotionData.emotion,
        ui: uiData.ui,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      };
      
      setResult(analysisResult);
      
      // Refresh usage count
      await loadUsageData();
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to analyze media. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setResetTrigger(prev => prev + 1); // Trigger MediaUpload reset
  };

  // Show loading screen while checking authentication
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Verifying authentication...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="clarity" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#000" stopOpacity="0.15"/>
                  <stop offset="30%" stopColor="#000" stopOpacity="0.4"/>
                  <stop offset="70%" stopColor="#000" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#000" stopOpacity="1"/>
                </linearGradient>
                <linearGradient id="clarityFill" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#000" stopOpacity="0.05"/>
                  <stop offset="100%" stopColor="#000" stopOpacity="0.2"/>
                </linearGradient>
              </defs>
              
              {/* 1つの統一された結晶 - 霧から明確さへのグラデーション */}
              <path d="M6 16L16 6L26 16L16 26L6 16z" 
                    stroke="url(#clarity)" 
                    strokeWidth="2" 
                    fill="url(#clarityFill)"/>
              
              {/* 内部構造線 - 同じグラデーション */}
              <path d="M6 16h20M16 6v20" 
                    stroke="url(#clarity)" 
                    strokeWidth="1"/>
              
              {/* 中心核 */}
              <circle cx="16" cy="16" r="2" fill="#000"/>
              
              {/* 理解の放射 - 右側のみ明確 */}
              <g opacity="0.6">
                <path d="M22 10l2-2M22 22l2 2M26 16h3" 
                      stroke="#000" 
                      strokeWidth="1" 
                      strokeLinecap="round"/>
              </g>
            </svg>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Usage Counter & Subscribe Button (Coming Soon) */}
            <div className="flex items-center space-x-3">
              {/* Monthly Usage Counter */}
              <div className="px-3 py-2 bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {usageCount}/{monthlyLimit} this month
                  </span>
                </div>
              </div>
              
            </div>
            
            {/* History Button */}
            <Link 
              href="/app/history" 
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="View History"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
            
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)]">
        {/* Left Panel - Input */}
        <div className={`border-r border-gray-200 p-6 overflow-y-auto ${
          result ? 'w-full max-w-xs' : 'w-full max-w-lg'
        }`}>
          <div className="flex flex-col">
            {/* ヘッダー部分 - 解析後は非表示 */}
            {!result && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Upload Design Media
                </h2>
                <p className="text-sm text-gray-600">
                  Upload your UI design image or video to generate specifications
                </p>
              </div>
            )}

            <div className={result ? "" : "mb-6"}>
              <MediaUpload 
                onMediaUpload={handleMediaUpload}
                isLoading={isLoading}
                resetTrigger={resetTrigger}
                viewMode={result ? 'compact' : 'full'}
                usageCount={usageCount}
                monthlyLimit={monthlyLimit}
              />
            </div>

            {/* Error Display - 解析後は非表示 */}
            {!result && error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Analysis Error
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Output */}
        {result && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Generated Specification
                  </h2>
                  <p className="text-sm text-gray-600">
                    {result.fileName}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg transition-colors"
                >
                  New Analysis
                </button>
              </div>

              <div className="flex-1">
                <MEDSJsonViewer
                  spec={{ emotion: result.emotion, ui: result.ui }}
                  fileName={result.fileName}
                  fileSize={result.fileSize}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}