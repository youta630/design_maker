'use client';

import { useState, useEffect } from 'react';
import MediaUpload from '@/components/MediaUpload';
import SpecificationDisplay from '@/components/SpecificationDisplay';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface AnalysisResult {
  specification: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  usageCount: number;
  monthlyLimit: number;
}

export default function AppPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [usageCount, setUsageCount] = useState<number>(0);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(7);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // 一時的に認証チェックを無効化

  useEffect(() => {
    // セキュアなAPI経由でデータ読み込み
    loadUsageData();
  }, []);


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
      
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };

  const handleMediaUpload = async (file: File, language: string) => {
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
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
            {/* Subscribe Button */}
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
        <div className="w-full max-w-lg border-r border-gray-200 p-6 overflow-y-auto">
          <div className="flex flex-col">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Upload Design Media
              </h2>
              <p className="text-sm text-gray-600">
                Upload your UI design image or video to generate specifications
              </p>
            </div>

            <div className="mb-6">
              <MediaUpload 
                onMediaUpload={handleMediaUpload}
                isLoading={isLoading}
                resetTrigger={resetTrigger}
              />
            </div>

            {/* Error Display */}
            {error && (
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                           border border-gray-300 rounded-lg transition-colors"
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