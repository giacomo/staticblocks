/**
 * JavaScript Bundler - Handles JS bundling with esbuild
 */

import * as esbuild from 'esbuild';
import fs from 'fs-extra';
import path from 'path';

export interface BundleOptions {
  entryPoints: string[];
  outdir: string;
  minify?: boolean;
  sourcemap?: boolean;
}

export class JSBundler {
  /**
   * Bundle JavaScript files
   */
  async bundle(options: BundleOptions): Promise<void> {
    if (options.entryPoints.length === 0) {
      return;
    }

    try {
      await esbuild.build({
        entryPoints: options.entryPoints,
        bundle: true,
        outdir: options.outdir,
        format: 'esm',
        splitting: true,
        minify: options.minify || false,
        sourcemap: options.sourcemap || false,
        target: ['es2020'],
        platform: 'browser',
      });
    } catch (error) {
      console.error('Failed to bundle JavaScript:', error);
      throw error;
    }
  }

  /**
   * Bundle all block JavaScript files
   */
  async bundleBlocks(minify: boolean = false): Promise<void> {
    const blocksPath = path.join(process.cwd(), 'src/blocks');
    const outdir = path.join(process.cwd(), 'dist/assets/js/blocks');

    // Get all JS files in blocks directory
    const blockFiles = await this.getJSFiles(blocksPath);

    if (blockFiles.length === 0) {
      return;
    }

    await fs.ensureDir(outdir);
    await this.bundle({
      entryPoints: blockFiles,
      outdir,
      minify,
    });

    console.log(`Bundled ${blockFiles.length} block JS file(s)`);
  }

  /**
   * Bundle global JavaScript files
   */
  async bundleGlobalScripts(minify: boolean = false): Promise<void> {
    const jsPath = path.join(process.cwd(), 'src/assets/js');
    const outdir = path.join(process.cwd(), 'dist/assets/js');

    // Check if main.js exists
    const mainJsPath = path.join(jsPath, 'main.js');
    if (!await fs.pathExists(mainJsPath)) {
      return;
    }

    await fs.ensureDir(outdir);
    await this.bundle({
      entryPoints: [mainJsPath],
      outdir,
      minify,
    });

    console.log('Bundled global scripts');
  }

  /**
   * Get all JS files in a directory
   */
  private async getJSFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    if (!await fs.pathExists(dir)) {
      return files;
    }

    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.ts'))) {
        files.push(fullPath);
      }
    }

    return files;
  }
}
