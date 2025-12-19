import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { GenerateOptions } from '../types';

export async function generateCommand(options: GenerateOptions): Promise<void> {
  console.log(chalk.blue.bold(`\n🔨 Generating ${options.type}: ${options.name}\n`));

  const srcPath = path.join(process.cwd(), 'src');

  // Check if src directory exists
  if (!await fs.pathExists(srcPath)) {
    throw new Error('Not in a StaticBlocks project. Run "staticblocks init" first.');
  }

  switch (options.type) {
    case 'block':
      await generateBlock(options);
      break;
    case 'template':
      await generateTemplate(options);
      break;
    case 'page':
      await generatePage(options);
      break;
    default:
      throw new Error(`Unknown type: ${options.type}`);
  }

  console.log(chalk.green.bold('\n✅ Generation complete!\n'));
}

async function generateBlock(options: GenerateOptions): Promise<void> {
  const blockPath = path.join(process.cwd(), 'src/blocks', `${options.name}.html`);

  if (await fs.pathExists(blockPath)) {
    throw new Error(`Block "${options.name}" already exists`);
  }

  const blockContent = `<div class="block-${options.name}">
  <h2>{{title}}</h2>
  <p>{{description}}</p>
</div>
`;

  await fs.writeFile(blockPath, blockContent);
  console.log(chalk.gray(`  ✓ src/blocks/${options.name}.html`));

  // Generate JS file if requested
  if (options.withJs) {
    const jsPath = path.join(process.cwd(), 'src/blocks', `${options.name}.js`);
    const jsContent = `export function init${capitalize(options.name)}() {
  const blocks = document.querySelectorAll('[data-component="${options.name}"]');
  
  blocks.forEach(block => {
    // Your initialization code here
    console.log('${options.name} initialized');
  });
}
`;
    await fs.writeFile(jsPath, jsContent);
    console.log(chalk.gray(`  ✓ src/blocks/${options.name}.js`));
  }

  // Generate CSS file if requested
  if (options.withCss) {
    const cssPath = path.join(process.cwd(), 'src/blocks', `${options.name}.css`);
    const cssContent = `.block-${options.name} {
  /* Your styles here */
}
`;
    await fs.writeFile(cssPath, cssContent);
    console.log(chalk.gray(`  ✓ src/blocks/${options.name}.css`));
  }
}

async function generateTemplate(options: GenerateOptions): Promise<void> {
  const templatePath = path.join(process.cwd(), 'src/templates', `${options.name}.html`);

  if (await fs.pathExists(templatePath)) {
    throw new Error(`Template "${options.name}" already exists`);
  }

  const templateContent = `<!DOCTYPE html>
<html lang="{{currentLang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{page.title}}</title>
  {{styles}}
</head>
<body>
  {{blocks}}
  {{scripts}}
</body>
</html>
`;

  await fs.writeFile(templatePath, templateContent);
  console.log(chalk.gray(`  ✓ src/templates/${options.name}.html`));
}

async function generatePage(options: GenerateOptions): Promise<void> {
  const pagePath = path.join(process.cwd(), 'src/pages', `${options.name}.yaml`);

  if (await fs.pathExists(pagePath)) {
    throw new Error(`Page "${options.name}" already exists`);
  }

  const pageContent = `template: main
title: ${capitalize(options.name)}
blocks:
  - block: nav
  - block: hero
    title: ${capitalize(options.name)}
    description: Page description here
`;

  await fs.writeFile(pagePath, pageContent);
  console.log(chalk.gray(`  ✓ src/pages/${options.name}.yaml`));
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}