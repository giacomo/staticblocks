#!/usr/bin/env node

/**
 * StaticBlocks CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { generateCommand } from './commands/generate';
import { buildCommand } from './commands/build';
import { devCommand } from './commands/dev';
import { validateCommand } from './commands/validate';
import { addCommand } from './commands/add';

const program = new Command();

program
  .name('staticblocks')
  .description('A simple, block-based static site generator')
  .version('0.1.0');

// Init command
program
  .command('init <project-name>')
  .description('Create a new StaticBlocks project')
  .action(async (projectName: string) => {
    try {
      await initCommand(projectName);
    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Generate command
program
  .command('generate <type> <name>')
  .alias('g')
  .description('Generate a new block, template, or page')
  .option('--with-js', 'Generate JavaScript file (blocks only)')
  .option('--with-css', 'Generate CSS file (blocks only)')
  .action(async (type: string, name: string, options: any) => {
    try {
      await generateCommand({
        type: type as 'block' | 'template' | 'page',
        name,
        withJs: options.withJs,
        withCss: options.withCss,
      });
    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Build command
program
  .command('build')
  .description('Build the project for production')
  .option('-v, --verbose', 'Verbose output')
  .option('--minify', 'Minify output (not yet implemented)')
  .action(async (options: any) => {
    try {
      await buildCommand({
        verbose: options.verbose,
        minify: options.minify,
      });
    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Dev command
program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('--open', 'Open browser automatically')
  .action(async (options: any) => {
    try {
      await devCommand({
        port: parseInt(options.port, 10),
        open: options.open,
      });
    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate [type]')
  .description('Validate project configuration and files')
  .action(async (type?: string) => {
    try {
      await validateCommand(type);
    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Add command
program
  .command('add <type> <name>')
  .description('Add a new locale or script')
  .action(async (type: string, name: string) => {
    try {
      await addCommand({
        type: type as 'locale' | 'script',
        name,
      });
    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
