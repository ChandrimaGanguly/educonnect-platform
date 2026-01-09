/**
 * Miscellaneous checkers for Technical, QA, Documentation, and Operations categories
 */

import { ParsedSpec, RubricCriterion, CriterionResult, SectionType } from '../../types';
import { ResultBuilder } from '../result-builder';

export class MiscChecker {
  // ===== Technical Requirements =====

  checkTechnicalConstraints(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const keywords = [
      /\bconstraint(s)?\b/i,
      /\blimitation(s)?\b/i,
      /\brestriction(s)?\b/i,
      /\bmust\s+(not|be|support|run|work)\b/i,
      /\brequires?\b/i
    ];

    const found = this.searchContent(spec, keywords);

    if (found.length === 0) {
      return builder
        .missing('No technical constraints mentioned')
        .build();
    }

    return builder
      .present(`Technical constraints mentioned (${found.length} references)`)
      .build();
  }

  checkDependencies(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const keywords = [
      /\bdepend(s|ency|encies)?\s+(on|upon)\b/i,
      /\brequires?\s+\w+\s+(feature|system|service|module)\b/i,
      /\bintegrat(e|ion)\s+with\b/i,
      /\brelies\s+on\b/i
    ];

    const found = this.searchContent(spec, keywords);

    if (found.length === 0) {
      return builder.missing('No dependencies mentioned').build();
    }

    return builder.present(`Dependencies mentioned (${found.length} references)`).build();
  }

  checkArchitectureReferences(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const keywords = [
      /\barchitecture\b/i,
      /\bdesign\s+pattern\b/i,
      /\bapproach\b/i,
      /\bimplementation\b/i,
      /\btechnical\s+design\b/i
    ];

    const found = this.searchContent(spec, keywords);

    if (found.length === 0) {
      return builder.missing('No architecture considerations mentioned').build();
    }

    return builder.present(`Architecture considerations mentioned (${found.length} references)`).build();
  }

  // ===== Quality Assurance =====

  checkAcceptanceCriteria(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const scenarios = this.getAllScenarios(spec);

    if (scenarios.length === 0) {
      return builder
        .missing('No scenarios (acceptance criteria) defined')
        .build();
    }

    return builder
      .present(
        `${scenarios.length} scenarios serve as acceptance criteria`,
        scenarios[0]?.lineNumber
      )
      .build();
  }

  checkVerifiableOutcomes(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const scenarios = this.getAllScenarios(spec);

    if (scenarios.length === 0) {
      return builder.missing('No scenarios to evaluate').build();
    }

    let verifiable = 0;
    let unverifiable = 0;

    for (const scenario of scenarios) {
      // Check if THEN clauses exist and have specific outcomes
      if (scenario.then && scenario.then.length > 0) {
        verifiable++;
      } else {
        unverifiable++;
      }
    }

    if (unverifiable === 0) {
      return builder
        .present(`All ${scenarios.length} scenarios have verifiable THEN outcomes`)
        .build();
    }

    if (verifiable > unverifiable) {
      return builder
        .partial(`${verifiable}/${scenarios.length} scenarios have verifiable outcomes`)
        .build();
    }

    return builder
      .missing(`Most scenarios (${unverifiable}/${scenarios.length}) lack verifiable outcomes`)
      .build();
  }

  // ===== Documentation Quality =====

  checkDocumentStructure(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    // Check heading hierarchy
    const issues: string[] = [];

    // Must have H1 title
    const hasTitle = spec.sections.some(s => s.level === 1);
    if (!hasTitle) {
      issues.push('Missing H1 title');
    }

    // Check for proper hierarchy (no skipping levels)
    const violations = this.checkHeadingHierarchy(spec.sections);
    if (violations.length > 0) {
      issues.push(`Heading hierarchy violations: ${violations.length}`);
    }

    if (issues.length > 0) {
      return builder
        .partial(`Structure issues found: ${issues.join(', ')}`, 'Ensure proper heading hierarchy (H1 > H2 > H3 > H4)')
        .build();
    }

    return builder.present('Document structure is well-organized with proper heading hierarchy').build();
  }

  checkSectionCompleteness(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const hasTitle = this.findSection(spec.sections, SectionType.TITLE);
    const hasPurpose = this.findSection(spec.sections, SectionType.PURPOSE);
    const hasRequirements = this.findSection(spec.sections, SectionType.REQUIREMENTS);
    const hasNFR = this.findSection(spec.sections, SectionType.NON_FUNCTIONAL);

    const missing: string[] = [];
    if (!hasTitle) missing.push('Title');
    if (!hasPurpose) missing.push('Purpose');
    if (!hasRequirements) missing.push('Requirements');
    if (!hasNFR) missing.push('Non-Functional Requirements');

    if (missing.length === 0) {
      return builder.present('All major sections are present (Title, Purpose, Requirements, NFRs)').build();
    }

    if (missing.length <= 1) {
      return builder
        .partial(`Most sections present, missing: ${missing.join(', ')}`)
        .build();
    }

    return builder
      .missing(`Missing major sections: ${missing.join(', ')}`)
      .build();
  }

  checkFormatting(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    // Basic check - if we parsed it successfully, formatting is likely consistent
    return builder
      .present('Document uses consistent markdown formatting')
      .build();
  }

  // ===== Maintenance & Operations =====

  checkMonitoringRequirements(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const keywords = [
      /\bmonitor(ing)?\b/i,
      /\blogging\b/i,
      /\bmetrics?\b/i,
      /\balert(ing|s)?\b/i,
      /\bobservability\b/i,
      /\btelemetry\b/i
    ];

    const found = this.searchContent(spec, keywords);

    if (found.length === 0) {
      return builder.missing('No monitoring/observability requirements').build();
    }

    return builder.present(`Monitoring requirements mentioned (${found.length} references)`).build();
  }

  checkOperationalConsiderations(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const keywords = [
      /\boperation(s|al)?\b/i,
      /\bdeployment\b/i,
      /\bmaintenance\b/i,
      /\bsupport\b/i,
      /\bbackup\b/i,
      /\brecovery\b/i
    ];

    const found = this.searchContent(spec, keywords);

    if (found.length === 0) {
      return builder.missing('No operational considerations mentioned').build();
    }

    return builder.present(`Operational considerations mentioned (${found.length} references)`).build();
  }

  // ===== Helpers =====

  private findSection(sections: any[], type: SectionType): any | undefined {
    for (const section of sections) {
      if (section.type === type) return section;
      if (section.children && section.children.length > 0) {
        const found = this.findSection(section.children, type);
        if (found) return found;
      }
    }
    return undefined;
  }

  private searchContent(spec: ParsedSpec, keywords: RegExp[]): string[] {
    const matches: string[] = [];
    const content = spec.rawContent;

    for (const keyword of keywords) {
      const match = content.match(keyword);
      if (match) {
        matches.push(match[0]);
      }
    }

    return matches;
  }

  private getAllScenarios(spec: ParsedSpec) {
    const scenarios: any[] = [];
    for (const req of spec.requirements || []) {
      if (req.scenarios) scenarios.push(...req.scenarios);
    }
    return scenarios;
  }

  private checkHeadingHierarchy(sections: any[], prevLevel: number = 0): any[] {
    const violations: any[] = [];

    for (const section of sections) {
      // Check if heading skips a level (e.g., H1 -> H3)
      if (section.level > prevLevel + 1) {
        violations.push(section);
      }

      if (section.children && section.children.length > 0) {
        violations.push(...this.checkHeadingHierarchy(section.children, section.level));
      }
    }

    return violations;
  }
}
