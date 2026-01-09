/**
 * CLI entry point for the spec evaluator
 */

import { Command } from 'commander';
import * as path from 'path';
import { SpecExtractor, RequirementParser } from '../parser';
import { SpecEvaluator } from '../evaluator';
import { MarkdownGenerator } from '../reporter';
import { RubricLoader, FileUtils, logger, LogLevel } from '../utils';

export class CLI {
  private program: Command;
  private specExtractor: SpecExtractor;
  private reqParser: RequirementParser;
  private evaluator: SpecEvaluator;
  private rubricLoader: RubricLoader;
  private markdownGen: MarkdownGenerator;

  constructor() {
    this.program = new Command();
    this.specExtractor = new SpecExtractor();
    this.reqParser = new RequirementParser();
    this.evaluator = new SpecEvaluator();
    this.rubricLoader = new RubricLoader();
    this.markdownGen = new MarkdownGenerator();

    this.setupCommands();
  }

  /**
   * Set up CLI commands
   */
  private setupCommands(): void {
    this.program
      .name('spec-eval')
      .description('OpenSpec specification evaluation tool')
      .version('1.0.0');

    // Analyze command
    this.program
      .command('analyze')
      .description('Analyze a single specification file')
      .argument('<spec-file>', 'Path to specification markdown file')
      .option('-o, --output <dir>', 'Output directory for reports', './reports')
      .option('-r, --rubric <file>', 'Custom rubric file (YAML)')
      .option('-v, --verbose', 'Verbose output', false)
      .option('-q, --quiet', 'Minimal output', false)
      .action(async (specFile, options) => {
        await this.analyzeCommand(specFile, options);
      });

    // Analyze directory command
    this.program
      .command('analyze-dir')
      .description('Analyze all specifications in a directory')
      .argument('<spec-dir>', 'Directory containing specification files')
      .option('-o, --output <dir>', 'Output directory for reports', './reports')
      .option('-r, --rubric <file>', 'Custom rubric file (YAML)')
      .option('--pattern <glob>', 'File pattern to match', '**/spec.md')
      .option('-v, --verbose', 'Verbose output', false)
      .action(async (specDir, options) => {
        await this.analyzeDirCommand(specDir, options);
      });

    // Show rubric command
    this.program
      .command('show-rubric')
      .description('Display rubric criteria')
      .option('-r, --rubric <file>', 'Rubric file to display')
      .option('--detailed', 'Show detailed criteria information')
      .action(async (options) => {
        await this.showRubricCommand(options);
      });

    // Validate rubric command
    this.program
      .command('validate-rubric')
      .description('Validate a rubric file')
      .argument('<rubric-file>', 'Path to rubric YAML file')
      .action(async (rubricFile) => {
        await this.validateRubricCommand(rubricFile);
      });
  }

  /**
   * Analyze a single spec file
   */
  private async analyzeCommand(specFile: string, options: any): Promise<void> {
    try {
      // Set logger options
      if (options.verbose) logger.setLevel(LogLevel.DEBUG);
      if (options.quiet) logger.setQuiet(true);

      logger.info(`Analyzing: ${specFile}`);

      // Check if file exists
      if (!FileUtils.exists(specFile)) {
        logger.error(`File not found: ${specFile}`);
        process.exit(1);
      }

      // Load rubric
      logger.info('Loading rubric...');
      const rubric = options.rubric
        ? await this.rubricLoader.load(options.rubric)
        : await this.rubricLoader.loadDefault();

      // Parse spec
      logger.info('Parsing specification...');
      const content = FileUtils.readFile(specFile);
      const spec = this.specExtractor.extract(specFile, content);

      // Extract requirements
      spec.requirements = this.reqParser.extractRequirements(spec.sections);

      // Evaluate
      logger.info('Evaluating criteria...');
      const result = await this.evaluator.evaluate(spec, rubric);

      // Generate report
      logger.info('Generating report...');
      const report = this.markdownGen.generate(result);

      // Save report
      FileUtils.ensureDir(options.output);
      const outputFile = path.join(
        options.output,
        `${FileUtils.getBasename(specFile)}-evaluation.md`
      );
      FileUtils.writeFile(outputFile, report);

      logger.success(`Report saved to: ${outputFile}`);

      // Print summary
      if (!options.quiet) {
        this.printSummary(result);
      }
    } catch (error) {
      logger.error('Error during analysis:', error);
      process.exit(1);
    }
  }

