/**
 * StaticBlocks - A simple, block-based static site generator
 *
 * Main entry point for programmatic usage
 */

export * from './types';
export * from './utils';

// Core functionality
export { TemplateEngine } from './core/template-engine';
export { Builder } from './core/builder';

// Commands (for programmatic usage)
export { initCommand } from './commands/init';
export { generateCommand } from './commands/generate';
export { buildCommand } from './commands/build';
export { devCommand } from './commands/dev';
export { validateCommand } from './commands/validate';
export { addCommand } from './commands/add';