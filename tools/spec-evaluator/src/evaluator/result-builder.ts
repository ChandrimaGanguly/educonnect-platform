/**
 * Helper for building criterion results
 */

import { CriterionResult, Finding, EvaluationScore, RubricCriterion } from '../types';

export class ResultBuilder {
  private criterion: RubricCriterion;
  private score: EvaluationScore;
  private details: string;
  private findings: Finding[];
  private lineReferences: number[];

  constructor(criterion: RubricCriterion) {
    this.criterion = criterion;
    this.score = 'no';
    this.details = '';
    this.findings = [];
    this.lineReferences = [];
  }

  setScore(score: EvaluationScore): this {
    this.score = score;
    return this;
  }

  setDetails(details: string): this {
    this.details = details;
    return this;
  }

  addFinding(finding: Finding): this {
    this.findings.push(finding);
    return this;
  }

  addLineReference(lineNumber: number): this {
    if (!this.lineReferences.includes(lineNumber)) {
      this.lineReferences.push(lineNumber);
    }
    return this;
  }

  addLineReferences(lineNumbers: number[]): this {
    for (const line of lineNumbers) {
      this.addLineReference(line);
    }
    return this;
  }

  present(message: string, lineNumber?: number): this {
    this.score = 'yes';
    this.details = message;
    this.addFinding({
      type: 'present',
      message,
      severity: 'info'
    });
    if (lineNumber) {
      this.addLineReference(lineNumber);
    }
    return this;
  }

  missing(message: string, suggestion?: string): this {
    this.score = 'no';
    this.details = message;
    this.addFinding({
      type: 'missing',
      message,
      severity: 'error',
      suggestion
    });
    return this;
  }

  partial(message: string, suggestion?: string, lineNumbers?: number[]): this {
    this.score = 'partial';
    this.details = message;
    this.addFinding({
      type: 'partial',
      message,
      severity: 'warning',
      suggestion
    });
    if (lineNumbers) {
      this.addLineReferences(lineNumbers);
    }
    return this;
  }

  issue(message: string, severity: 'info' | 'warning' | 'error', suggestion?: string): this {
    this.addFinding({
      type: 'issue',
      message,
      severity,
      suggestion
    });
    return this;
  }

  build(): CriterionResult {
    return {
      criterion: this.criterion,
      score: this.score,
      details: this.details,
      findings: this.findings,
      lineReferences: this.lineReferences.sort((a, b) => a - b)
    };
  }
}
