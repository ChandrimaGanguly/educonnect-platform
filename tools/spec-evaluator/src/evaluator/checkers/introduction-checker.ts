/**
 * Introduction & Context checkers
 */

import { ParsedSpec, RubricCriterion, CriterionResult, SectionType } from '../../types';
import { ResultBuilder } from '../result-builder';

export class IntroductionChecker {
  /**
   * Check if purpose section exists
   */
  checkPurposeSection(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    // Find purpose section
    const purposeSection = this.findSection(spec.sections, SectionType.PURPOSE);

    if (!purposeSection) {
      return builder
        .missing(
          'No Purpose section found',
          'Add an H2 section titled "## Purpose" that describes what this specification defines'
        )
        .build();
    }

    return builder
      .present(
        `Purpose section found at line ${purposeSection.lineNumber}`,
        purposeSection.lineNumber
      )
      .build();
  }

  /**
   * Check if purpose is clear and concise
   */
  checkPurposeClarity(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const purposeSection = this.findSection(spec.sections, SectionType.PURPOSE);

    if (!purposeSection) {
      return builder
        .missing('No Purpose section to evaluate')
        .build();
    }

    const content = purposeSection.content.trim();

    // Check if purpose is too short (less than 20 characters)
    if (content.length < 20) {
      return builder
        .partial(
          'Purpose statement is too brief',
          'Expand the purpose to clearly explain what this specification defines and why',
          [purposeSection.lineNumber]
        )
        .build();
    }

    // Check if purpose is too long (more than 500 characters)
    if (content.length > 500) {
      return builder
        .partial(
          'Purpose statement is very long',
          'Consider condensing the purpose to 1-3 concise sentences',
          [purposeSection.lineNumber]
        )
        .build();
    }

    // Check if it's a single long sentence (might be unclear)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length === 1 && content.length > 200) {
      return builder
        .partial(
          'Purpose is a single long sentence',
          'Consider breaking into multiple sentences for clarity',
          [purposeSection.lineNumber]
        )
        .build();
    }

    return builder
      .present(
        `Purpose is clear and concise (${content.length} characters, ${sentences.length} sentences)`,
        purposeSection.lineNumber
      )
      .build();
  }

  /**
   * Check if scope is defined
   */
  checkScopeInContent(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    // Look for scope-related keywords in purpose or other intro sections
    const scopeKeywords = [
      /\bscope\b/i,
      /\bincludes?\b/i,
      /\bexcludes?\b/i,
      /\bcovered?\b/i,
      /\bwithin\b/i,
      /\bboundary\b/i,
      /\blimits?\b/i
    ];

    const purposeSection = this.findSection(spec.sections, SectionType.PURPOSE);

    if (purposeSection) {
      for (const keyword of scopeKeywords) {
        if (keyword.test(purposeSection.content)) {
          return builder
            .present(
              'Scope is addressed in Purpose section',
              purposeSection.lineNumber
            )
            .build();
        }
      }
    }

    // Check if there's an explicit scope section (even if not recognized as such)
    for (const section of spec.sections) {
      if (section.title.toLowerCase().includes('scope')) {
        return builder
          .present(
            `Scope section found at line ${section.lineNumber}`,
            section.lineNumber
          )
          .build();
      }
    }

    return builder
      .missing(
        'No explicit scope definition found',
        'Consider adding scope boundaries to the Purpose section or creating a separate Scope section'
      )
      .build();
  }

  /**
   * Check if specification has a descriptive title
   */
  checkTitle(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const titleSection = this.findSection(spec.sections, SectionType.TITLE);

    if (!titleSection) {
      return builder
        .missing(
          'No H1 title found',
          'Add an H1 heading at the beginning of the document'
        )
        .build();
    }

    const title = titleSection.title.trim();

    // Check if title is too short
    if (title.length < 5) {
      return builder
        .partial(
          `Title is very short: "${title}"`,
          'Provide a more descriptive title that clearly identifies the feature',
          [titleSection.lineNumber]
        )
        .build();
    }

    // Check if it's just "Specification" or similar generic name
    const genericTerms = /^(specification|spec|requirements?|document)$/i;
    if (genericTerms.test(title)) {
      return builder
        .partial(
          `Title is generic: "${title}"`,
          'Use a more specific title that identifies the feature being specified',
          [titleSection.lineNumber]
        )
        .build();
    }

    return builder
      .present(
        `Descriptive title found: "${title}"`,
        titleSection.lineNumber
      )
      .build();
  }

  /**
   * Helper to find a section by type
   */
  private findSection(sections: any[], type: SectionType): any | undefined {
    for (const section of sections) {
      if (section.type === type) {
        return section;
      }
      if (section.children && section.children.length > 0) {
        const found = this.findSection(section.children, type);
        if (found) return found;
      }
    }
    return undefined;
  }
}
