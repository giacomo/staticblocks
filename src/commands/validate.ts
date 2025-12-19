import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { ValidationError, ValidationResult, ProjectConfig, PageConfig } from '../types';
import { getFiles, loadConfig } from '../utils';

export async function validateCommand(type?: string): Promise<void> {
  console.log(chalk.blue.bold('\n🔍 Validating project...\n'));

  const srcPath = path.join(process.cwd(), 'src');

  // Check if in a StaticBlocks project
  if (!await fs.pathExists(srcPath)) {
    console.error(chalk.red('Not in a StaticBlocks project.'));
    process.exit(1);
  }

  let result: ValidationResult;

  switch (type) {
    case 'locales':
      result = await validateLocales();
      break;
    case 'pages':
      result = await validatePages();
      break;
    case 'templates':
      result = await validateTemplates();
      break;
    case 'blocks':
      result = await validateBlocks();
      break;
    default:
      result = await validateAll();
  }

  // Display results
  displayValidationResults(result);

  // Exit with error code if validation failed
  if (!result.valid) {
    process.exit(1);
  }
}

async function validateAll(): Promise<ValidationResult> {
  const results = await Promise.all([
    validateConfig(),
    validateLocales(),
    validatePages(),
    validateTemplates(),
    validateBlocks(),
  ]);

  return mergeResults(results);
}

