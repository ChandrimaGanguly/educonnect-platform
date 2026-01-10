/**
 * Interactive Content Handler
 *
 * Handles interactive content including simulations, diagrams,
 * flashcards, quizzes, and other engaging learning elements.
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

export class InteractiveContentHandler extends BaseContentHandler {
  contentType = 'interactive' as const;
  supportedMimeTypes = ['application/json', 'text/html'];
  supportsOffline = false; // Some interactions may require server
  supportsTextAlternative = true;

  // Supported interactive element types
  private elementTypes = [
    'simulation',
    'diagram',
    'quiz_widget',
    'flashcard',
    'timeline',
    'map',
    'chart',
    'calculator',
    'form',
    'custom',
  ];

  validate(data: CreateContentItemDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.content_text) {
      errors.push('Interactive content requires content_text with element configuration');
    }

    if (!data.text_alternative) {
      warnings.push('Interactive content should have a text alternative for accessibility');
    }

    if (!data.description) {
      warnings.push('Interactive content should have a description');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async process(content: ContentItem): Promise<ContentItem> {
    // In a real implementation, this would:
    // 1. Validate the interactive configuration
    // 2. Pre-generate static versions where possible
    // 3. Set up required dependencies

    return {
      ...content,
      estimated_bandwidth_kb: 200, // Interactive content is moderately heavy
    };
  }

  generateOptimizationPlan(
    content: ContentItem,
    options: OptimizationOptions
  ): OptimizationResult {
    const variants = [];

    // Preview/thumbnail variant
    variants.push({
      variantType: 'thumbnail' as VariantType,
      optimizedForNetwork: 'any' as const,
      config: {
        format: 'webp',
        maxWidth: 400,
        maxHeight: 300,
        static: true,
      },
    });

    // Text-only variant
    if (options.generateTextAlternative) {
      variants.push({
        variantType: 'text_only' as VariantType,
        optimizedForNetwork: '2g' as const,
        config: {
          format: 'text',
          extractDescription: true,
        },
      });
    }

    return {
      success: true,
      variants,
      textAlternative: content.text_alternative || undefined,
    };
  }

  async generateTextAlternative(content: ContentItem): Promise<string | null> {
    if (content.text_alternative) {
      return content.text_alternative;
    }

    // Parse interactive config
    let config: {
      element_type?: string;
      title?: string;
      description?: string;
      data?: unknown;
    } = {};

    try {
      if (content.content_text) {
        config = JSON.parse(content.content_text);
      }
    } catch {
      // Not JSON, use as is
    }

    return `Interactive Element: ${content.title}\n` +
      `Type: ${config.element_type || 'Interactive'}\n\n` +
      `${config.description || content.description || 'No text description available.'}`;
  }

  render(content: ContentItem, options: RenderOptions): RenderResult {
    if (options.textOnly) {
      return this.renderTextOnly(content);
    }

    // Parse interactive configuration
    let config: {
      element_type?: string;
      title?: string;
      config?: Record<string, unknown>;
      data?: Record<string, unknown>;
      renderer?: string;
      custom_html?: string;
      custom_css?: string;
      custom_js?: string;
    } = {};

    try {
      if (content.content_text) {
        config = JSON.parse(content.content_text);
      }
    } catch {
      // Plain content
    }

    const elementType = config.element_type || 'custom';
    const elementId = `interactive-${content.id}`;

    // Render based on element type
    let html: string;
    let scripts: string[] = [];
    let styles: string[] = [];

    switch (elementType) {
      case 'quiz_widget':
        ({ html, scripts, styles } = this.renderQuizWidget(content, config, elementId));
        break;
      case 'flashcard':
        ({ html, scripts, styles } = this.renderFlashcard(content, config, elementId));
        break;
      case 'timeline':
        ({ html, scripts, styles } = this.renderTimeline(content, config, elementId));
        break;
      case 'chart':
        ({ html, scripts, styles } = this.renderChart(content, config, elementId));
        break;
      case 'diagram':
        ({ html, scripts, styles } = this.renderDiagram(content, config, elementId));
        break;
      case 'simulation':
        ({ html, scripts, styles } = this.renderSimulation(content, config, elementId));
        break;
      case 'custom':
      default:
        ({ html, scripts, styles } = this.renderCustomElement(content, config, elementId));
    }

    return {
      html,
      scripts,
      styles,
      metadata: {
        elementType,
        interactive: true,
        requiresServer: ['simulation', 'form'].includes(elementType),
      },
    };
  }

  checkAccessibility(content: ContentItem): AccessibilityChecks {
    const missingRequirements: string[] = [];

    if (!content.text_alternative) {
      missingRequirements.push('Interactive element must have text alternative (WCAG 1.1.1)');
    }

    if (!content.description) {
      missingRequirements.push('Interactive element should have a description');
    }

    // Parse config to check for accessibility settings
    let config: { keyboard_accessible?: boolean; screen_reader_accessible?: boolean } = {};
    try {
      if (content.content_text) {
        config = JSON.parse(content.content_text);
      }
    } catch {
      // Not JSON
    }

    const isKeyboardAccessible = config.keyboard_accessible !== false;
    if (!isKeyboardAccessible) {
      missingRequirements.push('Interactive element should be keyboard accessible (WCAG 2.1.1)');
    }

    return {
      hasAltText: !!content.text_alternative,
      hasTranscript: !!content.text_alternative,
      hasCaptions: true, // Not applicable unless has video
      isKeyboardAccessible,
      isScreenReaderCompatible: !!content.text_alternative && isKeyboardAccessible,
      missingRequirements,
    };
  }

  estimateBandwidth(content: ContentItem): number {
    // Interactive content varies widely
    // Base estimate plus data size
    const baseKb = 100;
    const dataKb = content.content_text ? Math.ceil(content.content_text.length / 1024) : 0;
    return baseKb + dataKb;
  }

  getRequiredVariants(): VariantType[] {
    return ['thumbnail', 'text_only'];
  }

  private renderTextOnly(content: ContentItem): RenderResult {
    const html = `
      <div class="interactive-text-alternative" role="article">
        <div class="interactive-placeholder">
          <span class="icon">🎮</span>
          <span class="label">Interactive Element</span>
        </div>
        <h2>${this.escapeHtml(content.title)}</h2>
        <div class="description">
          ${content.text_alternative || content.description || 'Interactive content - requires JavaScript enabled.'}
        </div>
        <p class="notice">
          ⚠️ This interactive element requires a full browser with JavaScript enabled.
        </p>
      </div>
    `;

    return {
      html,
      metadata: { mode: 'text_only' },
    };
  }

  private renderQuizWidget(
    content: ContentItem,
    config: Record<string, unknown>,
    elementId: string
  ): { html: string; scripts: string[]; styles: string[] } {
    const data = config.data as { questions?: Array<{ question: string; options: string[]; correct: number }> } || { questions: [] };
    const questions = data.questions || [];

    const html = `
      <div class="quiz-widget" id="${elementId}" role="region" aria-label="Quiz: ${this.escapeAttr(content.title)}">
        <h2>${this.escapeHtml(content.title)}</h2>
        <form class="quiz-form" aria-describedby="${elementId}-instructions">
          <p id="${elementId}-instructions" class="quiz-instructions">
            Answer the following questions. Select the best answer for each.
          </p>
          ${questions.map((q, i) => `
            <fieldset class="question" data-index="${i}">
              <legend>${i + 1}. ${this.escapeHtml(q.question)}</legend>
              ${q.options.map((opt: string, j: number) => `
                <label class="option">
                  <input type="radio" name="q${i}" value="${j}" aria-label="Option ${j + 1}" />
                  <span>${this.escapeHtml(opt)}</span>
                </label>
              `).join('')}
            </fieldset>
          `).join('')}
          <button type="submit" class="btn-submit-quiz">Submit Answers</button>
        </form>
        <div class="quiz-results" hidden aria-live="polite"></div>
      </div>
    `;

    return {
      html,
      scripts: ['/js/quiz-widget.js'],
      styles: ['/css/quiz-widget.css'],
    };
  }

  private renderFlashcard(
    content: ContentItem,
    config: Record<string, unknown>,
    elementId: string
  ): { html: string; scripts: string[]; styles: string[] } {
    const data = config.data as { cards?: Array<{ front: string; back: string }> } || { cards: [] };
    const cards = data.cards || [];

    const html = `
      <div class="flashcard-widget" id="${elementId}" role="application" aria-label="Flashcards: ${this.escapeAttr(content.title)}">
        <h2>${this.escapeHtml(content.title)}</h2>
        <div class="flashcard-container">
          <div class="flashcard" tabindex="0" role="button" aria-pressed="false">
            <div class="card-front"></div>
            <div class="card-back" hidden></div>
          </div>
        </div>
        <div class="flashcard-controls">
          <button class="btn-prev" aria-label="Previous card" disabled>← Previous</button>
          <span class="card-counter">1 / ${cards.length}</span>
          <button class="btn-next" aria-label="Next card">Next →</button>
        </div>
        <button class="btn-shuffle" aria-label="Shuffle cards">🔀 Shuffle</button>
        <script type="application/json" class="flashcard-data">${JSON.stringify(cards)}</script>
      </div>
    `;

    return {
      html,
      scripts: ['/js/flashcard-widget.js'],
      styles: ['/css/flashcard-widget.css'],
    };
  }

  private renderTimeline(
    content: ContentItem,
    config: Record<string, unknown>,
    elementId: string
  ): { html: string; scripts: string[]; styles: string[] } {
    const data = config.data as { events?: Array<{ date: string; title: string; description: string }> } || { events: [] };
    const events = data.events || [];

    const html = `
      <div class="timeline-widget" id="${elementId}" role="region" aria-label="Timeline: ${this.escapeAttr(content.title)}">
        <h2>${this.escapeHtml(content.title)}</h2>
        <div class="timeline-container" role="list">
          ${events.map((event, i) => `
            <div class="timeline-event" role="listitem">
              <div class="event-date">${this.escapeHtml(event.date)}</div>
              <div class="event-content">
                <h3>${this.escapeHtml(event.title)}</h3>
                <p>${this.escapeHtml(event.description)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    return {
      html,
      scripts: ['/js/timeline-widget.js'],
      styles: ['/css/timeline-widget.css'],
    };
  }

  private renderChart(
    content: ContentItem,
    config: Record<string, unknown>,
    elementId: string
  ): { html: string; scripts: string[]; styles: string[] } {
    const chartConfig = config.config as { type?: string } || {};
    const chartType = chartConfig.type || 'bar';

    const html = `
      <div class="chart-widget" id="${elementId}" role="img" aria-label="Chart: ${this.escapeAttr(content.title)}">
        <h2>${this.escapeHtml(content.title)}</h2>
        <canvas class="chart-canvas" aria-hidden="true"></canvas>
        <div class="chart-accessible-table sr-only">
          <!-- Data table for screen readers - populated by JS -->
        </div>
        <script type="application/json" class="chart-config">${JSON.stringify({ type: chartType, ...config })}</script>
      </div>
    `;

    return {
      html,
      scripts: [
        'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
        '/js/chart-widget.js',
      ],
      styles: ['/css/chart-widget.css'],
    };
  }

  private renderDiagram(
    content: ContentItem,
    config: Record<string, unknown>,
    elementId: string
  ): { html: string; scripts: string[]; styles: string[] } {
    const html = `
      <div class="diagram-widget" id="${elementId}" role="img" aria-label="Diagram: ${this.escapeAttr(content.title)}">
        <h2>${this.escapeHtml(content.title)}</h2>
        <div class="diagram-container">
          <svg class="diagram-svg" role="img" aria-label="${this.escapeAttr(content.description || content.title)}">
            <!-- SVG content rendered by JS -->
          </svg>
        </div>
        <p class="diagram-description">${this.escapeHtml(content.description || '')}</p>
        <script type="application/json" class="diagram-config">${JSON.stringify(config)}</script>
      </div>
    `;

    return {
      html,
      scripts: ['/js/diagram-widget.js'],
      styles: ['/css/diagram-widget.css'],
    };
  }

  private renderSimulation(
    content: ContentItem,
    config: Record<string, unknown>,
    elementId: string
  ): { html: string; scripts: string[]; styles: string[] } {
    const html = `
      <div class="simulation-widget" id="${elementId}" role="application" aria-label="Simulation: ${this.escapeAttr(content.title)}">
        <h2>${this.escapeHtml(content.title)}</h2>
        <div class="simulation-container">
          <canvas class="simulation-canvas" tabindex="0" aria-label="Interactive simulation"></canvas>
        </div>
        <div class="simulation-controls">
          <button class="btn-play" aria-label="Play simulation">▶ Play</button>
          <button class="btn-pause" aria-label="Pause simulation" hidden>⏸ Pause</button>
          <button class="btn-reset" aria-label="Reset simulation">↺ Reset</button>
        </div>
        <p class="simulation-instructions">${this.escapeHtml(content.description || '')}</p>
        <script type="application/json" class="simulation-config">${JSON.stringify(config)}</script>
      </div>
    `;

    return {
      html,
      scripts: ['/js/simulation-widget.js'],
      styles: ['/css/simulation-widget.css'],
    };
  }

  private renderCustomElement(
    content: ContentItem,
    config: Record<string, unknown>,
    elementId: string
  ): { html: string; scripts: string[]; styles: string[] } {
    const customHtml = config.custom_html as string || '';
    const customCss = config.custom_css as string || '';
    const customJs = config.custom_js as string || '';

    const html = `
      <div class="custom-interactive" id="${elementId}" role="region" aria-label="${this.escapeAttr(content.title)}">
        <h2>${this.escapeHtml(content.title)}</h2>
        ${customCss ? `<style>${customCss}</style>` : ''}
        <div class="custom-content">
          ${this.sanitizeHtml(customHtml)}
        </div>
        ${customJs ? `<script>${customJs}</script>` : ''}
      </div>
    `;

    return {
      html,
      scripts: [],
      styles: ['/css/custom-interactive.css'],
    };
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
