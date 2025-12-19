/**
 * Builder - Orchestrates the build process
 */

import fs from 'fs-extra';
import path from 'path';
import { TemplateEngine } from './template-engine';
import { SEOGenerator } from './seo';
import { JSBundler } from './bundler';
import { CSSProcessor } from './css-processor';
import { ProjectConfig, PageConfig, RenderContext, BuildContext } from '../types';
import {
  loadConfig,
  loadPageConfig,
  loadLocale,
  getFiles,
  getPageSlug,
  getOutputPath,
  ensureDir
} from '../utils';

export class Builder {
  private engine: TemplateEngine;
  private config!: ProjectConfig;
  private srcPath: string;
  private distPath: string;
  private isDev: boolean = false;

  constructor() {
    this.engine = new TemplateEngine();
    this.srcPath = path.join(process.cwd(), 'src');
    this.distPath = path.join(process.cwd(), 'dist');
  }

  /**
   * Build all pages
   */
  async build(options: { verbose?: boolean; minify?: boolean; dev?: boolean } = {}): Promise<void> {
    this.isDev = options.dev || false;
    console.log('Building project...\n');

    // Load configuration
    this.config = await loadConfig();

    // Clean dist directory
    await fs.emptyDir(this.distPath);

    // Get all page files
    const pageFiles = await getFiles(path.join(this.srcPath, 'pages'), '.yaml');

    if (pageFiles.length === 0) {
      console.warn('No pages found to build');
      return;
    }

    // Build pages
    const locales = this.config.i18n?.locales || [this.config.i18n?.defaultLocale || 'de'];

    for (const pageFile of pageFiles) {
      const slug = getPageSlug(pageFile);
      const pageConfig = await loadPageConfig(pageFile);

      for (const locale of locales) {
        await this.buildPage(pageConfig, slug, locale, options);
      }
    }

    // Copy assets
    await this.copyAssets();

    // Process CSS (Tailwind, etc.)
    const cssProcessor = new CSSProcessor(this.config);
    await cssProcessor.process();

    // Bundle JavaScript
    const bundler = new JSBundler();
    await bundler.bundleBlocks(options.minify);
    await bundler.bundleGlobalScripts(options.minify);

    // Generate SEO files
    const seoGenerator = new SEOGenerator(this.config);
    await seoGenerator.generateSitemap();
    await seoGenerator.generateRobotsTxt();

    console.log('\nBuild complete!');
  }

  /**
   * Build a single page
   */
  async buildPage(
    pageConfig: PageConfig,
    slug: string,
    locale: string,
    options: { verbose?: boolean } = {}
  ): Promise<void> {
    const defaultLocale = this.config.i18n?.defaultLocale || 'de';
    const outputPath = getOutputPath(slug, locale, defaultLocale);
    const fullOutputPath = path.join(this.distPath, outputPath);

    if (options.verbose) {
      console.log(`Building: ${slug} (${locale}) -> ${outputPath}`);
    }

    // Load locale data
    let localeData: Record<string, any> = {};
    if (this.config.i18n) {
      try {
        localeData = await loadLocale(locale);
      } catch (error) {
        console.warn(`Locale ${locale} not found, using default`);
        localeData = await loadLocale(defaultLocale);
      }
    }

    // Translate page config values
    const translatedPageConfig = this.translatePageConfig(pageConfig, localeData, locale, defaultLocale);

    // Create build context
    const context: BuildContext = {
      page: translatedPageConfig,
      locale,
      localeData,
      config: this.config,
      slug,
      outputPath,
    };

    // Render page
    const html = await this.renderPage(context);

    // Write output
    await ensureDir(path.dirname(fullOutputPath));
    await fs.writeFile(fullOutputPath, html, 'utf-8');

    if (options.verbose) {
      console.log(`  ✓ Written to ${outputPath}`);
    }
  }

