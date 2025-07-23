'use client';

import { useState } from 'react';
import { TOCItem } from '@/lib/markdownUtils';

interface TableOfContentsProps {
  toc: TOCItem[];
  activeSection?: string;
  onSectionClick: (sectionId: string) => void;
  className?: string;
}

interface TOCItemComponentProps {
  item: TOCItem;
  activeSection?: string;
  onSectionClick: (sectionId: string) => void;
  level?: number;
}

function TOCItemComponent({ item, activeSection, onSectionClick, level = 0 }: TOCItemComponentProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = activeSection === item.id;

  const handleClick = () => {
    onSectionClick(item.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const indentClass = {
    1: 'pl-0',
    2: 'pl-3',
    3: 'pl-6',
    4: 'pl-9',
    5: 'pl-12',
    6: 'pl-15'
  }[Math.min(item.level, 6)] || 'pl-0';

  const textSizeClass = {
    1: 'text-sm font-semibold',
    2: 'text-sm font-medium',
    3: 'text-sm font-normal',
    4: 'text-xs font-normal',
    5: 'text-xs font-normal',
    6: 'text-xs font-normal'
  }[Math.min(item.level, 6)] || 'text-sm';

  return (
    <div>
      <div 
        className={`
          flex items-center group cursor-pointer py-1.5 px-2 transition-all duration-200
          ${indentClass}
          ${isActive 
            ? 'bg-black text-white border-l-2 border-black font-medium' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-black'
          }
        `}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            onClick={handleToggle}
            className={`mr-2 p-0.5 rounded transition-colors ${
              isActive ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.title}`}
          >
            <svg 
              className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        
        <span className={`${textSizeClass} flex-1 leading-tight`}>
          {item.title}
        </span>
        
        {item.level === 1 && (
          <div className={`w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
            isActive ? 'bg-white' : 'bg-black'
          }`} />
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map((child) => (
            <TOCItemComponent
              key={child.id}
              item={child}
              activeSection={activeSection}
              onSectionClick={onSectionClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TableOfContents({ 
  toc, 
  activeSection, 
  onSectionClick, 
  className = '' 
}: TableOfContentsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <nav 
      className={`bg-white border-r border-gray-200 ${className}`}
      aria-label="Table of contents"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Contents
        </h2>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="lg:hidden p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} table of contents`}
        >
          <svg 
            className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* TOC Content */}
      <div className={`px-2 py-4 overflow-y-auto ${isCollapsed ? 'hidden lg:block' : 'block'}`}>
        {toc.length > 0 ? (
          <div className="space-y-1">
            {toc.map((item) => (
              <TOCItemComponent
                key={item.id}
                item={item}
                activeSection={activeSection}
                onSectionClick={onSectionClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              No headings found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Upload a document to see the table of contents
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {toc.length > 0 && (
        <div className="sticky bottom-0 bg-black border-t border-gray-200 px-4 py-2">
          <p className="text-xs text-white font-mono">
            {toc.length} section{toc.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </nav>
  );
}