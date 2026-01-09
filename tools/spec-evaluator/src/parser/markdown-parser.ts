/**
 * Markdown parser using markdown-it
 * Parses markdown content and extracts structural information
 */

import MarkdownIt from 'markdown-it';
import { SectionType } from '../types';

export interface HeadingNode {
  level: number;
  title: string;
  lineNumber: number;
  type: SectionType;
}

export interface ContentBlock {
  startLine: number;
  endLine: number;
  content: string;
}

export class MarkdownParser {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt();
  }

  /**
   * Parse markdown content and return heading structure
   */
  parse(content: string): { headings: HeadingNode[]; lines: string[] } {
    const lines = content.split('\n');
    const headings: HeadingNode[] = [];

    // Parse tokens using markdown-it
    const tokens = this.md.parse(content, {});

    // Track line numbers
    let currentLine = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'heading_open') {
        const level = parseInt(token.tag.substring(1)); // h1 -> 1, h2 -> 2, etc.
        const contentToken = tokens[i + 1];

        if (contentToken && contentToken.type === 'inline') {
          const title = contentToken.content;
          const lineNumber = token.map ? token.map[0] + 1 : currentLine; // Convert to 1-based

          const type = this.identifySectionType(level, title);

          headings.push({
            level,
            title,
            lineNumber,
            type
          });
        }
      }

      // Update current line
      if (token.map) {
        currentLine = token.map[1];
      }
    }

    return { headings, lines };
  }

  /**
   * Identify the section type based on heading level and title
   */
  private identifySectionType(level: number, title: string): SectionType {
    const titleLower = title.toLowerCase().trim();

    if (level === 1) {
      return SectionType.TITLE;
    }

    if (level === 2) {
      if (titleLower === 'purpose') {
        return SectionType.PURPOSE;
      }
      if (titleLower === 'requirements') {
        return SectionType.REQUIREMENTS;
      }
      if (titleLower === 'non-functional requirements' || titleLower.includes('non-functional')) {
        return SectionType.NON_FUNCTIONAL;
      }
    }

    if (level === 3 && titleLower.startsWith('requirement:')) {
      return SectionType.REQUIREMENT;
    }

    if (level === 4 && titleLower.startsWith('scenario:')) {
      return SectionType.SCENARIO;
    }

    return SectionType.UNKNOWN;
  }

  /**
   * Extract content between two line numbers
   */
  extractContent(lines: string[], startLine: number, endLine: number): string {
    // Convert to 0-based indexing
    const start = Math.max(0, startLine - 1);
    const end = Math.min(lines.length, endLine);

    return lines.slice(start, end).join('\n');
  }

  /**
   * Get content for a specific section (between a heading and the next heading of same or lower level)
   */
  getSectionContent(
    lines: string[],
    heading: HeadingNode,
    nextHeadingLine?: number
  ): string {
    const startLine = heading.lineNumber + 1; // Skip the heading itself
    const endLine = nextHeadingLine ? nextHeadingLine - 1 : lines.length;

    return this.extractContent(lines, startLine, endLine).trim();
  }

  /**
   * Extract bullet points from content
   */
  extractBulletPoints(content: string): string[] {
    const lines = content.split('\n');
    const bullets: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        bullets.push(trimmed.substring(2).trim());
      }
    }

    return bullets;
  }

  /**
   * Count words in content
   */
  countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Count lines in content
   */
  countLines(content: string): number {
    return content.split('\n').length;
  }
}
