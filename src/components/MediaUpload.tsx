'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface MediaUploadProps {
  onMediaUpload: (file: File, language: string) => void;
  isLoading: boolean;
  resetTrigger?: number; // Add trigger for reset
}

export default function MediaUpload({ onMediaUpload, isLoading, resetTrigger }: MediaUploadProps) {
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
    if (selectedFile) {
      onMediaUpload(selectedFile, selectedLanguage);
    }
  };

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
    disabled: isLoading
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
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
                  className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-70 hover:bg-opacity-90 rounded-full flex items-center justify-center transition-all duration-200"
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubmit();
                    }}
                    className="px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center space-x-2"
                    disabled={!selectedFile}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Analyze {fileType === 'video' ? 'Video' : 'Image'}</span>
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  Click or drag to change {fileType === 'video' ? 'video' : 'image'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-800 mb-2">
                Upload UI Design Media
              </p>
              <p className="text-sm text-gray-500 mb-3">
                Images: PNG, JPG, JPEG, WebP, GIF<br/>
                Videos: MP4, MOV, WebM, WMV, AVI, MKV<br/>
                (max 50MB)
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Drag & drop or click to select
              </p>
              
              {/* Language Selection */}
              <div 
                className="flex items-center justify-center space-x-2"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-gray-500">Output Language:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={isLoading}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                  <option value="ko">한국어</option>
                  <option value="zh">中文</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mt-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-3">Analyzing {fileType === 'video' ? 'video' : 'image'}...</p>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded">
        <p className="text-sm font-medium text-gray-800 mb-2">Tips for better analysis:</p>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>• Images: Use high-resolution UI screenshots, mockups, or wireframes</li>
          <li>• Videos: Screen recordings of UI interactions work best</li>
          <li>• Full-screen captures provide more context</li>
          <li>• Files are automatically optimized for Gemini 2.5 Flash</li>
        </ul>
      </div>
    </div>
  );
}