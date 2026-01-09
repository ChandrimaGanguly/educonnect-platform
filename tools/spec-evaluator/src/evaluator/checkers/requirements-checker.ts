/**
 * Functional Requirements checkers
 */

import { ParsedSpec, RubricCriterion, CriterionResult, SectionType, Requirement } from '../../types';
import { ResultBuilder } from '../result-builder';
import { RequirementParser } from '../../parser';

export class RequirementsChecker {
  private reqParser: RequirementParser;

  constructor() {
    this.reqParser = new RequirementParser();
  }

  /**
   * Check if Requirements section exists
   */
  checkRequirementsSection(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const reqSection = this.findSection(spec.sections, SectionType.REQUIREMENTS);

    if (!reqSection) {
      return builder
        .missing(
          'No Requirements section found',
          'Add an H2 section titled "## Requirements" to contain functional requirements'
        )
        .build();
    }

    return builder
      .present(
        `Requirements section found at line ${reqSection.lineNumber}`,
        reqSection.lineNumber
      )
      .build();
  }

  /**
   * Count requirements and check if sufficient
   */
  countRequirements(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const requirements = spec.requirements || [];
    const count = requirements.length;

    if (count === 0) {
      return builder
        .missing(
          'No requirements defined',
          'Add H3 sections starting with "### Requirement:" to define functional requirements'
        )
        .build();
    }

    if (count < 3) {
      return builder
        .partial(
          `Found only ${count} requirement${count === 1 ? '' : 's'}, recommend at least 3`,
          'Add more requirements to fully specify the feature'
        )
        .build();
    }

    const lineNumbers = requirements.map(r => r.lineNumber);
    return builder
      .present(
        `Found ${count} requirements (minimum 3 met)`,
        lineNumbers[0]
      )
      .addLineReferences(lineNumbers)
      .build();
  }

  /**
   * Check requirement structure
   */
  checkRequirementStructure(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const requirements = spec.requirements || [];

    if (requirements.length === 0) {
      return builder
        .missing('No requirements to evaluate structure')
        .build();
    }

    // Check if all requirements follow proper structure
    let properStructure = 0;
    let issues = 0;

    for (const req of requirements) {
      // Check if title starts with "Requirement:" or is properly formatted
      if (req.section && req.section.level === 3) {
        properStructure++;
      } else {
        issues++;
        builder.issue(
          `Requirement "${req.title}" is not an H3 heading`,
          'warning',
          'Use H3 headings (###) for requirements'
        );
      }
    }

    if (issues === 0) {
      return builder
        .setScore('yes')
        .setDetails(`All ${requirements.length} requirements follow proper H3 structure`)
        .build();
    }

    if (properStructure > issues) {
      return builder
        .setScore('partial')
        .setDetails(`${properStructure}/${requirements.length} requirements have proper structure`)
        .build();
    }

    return builder
      .setScore('no')
      .setDetails(`Most requirements (${issues}/${requirements.length}) don't follow proper structure`)
      .build();
  }

  /**
   * Check for RFC 2119 keywords
   */
  checkRFCLanguage(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const requirements = spec.requirements || [];

    if (requirements.length === 0) {
      return builder
        .missing('No requirements to evaluate RFC language')
        .build();
    }

    let withKeywords = 0;
    let withoutKeywords = 0;

    for (const req of requirements) {
      if (req.keywords && req.keywords.length > 0) {
        withKeywords++;
      } else {
        withoutKeywords++;
        builder.issue(
          `Requirement "${req.title}" lacks RFC 2119 keywords (SHALL/SHOULD/MAY/MUST)`,
          'warning',
          'Add SHALL for mandatory requirements, SHOULD for recommended, MAY for optional'
        );
      }
    }

    if (withoutKeywords === 0) {
      return builder
        .setScore('yes')
        .setDetails(`All ${requirements.length} requirements use RFC 2119 keywords`)
        .build();
    }

    if (withKeywords > withoutKeywords) {
      return builder
        .setScore('partial')
        .setDetails(`${withKeywords}/${requirements.length} requirements use RFC 2119 keywords`)
        .build();
    }

    return builder
      .setScore('no')
      .setDetails(`Most requirements (${withoutKeywords}/${requirements.length}) lack RFC 2119 keywords`)
      .build();
  }

  /**
   * Check RFC consistency
   */
  checkRFCConsistency(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const requirements = spec.requirements || [];

    if (requirements.length === 0) {
      return builder.missing('No requirements to evaluate').build();
    }

    const withKeywords = requirements.filter(r => r.keywords && r.keywords.length > 0).length;
    const percentage = (withKeywords / requirements.length) * 100;

    if (percentage >= 90) {
      return builder
        .present(
          `${withKeywords}/${requirements.length} (${percentage.toFixed(0)}%) requirements use RFC keywords`
        )
        .build();
    }

    if (percentage >= 70) {
      return builder
        .partial(
          `${withKeywords}/${requirements.length} (${percentage.toFixed(0)}%) requirements use RFC keywords`,
          'Aim for at least 90% consistency in RFC keyword usage'
        )
        .build();
    }

    return builder
      .missing(
        `Only ${withKeywords}/${requirements.length} (${percentage.toFixed(0)}%) requirements use RFC keywords`,
        'Use RFC 2119 keywords (SHALL/SHOULD/MAY/MUST) consistently across all requirements'
      )
      .build();
  }

  /**
   * Check if requirements are testable (have scenarios)
   */
  checkTestability(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const requirements = spec.requirements || [];

    if (requirements.length === 0) {
      return builder.missing('No requirements to evaluate testability').build();
    }

    let withScenarios = 0;
    let withoutScenarios = 0;

    for (const req of requirements) {
      if (req.scenarios && req.scenarios.length > 0) {
        withScenarios++;
      } else {
        withoutScenarios++;
        builder.issue(
          `Requirement "${req.title}" has no scenarios`,
          'warning',
          'Add at least one H4 scenario with GIVEN-WHEN-THEN format'
        );
      }
    }

    if (withoutScenarios === 0) {
      return builder
        .setScore('yes')
        .setDetails(`All ${requirements.length} requirements have scenarios`)
        .build();
    }

    if (withScenarios > withoutScenarios) {
      return builder
        .setScore('partial')
        .setDetails(`${withScenarios}/${requirements.length} requirements have scenarios`)
        .build();
    }

    return builder
      .setScore('no')
      .setDetails(`Most requirements (${withoutScenarios}/${requirements.length}) lack scenarios`)
      .build();
  }

  /**
   * Check if requirements have clear descriptions
   */
  checkRequirementClarity(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const requirements = spec.requirements || [];

    if (requirements.length === 0) {
      return builder.missing('No requirements to evaluate clarity').build();
    }

    let clear = 0;
    let unclear = 0;

    for (const req of requirements) {
      // Check if requirement has a description (not just a title)
      if (req.description && req.description.length > 20) {
        clear++;
      } else {
        unclear++;
        builder.issue(
          `Requirement "${req.title}" lacks a clear description`,
          'warning',
          'Add a detailed description after the requirement heading'
        );
      }
    }

    if (unclear === 0) {
      return builder
        .setScore('yes')
        .setDetails(`All ${requirements.length} requirements have clear descriptions`)
        .build();
    }

    if (clear > unclear) {
      return builder
        .setScore('partial')
        .setDetails(`${clear}/${requirements.length} requirements have clear descriptions`)
        .build();
    }

    return builder
      .setScore('no')
      .setDetails(`Most requirements (${unclear}/${requirements.length}) lack clear descriptions`)
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
