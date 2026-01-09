/**
 * Rubric loader - loads and validates rubric YAML files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Rubric, RubricCategory, RubricCriterion, EvaluationType } from '../types';

export class RubricLoader {
  /**
   * Load rubric from YAML file
   */
  async load(filePath: string): Promise<Rubric> {
    try {
      const absolutePath = path.resolve(filePath);
      const content = fs.readFileSync(absolutePath, 'utf8');
      const data = yaml.load(content) as any;

      // Validate and transform
      const rubric = this.transformRubric(data);
      this.validate(rubric);

      return rubric;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load rubric from ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load the default OpenSpec standard rubric
   */
  async loadDefault(): Promise<Rubric> {
    const defaultPath = path.join(__dirname, '../../rubrics/openspec-standard.yaml');
    return this.load(defaultPath);
  }

  /**
   * Transform raw YAML data into typed Rubric object
   */
  private transformRubric(data: any): Rubric {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid rubric format: root must be an object');
    }

    const rubric: Rubric = {
      version: data.version || '1.0.0',
      name: data.name || 'Unnamed Rubric',
      description: data.description || '',
      categories: []
    };

    if (Array.isArray(data.categories)) {
      rubric.categories = data.categories.map((cat: any) => this.transformCategory(cat));
    }

    return rubric;
  }

  /**
   * Transform category data
   */
  private transformCategory(data: any): RubricCategory {
    const category: RubricCategory = {
      id: data.id || 'unknown',
      name: data.name || 'Unnamed Category',
      description: data.description || '',
      weight: typeof data.weight === 'number' ? data.weight : 0.1,
      criteria: []
    };

    if (Array.isArray(data.criteria)) {
      category.criteria = data.criteria.map((crit: any) => this.transformCriterion(crit));
    }

    return category;
  }

  /**
   * Transform criterion data
   */
  private transformCriterion(data: any): RubricCriterion {
    return {
      id: data.id || 'unknown',
      name: data.name || 'Unnamed Criterion',
      description: data.description || '',
      required: data.required === true,
      evaluationType: this.parseEvaluationType(data.evaluationType),
      checkFunction: data.checkFunction || 'checkUnknown',
      guidance: data.guidance || '',
      examples: Array.isArray(data.examples) ? data.examples : undefined
    };
  }

  /**
   * Parse evaluation type string
   */
  private parseEvaluationType(value: any): EvaluationType {
    const types: EvaluationType[] = [
      EvaluationType.PRESENCE,
      EvaluationType.QUALITY,
      EvaluationType.COUNT,
      EvaluationType.COMPLETENESS
    ];

    const valueStr = String(value).toLowerCase();
    const found = types.find(t => t.toLowerCase() === valueStr);

    return found || EvaluationType.PRESENCE;
  }

  /**
   * Validate rubric structure
   */
  validate(rubric: Rubric): void {
    const errors: string[] = [];

    // Check basic fields
    if (!rubric.version) {
      errors.push('Rubric must have a version');
    }

    if (!rubric.name) {
      errors.push('Rubric must have a name');
    }

    if (!rubric.categories || rubric.categories.length === 0) {
      errors.push('Rubric must have at least one category');
    }

    // Validate categories
    let totalWeight = 0;
    const categoryIds = new Set<string>();

    for (const category of rubric.categories) {
      // Check for duplicate IDs
      if (categoryIds.has(category.id)) {
        errors.push(`Duplicate category ID: ${category.id}`);
      }
      categoryIds.add(category.id);

      // Validate weight
      if (category.weight < 0 || category.weight > 1) {
        errors.push(`Category ${category.id}: weight must be between 0 and 1`);
      }
      totalWeight += category.weight;

      // Check for criteria
      if (!category.criteria || category.criteria.length === 0) {
        errors.push(`Category ${category.id} must have at least one criterion`);
      }

      // Validate criteria
      const criterionIds = new Set<string>();
      for (const criterion of category.criteria) {
        // Check for duplicate IDs
        if (criterionIds.has(criterion.id)) {
          errors.push(`Duplicate criterion ID in ${category.id}: ${criterion.id}`);
        }
        criterionIds.add(criterion.id);

        // Check for check function
        if (!criterion.checkFunction) {
          errors.push(`Criterion ${criterion.id}: must have a checkFunction`);
        }
      }
    }

    // Warn if weights don't sum to 1.0 (allow small tolerance)
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      console.warn(`Warning: Category weights sum to ${totalWeight.toFixed(2)}, expected 1.0`);
    }

    if (errors.length > 0) {
      throw new Error(`Rubric validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get summary of rubric
   */
  getSummary(rubric: Rubric): string {
    const lines: string[] = [];
    lines.push(`Rubric: ${rubric.name} v${rubric.version}`);
    lines.push(`Description: ${rubric.description}`);
    lines.push(`\nCategories (${rubric.categories.length}):`);

    for (const category of rubric.categories) {
      const requiredCount = category.criteria.filter(c => c.required).length;
      const optionalCount = category.criteria.length - requiredCount;

      lines.push(`  - ${category.name} (weight: ${(category.weight * 100).toFixed(0)}%)`);
      lines.push(`    Criteria: ${requiredCount} required, ${optionalCount} optional`);
    }

    return lines.join('\n');
  }
}