  /**
   * Analyze all specs in a directory
   */
  private async analyzeDirCommand(specDir: string, options: any): Promise<void> {
    try {
      if (options.verbose) logger.setLevel(LogLevel.DEBUG);

      logger.info(`Analyzing directory: ${specDir}`);

      // Find spec files
      const pattern = new RegExp(options.pattern.replace(/\*/g, '.*'));
      const files = FileUtils.listFiles(specDir, pattern);

      if (files.length === 0) {
        logger.warn(`No spec files found matching pattern: ${options.pattern}`);
        process.exit(0);
      }

      logger.info(`Found ${files.length} specification(s)`);

      // Load rubric once
      const rubric = options.rubric
        ? await this.rubricLoader.load(options.rubric)
        : await this.rubricLoader.loadDefault();

      // Process each file
      const results: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        logger.info(`[${i + 1}/${files.length}] ${path.basename(file)}`);

        try {
          const content = FileUtils.readFile(file);
          const spec = this.specExtractor.extract(file, content);
          spec.requirements = this.reqParser.extractRequirements(spec.sections);

          const result = await this.evaluator.evaluate(spec, rubric);
          results.push({ file, result });

          // Save individual report
          FileUtils.ensureDir(options.output);
          const report = this.markdownGen.generate(result);
          const outputFile = path.join(
            options.output,
            `${FileUtils.getBasename(file)}-evaluation.md`
          );
          FileUtils.writeFile(outputFile, report);

          logger.success(`  ${result.overallScore}%`);
        } catch (error) {
          logger.error(`  Failed to analyze: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Print aggregate summary
      if (results.length > 0) {
        const avgScore = results.reduce((sum, r) => sum + r.result.overallScore, 0) / results.length;
        logger.info('\nAggregate Results:');
        logger.info(`  Average score: ${avgScore.toFixed(1)}%`);
        logger.info(`  Reports saved to: ${options.output}`);
      }
    } catch (error) {
      logger.error('Error during directory analysis:', error);
      process.exit(1);
    }
  }

  /**
   * Show rubric criteria
   */
  private async showRubricCommand(options: any): Promise<void> {
    try {
      const rubric = options.rubric
        ? await this.rubricLoader.load(options.rubric)
        : await this.rubricLoader.loadDefault();

      console.log(this.rubricLoader.getSummary(rubric));

      if (options.detailed) {
        console.log('\n--- Detailed Criteria ---\n');

        for (const category of rubric.categories) {
          console.log(`\n${category.name} (${category.criteria.length} criteria):`);

          for (const criterion of category.criteria) {
            console.log(`  - ${criterion.name} ${criterion.required ? '[REQUIRED]' : '[OPTIONAL]'}`);
            console.log(`    ${criterion.description}`);
            console.log(`    Type: ${criterion.evaluationType}`);
            console.log(`    Checker: ${criterion.checkFunction}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading rubric:', error);
      process.exit(1);
    }
  }

  /**
   * Validate a rubric file
   */
  private async validateRubricCommand(rubricFile: string): Promise<void> {
    try {
      logger.info(`Validating rubric: ${rubricFile}`);

      const rubric = await this.rubricLoader.load(rubricFile);

      logger.success('Rubric is valid!');
      console.log(this.rubricLoader.getSummary(rubric));
    } catch (error) {
      logger.error('Rubric validation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Print evaluation summary to console
   */
  private printSummary(result: any): void {
    console.log('\n' + '='.repeat(50));
    console.log(`Overall Score: ${result.overallScore}%`);
    console.log(`- Met: ${result.summary.metCriteria}/${result.summary.totalCriteria} (${((result.summary.metCriteria/result.summary.totalCriteria)*100).toFixed(1)}%)`);
    console.log(`- Partial: ${result.summary.partialCriteria}/${result.summary.totalCriteria} (${((result.summary.partialCriteria/result.summary.totalCriteria)*100).toFixed(1)}%)`);
    console.log(`- Missing: ${result.summary.missingCriteria}/${result.summary.totalCriteria} (${((result.summary.missingCriteria/result.summary.totalCriteria)*100).toFixed(1)}%)`);

    const highPriority = result.recommendations.filter((r: any) => r.priority === 'high');
    const mediumPriority = result.recommendations.filter((r: any) => r.priority === 'medium');

    if (result.recommendations.length > 0) {
      console.log(`\nRecommendations:`);
      if (highPriority.length > 0) {
        console.log(`  High priority: ${highPriority.length}`);
      }
      if (mediumPriority.length > 0) {
        console.log(`  Medium priority: ${mediumPriority.length}`);
      }
    }

    console.log('='.repeat(50) + '\n');
  }

  /**
   * Run the CLI
   */
  run(argv?: string[]): void {
    this.program.parse(argv);
  }
}
