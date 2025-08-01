'use client';

import { useState } from 'react';
import { 
  SandpackProvider, 
  SandpackLayout,
  SandpackPreview, 
  SandpackCodeEditor 
} from "@codesandbox/sandpack-react";

interface KVPreviewProps {
  spec: Record<string, unknown>;
  fileName?: string;
  fileSize?: number;
}

// JSONからHTMLファイルを生成する関数（暫定版）
function generateFilesFromSpec(spec: Record<string, unknown>) {
  // 暫定：シンプルなHTMLを生成
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KV Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
        }
        .hero {
            text-align: center;
            max-width: 600px;
        }
        .hero h1 {
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }
        .hero p {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 2rem;
        }
        .cta {
            background: white;
            color: #667eea;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            transition: transform 0.2s;
        }
        .cta:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="hero">
        <h1>Generated KV Preview</h1>
        <p>This is a sample preview generated from your design spec.</p>
        <a href="#" class="cta">Get Started</a>
    </div>
    
    <script>
        console.log('KV Preview loaded!');
        console.log('Spec data:', ${JSON.stringify(spec, null, 2)});
    </script>
</body>
</html>`;

  return {
    "/index.html": htmlContent
  };
}

export default function KVPreview({ spec, fileName, fileSize }: KVPreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  
  // JSONからファイル生成
  const files = generateFilesFromSpec(spec);
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border border-black overflow-hidden">
      {/* Header with Toggle */}
      <div className="bg-white border-b border-black p-3 lg:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 min-w-0 flex-1">
          <div className="min-w-0">
            <h2 className="text-base lg:text-lg font-semibold text-black">KV Preview</h2>
            {fileName && (
              <p className="text-xs lg:text-sm text-black truncate">
                {fileName} {fileSize && `(${formatFileSize(fileSize)})`}
              </p>
            )}
          </div>
        </div>
        
        {/* Toggle Buttons */}
        <div className="flex border border-black overflow-hidden">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium transition-colors ${
              activeTab === 'preview' 
                ? 'bg-black text-white' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium transition-colors border-l border-black ${
              activeTab === 'code' 
                ? 'bg-black text-white' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Code
          </button>
        </div>
      </div>

      {/* Sandpack Content */}
      <div className="flex-1 overflow-hidden">
        <SandpackProvider 
          template="static" 
          files={files}
          options={{ 
            recompileDelay: 300,
            recompileMode: "delayed"
          }}
          customSetup={{
            entry: "/index.html"
          }}
        >
          <SandpackLayout className="h-full">
            {activeTab === 'preview' ? (
              <SandpackPreview 
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                className="h-full"
              />
            ) : (
              <SandpackCodeEditor 
                showTabs={true}
                showLineNumbers={true}
                className="h-full"
              />
            )}
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}