/**
 * Types for evaluation results and findings
 */

import { ParsedSpec } from './spec';
import { Rubric, RubricCategory, RubricCriterion } from './rubric';

export type EvaluationScore = 'yes' | 'partial' | 'no';

export type FindingType = 'present' | 'missing' | 'partial' | 'issue';

export type FindingSeverity = 'info' | 'warning' | 'error';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export type RecommendationEffort = 'small' | 'medium' | 'large';

export interface Finding {
  type: FindingType;
  message: string;
  severity: FindingSeverity;
  suggestion?: string;
  lineReferences?: number[];
}

export interface CriterionResult {
  criterion: RubricCriterion;
  score: EvaluationScore;
  details: string;
  findings: Finding[];
  lineReferences: number[];
}

export interface CategoryResult {
  category: RubricCategory;
  criteriaResults: CriterionResult[];
  score: number; // 0-100 for this category
  completeness: EvaluationScore;
}

export interface ResultSummary {
  totalCriteria: number;
  metCriteria: number;
  partialCriteria: number;
  missingCriteria: number;
  requirementCount: number;
  scenarioCount: number;
  hasNonFunctional: boolean;
  hasPurpose: boolean;
}

export interface Recommendation {
  priority: RecommendationPriority;
  category: string;
  issue: string;
  suggestion: string;
  effort: RecommendationEffort;
  relatedCriteria: string[];
}

export interface EvaluationResult {
  spec: ParsedSpec;
  timestamp: Date;
  rubric: Rubric;
  categoryResults: CategoryResult[];
  overallScore: number; // 0-100
  summary: ResultSummary;
  recommendations: Recommendation[];
}
