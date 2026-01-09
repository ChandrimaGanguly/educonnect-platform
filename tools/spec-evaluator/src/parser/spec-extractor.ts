/**
 * Spec extractor - builds hierarchical section structure from parsed markdown
 */

import { MarkdownParser, HeadingNode } from './markdown-parser';
import { ParsedSpec, SpecSection, SpecMetadata, SectionType } from '../types';

export class SpecExtractor {
  private parser: MarkdownParser;

  constructor() {
    this.parser = new MarkdownParser();
  }

  /**
   * Extract a complete spec from markdown file content
   */
  extract(filePath: string, content: string): ParsedSpec {
    const { headings, lines } = this.parser.parse(content);

    // Extract metadata
    const metadata = this.extractMetadata(content, headings, lines);

    // Build section hierarchy
    const sections = this.buildSectionHierarchy(headings, lines);

    // Extract requirements (will be done by requirement-parser, but initialize empty)
    const requirements = [];

    return {
      filePath,
      metadata,
      sections,
      requirements,
      rawContent: content
    };
  }

  /**
   * Extract metadata from the spec
   */
  private extractMetadata(
    content: string,
    headings: HeadingNode[],
    lines: string[]
  ): SpecMetadata {
    // Find title (first H1)
    const titleHeading = headings.find(h => h.level === 1);
    const title = titleHeading ? titleHeading.title : 'Untitled Specification';

    // Find purpose section
    const purposeHeading = headings.find(h => h.type === SectionType.PURPOSE);
    let purpose: string | undefined;

    if (purposeHeading) {
      const nextHeading = this.findNextHeading(headings, purposeHeading);
      purpose = this.parser.getSectionContent(lines, purposeHeading, nextHeading?.lineNumber);
    }

    // Count words and lines
    const wordCount = this.parser.countWords(content);
    const lineCount = this.parser.countLines(content);

    return {
      title,
      purpose,
      wordCount,
      lineCount
    };
  }

  /**
   * Build hierarchical section structure
   */
  private buildSectionHierarchy(
    headings: HeadingNode[],
    lines: string[]
  ): SpecSection[] {
    const rootSections: SpecSection[] = [];
    const stack: SpecSection[] = [];

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];

      // Get content for this section
      const content = this.parser.getSectionContent(
        lines,
        heading,
        nextHeading?.lineNumber
      );

      const section: SpecSection = {
        type: heading.type,
        level: heading.level,
        title: heading.title,
        content,
        lineNumber: heading.lineNumber,
        children: []
      };

      // Find parent by popping stack until we find a section with lower level
      while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // This is a root level section
        rootSections.push(section);
      } else {
        // Add as child to the top of stack
        const parent = stack[stack.length - 1];
        section.parent = parent;
        parent.children.push(section);
      }

      // Push this section onto the stack
      stack.push(section);
    }

    return rootSections;
  }

  /**
   * Find the next heading at the same or lower level
   */
  private findNextHeading(
    headings: HeadingNode[],
    current: HeadingNode
  ): HeadingNode | undefined {
    const currentIndex = headings.indexOf(current);

    for (let i = currentIndex + 1; i < headings.length; i++) {
      if (headings[i].level <= current.level) {
        return headings[i];
      }
    }

    return undefined;
  }

  /**
   * Find a section by type in the section tree
   */
  findSectionByType(sections: SpecSection[], type: SectionType): SpecSection | undefined {
    for (const section of sections) {
      if (section.type === type) {
        return section;
      }

      const found = this.findSectionByType(section.children, type);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  /**
   * Find all sections of a specific type
   */
  findAllSectionsByType(sections: SpecSection[], type: SectionType): SpecSection[] {
    const results: SpecSection[] = [];

    for (const section of sections) {
      if (section.type === type) {
        results.push(section);
      }

      results.push(...this.findAllSectionsByType(section.children, type));
    }

    return results;
  }

  /**
   * Get all leaf sections (sections with no children)
   */
  getLeafSections(sections: SpecSection[]): SpecSection[] {
    const results: SpecSection[] = [];

    for (const section of sections) {
      if (section.children.length === 0) {
        results.push(section);
      } else {
        results.push(...this.getLeafSections(section.children));
      }
    }

    return results;
  }
}
