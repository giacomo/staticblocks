/**
 * SEO Module - Handles sitemap and robots.txt generation
 */

import fs from 'fs-extra';
import path from 'path';
import { ProjectConfig } from '../types';
import { getFiles, getPageSlug } from '../utils';

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export class SEOGenerator {
  private config: ProjectConfig;
  private baseUrl: string;

  constructor(config: ProjectConfig) {
    this.config = config;
    this.baseUrl = config.meta?.siteUrl || '';
  }

  /**
   * Generate sitemap.xml
   */
  async generateSitemap(): Promise<void> {
    if (!this.baseUrl) {
      console.warn('No siteUrl configured, skipping sitemap generation');
      return;
    }

    const entries = await this.collectSitemapEntries();
    const xml = this.generateSitemapXML(entries);

    const outputPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
    await fs.writeFile(outputPath, xml, 'utf-8');

    console.log('Sitemap generated');
  }

  /**
   * Generate robots.txt
   */
  async generateRobotsTxt(): Promise<void> {
    const robotsTxt = this.generateRobotsTxtContent();

    const outputPath = path.join(process.cwd(), 'dist', 'robots.txt');
    await fs.writeFile(outputPath, robotsTxt, 'utf-8');

    console.log('Robots.txt generated');
  }

  /**
   * Collect all pages for sitemap
   */
  private async collectSitemapEntries(): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = [];
    const pagesPath = path.join(process.cwd(), 'src/pages');
    const pageFiles = await getFiles(pagesPath, '.yaml');

    const locales = this.config.i18n?.locales || ['de'];
    const defaultLocale = this.config.i18n?.defaultLocale || 'de';
    const strategy = this.config.i18n?.strategy || 'prefix_except_default';

    for (const pageFile of pageFiles) {
      const slug = getPageSlug(pageFile);

      for (const locale of locales) {
        // Build URL based on strategy
        let url = this.baseUrl;

        // Add locale prefix if needed
        if (this.config.i18n) {
          if (strategy === 'prefix_except_default' && locale !== defaultLocale) {
            url += `/${locale}`;
          } else if (strategy === 'prefix') {
            url += `/${locale}`;
          }
        }

        // Add page path
        if (slug === 'index') {
          url += '/';
        } else {
          url += `/${slug}/`;
        }

        entries.push({
          url,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: slug === 'index' ? 1.0 : 0.8,
        });
      }
    }

    return entries;
  }

  /**
   * Generate sitemap XML content
   */
  private generateSitemapXML(entries: SitemapEntry[]): string {
    const urls = entries.map(entry => {
      return `  <url>
    <loc>${this.escapeXml(entry.url)}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ''}
  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  }

  /**
   * Generate robots.txt content
   */
  private generateRobotsTxtContent(): string {
    const sitemapUrl = this.baseUrl ? `${this.baseUrl}/sitemap.xml` : '';

    return `# StaticBlocks - Robots.txt
User-agent: *
Allow: /

# Sitemaps
${sitemapUrl ? `Sitemap: ${sitemapUrl}` : '# No sitemap URL configured'}
`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
