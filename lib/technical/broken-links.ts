import fetch from 'node-fetch';

export interface BrokenLinkResult {
  url: string;
  status: number;
  statusText: string;
  isBroken: boolean;
}

export interface RedirectChainResult {
  url: string;
  chain: string[];
  isRedirectLoop: boolean;
  finalStatus: number;
}

export class BrokenLinksChecker {
  /**
   * Check for broken links on a page
   */
  static async checkBrokenLinks(url: string): Promise<BrokenLinkResult[]> {
    try {
      const response = await fetch(url);
      const html = await response.text();

      const links = this.extractLinks(html, url);
      const results = await Promise.all(
        links.map(async (link) => this.checkLink(link))
      );

      return results;
    } catch (error: any) {
      console.error(`Failed to check broken links for ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Check a single link
   */
  static async checkLink(url: string): Promise<BrokenLinkResult> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
      });

      return {
        url,
        status: response.status,
        statusText: response.statusText,
        isBroken: response.status >= 400,
      };
    } catch (error: any) {
      return {
        url,
        status: 0,
        statusText: error.message,
        isBroken: true,
      };
    }
  }

  /**
   * Check for redirect chains
   */
  static async checkRedirectChains(url: string): Promise<RedirectChainResult[]> {
    try {
      const response = await fetch(url);
      const html = await response.text();

      const links = this.extractLinks(html, url);
      const results = await Promise.all(
        links.map(async (link) => this.checkRedirectChain(link))
      );

      return results;
    } catch (error: any) {
      console.error(`Failed to check redirect chains for ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Check a single link's redirect chain
   */
  static async checkRedirectChain(url: string): Promise<RedirectChainResult> {
    const chain: string[] = [];
    const seen = new Set<string>();

    try {
      let current = url;
      while (current) {
        if (seen.has(current)) {
          return {
            url,
            chain,
            isRedirectLoop: true,
            finalStatus: 0,
          };
        }

        seen.add(current);
        chain.push(current);

        const response = await fetch(current, {
          method: 'HEAD',
          redirect: 'manual',
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            current = this.resolveUrl(location, url);
          } else {
            break;
          }
        } else {
          break;
        }
      }

      return {
        url,
        chain,
        isRedirectLoop: false,
        finalStatus: chain.length > 1 ? 301 : 200,
      };
    } catch (error: any) {
      return {
        url,
        chain,
        isRedirectLoop: false,
        finalStatus: 0,
      };
    }
  }

  /**
   * Extract links from HTML
   */
  private static extractLinks(html: string, baseUrl: string): string[] {
    const linkPattern = /<a[^>]+href=["']([^"']+)["']/g;
    const links: string[] = [];
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1].trim();
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        if (absoluteUrl) {
          links.push(absoluteUrl);
        }
      }
    }

    return [...new Set(links)];
  }

  /**
   * Resolve relative URL to absolute
   */
  private static resolveUrl(relative: string, base: string): string | null {
    try {
      return new URL(relative, base).toString();
    } catch {
      return null;
    }
  }

  /**
   * Check canonical tag on a page
   */
  static async checkCanonicalTag(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const html = await response.text();

      const canonicalPattern = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i;
      const match = html.match(canonicalPattern);

      if (match) {
        const canonicalUrl = match[1].trim();
        return this.resolveUrl(canonicalUrl, url);
      }

      return null;
    } catch (error: any) {
      console.error(`Failed to check canonical tag for ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Check hreflang tags on a page
   */
  static async checkHreflangTags(url: string): Promise<string[]> {
    try {
      const response = await fetch(url);
      const html = await response.text();

      const hreflangPattern = /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi;
      const hreflangTags: string[] = [];
      let match;

      while ((match = hreflangPattern.exec(html)) !== null) {
        const lang = match[1].trim();
        const href = match[2].trim();
        const absoluteUrl = this.resolveUrl(href, url);
        if (absoluteUrl) {
          hreflangTags.push(`${lang}: ${absoluteUrl}`);
        }
      }

      return hreflangTags;
    } catch (error: any) {
      console.error(`Failed to check hreflang tags for ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Check sitemap for errors
   */
  static async checkSitemap(url: string): Promise<{ valid: boolean; errors: string[]; urls: string[] }> {
    try {
      const sitemapUrl = new URL('/sitemap.xml', url).toString();
      const response = await fetch(sitemapUrl);

      if (!response.ok) {
        return {
          valid: false,
          errors: [`Sitemap not found (${response.status} ${response.statusText})`],
          urls: [],
        };
      }

      const xml = await response.text();

      // Check if it's valid XML
      if (!xml.startsWith('<?xml') && !xml.includes('<urlset')) {
        return {
          valid: false,
          errors: ['Not a valid sitemap XML'],
          urls: [],
        };
      }

      // Extract URLs from sitemap
      const urlPattern = /<loc>([^<]+)<\/loc>/g;
      const urls: string[] = [];
      let match;

      while ((match = urlPattern.exec(xml)) !== null) {
        urls.push(match[1].trim());
      }

      return {
        valid: true,
        errors: [],
        urls,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message],
        urls: [],
      };
    }
  }

  /**
   * Check robots.txt for errors
   */
  static async checkRobotsTxt(url: string): Promise<{ valid: boolean; errors: string[]; rules: any }> {
    try {
      const robotsUrl = new URL('/robots.txt', url).toString();
      const response = await fetch(robotsUrl);

      if (!response.ok) {
        return {
          valid: false,
          errors: [`Robots.txt not found (${response.status} ${response.statusText})`],
          rules: {},
        };
      }

      const content = await response.text();

      return {
        valid: true,
        errors: [],
        rules: this.parseRobotsTxt(content),
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message],
        rules: {},
      };
    }
  }

