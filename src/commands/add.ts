import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { AddOptions, ProjectConfig } from '../types';
import { loadConfig } from '../utils';

export async function addCommand(options: AddOptions): Promise<void> {
  console.log(chalk.blue.bold(`\n➕ Adding ${options.type}: ${options.name}\n`));

  const srcPath = path.join(process.cwd(), 'src');

  // Check if in a StaticBlocks project
  if (!await fs.pathExists(srcPath)) {
    throw new Error('Not in a StaticBlocks project. Run "staticblocks init" first.');
  }

  switch (options.type) {
    case 'locale':
      await addLocale(options.name);
      break;
    case 'script':
      await addScript(options.name);
      break;
    default:
      throw new Error(`Unknown type: ${options.type}`);
  }

  console.log(chalk.green.bold('\n✅ Addition complete!\n'));
}

async function addLocale(locale: string): Promise<void> {
  const localesPath = path.join(process.cwd(), 'src/locales');
  const localePath = path.join(localesPath, `${locale}.json`);

  // Check if locale already exists
  if (await fs.pathExists(localePath)) {
    throw new Error(`Locale "${locale}" already exists`);
  }

  // Create empty locale file with basic structure
  const defaultLocaleContent = {
    nav: {
      home: 'Home',
      about: 'About',
      contact: 'Contact',
    },
    hero: {
      welcome: 'Welcome',
      subtitle: 'Static and fast',
    },
    buttons: {
      learn_more: 'Learn more',
      contact_us: 'Contact us',
    },
  };

  await fs.writeJSON(localePath, defaultLocaleContent, { spaces: 2 });
  console.log(chalk.gray(`  ✓ src/locales/${locale}.json`));

  // Update config file
  await updateConfigWithLocale(locale);

  console.log(chalk.yellow(`\nDon't forget to translate the strings in src/locales/${locale}.json`));
}

async function updateConfigWithLocale(locale: string): Promise<void> {
  const configPath = path.join(process.cwd(), 'staticblocks.config.ts');

  if (!await fs.pathExists(configPath)) {
    console.warn('Config file not found, skipping update');
    return;
  }

  // Read config file
  let configContent = await fs.readFile(configPath, 'utf-8');

  // Try to add locale to the locales array
  // This is a simple string replacement approach
  const localesMatch = configContent.match(/locales:\s*\[(.*?)\]/s);

  if (localesMatch) {
    const currentLocales = localesMatch[1];
    const newLocales = currentLocales.trim()
      ? `${currentLocales.trim()}, '${locale}'`
      : `'${locale}'`;

    configContent = configContent.replace(
      /locales:\s*\[.*?\]/s,
      `locales: [${newLocales}]`
    );

    await fs.writeFile(configPath, configContent, 'utf-8');
    console.log(chalk.gray(`  ✓ Updated staticblocks.config.ts`));
  } else {
    console.warn(chalk.yellow('Could not automatically update config. Please add locale manually.'));
  }
}

async function addScript(scriptName: string): Promise<void> {
  const scriptsPath = path.join(process.cwd(), 'src/assets/js');
  const scriptPath = path.join(scriptsPath, `${scriptName}.js`);

  // Check if script already exists
  if (await fs.pathExists(scriptPath)) {
    throw new Error(`Script "${scriptName}" already exists`);
  }

  // Create script file with boilerplate
  const scriptContent = `/**
 * ${scriptName}
 */

export function init() {
  console.log('${scriptName} initialized');

  // Your code here
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
`;

  await ensureDir(scriptsPath);
  await fs.writeFile(scriptPath, scriptContent, 'utf-8');
  console.log(chalk.gray(`  ✓ src/assets/js/${scriptName}.js`));

  console.log(chalk.yellow(`\nScript created. To use it, add it to your template or page configuration.`));
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}
