'use client';

import { useState } from 'react';
import MediaUpload from '@/components/MediaUpload';
import SpecificationDisplay from '@/components/SpecificationDisplay';
import Link from 'next/link';

interface AnalysisResult {
  specification: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export default function AppPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  const handleMediaUpload = async (file: File, language: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('language', language);

      const response = await fetch('/api/analyze-design', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Design Spec Generator
          </h1>
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