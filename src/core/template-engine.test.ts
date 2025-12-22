/**
 * Template Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateEngine } from './template-engine';
import { RenderContext } from '../types';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  describe('url helper', () => {
    describe('with prefix_except_default strategy', () => {
      const baseConfig = {
        i18n: {
          defaultLocale: 'en',
          locales: ['en', 'de', 'fr'],
          strategy: 'prefix_except_default' as const
        }
      };

      it('should return root path without prefix when on default locale', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'en',
          langPrefix: '',
          baseUrl: ''
        };

        const result = engine.render('{{url:/}}', context);
        expect(result).toBe('/');
      });

      it('should return root path without prefix when on non-default locale (bug fix test)', () => {
        // This is the critical test for the bug we fixed
        // When viewing the German page, {{url:/}} should link to the default English root
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: ''
        };

        const result = engine.render('{{url:/}}', context);
        expect(result).toBe('/'); // Should be '/', not '/de/'
      });

      it('should add language prefix to non-root paths on non-default locale', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: ''
        };

        const result = engine.render('{{url:/about}}', context);
        expect(result).toBe('/de/about');
      });

      it('should not add prefix to paths with explicit language code', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'en',
          langPrefix: '',
          baseUrl: ''
        };

        const result = engine.render('{{url:/de/about}}', context);
        expect(result).toBe('/de/about');
      });

      it('should handle paths with explicit language code from non-default locale', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: ''
        };

        const result = engine.render('{{url:/fr/contact}}', context);
        expect(result).toBe('/fr/contact');
      });

      it('should not add prefix to default locale paths', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'en',
          langPrefix: '',
          baseUrl: ''
        };

        const result = engine.render('{{url:/contact}}', context);
        expect(result).toBe('/contact');
      });

      it('should work with baseUrl', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: 'https://example.com/'
        };

        const result = engine.render('{{url:/}}', context);
        expect(result).toBe('https://example.com/');
      });

      it('should work with baseUrl for non-root paths', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: 'https://example.com'
        };

        const result = engine.render('{{url:/about}}', context);
        expect(result).toBe('https://example.com/de/about');
      });

      it('should remove trailing slashes from non-root paths', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: ''
        };

        const result = engine.render('{{url:/about/}}', context);
        expect(result).toBe('/de/about');
      });

      it('should handle paths without leading slash', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: ''
        };

        const result = engine.render('{{url:about}}', context);
        expect(result).toBe('/de/about');
      });
    });

    describe('with prefix strategy', () => {
      const baseConfig = {
        i18n: {
          defaultLocale: 'en',
          locales: ['en', 'de', 'fr'],
          strategy: 'prefix' as const
        }
      };

      it('should add prefix even for default locale', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'en',
          langPrefix: '/en',
          baseUrl: ''
        };

        const result = engine.render('{{url:/about}}', context);
        expect(result).toBe('/en/about');
      });

      it('should return root path without prefix (regression test)', () => {
        // Even with prefix strategy, root path should not get current lang prefix
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: ''
        };

        const result = engine.render('{{url:/}}', context);
        expect(result).toBe('/');
      });

      it('should add language prefix to non-root paths', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: ''
        };

        const result = engine.render('{{url:/about}}', context);
        expect(result).toBe('/de/about');
      });
    });

    describe('language switcher use case', () => {
      const baseConfig = {
        i18n: {
          defaultLocale: 'en',
          locales: ['en', 'de'],
          strategy: 'prefix_except_default' as const
        }
      };

      it('should correctly generate language switcher links from default locale', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'en',
          langPrefix: '',
          baseUrl: '',
          slug: 'about'
        };

        const template = `
          <a href="{{url:/}}{{slug}}">EN</a>
          <a href="{{url:/de}}/{{slug}}">DE</a>
        `.trim();

        const result = engine.render(template, context);
        expect(result).toContain('href="/about"');
        expect(result).toContain('href="/de/about"');
      });

      it('should correctly generate language switcher links from non-default locale', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: '',
          slug: 'about'
        };

        const template = `
          <a href="{{url:/}}{{slug}}">EN</a>
          <a href="{{url:/de}}/{{slug}}">DE</a>
        `.trim();

        const result = engine.render(template, context);
        expect(result).toContain('href="/about"'); // Should switch to EN (default)
        expect(result).toContain('href="/de/about"'); // Stay on DE
      });

      it('should correctly generate home page language switcher from non-default locale', () => {
        const context: RenderContext = {
          config: baseConfig,
          currentLang: 'de',
          langPrefix: '/de',
          baseUrl: ''
        };

        const template = `
          <a href="{{url:/}}">EN</a>
          <a href="{{url:/de}}">DE</a>
        `.trim();

        const result = engine.render(template, context);
        expect(result).toContain('href="/"'); // Should link to default EN root
        expect(result).toContain('href="/de"'); // Should link to DE root
      });
    });

    describe('without i18n config', () => {
      it('should work without i18n configuration', () => {
        const context: RenderContext = {
          config: {},
          baseUrl: ''
        };

        const result = engine.render('{{url:/about}}', context);
        expect(result).toBe('/about');
      });

      it('should handle root path without i18n', () => {
        const context: RenderContext = {
          config: {},
          baseUrl: ''
        };

        const result = engine.render('{{url:/}}', context);
        expect(result).toBe('/');
      });
    });
  });

  describe('other helpers', () => {
    it('should handle translate helper', () => {
      const context: RenderContext = {
        config: {},
        localeData: {
          greeting: 'Hello'
        }
      };

      const result = engine.render('{{translate:greeting}}', context);
      expect(result).toBe('Hello');
    });

    it('should handle currentLang helper', () => {
      const context: RenderContext = {
        config: {
          i18n: {
            defaultLocale: 'en',
            locales: ['en', 'de']
          }
        },
        currentLang: 'de'
      };

      const result = engine.render('{{currentLang:_}}', context);
      expect(result).toBe('de');
    });

    it('should handle langActive helper', () => {
      const context: RenderContext = {
        config: {
          i18n: {
            defaultLocale: 'en',
            locales: ['en', 'de']
          }
        },
        currentLang: 'de'
      };

      const result = engine.render('{{langActive:de,active-class}}', context);
      expect(result).toBe('active-class');
    });

    it('should handle langActive helper when not active', () => {
      const context: RenderContext = {
        config: {
          i18n: {
            defaultLocale: 'en',
            locales: ['en', 'de']
          }
        },
        currentLang: 'de'
      };

      const result = engine.render('{{langActive:en,active-class}}', context);
      expect(result).toBe('');
    });
  });

  describe('conditionals', () => {
    it('should handle if blocks', () => {
      const context: RenderContext = {
        config: {},
        showContent: true
      };

      const result = engine.render('{{#if showContent}}Content{{/if}}', context);
      expect(result).toBe('Content');
    });

    it('should handle if-else blocks', () => {
      const context: RenderContext = {
        config: {},
        showContent: false
      };

      const result = engine.render('{{#if showContent}}Yes{{#else}}No{{/if}}', context);
      expect(result).toBe('No');
    });
  });

  describe('variables', () => {
    it('should replace simple variables', () => {
      const context: RenderContext = {
        config: {},
        title: 'Test Title'
      };

      const result = engine.render('{{title}}', context);
      expect(result).toBe('Test Title');
    });
  });
});
