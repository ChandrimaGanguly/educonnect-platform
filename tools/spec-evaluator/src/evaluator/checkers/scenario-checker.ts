/**
 * Scenarios & Use Cases checkers
 */

import { ParsedSpec, RubricCriterion, CriterionResult, Scenario, SectionType } from '../../types';
import { ResultBuilder } from '../result-builder';

export class ScenarioChecker {
  /**
   * Check if each requirement has at least one scenario
   */
  checkScenarioCoverage(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const requirements = spec.requirements || [];

    if (requirements.length === 0) {
      return builder.missing('No requirements to evaluate scenario coverage').build();
    }

    const withScenarios = requirements.filter(r => r.scenarios && r.scenarios.length > 0);
    const withoutScenarios = requirements.filter(r => !r.scenarios || r.scenarios.length === 0);

    const percentage = (withScenarios.length / requirements.length) * 100;

    if (withoutScenarios.length === 0) {
      return builder
        .present(
          `All ${requirements.length} requirements have scenarios (100% coverage)`
        )
        .build();
    }

    if (percentage >= 80) {
      return builder
        .partial(
          `${withScenarios.length}/${requirements.length} requirements have scenarios (${percentage.toFixed(0)}% coverage)`,
          `Add scenarios to: ${withoutScenarios.map(r => r.title).join(', ')}`
        )
        .build();
    }

    return builder
      .missing(
        `Only ${withScenarios.length}/${requirements.length} requirements have scenarios (${percentage.toFixed(0)}% coverage)`,
        'Add H4 scenarios with GIVEN-WHEN-THEN format to requirements'
      )
      .build();
  }

  /**
   * Check if scenarios follow GIVEN-WHEN-THEN format
   */
  checkScenarioFormat(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const scenarios = this.getAllScenarios(spec);

    if (scenarios.length === 0) {
      return builder.missing('No scenarios to evaluate format').build();
    }

    let properFormat = 0;
    let improperFormat = 0;

    for (const scenario of scenarios) {
      // Check if scenario uses bullet points
      const hasGiven = scenario.given && scenario.given.length > 0;
      const hasWhen = scenario.when && scenario.when.length > 0;
      const hasThen = scenario.then && scenario.then.length > 0;

      if (hasGiven || hasWhen || hasThen) {
        properFormat++;
      } else {
        improperFormat++;
        builder.issue(
          `Scenario "${scenario.title}" doesn't use GIVEN-WHEN-THEN format`,
          'warning',
          'Use bullet points with GIVEN, WHEN, THEN, and AND prefixes'
        );
      }
    }

    if (improperFormat === 0) {
      return builder
        .setScore('yes')
        .setDetails(`All ${scenarios.length} scenarios use GIVEN-WHEN-THEN format`)
        .build();
    }

    if (properFormat > improperFormat) {
      return builder
        .setScore('partial')
        .setDetails(`${properFormat}/${scenarios.length} scenarios use proper format`)
        .build();
    }

    return builder
      .setScore('no')
      .setDetails(`Most scenarios (${improperFormat}/${scenarios.length}) don't use GIVEN-WHEN-THEN format`)
      .build();
  }

  /**
   * Check if scenarios are complete (have all three parts)
   */
  checkScenarioCompleteness(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const scenarios = this.getAllScenarios(spec);

    if (scenarios.length === 0) {
      return builder.missing('No scenarios to evaluate completeness').build();
    }

    let complete = 0;
    let incomplete = 0;

    for (const scenario of scenarios) {
      if (scenario.isComplete) {
        complete++;
      } else {
        incomplete++;

        const missing: string[] = [];
        if (!scenario.given || scenario.given.length === 0) missing.push('GIVEN');
        if (!scenario.when || scenario.when.length === 0) missing.push('WHEN');
        if (!scenario.then || scenario.then.length === 0) missing.push('THEN');

        builder.issue(
          `Scenario "${scenario.title}" is missing: ${missing.join(', ')}`,
          'warning',
          `Add ${missing.join(', ')} sections to complete the scenario`
        );
      }
    }

    if (incomplete === 0) {
      return builder
        .setScore('yes')
        .setDetails(`All ${scenarios.length} scenarios are complete with GIVEN-WHEN-THEN`)
        .build();
    }

    if (complete > incomplete) {
      return builder
        .setScore('partial')
        .setDetails(`${complete}/${scenarios.length} scenarios are complete`)
        .build();
    }

    return builder
      .setScore('no')
      .setDetails(`Most scenarios (${incomplete}/${scenarios.length}) are incomplete`)
      .build();
  }

