# StaticBlocks

A simple, block-based static site generator built with TypeScript.

> **Note:** StaticBlocks is currently in early development (v0.1.0). While fully functional, some advanced features are still being developed. Contributions and feedback are welcome!

## Why StaticBlocks?

Modern web development often involves heavy JavaScript frameworks for simple static websites. StaticBlocks brings back the simplicity of static HTML while providing a modern, block-based development experience.

**Key Features:**
- 📦 Block-based architecture
- 🌍 Built-in i18n support
- 🎨 Tailwind CSS or Bootstrap
- 🚀 Fast builds
- 🔍 SEO-optimized output
- 💻 TypeScript-based
- 🎯 Zero JavaScript runtime required

## Installation

```bash
npm install -g staticblocks
```

## Quick Start

```bash
# Create a new project
staticblocks init my-website

# Navigate to project
cd my-website

# Install dependencies (yarn or npm)
yarn install
# or
npm install

# Start development server
yarn run dev
# or
npm run dev

# Build for production
yarn run build
# or
npm run build
```

## Project Structure

```
my-website/
├── src/
│   ├── templates/          # HTML templates
│   │   └── main.html
│   ├── blocks/             # Reusable blocks
│   │   ├── nav.html
│   │   └── hero.html
│   ├── pages/              # Page configurations (YAML)
│   │   └── index.yaml
│   ├── locales/            # Translation files (JSON)
│   │   ├── de.json
│   │   └── en.json
│   └── assets/
│       ├── css/
│       ├── js/
│       └── images/
├── dist/                   # Build output
├── staticblocks.config.ts  # Project configuration
└── package.json
```

## CLI Commands

### Create New Project
```bash
staticblocks init <project-name>
```

### Generate Components
```bash
# Generate a new block
staticblocks generate block hero --with-js --with-css

# Generate a new template
staticblocks generate template blog

# Generate a new page
staticblocks generate page about
```

### Development
```bash
# Start dev server with hot reload
staticblocks dev

# Start dev server on specific port
staticblocks dev --port 8080

# Build for production
staticblocks build

# Build with verbose output
staticblocks build --verbose
```

### Add Resources
```bash
# Add a new locale
staticblocks add locale fr

# Add a new script
staticblocks add script analytics
```

### Validation
```bash
# Validate all project files
staticblocks validate

# Validate specific types
staticblocks validate locales
staticblocks validate pages
staticblocks validate templates
staticblocks validate blocks
```

## Template Syntax

### Variables
```html
{{variableName}}
{{page.title}}
{{page.meta.description}}
```

### Conditionals
```html
{{#if condition}}
  <p>Content when true</p>
{{/if}}
```

### Loops
```html
{{#each items}}
  <div>{{name}}</div>
{{/each}}
```

### Special Helpers

**Translation:**
```html
{{translate:nav.home}}
{{translate:buttons.submit}}
```

**Active Navigation:**
```html
<a href="/about/" class="{{active:/about/}}">About</a>
```

**Language Prefix:**
```html
<a href="{{langPrefix}}/contact/">Contact</a>
```

**Current Language:**
```html
<html lang="{{currentLang}}">
```

## Page Configuration (YAML)

```yaml
template: main
title: About Us
lang: de
activeNav: about
meta:
  description: Learn more about our company
  keywords:
    - company
    - about
blocks:
  - block: nav
  - block: hero
    title: About Our Company
    description: We build amazing things
    image: /assets/images/about.jpg
  - block: features
    items:
      - title: Fast
        description: Lightning fast performance
      - title: Simple
        description: Easy to understand
```

## Blocks

Blocks are reusable HTML components with props:

**blocks/card.html:**
```html
<div class="card">
  <img src="{{image}}" alt="{{title}}">
  <h3>{{title}}</h3>
  <p>{{description}}</p>
  {{#if link}}
    <a href="{{link}}">Learn more</a>
  {{/if}}
</div>
```

**Usage in page:**
```yaml
blocks:
  - block: card
    image: /assets/images/product.jpg
    title: Our Product
    description: The best product ever
    link: /products/
```

## JavaScript in Blocks

**Option 1: Inline**
```html
<div class="slider" data-component="slider">
  <!-- HTML -->
</div>

<script>
  document.querySelectorAll('[data-component="slider"]').forEach(slider => {
    // Init code
  });
</script>
```

**Option 2: Separate File**

**blocks/slider.html:**
```html
<div class="slider" data-component="slider">
  <!-- HTML -->
</div>
```

**blocks/slider.js:**
```javascript
export function initSlider() {
  document.querySelectorAll('[data-component="slider"]').forEach(slider => {
    // Init code
  });
}
```

## Internationalization (i18n)

**locales/de.json:**
```json
{
  "nav": {
    "home": "Startseite",
    "about": "Über uns"
  }
}
```

**locales/en.json:**
```json
{
  "nav": {
    "home": "Home",
    "about": "About"
  }
}
```

**Usage:**
```html
<a href="/">{{translate:nav.home}}</a>
```

**Build Output:**
```
dist/
├── index.html              # Default locale (de)
├── about/
│   └── index.html
├── en/
│   ├── index.html          # English version
│   └── about/
│       └── index.html
└── assets/
```

## Configuration

**staticblocks.config.ts:**
```typescript
import { ProjectConfig } from 'staticblocks/types';

export default {
  css: 'tailwind',
  icons: 'lucide',
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en', 'fr'],
    strategy: 'prefix_except_default'
  },
  scripts: {
    global: ['assets/js/main.js'],
    external: [
      'https://cdn.example.com/script.js'
    ]
  },
  port: 3000
} as ProjectConfig;
```

## Development Roadmap

- [x] Phase 1: Project Setup & CLI
- [x] Phase 2: Template Engine
- [x] Phase 3: Build System
- [x] Phase 4: i18n Support
- [x] Phase 5: JavaScript Integration
- [x] Phase 6: Asset Pipeline
- [x] Phase 7: SEO & Meta
- [x] Phase 8: Validation
- [x] Phase 9: Dev Server
- [ ] Phase 10: Advanced Features (Plugins, CMS Integration, etc.)

## Publishing Your Site

After building your project with `staticblocks build`, the `dist/` folder contains your complete static website. You can deploy it to any static hosting service:

- **Netlify**: Drop the `dist` folder or connect your Git repository
- **Vercel**: Import your project and set build command to `npm run build`
- **GitHub Pages**: Push the `dist` folder to your `gh-pages` branch
- **Any static hosting**: Upload the `dist` folder contents

## Requirements

- Node.js >= 16.0.0
- npm or yarn

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT - see [LICENSE](LICENSE) file for details

---

**Built with ❤️ for the modern web**
