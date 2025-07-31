'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HistoryCard from '@/components/HistoryCard';
import MEDSJsonViewer from '@/components/MEDSJsonViewer';
import { supabase } from '@/lib/supabase/client';
// Generic spec type for history items
type GenericSpec = Record<string, unknown>;

interface HistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  spec: GenericSpec | null;
  createdAt: string;
  imageUrl?: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication token');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/history', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to load history:', errorData.error);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setHistory(data.history || []);
      
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewItem = (item: HistoryItem) => {
    setSelectedItem(item);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication token');
        return;
      }

      const response = await fetch('/api/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to delete history item:', errorData.error);
        return;
      }

      // UIから削除
      setHistory(prev => prev.filter(item => item.id !== id));
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
      
    } catch (error) {
      console.error('Error deleting history item:', error);
    }
  };

  const handleBackToList = () => {
    setSelectedItem(null);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg lg:text-xl font-semibold text-gray-900">History</h1>
            <Link 
              href="/app" 
              className="p-1.5 lg:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <header className="border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
              <button
                onClick={handleBackToList}
                className="p-1.5 lg:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Back to History"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-base lg:text-xl font-semibold text-gray-900 truncate">
                {selectedItem.fileName}
              </h1>
            </div>
            <Link 
              href="/app" 
              className="flex items-center space-x-1 lg:space-x-2 p-1.5 lg:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
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

        {/* Full Width JSON Viewer */}
        <div className="p-4 lg:p-6 h-full">
          {selectedItem.spec ? (
            <MEDSJsonViewer
              spec={selectedItem.spec}
              fileName={selectedItem.fileName}
              fileSize={selectedItem.fileSize}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Specification not available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg lg:text-xl font-semibold text-gray-900">History</h1>
          <Link 
            href="/app" 
            className="p-1.5 lg:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to App"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="p-4 lg:p-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
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