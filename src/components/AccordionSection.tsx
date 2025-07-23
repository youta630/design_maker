'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarkdownSection } from '@/lib/markdownUtils';

interface AccordionSectionProps {
  section: MarkdownSection;
  isOpen?: boolean;
  onToggle?: (sectionId: string, isOpen: boolean) => void;
  onVisibilityChange?: (sectionId: string, isVisible: boolean) => void;
}

export default function AccordionSection({ 
  section, 
  isOpen: controlledIsOpen, 
  onToggle,
  onVisibilityChange 
}: AccordionSectionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        setContentHeight(contentRef.current.scrollHeight);
      } else {
        setContentHeight(0);
      }
    }
  }, [isOpen, section.content]);

  // Intersection Observer for visibility tracking
  useEffect(() => {
    if (!onVisibilityChange || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            onVisibilityChange(section.id, true);
          }
        });
      },
      { threshold: [0.3], rootMargin: '-50px 0px -50px 0px' }
    );

    observer.observe(sectionRef.current);

    return () => {
      observer.disconnect();
    };
  }, [section.id, onVisibilityChange]);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(newIsOpen);
    }
    
    onToggle?.(section.id, newIsOpen);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(section.originalMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy section content: ', err);
    }
  };

  const getLevelStyles = (level: number) => {
    switch (level) {
      case 1:
        return {
          container: 'border border-black shadow-sm',
          header: 'bg-black text-white text-lg font-bold py-4 px-6',
          icon: 'w-5 h-5',
          badge: 'bg-white text-black text-xs px-2 py-1 font-mono'
        };
      case 2:
        return {
          container: 'border border-gray-300 shadow-sm',
          header: 'bg-gray-100 text-black text-base font-semibold py-3 px-5',
          icon: 'w-4 h-4',
          badge: 'bg-black text-white text-xs px-2 py-1 font-mono'
        };
      case 3:
        return {
          container: 'border border-gray-200',
          header: 'bg-white text-black text-sm font-medium py-3 px-4 border-b border-gray-200',
          icon: 'w-4 h-4',
          badge: 'bg-gray-200 text-black text-xs px-2 py-1 font-mono'
        };
      default:
        return {
          container: 'border border-gray-100',
          header: 'bg-white text-gray-700 text-sm font-normal py-2 px-4 border-b border-gray-100',
          icon: 'w-3 h-3',
          badge: 'bg-gray-100 text-gray-600 text-xs px-2 py-1 font-mono'
        };
    }
  };

  const styles = getLevelStyles(section.level);

  // Get content without the heading line and process tables
  const contentWithoutHeading = section.originalMarkdown
    .split('\n')
    .slice(1) // Remove first line (heading)
    .join('\n')
    .trim();

  // Custom table processing function
  const processContent = (content: string) => {
    // Simple table detection - if content has pipe characters, treat as table
    const lines = content.split('\n');
    let processedContent = '';
    let inTable = false;
    let tableRows: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';
      
      // Check if line contains table structure (starts and ends with |)
      if (line.includes('|') && (line.startsWith('|') || line.endsWith('|'))) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
      } else {
        // End of table or not a table line
        if (inTable) {
          // Process accumulated table rows
          processedContent += processTableRows(tableRows) + '\n\n';
          tableRows = [];
          inTable = false;
        }
        processedContent += line + '\n';
      }
    }

    // Handle table at end of content
    if (inTable && tableRows.length > 0) {
      processedContent += processTableRows(tableRows);
    }

    return processedContent.trim();
  };

  const processTableRows = (rows: string[]): string => {
    if (rows.length === 0) return '';
    
    // Convert pipe-separated rows to HTML table
    let tableHtml = '<table class="min-w-full border-collapse border border-gray-300">\n';
    
    rows.forEach((row, index) => {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
      
      if (cells.length === 0) return;
      
      // Skip separator rows (contains only dashes and spaces)
      if (cells.every(cell => /^[-\s]*$/.test(cell))) return;
      
      const isHeader = index === 0;
      const tag = isHeader ? 'th' : 'td';
      const className = isHeader 
        ? 'px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-100 border-b border-r border-gray-300 last:border-r-0'
        : 'px-4 py-3 text-sm text-gray-700 border-b border-r border-gray-200 last:border-r-0 align-top';
      
      tableHtml += '  <tr class="hover:bg-gray-50 transition-colors">\n';
      cells.forEach(cell => {
        tableHtml += `    <${tag} class="${className}">${cell}</${tag}>\n`;
      });
      tableHtml += '  </tr>\n';
    });
    
    tableHtml += '</table>';
    return tableHtml;
  };

  const processedContent = processContent(contentWithoutHeading);

  return (
    <div 
      ref={sectionRef}
      className={`rounded-lg overflow-hidden mb-4 transition-all duration-200 ${styles.container}`}
      id={section.id}
    >
      {/* Header */}
      <div
        className={`
          w-full flex items-center justify-between transition-all duration-200
          ${styles.header}
          ${isOpen ? 'shadow-sm' : section.level === 1 ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}
        `}
      >
        <button
          onClick={handleToggle}
          className="flex-1 flex items-center space-x-3 text-left py-0"
          aria-expanded={isOpen}
          aria-controls={`section-${section.id}`}
        >
          <span className="flex-1">
            {section.title}
          </span>
          <span className={`rounded-full font-mono ${styles.badge}`}>
            H{section.level}
          </span>
        </button>
        
        <div className="flex items-center space-x-2">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`
              p-1.5 rounded transition-all duration-200 text-xs font-medium
              ${section.level === 1 
                ? copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
                : copied 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }
            `}
            title={copied ? 'Copied!' : 'Copy section'}
          >
            {copied ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          
          <button
            onClick={handleToggle}
            className="p-1"
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${section.title}`}
          >
            <svg 
              className={`${styles.icon} transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        id={`section-${section.id}`}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height: contentHeight }}
        aria-hidden={!isOpen}
      >
        <div className="p-6 bg-white border-t border-gray-100">
          {contentWithoutHeading ? (
            <div className="prose prose-sm max-w-none">
              {/* Check if content contains HTML tables (processed) */}
              {processedContent.includes('<table') ? (
                <div dangerouslySetInnerHTML={{ __html: processedContent }} />
              ) : (
                <ReactMarkdown
                  key={section.id}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold text-gray-800 mb-3 mt-6">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-medium text-gray-700 mb-2 mt-4">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-sm font-medium text-gray-700 mb-2 mt-3">
                        {children}
                      </h4>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 mb-4 text-gray-700 pl-4">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 mb-4 text-gray-700 pl-4">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="ml-2">{children}</li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 mb-4 italic text-blue-900 rounded-r">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">
                          {children}
                        </code>
                      ) : (
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                          <code className="text-sm font-mono">{children}</code>
                        </pre>
                      );
                    },
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-gray-700">{children}</em>
                    ),
                    p: ({ children }) => (
                      <p className="mb-3 text-gray-700 leading-relaxed">{children}</p>
                    ),
                  }}
                >
                  {processedContent}
                </ReactMarkdown>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No content in this section</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}