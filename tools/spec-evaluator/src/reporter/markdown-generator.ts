/**
 * Markdown report generator
 */

import { EvaluationResult, CategoryResult, CriterionResult, EvaluationScore, Recommendation } from '../types';

export class MarkdownGenerator {
  /**
   * Generate a complete markdown report
   */
  generate(result: EvaluationResult): string {
    const sections: string[] = [];

    sections.push(this.generateHeader(result));
    sections.push(this.generateExecutiveSummary(result));
    sections.push(this.generateCategoryScores(result));
    sections.push(this.generateDetailedFindings(result));
    sections.push(this.generateRecommendations(result));
    sections.push(this.generateFooter(result));

    return sections.join('\n\n');
  }

  /**
   * Generate report header
   */
  private generateHeader(result: EvaluationResult): string {
    return `# Specification Evaluation Report

**Specification:** ${result.spec.metadata.title}
**File:** \`${result.spec.filePath}\`
**Evaluated:** ${result.timestamp.toLocaleString()}
**Rubric:** ${result.rubric.name} v${result.rubric.version}

---`;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(result: EvaluationResult): string {
    const { overallScore, summary } = result;
    const label = this.getScoreLabel(overallScore);

    const metPercentage = ((summary.metCriteria / summary.totalCriteria) * 100).toFixed(1);
    const partialPercentage = ((summary.partialCriteria / summary.totalCriteria) * 100).toFixed(1);
    const missingPercentage = ((summary.missingCriteria / summary.totalCriteria) * 100).toFixed(1);

    return `## Executive Summary

**Overall Completeness: ${overallScore}%** - ${label} ${this.getScoreEmoji(overallScore)}

- **Total Criteria Evaluated:** ${summary.totalCriteria}
- **Criteria Met:** ${summary.metCriteria} (${metPercentage}%)
- **Partially Met:** ${summary.partialCriteria} (${partialPercentage}%)
- **Not Met:** ${summary.missingCriteria} (${missingPercentage}%)

**Specification Statistics:**
- Requirements: ${summary.requirementCount}
- Scenarios: ${summary.scenarioCount}
- Has Non-Functional Requirements: ${summary.hasNonFunctional ? 'Yes ✓' : 'No ✗'}
- Has Purpose Statement: ${summary.hasPurpose ? 'Yes ✓' : 'No ✗'}

---`;
  }

  /**
   * Generate category scores table
   */
  private generateCategoryScores(result: EvaluationResult): string {
    let output = `## Category Scores\n\n`;

    for (const categoryResult of result.categoryResults) {
      const emoji = this.getCompletenessEmoji(categoryResult.completeness);
      const weight = (categoryResult.category.weight * 100).toFixed(0);

      output += `### ${categoryResult.category.name} - ${categoryResult.score}% ${emoji}\n\n`;
      output += `*${categoryResult.category.description}* (Weight: ${weight}%)\n\n`;

      output += `| Criterion | Status | Details |\n`;
      output += `|-----------|--------|----------|\n`;

      for (const criterion of categoryResult.criteriaResults) {
        const status = this.getStatusBadge(criterion.score);
        const name = criterion.criterion.name;
        const required = criterion.criterion.required ? ' **(required)**' : '';
        const details = this.truncate(criterion.details, 80);

        output += `| ${name}${required} | ${status} | ${details} |\n`;
      }

      // Add issues found section if there are any
      const issues = categoryResult.criteriaResults.filter(c => c.score !== 'yes');
      if (issues.length > 0) {
        output += `\n**Issues Found (${issues.length}):**\n\n`;

        for (const criterion of issues) {
          for (const finding of criterion.findings) {
            if (finding.type !== 'present') {
              const icon = this.getSeverityIcon(finding.severity);
              output += `- ${icon} **${criterion.criterion.name}:** ${finding.message}\n`;

              if (finding.suggestion) {
                output += `  - *Suggestion:* ${finding.suggestion}\n`;
              }
            }
          }
        }
      }

      output += `\n`;
    }

    output += `---`;
    return output;
  }

  /**
   * Generate detailed findings section
   */
  private generateDetailedFindings(result: EvaluationResult): string {
    let output = `## Detailed Findings\n\n`;

    for (const categoryResult of result.categoryResults) {
      const issues = categoryResult.criteriaResults.filter(c => c.score !== 'yes');

      if (issues.length === 0) {
        continue; // Skip categories with no issues
      }

      output += `### ${categoryResult.category.name}\n\n`;

      for (const criterion of issues) {
        output += `#### ${criterion.criterion.name}\n\n`;
        output += `**Status:** ${this.getStatusText(criterion.score)}  \n`;
        output += `**Description:** ${criterion.criterion.description}  \n`;

        if (criterion.criterion.required) {
          output += `**Required:** Yes  \n`;
        }

        output += `\n**Findings:**\n\n`;

        for (const finding of criterion.findings) {
          const icon = this.getSeverityIcon(finding.severity);
          output += `- ${icon} ${finding.message}\n`;

          if (finding.suggestion) {
            output += `  - **Recommendation:** ${finding.suggestion}\n`;
          }

          if (finding.lineReferences && finding.lineReferences.length > 0) {
            output += `  - *See lines:* ${finding.lineReferences.join(', ')}\n`;
          }
        }

        output += `\n`;
      }
    }

    output += `---`;
    return output;
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendations(result: EvaluationResult): string {
    const highPriority = result.recommendations.filter(r => r.priority === 'high');
    const mediumPriority = result.recommendations.filter(r => r.priority === 'medium');
    const lowPriority = result.recommendations.filter(r => r.priority === 'low');

    let output = `## Recommendations\n\n`;

    if (result.recommendations.length === 0) {
      output += `*No recommendations - all criteria are met!* ✓\n\n`;
    } else {
      output += `Found ${result.recommendations.length} recommendations to improve specification quality:\n\n`;

      if (highPriority.length > 0) {
        output += `### High Priority (${highPriority.length})\n\n`;
        output += this.formatRecommendations(highPriority);
      }

      if (mediumPriority.length > 0) {
        output += `### Medium Priority (${mediumPriority.length})\n\n`;
        output += this.formatRecommendations(mediumPriority);
      }

      if (lowPriority.length > 0) {
        output += `### Low Priority (${lowPriority.length})\n\n`;
        output += this.formatRecommendations(lowPriority);
      }
    }

    output += `---`;
    return output;
  }

  /**
   * Format a list of recommendations
   */
  private formatRecommendations(recommendations: Recommendation[]): string {
    let output = '';
    let counter = 1;

    for (const rec of recommendations) {
      output += `${counter}. **[${rec.category}]** ${rec.issue}\n`;
      output += `   - **Action:** ${rec.suggestion}\n`;
      output += `   - **Effort:** ${this.capitalize(rec.effort)}\n\n`;
      counter++;
    }

    return output;
  }

  /**
   * Generate report footer
   */
  private generateFooter(result: EvaluationResult): string {
    return `## Rubric Reference

This evaluation used the **${result.rubric.name}** rubric, which assesses specifications across ${result.rubric.categories.length} major categories:

${result.rubric.categories.map(c => `- **${c.name}** (weight: ${(c.weight * 100).toFixed(0)}%): ${c.description}`).join('\n')}

---

*Report generated by OpenSpec Evaluation Tool*`;
  }

  // === Helper functions ===

  private getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  }

  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    return '🔴';
  }

  private getCompletenessEmoji(completeness: EvaluationScore): string {
    switch (completeness) {
      case 'yes': return '✅';
      case 'partial': return '⚠️';
      case 'no': return '❌';
    }
  }

  private getStatusBadge(score: EvaluationScore): string {
    switch (score) {
      case 'yes': return '✅ Yes';
      case 'partial': return '⚠️ Partial';
      case 'no': return '❌ No';
    }
  }

  private getStatusText(score: EvaluationScore): string {
    switch (score) {
      case 'yes': return 'Met ✅';
      case 'partial': return 'Partially Met ⚠️';
      case 'no': return 'Not Met ❌';
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
