/**
 * Main evaluation engine
 */

import {
  ParsedSpec,
  Rubric,
  RubricCategory,
  RubricCriterion,
  EvaluationResult,
  CategoryResult,
  CriterionResult,
  ResultSummary,
  Recommendation,
  EvaluationScore
} from '../types';
import { CheckerRegistry } from './checker';
import {
  IntroductionChecker,
  RequirementsChecker,
  ScenarioChecker,
  NFRChecker,
  MiscChecker
} from './checkers';

export class SpecEvaluator {
  private checkerRegistry: CheckerRegistry;

  constructor() {
    this.checkerRegistry = new CheckerRegistry();
    this.registerAllCheckers();
  }

  /**
   * Register all checker functions
   */
  private registerAllCheckers(): void {
    const introChecker = new IntroductionChecker();
    const reqChecker = new RequirementsChecker();
    const scenarioChecker = new ScenarioChecker();
    const nfrChecker = new NFRChecker();
    const miscChecker = new MiscChecker();

    // Introduction checkers
    this.checkerRegistry.register('checkPurposeSection', introChecker.checkPurposeSection.bind(introChecker));
    this.checkerRegistry.register('checkPurposeClarity', introChecker.checkPurposeClarity.bind(introChecker));
    this.checkerRegistry.register('checkScopeInContent', introChecker.checkScopeInContent.bind(introChecker));
    this.checkerRegistry.register('checkTitle', introChecker.checkTitle.bind(introChecker));

    // Requirements checkers
    this.checkerRegistry.register('checkRequirementsSection', reqChecker.checkRequirementsSection.bind(reqChecker));
    this.checkerRegistry.register('countRequirements', reqChecker.countRequirements.bind(reqChecker));
    this.checkerRegistry.register('checkRequirementStructure', reqChecker.checkRequirementStructure.bind(reqChecker));
    this.checkerRegistry.register('checkRFCLanguage', reqChecker.checkRFCLanguage.bind(reqChecker));
    this.checkerRegistry.register('checkRFCConsistency', reqChecker.checkRFCConsistency.bind(reqChecker));
    this.checkerRegistry.register('checkTestability', reqChecker.checkTestability.bind(reqChecker));
    this.checkerRegistry.register('checkRequirementClarity', reqChecker.checkRequirementClarity.bind(reqChecker));

    // Scenario checkers
    this.checkerRegistry.register('checkScenarioCoverage', scenarioChecker.checkScenarioCoverage.bind(scenarioChecker));
    this.checkerRegistry.register('checkScenarioFormat', scenarioChecker.checkScenarioFormat.bind(scenarioChecker));
    this.checkerRegistry.register('checkScenarioCompleteness', scenarioChecker.checkScenarioCompleteness.bind(scenarioChecker));
    this.checkerRegistry.register('checkScenarioStructure', scenarioChecker.checkScenarioStructure.bind(scenarioChecker));
    this.checkerRegistry.register('checkEdgeCases', scenarioChecker.checkEdgeCases.bind(scenarioChecker));
    this.checkerRegistry.register('checkMultipleScenarios', scenarioChecker.checkMultipleScenarios.bind(scenarioChecker));

    // NFR checkers
    this.checkerRegistry.register('checkNonFunctionalSection', nfrChecker.checkNonFunctionalSection.bind(nfrChecker));
    this.checkerRegistry.register('checkPerformanceRequirements', nfrChecker.checkPerformanceRequirements.bind(nfrChecker));
    this.checkerRegistry.register('checkScalabilityRequirements', nfrChecker.checkScalabilityRequirements.bind(nfrChecker));
    this.checkerRegistry.register('checkAvailabilityRequirements', nfrChecker.checkAvailabilityRequirements.bind(nfrChecker));
    this.checkerRegistry.register('checkSecurityRequirements', nfrChecker.checkSecurityRequirements.bind(nfrChecker));
    this.checkerRegistry.register('checkDataIntegrity', nfrChecker.checkDataIntegrity.bind(nfrChecker));
    this.checkerRegistry.register('checkQuantifiedNFRs', nfrChecker.checkQuantifiedNFRs.bind(nfrChecker));

    // Misc checkers
    this.checkerRegistry.register('checkTechnicalConstraints', miscChecker.checkTechnicalConstraints.bind(miscChecker));
    this.checkerRegistry.register('checkDependencies', miscChecker.checkDependencies.bind(miscChecker));
    this.checkerRegistry.register('checkArchitectureReferences', miscChecker.checkArchitectureReferences.bind(miscChecker));
    this.checkerRegistry.register('checkAcceptanceCriteria', miscChecker.checkAcceptanceCriteria.bind(miscChecker));
    this.checkerRegistry.register('checkVerifiableOutcomes', miscChecker.checkVerifiableOutcomes.bind(miscChecker));
    this.checkerRegistry.register('checkDocumentStructure', miscChecker.checkDocumentStructure.bind(miscChecker));
    this.checkerRegistry.register('checkSectionCompleteness', miscChecker.checkSectionCompleteness.bind(miscChecker));
    this.checkerRegistry.register('checkFormatting', miscChecker.checkFormatting.bind(miscChecker));
    this.checkerRegistry.register('checkMonitoringRequirements', miscChecker.checkMonitoringRequirements.bind(miscChecker));
    this.checkerRegistry.register('checkOperationalConsiderations', miscChecker.checkOperationalConsiderations.bind(miscChecker));
  }

