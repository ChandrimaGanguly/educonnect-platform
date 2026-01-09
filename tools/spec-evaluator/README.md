# OpenSpec Evaluator

A comprehensive CLI tool for evaluating OpenSpec specification documents against quality criteria. Designed specifically for the EduConnect platform's OpenSpec methodology.

## Features

- Parses OpenSpec markdown specifications
- Evaluates against a comprehensive rubric (38 criteria across 8 categories)
- Generates detailed markdown reports with actionable recommendations
- Supports batch processing of multiple specifications
- Extensible architecture for custom rubrics

## Installation

```bash
cd /home/gangucham/educonnect-platform/tools/spec-evaluator
npm install
npm run build
```

## Usage

### Analyze a Single Specification

```bash
./bin/spec-eval.ts analyze ../../openspec/specs/core/spec.md
```

**Options:**
- `-o, --output <dir>` - Output directory for reports (default: `./reports`)
- `-r, --rubric <file>` - Custom rubric file
- `-v, --verbose` - Verbose output
- `-q, --quiet` - Minimal output

**Example:**
```bash
./bin/spec-eval.ts analyze ../../openspec/specs/core/spec.md -o ./my-reports --verbose
```

### Analyze All Specifications in a Directory

```bash
./bin/spec-eval.ts analyze-dir ../../openspec/specs/
```

**Options:**
- `-o, --output <dir>` - Output directory for reports
- `-r, --rubric <file>` - Custom rubric file
- `--pattern <glob>` - File pattern to match (default: `**/spec.md`)
- `-v, --verbose` - Verbose output

**Example:**
```bash
./bin/spec-eval.ts analyze-dir ../../openspec/specs/ -o ./reports
```

### Show Rubric Criteria

```bash
./bin/spec-eval.ts show-rubric
./bin/spec-eval.ts show-rubric --detailed
```

### Validate a Rubric

```bash
./bin/spec-eval.ts validate-rubric ./rubrics/custom-rubric.yaml
```

## Evaluation Rubric

The tool evaluates specifications against 8 major categories:

1. **Introduction & Context** (10% weight)
   - Purpose statement
   - Title clarity
   - Scope definition

2. **Functional Requirements** (30% weight)
   - Requirements section exists
   - Sufficient requirements (≥3)
   - RFC 2119 keywords (SHALL/SHOULD/MAY)
   - Clear structure and descriptions

3. **Scenarios & Use Cases** (15% weight)
   - GIVEN-WHEN-THEN format
   - Complete scenarios
   - Edge case coverage

4. **Non-Functional Requirements** (20% weight)
   - Performance, scalability, availability
   - Security and data integrity
   - Quantified metrics

5. **Technical Requirements** (10% weight)
   - Technical constraints
   - Dependencies
   - Architecture considerations

6. **Quality Assurance** (5% weight)
   - Acceptance criteria
   - Verifiable outcomes

7. **Documentation Quality** (5% weight)
   - Clear structure
   - Section completeness
   - Consistent formatting

8. **Maintenance & Operations** (5% weight)
   - Monitoring requirements
   - Operational considerations

## Scoring Methodology

**Per Criterion:**
- **Yes (100%)** - Fully met
- **Partial (50%)** - Partially met
- **No (0%)** - Not met

**Category Score:**
- Required criteria weighted 1.0
- Optional criteria weighted 0.5
- Category score = (weighted sum) / (total weight) × 100

**Overall Score:**
- Weighted average of category scores (0-100%)

## Report Structure

Generated reports include:

1. **Executive Summary** - Overall score, statistics, key metrics
2. **Category Scores** - Breakdown by category with tables
3. **Detailed Findings** - In-depth analysis with line references
4. **Recommendations** - Prioritized (High/Medium/Low) actionable suggestions

## Output Example

```
Analyzing: openspec/specs/core/spec.md
✓ Loading rubric...
✓ Parsing specification...
✓ Evaluating criteria...
✓ Generating report...

Report saved to: ./reports/core-evaluation.md

==================================================
Overall Score: 85%
- Met: 32/38 (84.2%)
- Partial: 4/38 (10.5%)
- Missing: 2/38 (5.3%)

Recommendations:
  High priority: 2
  Medium priority: 3
==================================================
```

## Project Structure

```
spec-evaluator/
├── src/
│   ├── parser/           # Markdown parsing and spec extraction
│   ├── evaluator/        # Evaluation engine and checkers
│   ├── reporter/         # Report generation
│   ├── cli/              # CLI interface
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utilities (rubric loader, file utils, logger)
├── rubrics/
│   └── openspec-standard.yaml  # Default evaluation rubric
├── bin/
│   └── spec-eval.ts      # Executable entry point
└── reports/              # Generated reports (created on first run)
```

## Extending the Tool

### Custom Rubrics

Create a custom rubric YAML file following the structure in `rubrics/openspec-standard.yaml`:

```yaml
version: "1.0.0"
name: "My Custom Rubric"
description: "Custom evaluation criteria"

categories:
  - id: my-category
    name: "My Category"
    description: "Category description"
    weight: 0.25
    criteria:
      - id: my-criterion
        name: "Criterion Name"
        description: "What this checks"
        required: true
        evaluationType: presence
        checkFunction: "checkMyFunction"
        guidance: "How to check"
```

### Custom Checkers

Add new checker functions by:

1. Creating a new checker class in `src/evaluator/checkers/`
2. Implementing the checker method
3. Registering it in `src/evaluator/evaluator.ts`

## Testing

Run against all EduConnect specs:

```bash
./bin/spec-eval.ts analyze-dir ../../openspec/specs/ -o ./test-reports
```

Expected specs to analyze:
- core/spec.md
- matching/spec.md
- checkpoints/spec.md
- incentives/spec.md
- curriculum/spec.md
- oversight/spec.md
- analytics/spec.md
- security/spec.md
- mobile/spec.md
- notifications/spec.md
- content/spec.md

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## Requirements

- Node.js >= 18.0.0
- TypeScript 5.3+

## License

MIT

## Contributing

This tool is part of the EduConnect platform's OpenSpec development methodology. Contributions should align with the platform's specification-driven development approach.

## Support

For issues or questions, refer to the EduConnect platform documentation or create an issue in the project repository.
