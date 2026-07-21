import type { SourcePlatform } from '../../types';

/**
 * Parsed result of a shared URL. Platform-specific fetchers (in n8n) use
 * `oembedUrl` when present; `contentId` + `canonicalUrl` identify the post.
 */
export interface ParsedUrl {
  platform: SourcePlatform;
  /** The URL as shared, trimmed (tracking params stripped when we recognize the platform). */
  canonicalUrl: string | null;
  /** Platform-native id: IG shortcode, TikTok video id, YouTube video id, etc. */
  contentId: string | null;
  /** Public oembed endpoint, when the platform exposes one without auth. */
  oembedUrl: string | null;
  /** True when fetching this platform needs an app token / is fragile (Instagram, Facebook). */
  needsAuth: boolean;
}

/** Pull the first http(s) URL out of arbitrary shared text. */
export function extractUrl(text?: string | null): string | null {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
}

export function detectPlatform(url?: string | null): SourcePlatform {
  if (!url) return 'manual';
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('facebook.com') || u.includes('fb.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'x';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return 'manual';
}

/** Strip query/hash so we compare and store a stable URL. */
function stripParams(url: string): string {
  return url.split(/[?#]/)[0].replace(/\/+$/, '');
}

function instagramShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

function tiktokVideoId(url: string): string | null {
  // Full form: /@user/video/123 — short form (vm.tiktok.com/xxx) resolves server-side.
  const full = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (full) return full[1];
  const short = url.match(/(?:vm|vt)\.tiktok\.com\/([A-Za-z0-9]+)/i);
  return short ? short[1] : null;
}

function youtubeVideoId(url: string): string | null {
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (short) return short[1];
  const watch = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (watch) return watch[1];
  const sh = url.match(/youtube\.com\/(?:shorts|embed)\/([A-Za-z0-9_-]{6,})/i);
  return sh ? sh[1] : null;
}

/**
 * Parse a shared URL into platform + identifiers + a public oembed endpoint.
 * Pure + deterministic so it can run on the client and be mirrored in n8n.
 */
export function parseSharedUrl(rawUrl?: string | null): ParsedUrl {
  const url = (rawUrl ?? '').trim();
  const platform = detectPlatform(url);

  if (!url || platform === 'manual') {
    return { platform: 'manual', canonicalUrl: url || null, contentId: null, oembedUrl: null, needsAuth: false };
  }

  const canonicalUrl = stripParams(url);

  switch (platform) {
    case 'tiktok': {
      const contentId = tiktokVideoId(url);
      return {
        platform, canonicalUrl, contentId,
        oembedUrl: `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`,
        needsAuth: false,
      };
    }
    case 'youtube': {
      const contentId = youtubeVideoId(url);
      return {
        platform, canonicalUrl, contentId,
        oembedUrl: `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonicalUrl)}`,
        needsAuth: false,
      };
    }
    case 'instagram': {
      // Instagram oembed now requires a Facebook app token — fetching is fragile.
      const contentId = instagramShortcode(url);
      return { platform, canonicalUrl, contentId, oembedUrl: null, needsAuth: true };
    }
    case 'facebook':
      return { platform, canonicalUrl, contentId: null, oembedUrl: null, needsAuth: true };
    case 'x':
      // X/Twitter oembed is public but rate-limited; keep the endpoint.
      return {
        platform, canonicalUrl, contentId: null,
        oembedUrl: `https://publish.twitter.com/oembed?url=${encodeURIComponent(canonicalUrl)}`,
        needsAuth: false,
      };
    default:
      return { platform, canonicalUrl, contentId: null, oembedUrl: null, needsAuth: false };
  }
}
