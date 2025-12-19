import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { ProjectConfig } from '../types';

export async function initCommand(projectName: string): Promise<void> {
  console.log(chalk.blue.bold('\n🚀 StaticBlocks - Project Setup\n'));

  // Check if directory already exists
  const projectPath = path.join(process.cwd(), projectName);
  if (await fs.pathExists(projectPath)) {
    throw new Error(`Directory "${projectName}" already exists`);
  }

  // Interactive prompts
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'css',
      message: 'Choose CSS framework:',
      choices: ['tailwind', 'bootstrap'],
      default: 'tailwind'
    },
    {
      type: 'list',
      name: 'icons',
      message: 'Choose icon library:',
      choices: ['lucide', 'fontawesome'],
      default: 'lucide'
    },
    {
      type: 'confirm',
      name: 'i18n',
      message: 'Enable internationalization (i18n)?',
      default: true
    },
    {
      type: 'input',
      name: 'defaultLocale',
      message: 'Default locale:',
      default: 'de',
      when: (answers) => answers.i18n
    },
    {
      type: 'input',
      name: 'locales',
      message: 'Additional locales (comma-separated):',
      default: 'en',
      when: (answers) => answers.i18n,
      filter: (input: string) => input.split(',').map(s => s.trim())
    }
  ]);

  console.log(chalk.yellow('\n📁 Creating project structure...\n'));

  // Create project structure
  await createProjectStructure(projectPath, projectName, answers);

  console.log(chalk.green.bold('\n✅ Project created successfully!\n'));
  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.white(`  cd ${projectName}`));
  console.log(chalk.white('  yarn install'));
  console.log(chalk.white('  yarn run dev\n'));
}

async function createProjectStructure(
  projectPath: string,
  projectName: string,
  answers: any
): Promise<void> {
  // Create directories
  const dirs = [
    'src/templates',
    'src/blocks',
    'src/pages',
    'src/locales',
    'src/assets/css',
    'src/assets/js',
    'src/assets/images',
    'dist'
  ];

  for (const dir of dirs) {
    await fs.ensureDir(path.join(projectPath, dir));
    console.log(chalk.gray(`  ✓ ${dir}/`));
  }

  // Create config file
  const config: ProjectConfig = {
    css: answers.css,
    icons: answers.icons,
    port: 3000
  };

  if (answers.i18n) {
    config.i18n = {
      defaultLocale: answers.defaultLocale,
      locales: [answers.defaultLocale, ...answers.locales],
      strategy: 'prefix_except_default'
    };
  }

  await fs.writeFile(
    path.join(projectPath, 'staticblocks.config.ts'),
    `import { ProjectConfig } from 'staticblocks/types';

export default ${JSON.stringify(config, null, 2)} as ProjectConfig;
`
  );
  console.log(chalk.gray('  ✓ staticblocks.config.ts'));

  // Create package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'staticblocks dev',
      build: 'staticblocks build',
      validate: 'staticblocks validate'
    },
    devDependencies: {
      staticblocks: '^0.1.0',
      ...(answers.css === 'tailwind' ? { 'tailwindcss': '^3.3.0' } : {}),
      ...(answers.css === 'bootstrap' ? { 'bootstrap': '^5.3.0' } : {})
    }
  };

  await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
  console.log(chalk.gray('  ✓ package.json'));

  // Create default template
  await fs.writeFile(
    path.join(projectPath, 'src/templates/main.html'),
    createDefaultTemplate(answers.css, answers.icons)
  );
  console.log(chalk.gray('  ✓ src/templates/main.html'));

  // Create default navigation block
  await fs.writeFile(
    path.join(projectPath, 'src/blocks/nav.html'),
    createDefaultNavBlock()
  );
  console.log(chalk.gray('  ✓ src/blocks/nav.html'));

  // Create default hero block
  await fs.writeFile(
    path.join(projectPath, 'src/blocks/hero.html'),
    createDefaultHeroBlock()
  );
  console.log(chalk.gray('  ✓ src/blocks/hero.html'));

  // Create default page
  const defaultPageConfig = {
    template: 'main',
    title: 'Welcome to StaticBlocks',
    lang: answers.i18n ? answers.defaultLocale : undefined,
    blocks: [
      { block: 'nav' },
      {
        block: 'hero',
        title: 'Welcome to StaticBlocks',
        description: 'A simple, block-based static site generator',
        cta: 'Get Started'
      }
    ]
  };

  await fs.writeFile(
    path.join(projectPath, 'src/pages/index.yaml'),
    `template: main
title: Welcome to StaticBlocks
${answers.i18n ? `lang: ${answers.defaultLocale}` : ''}
blocks:
  - block: nav
  - block: hero
    title: Welcome to StaticBlocks
    description: A simple, block-based static site generator
    cta: Get Started
`
  );
  console.log(chalk.gray('  ✓ src/pages/index.yaml'));

  // Create locale files if i18n enabled
  if (answers.i18n) {
    const locales = [answers.defaultLocale, ...answers.locales];
    for (const locale of locales) {
      await fs.writeJSON(
        path.join(projectPath, `src/locales/${locale}.json`),
        createDefaultLocale(locale),
        { spaces: 2 }
      );
      console.log(chalk.gray(`  ✓ src/locales/${locale}.json`));
    }
  }

  // Create CSS file
  const cssContent = answers.css === 'tailwind'
    ? `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
`
    : `/* Bootstrap is loaded via CDN in template */

/* Custom styles */
`;

  await fs.writeFile(path.join(projectPath, 'src/assets/css/styles.css'), cssContent);
  console.log(chalk.gray('  ✓ src/assets/css/styles.css'));

  // Create Tailwind config if needed
  if (answers.css === 'tailwind') {
    await fs.writeFile(
      path.join(projectPath, 'tailwind.config.js'),
      `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`
    );
    console.log(chalk.gray('  ✓ tailwind.config.js'));
  }

  // Create .yarnrc.yml
  await fs.writeFile(
    path.join(projectPath, '.yarnrc.yml'),
    `nodeLinker: node-modules
`
  );
  console.log(chalk.gray('  ✓ .yarnrc.yml'));

  // Create .gitignore
  await fs.writeFile(
    path.join(projectPath, '.gitignore'),
    `node_modules/
dist/
.DS_Store
*.log
.yarn/cache
.yarn/install-state.gz
`
  );
  console.log(chalk.gray('  ✓ .gitignore'));

  // Create README
  await fs.writeFile(
    path.join(projectPath, 'README.md'),
    createReadme(projectName, answers)
  );
  console.log(chalk.gray('  ✓ README.md'));
}

