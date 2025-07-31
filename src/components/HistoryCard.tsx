'use client';

import Image from 'next/image';
import { useState } from 'react';
// Generic spec type for history items
type GenericSpec = Record<string, unknown>;

// Helper function to get component count from any spec format
function getComponentCount(spec: GenericSpec | null): number {
  if (!spec) return 0;
  
  // New emotion-driven system: spec.ui.components
  if (spec.ui && typeof spec.ui === 'object' && spec.ui !== null) {
    const ui = spec.ui as Record<string, unknown>;
    if (Array.isArray(ui.components)) {
      return (ui.components as unknown[]).length;
    }
  }
  
  // Old MEDS system: spec.components
  if (Array.isArray(spec.components)) {
    return (spec.components as unknown[]).length;
  }
  
  return 0;
}


interface HistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  spec: GenericSpec | null;
  createdAt: string;
  imageUrl?: string;
}

interface HistoryCardProps {
  item: HistoryItem;
  onView: (item: HistoryItem) => void;
  onDelete?: (id: string) => void;
}

export default function HistoryCard({ item, onView, onDelete }: HistoryCardProps) {
  const isImage = item.mimeType.startsWith('image/');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div 
      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onView(item)}
    >
      <div className="flex">
        {/* Image Preview */}
        <div className="w-24 sm:w-32 h-18 sm:h-24 flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center relative rounded-l-lg">
          {isImage && item.imageUrl && !imageLoadFailed ? (
            <Image 
              src={item.imageUrl} 
              alt={item.fileName}
              width={128}
              height={96}
              className="w-full h-full object-cover rounded-l-lg"
              onError={() => {
                console.error('Image load failed for URL:', item.imageUrl);
                setImageLoadFailed(true);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', item.imageUrl);
              }}
            />
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-blue-500 font-medium">Design</span>
              {getComponentCount(item.spec) > 0 && (
                <span className="text-xs text-gray-400">
                  {getComponentCount(item.spec)} components
                </span>
              )}
            </div>
          )}
          
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-900 truncate mb-1">
                {item.fileName}
              </h3>
              
              <div className="flex items-center text-xs text-gray-500 space-x-1 sm:space-x-2 mb-2">
                <span className="font-mono bg-gray-100 px-1 sm:px-1.5 py-0.5 rounded text-xs">
                  {item.mimeType}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">{formatFileSize(item.fileSize)}</span>
              </div>
              
              <p className="text-xs text-gray-600 line-clamp-2">
                {formatDate(item.createdAt)}
              </p>
            </div>

            {/* Actions */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}