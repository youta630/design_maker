'use client';

import { useState, useEffect } from 'react';
import MediaUpload from '@/components/MediaUpload';
import SpecificationDisplay from '@/components/SpecificationDisplay';
import ColorPicker from '@/components/ColorPicker';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface AnalysisResult {
  specification: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  usageCount: number;
  monthlyLimit: number;
  subscriptionStatus?: string;
}

export default function AppPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(7);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [primaryButtonColor, setPrimaryButtonColor] = useState<string>('#000000');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('free');

  useEffect(() => {
    // 認証状態をチェック
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
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
      loadUserPreferences();
      
    } catch (err) {
      console.error('Unexpected auth error:', err);
      setIsAuthenticated(false);
      window.location.href = '/landing';
    } finally {
      setAuthLoading(false);
    }
  };


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
      setUsageCount(data.usageCount);
      setMonthlyLimit(data.monthlyLimit);
      setSubscriptionStatus(data.subscriptionStatus || 'free');
      
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };

  // ユーザー設定読み込み
  const loadUserPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication token for preferences');
        return;
      }

      const response = await fetch('/api/preferences', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPrimaryButtonColor(data.primaryButtonColor);
      } else {
        console.error('Failed to load user preferences');
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  // ユーザー設定保存
  const saveUserPreferences = async (color: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication token for preferences');
        return;
      }

      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryButtonColor: color,
        }),
      });

      if (response.ok) {
        setPrimaryButtonColor(color);
        if (process.env.NODE_ENV === 'development') {
          console.log('User preferences saved successfully');
        }
      } else {
        console.error('Failed to save user preferences');
      }
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  };

  const handleMediaUpload = async (file: File, language: string) => {
    // セキュリティチェック: 使用制限確認
    if (usageCount >= monthlyLimit) {
      setError('Monthly usage limit reached. Please upgrade your plan to continue.');
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

      const formData = new FormData();
      formData.append('media', file);
      formData.append('language', language);

      const response = await fetch('/api/analyze-design', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
      
      // Update usage count in UI
      setUsageCount(data.usageCount);
      setMonthlyLimit(data.monthlyLimit);
      
      // サブスクリプション状況も更新
      if (data.subscriptionStatus) {
        setSubscriptionStatus(data.subscriptionStatus);
      }
      
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
          <h1 className="text-xl font-semibold text-gray-900">
            Design Spec Generator
          </h1>
          
          <div className="flex items-center space-x-3">
            {/* Subscribe Button - 条件分岐: 未登録時は虹色固定、登録後はカスタム色 */}
            {subscriptionStatus === 'free' ? (
              // 未登録時: 虹色グラデーション固定
              <Link 
                href="/app/subscribe" 
                className="group relative px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 animate-pulse"
                title="Upgrade to Premium"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Subscribe</span>
                  <span className="px-1.5 py-0.5 text-xs font-bold bg-white/20 rounded backdrop-blur">
                    {usageCount}/{monthlyLimit}
                  </span>
                </div>
                {/* Animated border */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 opacity-75 blur-sm group-hover:opacity-100 group-hover:blur-none transition-all duration-300 -z-10"></div>
              </Link>
            ) : (
              // 登録後: ユーザーカスタム色
              <Link 
                href="/app/subscribe" 
                className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center space-x-2"
                style={{ backgroundColor: primaryButtonColor }}
                title="Manage Subscription"
                onMouseEnter={(e) => {
                  const target = e.target as HTMLAnchorElement;
                  target.style.backgroundColor = `${primaryButtonColor}CC`;
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLAnchorElement;
                  target.style.backgroundColor = primaryButtonColor;
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span>Manage</span>
                <span className="px-1.5 py-0.5 text-xs font-bold bg-white/20 rounded backdrop-blur">
                  {subscriptionStatus === 'monthly' ? 'Monthly' : subscriptionStatus === 'yearly' ? 'Yearly' : 'Premium'}
                </span>
              </Link>
            )}
            
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
            
            {/* Color Picker */}
            <ColorPicker
              currentColor={primaryButtonColor}
              onColorChange={saveUserPreferences}
            />
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
                primaryButtonColor={primaryButtonColor}
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
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{ backgroundColor: primaryButtonColor }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = `${primaryButtonColor}CC`; // Add transparency for hover
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = primaryButtonColor;
                  }}
                >
                  New Analysis
                </button>
              </div>

              <div className="flex-1">
                <SpecificationDisplay
                  specification={result.specification}
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