/**
 * Non-Functional Requirements checkers
 */

import { ParsedSpec, RubricCriterion, CriterionResult, SectionType } from '../../types';
import { ResultBuilder } from '../result-builder';

export class NFRChecker {
  /**
   * Check if Non-Functional Requirements section exists
   */
  checkNonFunctionalSection(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const nfrSection = this.findSection(spec.sections, SectionType.NON_FUNCTIONAL);

    if (!nfrSection) {
      return builder
        .missing(
          'No Non-Functional Requirements section found',
          'Add an H2 section titled "## Non-Functional Requirements"'
        )
        .build();
    }

    return builder
      .present(
        `Non-Functional Requirements section found at line ${nfrSection.lineNumber}`,
        nfrSection.lineNumber
      )
      .build();
  }

  /**
   * Check for performance requirements
   */
  checkPerformanceRequirements(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const nfrSection = this.findSection(spec.sections, SectionType.NON_FUNCTIONAL);

    if (!nfrSection) {
      return builder.missing('No NFR section to evaluate').build();
    }

    const keywords = [
      /\bperformance\b/i,
      /\bresponse\s*time\b/i,
      /\blatency\b/i,
      /\bthroughput\b/i,
      /\bspeed\b/i,
      /\b\d+\s*(ms|milliseconds?|seconds?|s)\b/i
    ];

    const found = this.searchForKeywords(nfrSection, keywords);

    if (found.length === 0) {
      return builder
        .missing(
          'No performance requirements found',
          'Add performance targets (e.g., response times, throughput)'
        )
        .build();
    }

    return builder
      .present(
        `Performance requirements found (${found.length} mentions)`,
        found[0].lineNumber
      )
      .addLineReferences(found.map(f => f.lineNumber))
      .build();
  }

  /**
   * Check for scalability requirements
   */
  checkScalabilityRequirements(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const nfrSection = this.findSection(spec.sections, SectionType.NON_FUNCTIONAL);

    if (!nfrSection) {
      return builder.missing('No NFR section to evaluate').build();
    }

    const keywords = [
      /\bscalability\b/i,
      /\bscale\b/i,
      /\b\d+[\s,]*(users?|members?|requests?|concurrent)\b/i,
      /\bcapacity\b/i,
      /\bvolume\b/i,
      /\bgrowth\b/i
    ];

    const found = this.searchForKeywords(nfrSection, keywords);

    if (found.length === 0) {
      return builder
        .missing(
          'No scalability requirements found',
          'Add scalability targets (e.g., max users, concurrent requests)'
        )
        .build();
    }

    return builder
      .present(
        `Scalability requirements found (${found.length} mentions)`,
        found[0].lineNumber
      )
      .addLineReferences(found.map(f => f.lineNumber))
      .build();
  }

  /**
   * Check for availability requirements
   */
  checkAvailabilityRequirements(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const nfrSection = this.findSection(spec.sections, SectionType.NON_FUNCTIONAL);

    if (!nfrSection) {
      return builder.missing('No NFR section to evaluate').build();
    }

    const keywords = [
      /\bavailability\b/i,
      /\buptime\b/i,
      /\b99(\.\d+)?%\b/,
      /\breliability\b/i,
      /\bservice\s*level\b/i,
      /\bSLA\b/
    ];

    const found = this.searchForKeywords(nfrSection, keywords);

    if (found.length === 0) {
      return builder
        .missing(
          'No availability requirements found',
          'Consider adding uptime/availability targets (e.g., 99.9% uptime)'
        )
        .build();
    }

    return builder
      .present(
        `Availability requirements found (${found.length} mentions)`,
        found[0].lineNumber
      )
      .addLineReferences(found.map(f => f.lineNumber))
      .build();
  }