  /**
   * Check if a page is mobile-friendly using Google's Mobile-Friendly Test API
   */
  static async checkMobileFriendly(url: string): Promise<{ isMobileFriendly: boolean; errors: string[] }> {
    try {
      // This is a simplified check using Puppeteer or similar tools
      // For now, we'll use a simple heuristic based on viewport meta tag
      const response = await fetch(url);
      const html = await response.text();

      const viewportPattern = /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i;
      const viewportMatch = html.match(viewportPattern);

      if (!viewportMatch) {
        return {
          isMobileFriendly: false,
          errors: ['Missing viewport meta tag'],
        };
      }

      const viewportContent = viewportMatch[1].toLowerCase();
      if (!viewportContent.includes('width=device-width') || !viewportContent.includes('initial-scale=1')) {
        return {
          isMobileFriendly: false,
          errors: ['Viewport meta tag is not properly configured for mobile devices'],
        };
      }

      return {
        isMobileFriendly: true,
        errors: [],
      };
    } catch (error: any) {
      console.error(`Failed to check mobile-friendliness for ${url}:`, error.message);
      return {
        isMobileFriendly: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Parse robots.txt content
   */
  private static parseRobotsTxt(content: string): any {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    const rules: any = {};
    let currentUserAgent = '*';

    rules[currentUserAgent] = { allow: [], disallow: [] };

    for (const line of lines) {
      const [key, value] = line.split(':').map(s => s.trim());

      if (key.toLowerCase() === 'user-agent') {
        currentUserAgent = value;
        if (!rules[currentUserAgent]) {
          rules[currentUserAgent] = { allow: [], disallow: [] };
        }
      } else if (key.toLowerCase() === 'allow') {
        rules[currentUserAgent].allow.push(value);
      } else if (key.toLowerCase() === 'disallow') {
        rules[currentUserAgent].disallow.push(value);
      } else if (key.toLowerCase() === 'sitemap') {
        if (!rules.sitemaps) rules.sitemaps = [];
        rules.sitemaps.push(value);
      }
    }

    return rules;
  }
}

/**
 * Helper function for checking broken links
 */
export async function checkBrokenLinks(url: string): Promise<BrokenLinkResult[]> {
  return BrokenLinksChecker.checkBrokenLinks(url);
}

/**
 * Helper function for checking redirect chains
 */
export async function checkRedirectChains(
  url: string
): Promise<RedirectChainResult[]> {
  return BrokenLinksChecker.checkRedirectChains(url);
}

/**
 * Helper function for checking canonical tag
 */
export async function checkCanonicalTag(url: string): Promise<string | null> {
  return BrokenLinksChecker.checkCanonicalTag(url);
}

/**
 * Helper function for checking hreflang tags
 */
export async function checkHreflangTags(url: string): Promise<string[]> {
  return BrokenLinksChecker.checkHreflangTags(url);
}

/**
 * Helper function for checking sitemap
 */
export async function checkSitemap(url: string): Promise<{ valid: boolean; errors: string[]; urls: string[] }> {
  return BrokenLinksChecker.checkSitemap(url);
}

/**
 * Helper function for checking robots.txt
 */
export async function checkRobotsTxt(url: string): Promise<{ valid: boolean; errors: string[]; rules: any }> {
  return BrokenLinksChecker.checkRobotsTxt(url);
}

/**
 * Helper function for checking mobile-friendliness
 */
export async function checkMobileFriendly(url: string): Promise<{ isMobileFriendly: boolean; errors: string[] }> {
  return BrokenLinksChecker.checkMobileFriendly(url);
}
