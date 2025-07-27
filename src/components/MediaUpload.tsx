'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface MediaUploadProps {
  onMediaUpload: (file: File, language: string) => void;
  isLoading: boolean;
  resetTrigger?: number; // Add trigger for reset
  primaryButtonColor?: string; // Custom color for main buttons
  viewMode?: 'full' | 'compact'; // Display mode
  usageCount?: number; // Current usage count
  monthlyLimit?: number; // Monthly limit
}

export default function MediaUpload({ 
  onMediaUpload, 
  isLoading, 
  resetTrigger, 
  primaryButtonColor = '#000000',
  viewMode = 'full',
  usageCount = 0,
  monthlyLimit = 7
}: MediaUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ja');

  // Reset upload state when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setPreview(null);
      setFileType(null);
      setSelectedFile(null);
      setSelectedLanguage('ja');
    }
  }, [resetTrigger]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      setFileType(isVideo ? 'video' : 'image');
      setSelectedFile(file);
      
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
    
    if (selectedFile) {
      onMediaUpload(selectedFile, selectedLanguage);
    }
  };

  // 制限チェック用のヘルパー関数
  const isAtLimit = usageCount >= monthlyLimit;
  const isAnalyzeDisabled = !selectedFile || isLoading || isAtLimit;

  const handleRemoveFile = () => {
    setPreview(null);
    setFileType(null);
    setSelectedFile(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
      'video/*': ['.mp4', '.mov', '.webm', '.wmv', '.avi', '.mkv']
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
          {fileType === 'video' ? (
            <div className="w-full bg-gray-50 border border-gray-200 rounded-lg shadow-sm flex flex-col items-center justify-center p-4">
              <div className="mb-2">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-800 mb-1 text-center break-words max-w-full">
                {selectedFile?.name || 'Video File'}
              </h3>
              <div className="text-xs text-gray-500 text-center">
                {selectedFile && (
                  <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                )}
              </div>
            </div>
          ) : (
            <Image 
              src={preview} 
              alt="Uploaded media" 
              className="w-full rounded-lg shadow-sm border border-gray-200"
              width={300}
              height={200}
              style={{ objectFit: 'contain', maxHeight: '200px' }}
            />
          )}
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
              {fileType === 'video' ? (
                <div className="max-h-72 w-full max-w-md mx-auto bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl shadow-lg flex flex-col items-center justify-center p-8">
                  {/* Video Icon */}
                  <div className="mb-4">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  
                  {/* File Name */}
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center break-words">
                    {selectedFile?.name || 'Video File'}
                  </h3>
                  
                  {/* File Info */}
                  <div className="text-sm text-gray-600 space-y-1 text-center">
                    {selectedFile && (
                      <>
                        <p className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                          {selectedFile.type}
                        </p>
                        <p>
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </>
                    )}
                  </div>
                  
                </div>
              ) : (
                <Image 
                  src={preview} 
                  alt="Upload preview" 
                  className="max-h-72 mx-auto rounded-xl shadow-lg border border-gray-200"
                  width={500}
                  height={300}
                  style={{ objectFit: 'contain' }}
                />
              )}
              
              {/* Remove button */}
              {!isLoading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{ 
                    backgroundColor: `${primaryButtonColor}B3`, // 70% opacity
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = `${primaryButtonColor}E6`; // 90% opacity for hover
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = `${primaryButtonColor}B3`; // Back to 70% opacity
                  }}
                  title="Remove file"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {!isLoading && (
              <div className="space-y-4">
                {/* Language Selection */}
                <div 
                  className="flex items-center justify-center space-x-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-gray-500">Output Language:</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-black"
                    disabled={isLoading}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                    <option value="ko">한국어</option>
                    <option value="zh">中文</option>
                  </select>
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
                        ? `Limit Reached (${usageCount}/${monthlyLimit})` 
                        : `Analyze ${fileType === 'video' ? 'Video' : 'Design'}`
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
                    Click or drag to change {fileType === 'video' ? 'video' : 'image'}
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
                Upload Design Media
              </h2>
              <p className="text-lg text-gray-600 font-light">
                Images, videos, or any UI design asset
              </p>
              
              {/* Supported formats */}
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                {['PNG', 'JPG', 'WebP', 'MP4', 'MOV'].map((format) => (
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
                  Drag & drop or click to select • Max 50MB
                </p>
              )}
            </div>
            
            {/* Language Selection */}
            <motion.div 
              className="flex items-center justify-center space-x-3"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <span className="text-sm text-gray-500 font-medium">Output Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all duration-200"
                disabled={isLoading}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="ja">日本語</option>
                <option value="en">English</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
              </select>
            </motion.div>
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
              Analyzing {fileType === 'video' ? 'video' : 'design'}...
            </motion.p>
          </motion.div>
        )}
      </motion.div>

    </div>
  );
}