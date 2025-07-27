'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HistoryCard from '@/components/HistoryCard';
import SpecificationDisplay from '@/components/SpecificationDisplay';

interface HistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  specification: string;
  createdAt: string;
  thumbnail?: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    // TODO: Fetch history from API or local storage
    // For now, using mock data
    const mockHistory: HistoryItem[] = [
      {
        id: '1',
        fileName: 'login-form.png',
        fileSize: 245760,
        mimeType: 'image/png',
        specification: '# Login Form Specification\n\n## Overview\nA clean login form with email and password fields...',
        createdAt: '2024-01-20T10:30:00Z',
        thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiB2aWV3Qm94PSIwIDAgMTI4IDk2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjE2IiB5PSIyNCIgd2lkdGg9Ijk2IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRTVFN0VCIiByeD0iNCIvPgo8L3N2Zz4K'
      },
      {
        id: '2',
        fileName: 'dashboard.jpg',
        fileSize: 1048576,
        mimeType: 'image/jpeg',
        specification: '# Dashboard Specification\n\n## Overview\nA modern dashboard with charts and statistics...',
        createdAt: '2024-01-19T15:45:00Z'
      },
      {
        id: '3',
        fileName: 'app-demo.mp4',
        fileSize: 5242880,
        mimeType: 'video/mp4',
        specification: '# App Demo Animation Specification\n\n## Motion Analysis\nThe video shows smooth transitions and animations...',
        createdAt: '2024-01-18T09:15:00Z'
      }
    ];
    
    setTimeout(() => {
      setHistory(mockHistory);
      setLoading(false);
    }, 500);
  }, []);

  const handleViewItem = (item: HistoryItem) => {
    setSelectedItem(item);
  };

  const handleDeleteItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem(null);
    }
  };

  const handleBackToList = () => {
    setSelectedItem(null);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">History</h1>
            <Link 
              href="/app" 
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  // Show selected item details
  if (selectedItem) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToList}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to History"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {selectedItem.fileName}
              </h1>
            </div>
            <Link 
              href="/app" 
              className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to App"
            >
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="clarityHistory" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#000" stopOpacity="0.15"/>
                    <stop offset="30%" stopColor="#000" stopOpacity="0.4"/>
                    <stop offset="70%" stopColor="#000" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#000" stopOpacity="1"/>
                  </linearGradient>
                </defs>
                <path d="M6 16L16 6L26 16L16 26L6 16z" stroke="url(#clarityHistory)" strokeWidth="1.5" fill="none"/>
                <path d="M6 16h20M16 6v20" stroke="url(#clarityHistory)" strokeWidth="0.8"/>
                <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
              </svg>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>
        </header>

        <div className="p-6">
          <SpecificationDisplay
            specification={selectedItem.specification}
            fileName={selectedItem.fileName}
            fileSize={selectedItem.fileSize}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">History</h1>
          <Link 
            href="/app" 
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to App"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="p-6">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No history yet</h3>
            <p className="text-gray-600 mb-6">Start analyzing designs to see your history here.</p>
            <Link 
              href="/app"
              className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Start Analyzing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onView={handleViewItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}