function createDefaultTemplate(css: string, icons: string): string {
  const cssLink = css === 'tailwind'
    ? '<link rel="stylesheet" href="/assets/css/styles.css">'
    : '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">';

  const iconsLink = icons === 'lucide'
    ? ''
    : '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">';

  const lucideScript = icons === 'lucide'
    ? `  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    lucide.createIcons();
  </script>
`
    : '';

  return `<!DOCTYPE html>
<html lang="{{currentLang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{page.title}}</title>
  <meta name="description" content="{{page.meta.description}}">
  ${cssLink}
  ${iconsLink}
  {{styles}}
</head>
<body>
  {{blocks}}
  {{scripts}}
${lucideScript}</body>
</html>
`;
}

function createDefaultNavBlock(): string {
  return `<nav class="navbar">
  <div class="container">
    <a href="{{langPrefix}}/" class="{{active:/}}">
      {{translate:nav.home}}
    </a>
    <a href="{{langPrefix}}/about/" class="{{active:/about/}}">
      {{translate:nav.about}}
    </a>
    <a href="{{langPrefix}}/contact/" class="{{active:/contact/}}">
      {{translate:nav.contact}}
    </a>
  </div>
</nav>
`;
}

function createDefaultHeroBlock(): string {
  return `<section class="hero">
  <div class="container">
    <h1>{{title}}</h1>
    <p>{{description}}</p>
    {{#if cta}}
      <button class="btn">{{cta}}</button>
    {{/if}}
  </div>
</section>
`;
}

function createDefaultLocale(locale: string): any {
  const translations: any = {
    de: {
      nav: {
        home: 'Startseite',
        about: 'Über uns',
        contact: 'Kontakt'
      },
      hero: {
        welcome: 'Willkommen',
        subtitle: 'Statisch und schnell'
      },
      buttons: {
        learn_more: 'Mehr erfahren',
        contact_us: 'Kontaktieren Sie uns'
      }
    },
    en: {
      nav: {
        home: 'Home',
        about: 'About',
        contact: 'Contact'
      },
      hero: {
        welcome: 'Welcome',
        subtitle: 'Static and fast'
      },
      buttons: {
        learn_more: 'Learn more',
        contact_us: 'Contact us'
      }
    }
  };

  return translations[locale] || translations.en;
}

function createReadme(projectName: string, answers: any): string {
  return `# ${projectName}

A static website built with StaticBlocks.

## Project Structure

\`\`\`
src/
├── templates/     # HTML templates
├── blocks/        # Reusable blocks
├── pages/         # Page configurations (YAML)
├── locales/       # Translation files (JSON)
└── assets/        # Static assets
\`\`\`

## Development

\`\`\`bash
# Install dependencies
yarn install

# Start dev server
yarn run dev

# Build for production
yarn run build
\`\`\`

## Configuration

- **CSS Framework:** ${answers.css}
- **Icons:** ${answers.icons}
- **i18n:** ${answers.i18n ? 'Enabled' : 'Disabled'}
${answers.i18n ? `- **Default Locale:** ${answers.defaultLocale}` : ''}

## Commands

\`\`\`bash
# Generate new block
staticblocks generate block my-block --with-js

# Generate new page
staticblocks generate page my-page

# Add new locale
staticblocks add locale fr

# Validate project
staticblocks validate
\`\`\`
`;
}