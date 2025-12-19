/**
 * Template Engine - Handles parsing and rendering of templates
 */

import { RenderContext, TemplateHelpers, TemplateHelper } from '../types';
import { getNestedValue } from '../utils';

export class TemplateEngine {
  private helpers: TemplateHelpers = {};

  constructor() {
    this.registerDefaultHelpers();
  }

  /**
   * Register a custom helper function
   */
  registerHelper(name: string, fn: TemplateHelper): void {
    this.helpers[name] = fn;
  }

  /**
   * Render a template with context
   */
  render(template: string, context: RenderContext): string {
    let output = template;

    // Process conditionals: {{#if condition}}...{{/if}}
    output = this.processConditionals(output, context);

    // Process loops: {{#each items}}...{{/each}}
    output = this.processLoops(output, context);

    // Process helpers: {{helper:arg}}
    output = this.processHelpers(output, context);

    // Process simple variables: {{variable}}
    output = this.processVariables(output, context);

    return output;
  }

  /**
   * Process conditional blocks
   * Loops to handle nested conditionals
   */
  private processConditionals(template: string, context: RenderContext): string {
    const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{#else\}\}([\s\S]*?))?\{\{\/if\}\}/g;

    let output = template;
    let previousOutput = '';

    // Keep processing until no more conditionals are found
    while (output !== previousOutput && ifRegex.test(output)) {
      previousOutput = output;
      ifRegex.lastIndex = 0; // Reset regex state

      output = output.replace(ifRegex, (match, condition, trueBranch, falseBranch = '') => {
        const conditionValue = this.evaluateCondition(condition.trim(), context);
        return conditionValue ? trueBranch : falseBranch;
      });
    }

    return output;
  }

  /**
   * Process loop blocks
   */
  private processLoops(template: string, context: RenderContext): string {
    const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(eachRegex, (match, variable, loopContent) => {
      const items = getNestedValue(context, variable.trim());

      if (!Array.isArray(items)) {
        return '';
      }

      return items.map((item, index) => {
        const loopContext = {
          ...context,
          ...item,
          '@index': index,
          '@first': index === 0,
          '@last': index === items.length - 1,
        };
        return this.render(loopContent, loopContext);
      }).join('');
    });
  }

  /**
   * Process helper functions
   */
  private processHelpers(template: string, context: RenderContext): string {
    const helperRegex = /\{\{([a-zA-Z0-9_]+):([^}]+)\}\}/g;

    return template.replace(helperRegex, (match, helperName, args) => {
      const helper = this.helpers[helperName];
      if (!helper) {
        console.warn(`Helper not found: ${helperName}`);
        return match;
      }

      try {
        const argList = args.split(',').map((arg: string) => arg.trim());
        return helper(context, ...argList);
      } catch (error) {
        console.error(`Error in helper ${helperName}:`, error);
        return match;
      }
    });
  }

  /**
   * Process simple variable substitutions
   */
  private processVariables(template: string, context: RenderContext): string {
    const varRegex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

    return template.replace(varRegex, (match, variable) => {
      const value = getNestedValue(context, variable.trim());
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: string, context: RenderContext): boolean {
    // Handle negation
    if (condition.startsWith('!')) {
      return !this.evaluateCondition(condition.slice(1), context);
    }

    const value = getNestedValue(context, condition);

    // Check for truthy values
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return Boolean(value);
  }

  /**
   * Register default helper functions
   */
  private registerDefaultHelpers(): void {
    // Translation helper
    this.registerHelper('translate', (context, key) => {
      if (!context.localeData) {
        return key;
      }
      const translation = getNestedValue(context.localeData, key);
      return translation || key;
    });

    // Short alias for translate
    this.registerHelper('t', (context, key) => {
      return this.helpers.translate(context, key);
    });

    // Current language
    this.registerHelper('currentLang', (context) => {
      return context.currentLang || context.config.i18n?.defaultLocale || 'de';
    });

    // Language prefix for URLs
    this.registerHelper('langPrefix', (context) => {
      return context.langPrefix || '';
    });

    // Active navigation check
    // Usage: {{active:/path/}} or {{active:/path/,custom-class another-class}}
    this.registerHelper('active', (context, path, customClasses) => {
      const currentPath = '/' + (context.activeNav || context.slug);
      const normalizedPath = path.endsWith('/') ? path : path + '/';
      const normalizedCurrent = currentPath.endsWith('/') ? currentPath : currentPath + '/';

      const isActive = normalizedCurrent === normalizedPath ||
                       (normalizedPath === '/' && normalizedCurrent === '/');

      if (isActive) {
        // Use custom classes if provided, otherwise default to 'active'
        return customClasses || 'active';
      }

      return '';
    });

    // Language active check - returns custom classes if language matches current language
    // Usage: {{langActive:de,bg-white/10}} or {{langActive:en}}
    this.registerHelper('langActive', (context, lang, customClasses) => {
      const currentLang = context.currentLang || context.config.i18n?.defaultLocale || 'de';
      const isActive = currentLang.toLowerCase() === lang.toLowerCase();

      if (isActive) {
        return customClasses || 'active';
      }

      return '';
    });

    // Icon helper (basic implementation, can be extended)
    this.registerHelper('icon', (context, name, ...classes) => {
      const iconLib = context.config.icons;

      if (iconLib === 'lucide') {
        const classStr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
        return `<i data-lucide="${name}"${classStr}></i>`;
      } else {
        const classStr = classes.length > 0 ? ` ${classes.join(' ')}` : '';
        return `<i class="fa fa-${name}${classStr}"></i>`;
      }
    });

    // URL helper with language prefix
    this.registerHelper('url', (context, path) => {
      const baseUrl = context.baseUrl || '';
      const prefix = context.langPrefix || '';
      let normalizedPath = path.startsWith('/') ? path : `/${path}`;
      // Remove trailing slash unless it's the root path
      if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
        normalizedPath = normalizedPath.slice(0, -1);
      }
      return `${baseUrl}${prefix}${normalizedPath}`;
    });

    // Asset URL helper
    this.registerHelper('asset', (context, path) => {
      const baseUrl = context.baseUrl || '';
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${baseUrl}${normalizedPath}`;
    });

    // Year helper (for copyright notices)
    this.registerHelper('year', () => {
      return new Date().getFullYear().toString();
    });

    // JSON stringify helper
    this.registerHelper('json', (context, data) => {
      const value = typeof data === 'string' ? getNestedValue(context, data) : data;
      return JSON.stringify(value);
    });

    // HTML escape helper for code examples
    this.registerHelper('escape', (context, text) => {
      const value = typeof text === 'string' ? getNestedValue(context, text) : text;
      if (typeof value !== 'string') return '';
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\{\{/g, '&#123;&#123;')
        .replace(/\}\}/g, '&#125;&#125;');
    });
  }
}
