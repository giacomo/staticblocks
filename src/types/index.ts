/**
 * StaticBlocks Type Definitions
 */

// ============================================================================
// Project Configuration
// ============================================================================

export interface ProjectConfig {
  css: 'tailwind' | 'bootstrap';
  icons: 'lucide' | 'fontawesome';
  port?: number;
  i18n?: I18nConfig;
  scripts?: ScriptConfig;
  meta?: GlobalMetaData;
}

export interface I18nConfig {
  defaultLocale: string;
  locales: string[];
  strategy: 'prefix' | 'prefix_except_default';
}

export interface ScriptConfig {
  external?: string[];
  globals?: Record<string, string>;
}

export interface GlobalMetaData {
  siteName?: string;
  siteUrl?: string;
  author?: string;
  twitterHandle?: string;
}

// ============================================================================
// Page Configuration
// ============================================================================

export interface PageConfig {
  template: string;
  title: string;
  lang?: string;
  activeNav?: string;
  meta?: PageMetaData;
  blocks: BlockInstance[];
  data?: Record<string, any>;
}

export interface PageMetaData {
  description?: string;
  keywords?: string[];
  image?: string;
  noindex?: boolean;
  canonical?: string;
}

export interface BlockInstance {
  block: string;
  [key: string]: any; // Props for the block
}

// ============================================================================
// Build Context
// ============================================================================

export interface BuildContext {
  page: PageConfig;
  locale?: string;
  localeData?: Record<string, any>;
  config: ProjectConfig;
  slug: string;
  outputPath: string;
}

export interface RenderContext extends BuildContext {
  currentLang: string;
  langPrefix: string;
  activeNav?: string;
}

// ============================================================================
// Template Engine
// ============================================================================

export interface TemplateData {
  [key: string]: any;
}

export interface TemplateHelper {
  (context: RenderContext, ...args: any[]): string;
}

export interface TemplateHelpers {
  [name: string]: TemplateHelper;
}

// ============================================================================
// CLI Options
// ============================================================================

export interface GenerateOptions {
  type: 'block' | 'template' | 'page';
  name: string;
  withJs?: boolean;
  withCss?: boolean;
}

export interface AddOptions {
  type: 'locale' | 'script';
  name: string;
}

export interface BuildOptions {
  verbose?: boolean;
  minify?: boolean;
  dev?: boolean;
}

export interface DevOptions {
  port?: number;
  open?: boolean;
}

// ============================================================================
// Asset Pipeline
// ============================================================================

export interface Asset {
  type: 'css' | 'js' | 'image' | 'font';
  source: string;
  output: string;
  hash?: string;
}

export interface BundleResult {
  code: string;
  map?: string;
  assets?: Asset[];
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  file?: string;
  line?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