  /**
   * Render a page
   */
  private async renderPage(context: BuildContext): Promise<string> {
    const { page, locale, localeData } = context;

    // Load template
    const templatePath = path.join(this.srcPath, 'templates', `${page.template}.html`);
    if (!await fs.pathExists(templatePath)) {
      throw new Error(`Template not found: ${page.template}.html`);
    }
    let template = await fs.readFile(templatePath, 'utf-8');

    // Create render context
    const defaultLocale = this.config.i18n?.defaultLocale || 'de';
    const currentLang = locale || defaultLocale;
    const langPrefix = this.getLangPrefix(locale || defaultLocale, defaultLocale);

    const renderContext: RenderContext = {
      ...context,
      currentLang,
      langPrefix,
      activeNav: page.activeNav,
    };

    // Render blocks
    let blocksHtml = await this.renderBlocks(page.blocks, renderContext);

    // Escape {{ }} in blocks to prevent double-rendering
    // We use temporary placeholders that won't be processed by the template engine
    blocksHtml = blocksHtml.replace(/\{\{/g, '__TEMPLATE_OPEN__').replace(/\}\}/g, '__TEMPLATE_CLOSE__');

    // Collect scripts and styles
    const scripts = await this.collectScripts(page.blocks);
    const styles = await this.collectStyles(page.blocks);

    // Replace placeholders in template
    template = template.replace('{{blocks}}', blocksHtml);
    template = template.replace('{{scripts}}', this.generateScriptTags(scripts));
    template = template.replace('{{styles}}', this.generateStyleTags(styles));

    // Add meta tags
    template = this.injectMetaTags(template, page, renderContext);

    // Render final template
    let output = this.engine.render(template, renderContext);

    // Restore {{ }} that were escaped
    output = output.replace(/__TEMPLATE_OPEN__/g, '{{').replace(/__TEMPLATE_CLOSE__/g, '}}');

    // Inject live reload script in dev mode
    if (this.isDev) {
      const liveReloadScript = `
  <script>
    (function() {
      const ws = new WebSocket('ws://localhost:3001');
      ws.onmessage = () => window.location.reload();
      ws.onerror = () => setTimeout(() => window.location.reload(), 1000);
    })();
  </script>`;
      output = output.replace('</body>', `${liveReloadScript}\n</body>`);
    }

    return output;
  }

  /**
   * Render all blocks
   */
  private async renderBlocks(blocks: any[], context: RenderContext): Promise<string> {
    const rendered: string[] = [];

    for (const blockInstance of blocks) {
      const blockHtml = await this.renderBlock(blockInstance, context);
      rendered.push(blockHtml);
    }

    return rendered.join('\n');
  }

  /**
   * Render a single block
   */
  private async renderBlock(blockInstance: any, context: RenderContext): Promise<string> {
    const blockName = blockInstance.block;
    const blockPath = path.join(this.srcPath, 'blocks', `${blockName}.html`);

    if (!await fs.pathExists(blockPath)) {
      console.warn(`Block not found: ${blockName}.html`);
      return '';
    }

    let blockTemplate = await fs.readFile(blockPath, 'utf-8');

    // Create block context with block props
    const blockContext: RenderContext = {
      ...context,
      ...blockInstance,
    };

    return this.engine.render(blockTemplate, blockContext);
  }

  /**
   * Collect JavaScript files for blocks
   */
  private async collectScripts(blocks: any[]): Promise<string[]> {
    const scripts: string[] = [];

    for (const blockInstance of blocks) {
      const blockName = blockInstance.block;
      const jsPath = path.join(this.srcPath, 'blocks', `${blockName}.js`);

      if (await fs.pathExists(jsPath)) {
        scripts.push(`/assets/js/blocks/${blockName}.js`);
      }
    }

    // Add global scripts
    const globalJsPath = path.join(this.srcPath, 'assets/js/main.js');
    if (await fs.pathExists(globalJsPath)) {
      scripts.push('/assets/js/main.js');
    }

    return scripts;
  }

  /**
   * Collect CSS files for blocks
   */
  private async collectStyles(blocks: any[]): Promise<string[]> {
    const styles: string[] = [];

    for (const blockInstance of blocks) {
      const blockName = blockInstance.block;
      const cssPath = path.join(this.srcPath, 'blocks', `${blockName}.css`);

      if (await fs.pathExists(cssPath)) {
        styles.push(`/assets/css/blocks/${blockName}.css`);
      }
    }

    return styles;
  }

  /**
   * Generate script tags
   */
  private generateScriptTags(scripts: string[]): string {
    return scripts
      .map(src => `<script type="module" src="${src}"></script>`)
      .join('\n  ');
  }

  /**
   * Generate style tags
   */
  private generateStyleTags(styles: string[]): string {
    return styles
      .map(href => `<link rel="stylesheet" href="${href}">`)
      .join('\n  ');
  }

