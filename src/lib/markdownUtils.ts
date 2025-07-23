// Markdown parsing utilities for TOC generation and section extraction

export interface TOCItem {
  id: string;
  title: string;
  level: number;
  children?: TOCItem[];
}

export interface MarkdownSection {
  id: string;
  title: string;
  level: number;
  content: string;
  originalMarkdown: string;
}

/**
 * Generate a URL-safe ID from heading text
 */
export function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract headings from markdown text
 */
export function extractHeadings(markdown: string): Array<{ level: number; title: string; id: string }> {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; title: string; id: string }> = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    if (match[1] && match[2]) {
      const level = match[1].length;
      const title = match[2].trim();
      const id = generateId(title);
      
      headings.push({ level, title, id });
    }
  }

  return headings;
}

/**
 * Build hierarchical TOC structure from flat headings array
 */
export function buildTOC(headings: Array<{ level: number; title: string; id: string }>): TOCItem[] {
  const toc: TOCItem[] = [];
  const stack: TOCItem[] = [];

  for (const heading of headings) {
    const tocItem: TOCItem = {
      id: heading.id,
      title: heading.title,
      level: heading.level,
      children: []
    };

    // Find the correct parent level
    while (stack.length > 0) {
      const lastItem = stack[stack.length - 1];
      if (lastItem && lastItem.level >= heading.level) {
        stack.pop();
      } else {
        break;
      }
    }

    if (stack.length === 0) {
      // Top level item
      toc.push(tocItem);
    } else {
      // Child item
      const parent = stack[stack.length - 1];
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(tocItem);
      }
    }

    stack.push(tocItem);
  }

  return toc;
}

/**
 * Split markdown into sections based on headings
 * Only split on H1 and H3+ (H2 is treated as subtitle, not section)
 */
export function splitIntoSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split('\n');
  const sections: MarkdownSection[] = [];
  
  let currentSection: MarkdownSection | null = null;
  let currentContent: string[] = [];
  let preHeaderContent: string[] = []; // Store content before first heading

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      
      // Only create new sections for H1 and H3+ (skip H2 as it's a subtitle)
      if (level === 1 || level >= 3) {
        // Save previous section if exists
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          currentSection.originalMarkdown = currentContent.join('\n');
          sections.push(currentSection);
        }

        // Start new section
        const title = headingMatch[2].trim();
        const id = generateId(title);

        currentSection = {
          id,
          title,
          level,
          content: '',
          originalMarkdown: ''
        };
        
        // Include pre-header content in the first section
        if (sections.length === 0 && preHeaderContent.length > 0) {
          currentContent = [...preHeaderContent, line];
          preHeaderContent = []; // Clear after using
        } else {
          currentContent = [line];
        }
      } else {
        // H2 - add to current section as content
        if (currentSection) {
          currentContent.push(line);
        } else {
          // H2 at the beginning - create a section for it
          const title = headingMatch[2].trim();
          const id = generateId(title);
          currentSection = {
            id,
            title,
            level,
            content: '',
            originalMarkdown: ''
          };
          
          // Include pre-header content
          if (preHeaderContent.length > 0) {
            currentContent = [...preHeaderContent, line];
            preHeaderContent = [];
          } else {
            currentContent = [line];
          }
        }
      }
    } else {
      // Add to current section content or store as pre-header content
      if (currentSection) {
        currentContent.push(line);
      } else {
        // Content before any heading - store for later
        if (line.trim()) {
          preHeaderContent.push(line);
        }
      }
    }
  }

  // Save the last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    currentSection.originalMarkdown = currentContent.join('\n');
    sections.push(currentSection);
  }

  // Filter out empty sections
  return sections.filter(section => 
    section.content.trim() !== '' || 
    section.originalMarkdown.trim() !== section.title
  );
}

/**
 * Add IDs to markdown headings for anchor linking
 */
export function addHeadingIds(markdown: string): string {
  return markdown.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
    if (hashes && title) {
      const id = generateId(title.trim());
      return `${match} {#${id}}`;
    }
    return match;
  });
}

/**
 * Parse markdown and return both TOC and sections
 */
export function parseMarkdownDocument(markdown: string): {
  toc: TOCItem[];
  sections: MarkdownSection[];
  headings: Array<{ level: number; title: string; id: string }>;
} {
  const headings = extractHeadings(markdown);
  const toc = buildTOC(headings);
  const sections = splitIntoSections(markdown);

  return {
    toc,
    sections,
    headings
  };
}

/**
 * Get section content without the heading
 */
export function getSectionContentOnly(section: MarkdownSection): string {
  const lines = section.originalMarkdown.split('\n');
  // Remove first line if it's a heading
  const firstLine = lines[0];
  if (firstLine && firstLine.match(/^#{1,6}\s+/)) {
    lines.shift();
  }
  return lines.join('\n').trim();
}

/**
 * Find section by ID
 */
export function findSectionById(sections: MarkdownSection[], id: string): MarkdownSection | undefined {
  return sections.find(section => section.id === id);
}

/**
 * Get flattened TOC for sidebar navigation
 */
export function flattenTOC(toc: TOCItem[]): TOCItem[] {
  const flattened: TOCItem[] = [];
  
  function flatten(items: TOCItem[]) {
    for (const item of items) {
      flattened.push({
        ...item,
        level: item.level
      });
      
      if (item.children && item.children.length > 0) {
        flatten(item.children);
      }
    }
  }
  
  flatten(toc);
  return flattened;
}