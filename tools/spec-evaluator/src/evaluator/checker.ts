/**
 * Checker interface and registry
 */

import { ParsedSpec, RubricCriterion, CriterionResult } from '../types';

/**
 * Interface for checker functions
 */
export type CheckerFunction = (
  spec: ParsedSpec,
  criterion: RubricCriterion
) => Promise<CriterionResult> | CriterionResult;

/**
 * Checker registry - manages all checker functions
 */
export class CheckerRegistry {
  private checkers: Map<string, CheckerFunction>;

  constructor() {
    this.checkers = new Map();
  }

  /**
   * Register a checker function
   */
  register(name: string, checker: CheckerFunction): void {
    this.checkers.set(name, checker);
  }

  /**
   * Get a checker function by name
   */
  get(name: string): CheckerFunction | undefined {
    return this.checkers.get(name);
  }

  /**
   * Check if a checker is registered
   */
  has(name: string): boolean {
    return this.checkers.has(name);
  }

  /**
   * Get all registered checker names
   */
  getNames(): string[] {
    return Array.from(this.checkers.keys());
  }

  /**
   * Register multiple checkers at once
   */
  registerAll(checkers: Record<string, CheckerFunction>): void {
    for (const [name, checker] of Object.entries(checkers)) {
      this.register(name, checker);
    }
  }
}
