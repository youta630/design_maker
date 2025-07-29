'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function ComingSoonModal({ 
  isOpen, 
  onClose, 
  title = "Coming Soon",
  message = "This feature is currently under development. Please stay tuned for updates!"
}: ComingSoonModalProps) {

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // モーダル表示中はボディのスクロールを無効化
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* バックドロップ */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          
          {/* モーダルコンテンツ */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-auto border border-gray-200"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: 0.15,
                ease: "easeOut"
              }}
            >
              {/* モーダルヘッダー */}
              <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg 
                      className="w-8 h-8 text-gray-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <svg 
                      className="w-4 h-4 text-gray-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M6 18L18 6M6 6l12 12" 
                      />
                    </svg>
                  </button>
                </div>

                <h2 className="text-2xl font-black text-gray-900 mb-3">
                  {title}
                </h2>
                
                <p className="text-gray-600 leading-relaxed">
                  {message}
                </p>
              </div>

              {/* モーダルフッター */}
              <div className="p-8 pt-4">
                <button
                  onClick={onClose}
                  className="w-full px-6 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors"
                >
                  Got it
                </button>
                
                <p className="text-center text-xs text-gray-500 mt-4">
                  Press ESC to close
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}