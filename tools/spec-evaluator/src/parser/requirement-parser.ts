/**
 * Requirement parser - extracts requirements and scenarios from spec sections
 */

import { MarkdownParser } from './markdown-parser';
import { Requirement, Scenario, SpecSection, SectionType, RFCKeyword } from '../types';

export class RequirementParser {
  private parser: MarkdownParser;

  constructor() {
    this.parser = new MarkdownParser();
  }

  /**
   * Extract all requirements from a spec section tree
   */
  extractRequirements(sections: SpecSection[]): Requirement[] {
    const requirements: Requirement[] = [];

    for (const section of sections) {
      if (section.type === SectionType.REQUIREMENT) {
        const requirement = this.parseRequirement(section);
        requirements.push(requirement);
      }

      // Recursively process children
      requirements.push(...this.extractRequirements(section.children));
    }

    return requirements;
  }

  /**
   * Parse a single requirement section
   */
  private parseRequirement(section: SpecSection): Requirement {
    // Generate ID from heading path
    const id = this.generateRequirementId(section);

    // Extract title (remove "Requirement:" prefix if present)
    const title = section.title.replace(/^Requirement:\s*/i, '').trim();

    // Description is the first paragraph of content (before any child sections)
    const description = this.extractDescription(section.content);

    // Extract RFC keywords
    const keywords = this.extractRFCKeywords(section.content);

    // Extract scenarios from child sections
    const scenarios = this.extractScenarios(section.children);

    return {
      id,
      title,
      description,
      keywords,
      scenarios,
      lineNumber: section.lineNumber,
      section
    };
  }

  /**
   * Generate a unique ID for a requirement from its heading path
   */
  private generateRequirementId(section: SpecSection): string {
    const parts: string[] = [];
    let current: SpecSection | undefined = section;

    while (current) {
      if (current.type === SectionType.REQUIREMENT || current.type === SectionType.REQUIREMENTS) {
        const slug = this.titleToSlug(current.title);
        if (slug) {
          parts.unshift(slug);
        }
      }
      current = current.parent;
    }

    return parts.join('.') || 'unknown-requirement';
  }

  /**
   * Convert title to URL-safe slug
   */
  private titleToSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/^requirement:\s*/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Extract description (first paragraph before scenarios)
   */
  private extractDescription(content: string): string {
    const lines = content.split('\n');
    const descLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Stop at first empty line or heading
      if (!trimmed || trimmed.startsWith('#')) {
        break;
      }

      descLines.push(trimmed);
    }

    return descLines.join(' ').trim();
  }

  /**
   * Extract RFC 2119 keywords from content
   */
  extractRFCKeywords(content: string): RFCKeyword[] {
    const keywords: RFCKeyword[] = [];
    const pattern = /\b(SHALL|MUST|SHOULD|MAY)\b/g;
    const matches = content.match(pattern);

    if (matches) {
      const uniqueKeywords = Array.from(new Set(matches));
      for (const match of uniqueKeywords) {
        keywords.push(match as RFCKeyword);
      }
    }

    return keywords;
  }

  /**
   * Extract scenarios from child sections
   */
  private extractScenarios(childSections: SpecSection[]): Scenario[] {
    const scenarios: Scenario[] = [];

    for (const section of childSections) {
      if (section.type === SectionType.SCENARIO) {
        const scenario = this.parseScenario(section);
        scenarios.push(scenario);
      }
    }

    return scenarios;
  }

  /**
   * Parse a scenario section into GIVEN-WHEN-THEN structure
   */
  parseScenario(section: SpecSection): Scenario {
    // Extract title (remove "Scenario:" prefix if present)
    const title = section.title.replace(/^Scenario:\s*/i, '').trim();

    // Parse bullet points
    const bullets = this.parser.extractBulletPoints(section.content);

    // Classify bullets into GIVEN/WHEN/THEN
    const given: string[] = [];
    const when: string[] = [];
    const then: string[] = [];

    let currentSection: 'given' | 'when' | 'then' | null = null;

    for (const bullet of bullets) {
      const bulletUpper = bullet.toUpperCase();

      if (bulletUpper.startsWith('GIVEN ')) {
        currentSection = 'given';
        given.push(bullet.replace(/^GIVEN\s+/i, '').trim());
      } else if (bulletUpper.startsWith('WHEN ')) {
        currentSection = 'when';
        when.push(bullet.replace(/^WHEN\s+/i, '').trim());
      } else if (bulletUpper.startsWith('THEN ')) {
        currentSection = 'then';
        then.push(bullet.replace(/^THEN\s+/i, '').trim());
      } else if (bulletUpper.startsWith('AND ')) {
        const content = bullet.replace(/^AND\s+/i, '').trim();
        // Add to current section
        if (currentSection === 'given') {
          given.push(content);
        } else if (currentSection === 'when') {
          when.push(content);
        } else if (currentSection === 'then') {
          then.push(content);
        }
      } else {
        // If no prefix, assume it continues the current section
        if (currentSection === 'given') {
          given.push(bullet);
        } else if (currentSection === 'when') {
          when.push(bullet);
        } else if (currentSection === 'then') {
          then.push(bullet);
        }
      }
    }

    // Check if scenario is complete
    const isComplete = given.length > 0 && when.length > 0 && then.length > 0;

    return {
      title,
      given,
      when,
      then,
      lineNumber: section.lineNumber,
      isComplete
    };
  }

  /**
   * Check if a requirement has RFC keywords
   */
  hasRFCKeywords(requirement: Requirement): boolean {
    return requirement.keywords.length > 0;
  }

  /**
   * Check if a requirement has at least one scenario
   */
  hasScenarios(requirement: Requirement): boolean {
    return requirement.scenarios.length > 0;
  }

  /**
   * Check if a requirement has at least one complete scenario
   */
  hasCompleteScenarios(requirement: Requirement): boolean {
    return requirement.scenarios.some(s => s.isComplete);
  }
}
