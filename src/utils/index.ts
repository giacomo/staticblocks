import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import * as esbuild from 'esbuild';
import { ProjectConfig, PageConfig } from '../types';

/**
 * Load project configuration
 */
export async function loadConfig(): Promise<ProjectConfig> {
  const configPathTS = path.join(process.cwd(), 'staticblocks.config.ts');
  const configPathJS = path.join(process.cwd(), 'staticblocks.config.js');

  let configPath: string;
  let needsCompile = false;

  if (await fs.pathExists(configPathTS)) {
    configPath = configPathTS;
    needsCompile = true;
  } else if (await fs.pathExists(configPathJS)) {
    configPath = configPathJS;
  } else {
    throw new Error('staticblocks.config.ts or .js not found. Are you in a StaticBlocks project?');
  }

  // If TypeScript config, compile it first
  if (needsCompile) {
    const tempConfigPath = path.join(process.cwd(), '.staticblocks.config.temp.js');

    try {
      await esbuild.build({
        entryPoints: [configPath],
        bundle: false,
        platform: 'node',
        format: 'cjs',
        outfile: tempConfigPath,
      });

      // Clear require cache
      delete require.cache[require.resolve(tempConfigPath)];
      const config = require(tempConfigPath);

      // Cleanup temp file
      await fs.remove(tempConfigPath);

      return config.default || config;
    } catch (error) {
      throw new Error(`Failed to load config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Load JS config directly
  delete require.cache[require.resolve(configPath)];
  const config = require(configPath);
  return config.default || config;
}

/**
 * Load page configuration from YAML
 */
export async function loadPageConfig(pagePath: string): Promise<PageConfig> {
  const content = await fs.readFile(pagePath, 'utf-8');
  return yaml.load(content) as PageConfig;
}

/**
 * Load locale data
 */
export async function loadLocale(locale: string): Promise<Record<string, any>> {
  const localePath = path.join(process.cwd(), 'src/locales', `${locale}.json`);
  
  if (!await fs.pathExists(localePath)) {
    throw new Error(`Locale file not found: ${locale}.json`);
  }

  return await fs.readJSON(localePath);
}

/**
 * Get nested value from object by dot notation
 * Example: get(obj, 'nav.home') returns obj.nav.home
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Copy directory recursively
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  await fs.copy(src, dest, { overwrite: true });
}

/**
 * Get all files in directory with specific extension
 */
export async function getFiles(dir: string, ext: string): Promise<string[]> {
  const files: string[] = [];
  
  if (!await fs.pathExists(dir)) {
    return files;
  }

  const items = await fs.readdir(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.stat(fullPath);
    
    if (stat.isDirectory()) {
      const subFiles = await getFiles(fullPath, ext);
      files.push(...subFiles);
    } else if (item.endsWith(ext)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Get page slug from file path
 * Example: src/pages/about.yaml -> about
 * Example: src/pages/blog/post.yaml -> blog/post
 */
export function getPageSlug(pagePath: string): string {
  const relative = path.relative(path.join(process.cwd(), 'src/pages'), pagePath);
  return relative.replace(/\.yaml$/, '');
}

/**
 * Generate output path for page (relative to dist directory)
 * Example: about -> about/index.html
 * Example: index -> index.html
 */
export function getOutputPath(slug: string, locale?: string, defaultLocale?: string): string {
  const parts: string[] = [];

  // Add locale prefix if needed
  if (locale && locale !== defaultLocale) {
    parts.push(locale);
  }

  // Add slug
  if (slug === 'index') {
    parts.push('index.html');
  } else {
    parts.push(slug, 'index.html');
  }

  return path.join(...parts);
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Measure execution time
 */
export async function measure<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  
  if (label) {
    console.log(`${label}: ${duration}ms`);
  }
  
  return { result, duration };
}