  /**
   * Evaluate a spec against a rubric
   */
  async evaluate(spec: ParsedSpec, rubric: Rubric): Promise<EvaluationResult> {
    const categoryResults: CategoryResult[] = [];

    // Evaluate each category
    for (const category of rubric.categories) {
      const categoryResult = await this.evaluateCategory(spec, category);
      categoryResults.push(categoryResult);
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(categoryResults, rubric);

    // Generate summary
    const summary = this.buildSummary(spec, categoryResults);

    // Generate recommendations
    const recommendations = this.generateRecommendations(categoryResults);

    return {
      spec,
      timestamp: new Date(),
      rubric,
      categoryResults,
      overallScore,
      summary,
      recommendations
    };
  }

  /**
   * Evaluate a single category
   */
  private async evaluateCategory(
    spec: ParsedSpec,
    category: RubricCategory
  ): Promise<CategoryResult> {
    const criteriaResults: CriterionResult[] = [];

    // Evaluate each criterion
    for (const criterion of category.criteria) {
      const result = await this.evaluateCriterion(spec, criterion);
      criteriaResults.push(result);
    }

    // Calculate category score
    const score = this.calculateCategoryScore(criteriaResults);

    // Determine category completeness
    const completeness = this.determineCategoryCompleteness(criteriaResults);

    return {
      category,
      criteriaResults,
      score,
      completeness
    };
  }

  /**
   * Evaluate a single criterion
   */
  private async evaluateCriterion(
    spec: ParsedSpec,
    criterion: RubricCriterion
  ): Promise<CriterionResult> {
    const checker = this.checkerRegistry.get(criterion.checkFunction);

    if (!checker) {
      // Checker not found - return a default result
      return {
        criterion,
        score: 'no',
        details: `Checker function '${criterion.checkFunction}' not found`,
        findings: [{
          type: 'issue',
          message: `No checker implementation for ${criterion.checkFunction}`,
          severity: 'error'
        }],
        lineReferences: []
      };
    }

    try {
      return await checker(spec, criterion);
    } catch (error) {
      // Handle checker errors gracefully
      return {
        criterion,
        score: 'no',
        details: `Error evaluating criterion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        findings: [{
          type: 'issue',
          message: `Checker execution failed`,
          severity: 'error'
        }],
        lineReferences: []
      };
    }
  }

  /**
   * Calculate category score (0-100)
   */
  private calculateCategoryScore(results: CriterionResult[]): number {
    let totalWeight = 0;
    let weightedScore = 0;

    for (const result of results) {
      const weight = result.criterion.required ? 1.0 : 0.5;
      totalWeight += weight;

      const score = this.scoreToNumeric(result.score);
      weightedScore += score * weight;
    }

    return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  }

  /**
   * Calculate overall score (0-100)
   */
  private calculateOverallScore(results: CategoryResult[], rubric: Rubric): number {
    let weightedScore = 0;

    for (const result of results) {
      weightedScore += result.score * result.category.weight;
    }

    return Math.round(weightedScore);
  }

  /**
   * Convert evaluation score to numeric value
   */
  private scoreToNumeric(score: EvaluationScore): number {
    switch (score) {
      case 'yes': return 1.0;
      case 'partial': return 0.5;
      case 'no': return 0.0;
    }
  }

  /**
   * Determine category completeness
   */
  private determineCategoryCompleteness(results: CriterionResult[]): EvaluationScore {
    const requiredResults = results.filter(r => r.criterion.required);

    if (requiredResults.length === 0) {
      return 'yes';
    }

    const allYes = requiredResults.every(r => r.score === 'yes');
    const allNo = requiredResults.every(r => r.score === 'no');

    if (allYes) return 'yes';
    if (allNo) return 'no';
    return 'partial';
  }

  /**
   * Build result summary
   */
  private buildSummary(spec: ParsedSpec, results: CategoryResult[]): ResultSummary {
    let totalCriteria = 0;
    let metCriteria = 0;
    let partialCriteria = 0;
    let missingCriteria = 0;

    for (const categoryResult of results) {
      for (const criterionResult of categoryResult.criteriaResults) {
        totalCriteria++;
        if (criterionResult.score === 'yes') metCriteria++;
        else if (criterionResult.score === 'partial') partialCriteria++;
        else missingCriteria++;
      }
    }

    return {
      totalCriteria,
      metCriteria,
      partialCriteria,
      missingCriteria,
      requirementCount: spec.requirements?.length || 0,
      scenarioCount: spec.requirements?.reduce((sum, r) => sum + (r.scenarios?.length || 0), 0) || 0,
      hasNonFunctional: spec.sections.some(s => s.type === 'non_functional'),
      hasPurpose: spec.sections.some(s => s.type === 'purpose')
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(results: CategoryResult[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const categoryResult of results) {
      for (const criterionResult of categoryResult.criteriaResults) {
        if (criterionResult.score !== 'yes') {
          const recs = this.createRecommendationsForCriterion(
            categoryResult.category.name,
            criterionResult
          );
          recommendations.push(...recs);
        }
      }
    }

    // Sort by priority
    return this.sortRecommendations(recommendations);
  }

  /**
   * Create recommendations for a failed or partial criterion
   */
  private createRecommendationsForCriterion(
    categoryName: string,
    result: CriterionResult
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const finding of result.findings) {
      if (finding.suggestion && finding.type !== 'present') {
        const priority = this.determinePriority(result, finding);
        const effort = this.estimateEffort(result);

        recommendations.push({
          priority,
          category: categoryName,
          issue: finding.message,
          suggestion: finding.suggestion,
          effort,
          relatedCriteria: [result.criterion.id]
        });
      }
    }

    return recommendations;
  }

  /**
   * Determine recommendation priority
   */
  private determinePriority(result: CriterionResult, finding: any): 'high' | 'medium' | 'low' {
    // Required criteria failures are high priority
    if (result.criterion.required && result.score === 'no') {
      return 'high';
    }

    // Error severity findings are high priority
    if (finding.severity === 'error') {
      return 'high';
    }

    // Partial results are medium priority
    if (result.score === 'partial') {
      return 'medium';
    }

    // Optional criteria failures are low priority
    return 'low';
  }

  /**
   * Estimate effort to address the issue
   */
  private estimateEffort(result: CriterionResult): 'small' | 'medium' | 'large' {
    // Based on criterion type
    if (result.criterion.evaluationType === 'presence') {
      return 'medium'; // Need to add a section
    }

    if (result.criterion.evaluationType === 'count') {
      return 'large'; // Need to add multiple items
    }

    return 'small'; // Quality improvements
  }

  /**
   * Sort recommendations by priority
   */
  private sortRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return recommendations.sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
}
