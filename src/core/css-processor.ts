/**
 * CSS Processor - Handles Tailwind/CSS processing
 */

import fs from 'fs-extra';
import path from 'path';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import { ProjectConfig } from '../types';

export class CSSProcessor {
  private config: ProjectConfig;

  constructor(config: ProjectConfig) {
    this.config = config;
  }

  /**
   * Process CSS files
   */
  async process(): Promise<void> {
    const cssPath = path.join(process.cwd(), 'src/assets/css/styles.css');
    const outputPath = path.join(process.cwd(), 'dist/assets/css/styles.css');

    if (!await fs.pathExists(cssPath)) {
      console.warn('No styles.css found, skipping CSS processing');
      return;
    }

    await fs.ensureDir(path.dirname(outputPath));

    if (this.config.css === 'tailwind') {
      await this.processTailwind(cssPath, outputPath);
    } else {
      // Just copy CSS for Bootstrap
      await fs.copy(cssPath, outputPath);
    }

    console.log('CSS processed');
  }

  /**
   * Process Tailwind CSS
   */
  private async processTailwind(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Check if tailwindcss is installed in the project
      const projectTailwindPath = path.join(process.cwd(), 'node_modules/tailwindcss');

      if (!await fs.pathExists(projectTailwindPath)) {
        console.warn('Tailwind CSS not installed in project. Run: yarn add -D tailwindcss');
        // Just copy the file as-is
        await fs.copy(inputPath, outputPath);
        return;
      }

      // Dynamically import tailwindcss from the project's node_modules
      const tailwindcss = require(projectTailwindPath);

      // Read input CSS
      const css = await fs.readFile(inputPath, 'utf-8');

      // Check if tailwind config exists
      const configPath = path.join(process.cwd(), 'tailwind.config.js');
      let tailwindConfig = {};

      if (await fs.pathExists(configPath)) {
        delete require.cache[require.resolve(configPath)];
        tailwindConfig = require(configPath);
      }

      // Process with PostCSS
      const result = await postcss([
        tailwindcss(tailwindConfig),
        autoprefixer
      ]).process(css, {
        from: inputPath,
        to: outputPath
      });

      // Write output
      await fs.writeFile(outputPath, result.css, 'utf-8');

      if (result.map) {
        await fs.writeFile(outputPath + '.map', result.map.toString(), 'utf-8');
      }
    } catch (error) {
      console.error('Failed to process Tailwind CSS:', error);
      // Fallback: copy the file
      await fs.copy(inputPath, outputPath);
    }
  }
}
