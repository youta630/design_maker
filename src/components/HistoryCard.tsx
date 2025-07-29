'use client';

import type { MEDSSpec } from '@/lib/validation/medsSchema';

interface HistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  spec: MEDSSpec | null;
  createdAt: string;
  imageUrl?: string;
  modality: string;
}

interface HistoryCardProps {
  item: HistoryItem;
  onView: (item: HistoryItem) => void;
  onDelete?: (id: string) => void;
}

export default function HistoryCard({ item, onView, onDelete }: HistoryCardProps) {
  const isImage = item.mimeType.startsWith('image/');

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
        <div className="w-32 h-24 flex-shrink-0 bg-gray-100 flex items-center justify-center relative">
          {isImage && item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt={item.fileName}
              className="w-full h-full object-cover rounded-l-lg"
            />
          ) : (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          
          {/* MEDS Badge */}
          <div className="absolute top-1 right-1 bg-black text-white text-xs px-1.5 py-0.5 rounded font-medium">
            MEDS
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                {item.fileName}
              </h3>
              
              <div className="flex items-center text-xs text-gray-500 space-x-2 mb-2">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                  {item.mimeType}
                </span>
                <span>•</span>
                <span>{formatFileSize(item.fileSize)}</span>
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