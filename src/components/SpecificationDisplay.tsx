'use client';

import { useState, useEffect } from 'react';
import { parseMarkdownDocument } from '@/lib/markdownUtils';
import TableOfContents from './TableOfContents';
import AccordionSection from './AccordionSection';

interface SpecificationDisplayProps {
  specification: string;
  fileName?: string;
  fileSize?: number;
}

export default function SpecificationDisplay({ 
  specification, 
  fileName, 
  fileSize 
}: SpecificationDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Parse markdown document
  console.log('=== SPECIFICATION DEBUG ===');
  console.log('Specification type:', typeof specification);
  console.log('Specification length:', specification?.length || 'undefined');
  console.log('First 500 chars:', specification?.substring(0, 500) || 'undefined');
  
  const { toc, sections } = parseMarkdownDocument(specification);
  
  console.log('=== PARSE RESULT DEBUG ===');
  console.log('TOC length:', toc?.length || 'undefined');
  console.log('Sections length:', sections?.length || 'undefined');
  console.log('TOC:', toc);
  console.log('Sections:', sections);
  console.log('==============================');

  // Initialize with first section open
  useEffect(() => {
    if (sections.length > 0 && openSections.size === 0 && sections[0]) {
      setOpenSections(new Set([sections[0].id]));
      setActiveSection(sections[0].id);
    }
  }, [sections.length, openSections.size]); // Only depend on length, not the sections array itself

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(specification);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleTOCClick = (sectionId: string) => {
    // Toggle section open state
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(sectionId)) {
      newOpenSections.delete(sectionId);
    } else {
      newOpenSections.add(sectionId);
    }
    setOpenSections(newOpenSections);
    setActiveSection(sectionId);

    // Scroll to section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSectionToggle = (sectionId: string, isOpen: boolean) => {
    const newOpenSections = new Set(openSections);
    if (isOpen) {
      newOpenSections.add(sectionId);
    } else {
      newOpenSections.delete(sectionId);
    }
    setOpenSections(newOpenSections);
  };

  const handleVisibilityChange = (sectionId: string, isVisible: boolean) => {
    if (isVisible) {
      setActiveSection(sectionId);
    }
  };

  const handleExpandAll = () => {
    setOpenSections(new Set(sections.map(s => s.id)));
  };

  const handleCollapseAll = () => {
    setOpenSections(new Set());
  };

  // 一時的にraw textを表示する（デバッグ用）
  if (sections.length === 0 && specification && specification.length > 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white border border-gray-300 rounded-lg p-8">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Raw Specification (Debug Mode)</h3>
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                copied
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } border`}
            >
              {copied ? '✓ Copied!' : 'Copy All'}
            </button>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">
              {specification}
            </pre>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Length: {specification.length} characters | Sections parsed: {sections.length}
          </div>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white border border-gray-300 rounded-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Available</h3>
            <p className="text-gray-600">The specification appears to be empty or couldn&apos;t be parsed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Sidebar - Table of Contents */}
      <div className={`${isSidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 border-r border-gray-200 bg-gray-50`}>
        <TableOfContents
          toc={toc}
          activeSection={activeSection}
          onSectionClick={handleTOCClick}
          className="h-full"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              aria-label={`${isSidebarCollapsed ? 'Show' : 'Hide'} table of contents`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">UI Specification</h2>
                {fileName && (
                  <p className="text-sm text-gray-600">
                    {fileName} {fileSize && `(${formatFileSize(fileSize)})`}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExpandAll}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              Collapse All
            </button>
            <div className="w-px h-6 bg-gray-300" />
            <button
              onClick={handleCopy}
              className={`
                px-4 py-2 rounded text-sm font-medium transition-all duration-200 flex items-center space-x-2
                ${copied 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-900 text-white hover:bg-gray-800'
                }
              `}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy All</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Accordion Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto space-y-0">
            {sections.map((section) => (
              <AccordionSection
                key={section.id}
                section={section}
                isOpen={openSections.has(section.id)}
                onToggle={handleSectionToggle}
                onVisibilityChange={handleVisibilityChange}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-end">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <span>Generated with Gemini 2.5 Flash</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}