/**
 * Pexels and Unsplash image search client.
 */
import https from 'https';
import type { ImageData } from './types';

export function fetchPexelsImage(query: string): Promise<ImageData | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return Promise.resolve(null);

  return new Promise((resolve) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
    const req = https.get(url, { headers: { Authorization: apiKey } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const photo = json.photos?.[0];
          if (!photo) return resolve(null);
          resolve({
            url: photo.src.large2x,
            alt: photo.alt || query,
            photographer: photo.photographer,
            credit: `${photo.photographer} / Pexels`,
            source: 'pexels',
          });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

export function fetchUnsplashImage(query: string): Promise<ImageData | null> {
  const apiKey = process.env.UNSPLASH_API_KEY || process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!apiKey) return Promise.resolve(null);

  return new Promise((resolve) => {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
    const req = https.get(url, { headers: { Authorization: `Client-ID ${apiKey}` } }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const photo = json.results?.[0];
          if (!photo) return resolve(null);
          resolve({
            url: photo.urls.regular,
            alt: photo.alt_description || query,
            photographer: photo.user.name,
            credit: `${photo.user.name} / Unsplash`,
            source: 'unsplash',
          });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

export async function fetchBestImage(query: string): Promise<ImageData | null> {
  const pexels = await fetchPexelsImage(query);
  if (pexels) return pexels;
  return fetchUnsplashImage(query);
}
