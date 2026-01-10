/**
 * Code Content Handler
 *
 * Handles interactive code exercises with sandbox execution,
 * syntax highlighting, and automated testing.
 */

import {
  ContentItem,
  CreateContentItemDto,
  VariantType,
} from '../../types/content.types';
import {
  BaseContentHandler,
  ValidationResult,
  OptimizationOptions,
  OptimizationResult,
  RenderOptions,
  RenderResult,
  AccessibilityChecks,
} from './base-handler';

export class CodeContentHandler extends BaseContentHandler {
  contentType = 'code' as const;
  supportedMimeTypes = ['application/json', 'text/plain'];
  supportsOffline = false; // Code execution requires server
  supportsTextAlternative = true;

  // Supported programming languages
  private supportedLanguages = [
    'javascript',
    'typescript',
    'python',
    'java',
    'csharp',
    'cpp',
    'go',
    'rust',
    'ruby',
    'php',
    'swift',
    'kotlin',
    'sql',
    'html',
    'css',
  ];

  validate(data: CreateContentItemDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.content_text) {
      errors.push('Code content requires content_text with exercise definition');
    }

    if (!data.description) {
      warnings.push('Code exercise should have a description explaining the task');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async process(content: ContentItem): Promise<ContentItem> {
    // In a real implementation, this would:
    // 1. Parse and validate the code exercise definition
    // 2. Set up sandbox environment
    // 3. Validate test cases

    return {
      ...content,
      // Code exercises are lightweight in terms of bandwidth
      estimated_bandwidth_kb: 50,
    };
  }

  generateOptimizationPlan(
    content: ContentItem,
    options: OptimizationOptions
  ): OptimizationResult {
    // Code exercises don't need variants - they're already lightweight JSON
    const variants = [];

    // Text-only variant shows the code without interactive features
    if (options.generateTextAlternative) {
      variants.push({
        variantType: 'text_only' as VariantType,
        optimizedForNetwork: '2g' as const,
        config: {
          format: 'text',
          stripInteractive: true,
        },
      });
    }

    return {
      success: true,
      variants,
      textAlternative: this.generateCodeTextAlternative(content),
    };
  }

  async generateTextAlternative(content: ContentItem): Promise<string | null> {
    return this.generateCodeTextAlternative(content);
  }

  private generateCodeTextAlternative(content: ContentItem): string {
    // Parse exercise data if available
    let exerciseData: {
      language?: string;
      starter_code?: string;
      instructions?: string;
    } = {};

    try {
      if (content.content_text) {
        exerciseData = JSON.parse(content.content_text);
      }
    } catch {
      // Content might be plain code
    }

    const language = exerciseData.language || 'Unknown';
    const starterCode = exerciseData.starter_code || content.content_text || '';
    const instructions = exerciseData.instructions || content.description || '';

    return `Code Exercise: ${content.title}\n` +
      `Language: ${language}\n\n` +
      `Instructions:\n${instructions}\n\n` +
      `Starter Code:\n\`\`\`${language}\n${starterCode}\n\`\`\``;
  }

  render(content: ContentItem, options: RenderOptions): RenderResult {
    if (options.textOnly) {
      return this.renderTextOnly(content);
    }

    const codeId = `code-${content.id}`;

    // Parse exercise data
    let exerciseData: {
      language?: string;
      starter_code?: string;
      instructions?: string;
      hints?: string;
      test_code?: string;
    } = {};

    try {
      if (content.content_text) {
        exerciseData = JSON.parse(content.content_text);
      }
    } catch {
      // Plain code content
      exerciseData = {
        starter_code: content.content_text || '',
        language: 'javascript',
      };
    }

    const language = exerciseData.language || 'javascript';
    const starterCode = exerciseData.starter_code || '';
    const instructions = exerciseData.instructions || content.description || '';
    const hints = exerciseData.hints || '';

    const html = `
      <div class="code-exercise-container" id="${codeId}" role="application" aria-label="Code Exercise: ${this.escapeAttr(content.title)}">
        <header class="exercise-header">
          <h2>${this.escapeHtml(content.title)}</h2>
          <span class="language-badge">${language}</span>
        </header>

        <section class="exercise-instructions" aria-labelledby="${codeId}-instructions-heading">
          <h3 id="${codeId}-instructions-heading">Instructions</h3>
          <div class="instructions-content">
            ${this.markdownToHtml(instructions)}
          </div>
        </section>

        <section class="code-editor-section" aria-labelledby="${codeId}-editor-heading">
          <h3 id="${codeId}-editor-heading" class="sr-only">Code Editor</h3>
          <div class="editor-toolbar">
            <button class="btn-reset" aria-label="Reset code">↺ Reset</button>
            <button class="btn-format" aria-label="Format code">⚡ Format</button>
            <select class="theme-selector" aria-label="Editor theme">
              <option value="light">Light Theme</option>
              <option value="dark">Dark Theme</option>
            </select>
          </div>
          <div
            class="code-editor"
            data-language="${language}"
            data-content-id="${content.id}"
            role="textbox"
            aria-multiline="true"
            aria-label="Code editor"
            tabindex="0"
          >
            <pre><code class="language-${language}">${this.escapeHtml(starterCode)}</code></pre>
          </div>
        </section>

        <section class="exercise-actions">
          <button class="btn-run" aria-label="Run code">▶ Run</button>
          <button class="btn-test" aria-label="Run tests">✓ Test</button>
          <button class="btn-submit" aria-label="Submit solution">Submit</button>
        </section>

        <section class="output-section" aria-live="polite" aria-labelledby="${codeId}-output-heading">
          <h3 id="${codeId}-output-heading">Output</h3>
          <div class="output-tabs" role="tablist">
            <button role="tab" aria-selected="true" id="${codeId}-tab-console">Console</button>
            <button role="tab" aria-selected="false" id="${codeId}-tab-tests">Tests</button>
          </div>
          <div class="output-content" role="tabpanel" aria-labelledby="${codeId}-tab-console">
            <pre class="console-output"></pre>
          </div>
        </section>

        ${hints ? this.renderHintsSection(hints, codeId) : ''}

        <input type="hidden" class="starter-code" value="${this.escapeAttr(starterCode)}" />
      </div>
    `;

    return {
      html,
      scripts: [
        'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js',
        '/js/code-editor.js',
      ],
      styles: [
        '/css/code-editor.css',
        'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css',
      ],
      metadata: {
        language,
        hasTests: !!exerciseData.test_code,
        interactive: !options.textOnly,
      },
    };
  }

  checkAccessibility(content: ContentItem): AccessibilityChecks {
    const missingRequirements: string[] = [];

    if (!content.description) {
      missingRequirements.push('Code exercise should have instructions');
    }

    return {
      hasAltText: !!content.description,
      hasTranscript: true, // Code is text-based
      hasCaptions: true, // Not applicable
      isKeyboardAccessible: true,
      isScreenReaderCompatible: true,
      missingRequirements,
    };
  }

  estimateBandwidth(content: ContentItem): number {
    // Code exercises are lightweight - just JSON
    const codeSize = content.content_text?.length || 0;
    return Math.ceil(codeSize / 1024) + 50; // Plus overhead for editor JS
  }

  getRequiredVariants(): VariantType[] {
    return ['text_only'];
  }

  private renderTextOnly(content: ContentItem): RenderResult {
    let exerciseData: {
      language?: string;
      starter_code?: string;
      instructions?: string;
    } = {};

    try {
      if (content.content_text) {
        exerciseData = JSON.parse(content.content_text);
      }
    } catch {
      exerciseData = { starter_code: content.content_text || '' };
    }

    const language = exerciseData.language || 'code';
    const starterCode = exerciseData.starter_code || '';
    const instructions = exerciseData.instructions || content.description || '';

    const html = `
      <div class="code-text-alternative" role="article">
        <header>
          <h2>${this.escapeHtml(content.title)}</h2>
          <span class="language-badge">${language}</span>
        </header>

        <section class="instructions">
          <h3>Instructions</h3>
          ${this.markdownToHtml(instructions)}
        </section>

        <section class="code-display">
          <h3>Starter Code</h3>
          <pre><code class="language-${language}">${this.escapeHtml(starterCode)}</code></pre>
        </section>

        <p class="offline-notice">
          ⚠️ Code execution requires an internet connection.
          Copy this code to practice in your local development environment.
        </p>
      </div>
    `;

    return {
      html,
      styles: ['https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css'],
      scripts: ['https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js'],
      metadata: {
        mode: 'text_only',
        language,
      },
    };
  }

  private renderHintsSection(hints: string, codeId: string): string {
    const hintList = hints.split('\n').filter((h) => h.trim());

    return `
      <section class="hints-section" aria-labelledby="${codeId}-hints-heading">
        <h3 id="${codeId}-hints-heading">Hints</h3>
        <div class="hints-list">
          ${hintList.map((hint, i) => `
            <details class="hint">
              <summary>Hint ${i + 1}</summary>
              <p>${this.escapeHtml(hint)}</p>
            </details>
          `).join('')}
        </div>
      </section>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeAttr(text: string): string {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}
