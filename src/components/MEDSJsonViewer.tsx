'use client';

import { useState } from 'react';
import JsonView from '@uiw/react-json-view';
// Generic JSON viewer for any spec data
interface MEDSJsonViewerProps {
  spec: Record<string, unknown>; // Generic spec data (MEDS, Emotion+UI, etc.)
  fileName?: string;
  fileSize?: number;
}

// Helper functions for spec info
function getSpecInfo(spec: Record<string, unknown>) {
  // New emotion-driven system
  if (spec.emotion && spec.ui) {
    const ui = spec.ui as Record<string, unknown>;
    const screenType = ui.screen_type || 'unknown';
    const componentCount = Array.isArray(ui.components) ? ui.components.length : 0;
    return {
      platform: `${screenType} screen`,
      components: componentCount,
      systemType: 'Emotion-driven'
    };
  }
  
  // Old MEDS system
  if (spec.viewportProfile || spec.components) {
    const viewport = spec.viewportProfile as Record<string, unknown> | undefined;
    const components = spec.components as unknown[] | undefined;
    return {
      platform: viewport?.type as string || 'unknown',
      components: components?.length || 0,
      systemType: 'MEDS'
    };
  }
  
  return {
    platform: 'unknown',
    components: 0,
    systemType: 'Unknown'
  };
}

export default function MEDSJsonViewer({ 
  spec, 
  fileName, 
  fileSize 
}: MEDSJsonViewerProps) {
  const [copied, setCopied] = useState(false);

  // Simple validation for any spec data
  const validationResult = { ok: true }; // Always valid for generic data
  
  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Create display spec (generic data)
  const displaySpec = spec;

  return (
    <div className="w-full h-full flex flex-col bg-white border border-black overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-black p-3 lg:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 min-w-0 flex-1">
          <div className="min-w-0">
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-black">Generated Specification</h2>
              {fileName && (
                <p className="text-xs lg:text-sm text-black truncate">
                  {fileName} {fileSize && `(${formatFileSize(fileSize)})`}
                </p>
              )}
            </div>
          </div>
          
          {/* Validation Badge */}
          <div className={`px-2 lg:px-3 py-1 border text-xs font-medium self-start sm:self-auto ${
            validationResult.ok 
              ? 'border-black bg-white text-black' 
              : 'border-black bg-black text-white'
          }`}>
            {validationResult.ok ? '✓ Valid' : '✗ Invalid'}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Copy button */}
          <button
            onClick={handleCopyAll}
            className={`
              px-3 lg:px-4 py-1.5 lg:py-2 border text-xs lg:text-sm font-medium transition-all duration-200 flex items-center space-x-2 whitespace-nowrap
              ${copied 
                ? 'border-black bg-white text-black' 
                : 'border-black bg-black text-white hover:bg-white hover:text-black'
              }
            `}
          >
            <span>{copied ? 'Copied!' : 'Copy All'}</span>
          </button>
        </div>
      </div>

      {/* JSON Content */}
      <div className="flex-1 overflow-auto p-3 lg:p-6 bg-white">
        <div className="bg-white border border-black overflow-hidden">
          <JsonView
            value={displaySpec}
            style={{
              backgroundColor: 'white',
              fontSize: '14px',
              fontFamily: 'ui-monospace, SFMono-Regular, Monaco, Consolas, monospace',
            }}
            displayDataTypes={false}
            enableClipboard={false}
            collapsed={false}
          />
        </div>
        
        {/* No validation errors for generic data */}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Platform: {getSpecInfo(spec).platform}</span>
            <span>Components: {getSpecInfo(spec).components}</span>
            <span>System: {getSpecInfo(spec).systemType}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-black rounded-full"></div>
            <span>Generated with Gemini 2.5 Flash</span>
          </div>
        </div>
      </div>
    </div>
  );
}