async function validateConfig(): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  console.log(chalk.cyan('Validating configuration...'));

  try {
    const config = await loadConfig();

    // Check required fields
    if (!config.css) {
      errors.push({
        type: 'error',
        message: 'Missing required field: css',
        file: 'staticblocks.config.ts',
      });
    }

    if (!config.icons) {
      errors.push({
        type: 'error',
        message: 'Missing required field: icons',
        file: 'staticblocks.config.ts',
      });
    }

    // Validate i18n config
    if (config.i18n) {
      if (!config.i18n.defaultLocale) {
        errors.push({
          type: 'error',
          message: 'i18n.defaultLocale is required when i18n is enabled',
          file: 'staticblocks.config.ts',
        });
      }

      if (!config.i18n.locales || config.i18n.locales.length === 0) {
        errors.push({
          type: 'error',
          message: 'i18n.locales must contain at least one locale',
          file: 'staticblocks.config.ts',
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to load config',
      file: 'staticblocks.config.ts',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

async function validateLocales(): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  console.log(chalk.cyan('Validating locales...'));

  try {
    const config = await loadConfig();

    if (!config.i18n) {
      return { valid: true, errors: [], warnings: [] };
    }

    const localesPath = path.join(process.cwd(), 'src/locales');
    const requiredLocales = config.i18n.locales || [];

    // Check if all required locale files exist
    for (const locale of requiredLocales) {
      const localePath = path.join(localesPath, `${locale}.json`);

      if (!await fs.pathExists(localePath)) {
        errors.push({
          type: 'error',
          message: `Missing locale file: ${locale}.json`,
          file: `src/locales/${locale}.json`,
        });
      } else {
        // Validate JSON structure
        try {
          const content = await fs.readJSON(localePath);
          if (!content || typeof content !== 'object') {
            errors.push({
              type: 'error',
              message: `Invalid locale file structure`,
              file: `src/locales/${locale}.json`,
            });
          }
        } catch (error) {
          errors.push({
            type: 'error',
            message: `Invalid JSON in locale file`,
            file: `src/locales/${locale}.json`,
          });
        }
      }
    }

    // TODO: Check for missing translation keys across locales
  } catch (error) {
    errors.push({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to validate locales',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

async function validatePages(): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  console.log(chalk.cyan('Validating pages...'));

  try {
    const pagesPath = path.join(process.cwd(), 'src/pages');
    const pageFiles = await getFiles(pagesPath, '.yaml');

    if (pageFiles.length === 0) {
      warnings.push({
        type: 'warning',
        message: 'No page files found',
        file: 'src/pages/',
      });
    }

    for (const pageFile of pageFiles) {
      try {
        const content = await fs.readFile(pageFile, 'utf-8');
        const pageConfig = yaml.load(content) as PageConfig;

        // Validate required fields
        if (!pageConfig.template) {
          errors.push({
            type: 'error',
            message: 'Missing required field: template',
            file: path.relative(process.cwd(), pageFile),
          });
        }

        if (!pageConfig.title) {
          errors.push({
            type: 'error',
            message: 'Missing required field: title',
            file: path.relative(process.cwd(), pageFile),
          });
        }

        if (!pageConfig.blocks || !Array.isArray(pageConfig.blocks)) {
          errors.push({
            type: 'error',
            message: 'Missing or invalid blocks array',
            file: path.relative(process.cwd(), pageFile),
          });
        }

        // Check if template exists
        if (pageConfig.template) {
          const templatePath = path.join(process.cwd(), 'src/templates', `${pageConfig.template}.html`);
          if (!await fs.pathExists(templatePath)) {
            errors.push({
              type: 'error',
              message: `Template not found: ${pageConfig.template}.html`,
              file: path.relative(process.cwd(), pageFile),
            });
          }
        }

        // Check if blocks exist
        if (pageConfig.blocks && Array.isArray(pageConfig.blocks)) {
          for (const block of pageConfig.blocks) {
            if (!block.block) {
              errors.push({
                type: 'error',
                message: 'Block instance missing "block" field',
                file: path.relative(process.cwd(), pageFile),
              });
              continue;
            }

            const blockPath = path.join(process.cwd(), 'src/blocks', `${block.block}.html`);
            if (!await fs.pathExists(blockPath)) {
              errors.push({
                type: 'error',
                message: `Block not found: ${block.block}.html`,
                file: path.relative(process.cwd(), pageFile),
              });
            }
          }
        }
      } catch (error) {
        errors.push({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to parse page file',
          file: path.relative(process.cwd(), pageFile),
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to validate pages',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

async function validateTemplates(): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  console.log(chalk.cyan('Validating templates...'));

  try {
    const templatesPath = path.join(process.cwd(), 'src/templates');
    const templateFiles = await getFiles(templatesPath, '.html');

    if (templateFiles.length === 0) {
      errors.push({
        type: 'error',
        message: 'No template files found',
        file: 'src/templates/',
      });
    }

    for (const templateFile of templateFiles) {
      const content = await fs.readFile(templateFile, 'utf-8');

      // Check for required placeholders
      if (!content.includes('{{blocks}}')) {
        warnings.push({
          type: 'warning',
          message: 'Template missing {{blocks}} placeholder',
          file: path.relative(process.cwd(), templateFile),
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to validate templates',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

async function validateBlocks(): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  console.log(chalk.cyan('Validating blocks...'));

  try {
    const blocksPath = path.join(process.cwd(), 'src/blocks');
    const blockFiles = await getFiles(blocksPath, '.html');

    if (blockFiles.length === 0) {
      warnings.push({
        type: 'warning',
        message: 'No block files found',
        file: 'src/blocks/',
      });
    }

    // Just check if files are readable
    for (const blockFile of blockFiles) {
      try {
        await fs.readFile(blockFile, 'utf-8');
      } catch (error) {
        errors.push({
          type: 'error',
          message: 'Failed to read block file',
          file: path.relative(process.cwd(), blockFile),
        });
      }
    }
  } catch (error) {
    errors.push({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to validate blocks',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function mergeResults(results: ValidationResult[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

function displayValidationResults(result: ValidationResult): void {
  console.log('');

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(chalk.green.bold('✅ Validation passed - no issues found!\n'));
    return;
  }

  // Display errors
  if (result.errors.length > 0) {
    console.log(chalk.red.bold(`\n❌ ${result.errors.length} error(s) found:\n`));
    for (const error of result.errors) {
      console.log(chalk.red(`  ${error.file || 'Unknown file'}: ${error.message}`));
    }
  }

  // Display warnings
  if (result.warnings.length > 0) {
    console.log(chalk.yellow.bold(`\n⚠️  ${result.warnings.length} warning(s) found:\n`));
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  ${warning.file || 'Unknown file'}: ${warning.message}`));
    }
  }

  console.log('');

  if (result.valid) {
    console.log(chalk.green.bold('✅ Validation passed with warnings\n'));
  } else {
    console.log(chalk.red.bold('❌ Validation failed\n'));
  }
}