  /**
   * Check for security requirements
   */
  checkSecurityRequirements(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const nfrSection = this.findSection(spec.sections, SectionType.NON_FUNCTIONAL);

    if (!nfrSection) {
      return builder.missing('No NFR section to evaluate').build();
    }

    const keywords = [
      /\bsecurity\b/i,
      /\bauthentication\b/i,
      /\bauthorization\b/i,
      /\bencryption\b/i,
      /\bprivacy\b/i,
      /\bGDPR\b/i,
      /\baccess\s*control\b/i
    ];

    const found = this.searchForKeywords(nfrSection, keywords);

    if (found.length === 0) {
      return builder
        .missing(
          'No security requirements found',
          'Consider adding security considerations (authentication, authorization, data protection)'
        )
        .build();
    }

    return builder
      .present(
        `Security requirements found (${found.length} mentions)`,
        found[0].lineNumber
      )
      .addLineReferences(found.map(f => f.lineNumber))
      .build();
  }

  /**
   * Check for data integrity requirements
   */
  checkDataIntegrity(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const nfrSection = this.findSection(spec.sections, SectionType.NON_FUNCTIONAL);

    if (!nfrSection) {
      return builder.missing('No NFR section to evaluate').build();
    }

    const keywords = [
      /\bdata\s*integrity\b/i,
      /\btransaction(al)?\b/i,
      /\bconsistency\b/i,
      /\bACID\b/,
      /\bintegrity\b/i,
      /\breferential\s*integrity\b/i
    ];

    const found = this.searchForKeywords(nfrSection, keywords);

    if (found.length === 0) {
      return builder
        .missing(
          'No data integrity requirements found',
          'Consider adding requirements for data consistency and integrity'
        )
        .build();
    }

    return builder
      .present(
        `Data integrity requirements found (${found.length} mentions)`,
        found[0].lineNumber
      )
      .addLineReferences(found.map(f => f.lineNumber))
      .build();
  }

  /**
   * Check if NFRs are quantified with measurable targets
   */
  checkQuantifiedNFRs(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const nfrSection = this.findSection(spec.sections, SectionType.NON_FUNCTIONAL);

    if (!nfrSection) {
      return builder.missing('No NFR section to evaluate').build();
    }

    // Look for numbers and percentages
    const quantifiers = [
      /\b\d+\s*(ms|milliseconds?|seconds?|s|minutes?|hours?)\b/i,
      /\b\d+(\.\d+)?%\b/,
      /\b\d+[\s,]*(users?|members?|requests?|concurrent|transactions?)\b/i,
      /\bwithin\s+\d+/i,
      /\bless\s+than\s+\d+/i,
      /\bgreater\s+than\s+\d+/i,
      /\bup\s+to\s+\d+/i
    ];

    const content = this.getSectionContent(nfrSection);
    let quantifiedCount = 0;

    for (const pattern of quantifiers) {
      const matches = content.match(new RegExp(pattern, 'g'));
      if (matches) {
        quantifiedCount += matches.length;
      }
    }

    if (quantifiedCount === 0) {
      return builder
        .missing(
          'NFRs lack quantifiable metrics',
          'Add specific numbers, percentages, or measurable criteria to NFRs'
        )
        .build();
    }

    if (quantifiedCount >= 3) {
      return builder
        .present(
          `NFRs include ${quantifiedCount} quantifiable metrics`,
          nfrSection.lineNumber
        )
        .build();
    }

    return builder
      .partial(
        `NFRs include ${quantifiedCount} quantifiable metrics`,
        'Add more specific, measurable targets to NFRs',
        [nfrSection.lineNumber]
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

  /**
   * Get all content from a section and its children
   */
  private getSectionContent(section: any): string {
    let content = section.content || '';

    if (section.children) {
      for (const child of section.children) {
        content += '\n' + this.getSectionContent(child);
      }
    }

    return content;
  }

  /**
   * Search for keywords in section content
   */
  private searchForKeywords(
    section: any,
    keywords: RegExp[]
  ): Array<{ lineNumber: number; match: string }> {
    const results: Array<{ lineNumber: number; match: string }> = [];
    const content = this.getSectionContent(section);

    for (const keyword of keywords) {
      const match = content.match(keyword);
      if (match) {
        results.push({
          lineNumber: section.lineNumber,
          match: match[0]
        });
      }
    }

    return results;
  }
}
