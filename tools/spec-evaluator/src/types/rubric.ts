/**
 * Types for rubric definition and evaluation criteria
 */

export enum EvaluationType {
  PRESENCE = 'presence',        // Yes/No - is it present?
  QUALITY = 'quality',          // Yes/Partial/No - quality assessment
  COUNT = 'count',              // Numeric - count items
  COMPLETENESS = 'completeness' // Percentage - coverage metric
}

export interface Rubric {
  version: string;
  name: string;
  description: string;
  categories: RubricCategory[];
}

export interface RubricCategory {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, for weighted scoring
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  required: boolean;
  evaluationType: EvaluationType;
  checkFunction: string; // Reference to checker function name
  guidance: string; // What to look for
  examples?: string[];
}
