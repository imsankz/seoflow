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