  /**
   * Check if scenarios follow proper H4 structure
   */
  checkScenarioStructure(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const scenarios = this.getAllScenarios(spec);

    if (scenarios.length === 0) {
      return builder.missing('No scenarios to evaluate structure').build();
    }

    // All scenarios extracted by our parser should be H4 under requirements
    // If we found them, they have proper structure
    return builder
      .present(
        `All ${scenarios.length} scenarios follow proper H4 structure under requirements`
      )
      .build();
  }

  /**
   * Check for edge cases and error scenarios
   */
  checkEdgeCases(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const scenarios = this.getAllScenarios(spec);

    if (scenarios.length === 0) {
      return builder.missing('No scenarios to evaluate').build();
    }

    // Look for keywords indicating edge cases or error handling
    const edgeCaseKeywords = [
      /\berror\b/i,
      /\bfail(ure|ed|s)?\b/i,
      /\binvalid\b/i,
      /\bexception\b/i,
      /\bedge\s*case\b/i,
      /\bboundary\b/i,
      /\bmax(imum)?\b/i,
      /\bmin(imum)?\b/i,
      /\bempty\b/i,
      /\bnull\b/i,
      /\bmissing\b/i
    ];

    let edgeCaseCount = 0;

    for (const scenario of scenarios) {
      const title = scenario.title.toLowerCase();
      const allText = [
        scenario.title,
        ...scenario.given,
        ...scenario.when,
        ...scenario.then
      ].join(' ');

      for (const keyword of edgeCaseKeywords) {
        if (keyword.test(allText)) {
          edgeCaseCount++;
          break;
        }
      }
    }

    if (edgeCaseCount === 0) {
      return builder
        .missing(
          'No edge case or error handling scenarios found',
          'Consider adding scenarios for error conditions, validation failures, and edge cases'
        )
        .build();
    }

    const percentage = (edgeCaseCount / scenarios.length) * 100;

    if (percentage >= 20) {
      return builder
        .present(
          `Found ${edgeCaseCount} edge case/error scenarios (${percentage.toFixed(0)}% of total)`
        )
        .build();
    }

    return builder
      .partial(
        `Found only ${edgeCaseCount} edge case/error scenarios (${percentage.toFixed(0)}% of total)`,
        'Consider adding more scenarios for error conditions and edge cases'
      )
      .build();
  }

  /**
   * Check if requirements have multiple scenarios
   */
  checkMultipleScenarios(spec: ParsedSpec, criterion: RubricCriterion): CriterionResult {
    const builder = new ResultBuilder(criterion);

    const requirements = spec.requirements || [];

    if (requirements.length === 0) {
      return builder.missing('No requirements to evaluate').build();
    }

    const withMultiple = requirements.filter(r => r.scenarios && r.scenarios.length >= 2);
    const withOne = requirements.filter(r => r.scenarios && r.scenarios.length === 1);
    const withNone = requirements.filter(r => !r.scenarios || r.scenarios.length === 0);

    if (withMultiple.length >= requirements.length * 0.5) {
      return builder
        .present(
          `${withMultiple.length}/${requirements.length} requirements have multiple scenarios`
        )
        .build();
    }

    if (withMultiple.length > 0) {
      return builder
        .partial(
          `${withMultiple.length}/${requirements.length} requirements have multiple scenarios`,
          'Complex requirements benefit from multiple scenarios covering different use cases'
        )
        .build();
    }

    return builder
      .missing(
        'No requirements have multiple scenarios',
        'Consider adding 2-3 scenarios per requirement to cover different use cases'
      )
      .build();
  }

  /**
   * Helper to get all scenarios from all requirements
   */
  private getAllScenarios(spec: ParsedSpec): Scenario[] {
    const scenarios: Scenario[] = [];

    for (const req of spec.requirements || []) {
      if (req.scenarios) {
        scenarios.push(...req.scenarios);
      }
    }

    return scenarios;
  }
}
