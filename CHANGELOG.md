# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-XX

### Added
- Initial release of StaticBlocks
- Project initialization with `init` command
- Interactive setup for CSS frameworks (Tailwind, Bootstrap)
- Interactive setup for icon libraries (Lucide, FontAwesome)
- Block-based architecture for reusable components
- Template engine with variable interpolation
- Conditional rendering with `{{#if}}`
- Loop rendering with `{{#each}}`
- Built-in i18n support with multiple locales
- Translation helper `{{translate:}}`
- Language-aware routing with `{{langPrefix}}`
- Active navigation helper `{{active:}}`
- Page configuration via YAML files
- Development server with hot reload
- WebSocket-based live reload
- File watching for automatic rebuilds
- Production build command
- Generate command for creating blocks, templates, and pages
- Add command for adding locales and scripts
- Comprehensive validation system for all project files
- SEO optimization with meta tags
- CSS processing with PostCSS and Autoprefixer
- JavaScript bundling with esbuild
- Support for separate CSS and JS files per block
- Verbose build output option

### Documentation
- Comprehensive README with examples
- CLI command documentation
- Template syntax guide
- Configuration examples
- i18n setup guide

[0.1.0]: https://github.com/giacomo/staticblocks/releases/tag/v0.1.0
