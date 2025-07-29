'use client';

import { useState } from 'react';
import JsonView from '@uiw/react-json-view';
import { validateMEDSJSON } from '@/lib/validation/medsSchema';
import type { MEDSSpec } from '@/lib/validation/medsSchema';

interface MEDSJsonViewerProps {
  spec: MEDSSpec;
  fileName?: string;
  fileSize?: number;
}

export default function MEDSJsonViewer({ 
  spec, 
  fileName, 
  fileSize 
}: MEDSJsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showUxSignals, setShowUxSignals] = useState(true);

  // Validate the spec
  const validationResult = validateMEDSJSON(spec);
  
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

  // Create display spec (conditionally include uxSignals)
  const displaySpec = showUxSignals ? spec : { ...spec, uxSignals: undefined };

  return (
    <div className="w-full h-full flex flex-col bg-white border border-black overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-black p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <div>
              <h2 className="text-lg font-semibold text-black">MEDS v{spec.version} Specification</h2>
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
          {/* Toggle uxSignals */}
          <button
            onClick={() => setShowUxSignals(!showUxSignals)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
              showUxSignals 
                ? 'border-black bg-black text-white' 
                : 'border-black bg-white text-black hover:bg-black hover:text-white'
            }`}
          >
            {showUxSignals ? 'Hide' : 'Show'} uxSignals
          </button>
          
          <div className="w-px h-6 bg-black" />
          
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
        
        {/* Validation Errors */}
        {!validationResult.ok && validationResult.errors && (
          <div className="mt-4 p-4 bg-white border border-black">
            <h3 className="text-sm font-medium text-black mb-2">Validation Errors:</h3>
            <ul className="text-xs text-black space-y-1">
              {validationResult.errors.map((error, index) => (
                <li key={index} className="font-mono">
                  {error.instancePath || 'root'}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Platform: {spec.viewportProfile?.type || 'unknown'}</span>
            <span>Components: {spec.components?.length || 0}</span>
            {spec.uxRulebook?.rules && (
              <span>UX Rules: {spec.uxRulebook.rules.length}</span>
            )}
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