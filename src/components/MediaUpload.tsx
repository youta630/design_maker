'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface MediaUploadProps {
  onMediaUpload: (file: File, screenType: string) => void; // Added screenType parameter
  isLoading: boolean;
  resetTrigger?: number; // Add trigger for reset
  viewMode?: 'full' | 'compact'; // Display mode
  usageCount?: number; // Current usage count
  monthlyLimit?: number; // Monthly limit
}

// Import screen types from emotion lib
import { SCREEN_TYPES } from '@/lib/emotion/types';

export default function MediaUpload({ 
  onMediaUpload, 
  isLoading, 
  resetTrigger, 
  viewMode = 'full',
  usageCount = 0,
  monthlyLimit = 50
}: MediaUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedScreenType, setSelectedScreenType] = useState<string>('');

  // Reset upload state when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setPreview(null);
      setSelectedFile(null);
      setSelectedScreenType('');
    }
  }, [resetTrigger]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setPreview(null);
      // Create preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSubmit = () => {
    // セキュリティチェック: 使用制限確認
    if (usageCount >= monthlyLimit) {
      return; // 制限に達している場合は処理を停止
    }
    
    if (selectedFile && selectedScreenType) {
      onMediaUpload(selectedFile, selectedScreenType);
    }
  };

  // 制限チェック用のヘルパー関数
  const isAtLimit = usageCount >= monthlyLimit;
  const isAnalyzeDisabled = !selectedFile || !selectedScreenType || isLoading || isAtLimit;

  const handleRemoveFile = () => {
    setPreview(null);
    setSelectedFile(null);
    setSelectedScreenType('');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif']
    },
    maxFiles: 1,
    disabled: isLoading || isAtLimit,
    noClick: false,
    noKeyboard: false
  });

  // Extract only the necessary props to avoid conflicts
  const { onClick, onKeyDown, onFocus, onBlur, onDragEnter, onDragLeave, onDragOver, onDrop: onDropProp } = getRootProps();

  // compactモードでは最小限の表示のみ
  if (viewMode === 'compact' && preview) {
    return (
      <div className="w-full">
        <div className="relative">
          <Image 
            src={preview} 
            alt="Uploaded image" 
            className="w-full rounded-lg shadow-sm border border-gray-200"
            width={300}
            height={200}
            style={{ objectFit: 'contain', maxHeight: '200px' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDropProp}
        tabIndex={0}
        role="button"
        aria-label="Upload design media"
        className={`
          relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer
          transition-all duration-300 backdrop-blur-sm
          ${isDragActive 
            ? 'border-gray-900 bg-gray-50 scale-[1.02]' 
            : 'border-gray-200 hover:border-gray-400 bg-white/80'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        whileHover={!isLoading && !isAtLimit ? { scale: 1.01 } : {}}
      >
        <input {...getInputProps()} disabled={isLoading || isAtLimit} />
        
        {preview ? (
          <div className="space-y-6">
            <div className="relative">
              <Image 
                src={preview} 
                alt="Upload preview" 
                className="max-h-72 mx-auto rounded-xl shadow-lg border border-gray-200"
                width={500}
                height={300}
                style={{ objectFit: 'contain' }}
              />
              {/* Remove button */}
              {!isLoading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-all duration-200"
                  title="Remove file"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {!isLoading && (
              <div className="space-y-6">
                {/* Screen Type Selection */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 text-center">
                    What type of screen do you want to design?
                  </h3>
                  <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                    {SCREEN_TYPES.map((type) => (
                      <motion.button
                        key={type.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScreenType(type.id);
                        }}
                        className={`p-3 text-left border rounded-lg transition-all duration-200 ${
                          selectedScreenType === type.id
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-sm font-medium">{type.name}</div>
                        <div className="text-xs opacity-75 mt-1">{type.description}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-center">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubmit();
                    }}
                    className={`px-12 py-4 rounded-2xl font-black text-xl transition-all duration-300 shadow-2xl flex items-center space-x-3 ${
                      isAnalyzeDisabled 
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                    whileHover={!isAnalyzeDisabled ? { scale: 1.05, y: -5 } : {}}
                    whileTap={!isAnalyzeDisabled ? { scale: 0.95 } : {}}
                    disabled={isAnalyzeDisabled}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>
                      {isAtLimit 
                        ? `Monthly Limit Reached (${usageCount}/${monthlyLimit})` 
                        : !selectedScreenType
                        ? 'Select Screen Type'
                        : `Generate ${SCREEN_TYPES.find(t => t.id === selectedScreenType)?.name.split(' ')[1] || 'Screen'}`
                      }
                    </span>
                  </motion.button>
                </div>
                
                {isAtLimit ? (
                  <p className="text-xs text-red-500 text-center">
                    Monthly limit reached. Please upgrade to continue.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 text-center">
                    Click or drag to change image
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Upload Icon */}
            <motion.div 
              className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </motion.div>
            
            {/* Main Content */}
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                Analyze Design
              </h2>
              <p className="text-lg text-gray-600 font-light">
                Upload UI design images
              </p>
              
              {/* Supported formats */}
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                {['PNG', 'JPG', 'WebP', 'GIF'].map((format) => (
                  <span 
                    key={format}
                    className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full"
                  >
                    {format}
                  </span>
                ))}
              </div>
              
              {/* Status Messages */}
              {isAtLimit ? (
                <motion.p 
                  className="text-red-500 font-medium"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Monthly limit reached ({usageCount}/{monthlyLimit})
                </motion.p>
              ) : (
                <p className="text-gray-400 font-light">
                  Drag & drop or click to select • Max 10MB (images)
                </p>
              )}
            </div>
            
          </motion.div>
        )}

        {isLoading && (
          <motion.div 
            className="mt-8 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.p 
              className="text-lg text-gray-600 font-light tracking-wide"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Analyzing design...
            </motion.p>
          </motion.div>
        )}
      </motion.div>

    </div>
  );
}