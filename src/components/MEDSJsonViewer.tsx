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
      <div className="bg-white border-b border-black p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <div>
              <h2 className="text-lg font-semibold text-black">Generated Specification</h2>
              {fileName && (
                <p className="text-sm text-black">
                  {fileName} {fileSize && `(${formatFileSize(fileSize)})`}
                </p>
              )}
            </div>
          </div>
          
          {/* Validation Badge */}
          <div className={`px-3 py-1 border text-xs font-medium ${
            validationResult.ok 
              ? 'border-black bg-white text-black' 
              : 'border-black bg-black text-white'
          }`}>
            {validationResult.ok ? '✓ Valid' : '✗ Invalid'}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Copy button */}
          <button
            onClick={handleCopyAll}
            className={`
              px-4 py-2 border text-sm font-medium transition-all duration-200 flex items-center space-x-2
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
      <div className="flex-1 overflow-auto p-6 bg-white">
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