  /**
   * Inject meta tags into template
   */
  private injectMetaTags(template: string, page: PageConfig, context: RenderContext): string {
    const meta = page.meta || {};
    const globalMeta = this.config.meta || {};

    let metaTags = '';

    // Description
    if (meta.description) {
      metaTags += `\n  <meta name="description" content="${meta.description}">`;
    }

    // Keywords
    if (meta.keywords && meta.keywords.length > 0) {
      metaTags += `\n  <meta name="keywords" content="${meta.keywords.join(', ')}">`;
    }

    // Open Graph
    if (meta.description) {
      metaTags += `\n  <meta property="og:title" content="${page.title}">`;
      metaTags += `\n  <meta property="og:description" content="${meta.description}">`;
    }

    if (meta.image) {
      metaTags += `\n  <meta property="og:image" content="${meta.image}">`;
    }

    if (globalMeta.siteUrl) {
      // Clean slug: remove 'index' and ensure proper URL format
      let cleanSlug = context.slug === 'index' ? '' : context.slug;
      cleanSlug = cleanSlug.replace(/\/index$/, ''); // Remove trailing /index

      // Build URL
      let url = globalMeta.siteUrl;
      if (context.langPrefix) {
        url += context.langPrefix;
      }
      if (cleanSlug) {
        url += '/' + cleanSlug;
      }

      metaTags += `\n  <meta property="og:url" content="${url}">`;
    }

    // Twitter Cards
    if (globalMeta.twitterHandle) {
      metaTags += `\n  <meta name="twitter:card" content="summary_large_image">`;
      metaTags += `\n  <meta name="twitter:site" content="${globalMeta.twitterHandle}">`;
    }

    // Canonical
    if (globalMeta.siteUrl) {
      if (!meta.canonical) {
        // Clean slug: remove 'index' and ensure proper URL format
        let cleanSlug = context.slug === 'index' ? '' : context.slug;
        cleanSlug = cleanSlug.replace(/\/index$/, ''); // Remove trailing /index

        // Build URL
        let canonical = globalMeta.siteUrl;
        if (context.langPrefix) {
          canonical += context.langPrefix;
        }
        if (cleanSlug) {
          canonical += '/' + cleanSlug;
        }

        metaTags += `\n  <link rel="canonical" href="${canonical}">`;
      } else {
        metaTags += `\n  <link rel="canonical" href="${meta.canonical}">`;
      }
    }

    // Robots
    if (meta.noindex) {
      metaTags += `\n  <meta name="robots" content="noindex, nofollow">`;
    }

    // Insert meta tags after <head>
    return template.replace('<head>', `<head>${metaTags}`);
  }

  /**
   * Copy static assets
   */
  private async copyAssets(): Promise<void> {
    const assetsPath = path.join(this.srcPath, 'assets');
    const outputAssetsPath = path.join(this.distPath, 'assets');

    if (await fs.pathExists(assetsPath)) {
      await fs.copy(assetsPath, outputAssetsPath);
      console.log('Assets copied');
    }
  }

  /**
   * Get language prefix for URLs
   */
  private getLangPrefix(locale: string, defaultLocale: string): string {
    if (!this.config.i18n) {
      return '';
    }

    const strategy = this.config.i18n.strategy || 'prefix_except_default';

    if (strategy === 'prefix_except_default' && locale === defaultLocale) {
      return '';
    }

    return `/${locale}`;
  }

  /**
   * Translate page config values using template engine
   */
  private translatePageConfig(
    pageConfig: PageConfig,
    localeData: Record<string, any>,
    locale: string,
    defaultLocale: string
  ): PageConfig {
    const renderContext: RenderContext = {
      page: pageConfig,
      locale,
      localeData,
      config: this.config,
      slug: '',
      outputPath: '',
      currentLang: locale || defaultLocale,
      langPrefix: this.getLangPrefix(locale || defaultLocale, defaultLocale),
    };

    // Translate title and description if they contain template syntax
    const translatedConfig = { ...pageConfig };

    if (pageConfig.title && pageConfig.title.includes('{{')) {
      translatedConfig.title = this.engine.render(pageConfig.title, renderContext);
    }

    if (pageConfig.meta?.description && pageConfig.meta.description.includes('{{')) {
      translatedConfig.meta = {
        ...pageConfig.meta,
        description: this.engine.render(pageConfig.meta.description, renderContext),
      };
    }

    // Translate block properties recursively
    translatedConfig.blocks = pageConfig.blocks.map(block => {
      const translatedBlock: any = { ...block };

      Object.keys(block).forEach(key => {
        const value = block[key];
        // Skip 'code' property to preserve template syntax in code examples
        if (key === 'code') {
          return;
        }
        if (typeof value === 'string' && value.includes('{{')) {
          translatedBlock[key] = this.engine.render(value, renderContext);
        }
      });

      return translatedBlock;
    });

    return translatedConfig;
  }
}
