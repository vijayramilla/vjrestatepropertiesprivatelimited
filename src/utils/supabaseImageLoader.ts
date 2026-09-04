import { supabaseDataUrl } from '@/lib/supabaseConfig';
import { getCachedOptimizedUrl, setCachedOptimizedUrl } from './imageCache';

/**
 * Smart Supabase storage URL generator.
 *
 * Every Supabase object URL on the site can go through here: it attaches the
 * Image Transformations query params (width/height/quality/resize/format),
 * resolves size presets by device, and builds responsive srcsets. Two
 * important safety properties:
 *
 *  1. Non-Supabase URLs (Firebase download URLs from pre-migration rows,
 *     blob: previews, external links) pass through unchanged, so this is safe
 *     to call for any <img> src.
 *  2. When the Image Transformations add-on is not enabled on the project,
 *     Supabase ignores the params and serves the original — the URL still
 *     renders. The moment the add-on is switched on, every existing caller
 *     automatically gets resized WebP/AVIF output with no code change.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type ImagePreset = 'card' | 'hero' | 'thumb' | 'admin' | 'document';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type ResizeMode = 'cover' | 'contain' | 'fill';
export type OutputFormat = 'webp' | 'avif' | 'jpeg' | 'png' | 'origin';

interface PresetSpec {
  width: number;
  height: number;
  quality: number;
}

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: OutputFormat;
  resize?: ResizeMode;
}

// ─── Device detection ──────────────────────────────────────────────────────

export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// ─── Size presets ──────────────────────────────────────────────────────────

export const IMAGE_PRESETS: Record<ImagePreset, Record<DeviceType, PresetSpec>> = {
  // Property / auction card thumbnail
  card: {
    mobile: { width: 400, height: 267, quality: 75 },
    tablet: { width: 600, height: 400, quality: 80 },
    desktop: { width: 800, height: 533, quality: 85 },
  },
  // Detail-page hero image
  hero: {
    mobile: { width: 768, height: 512, quality: 80 },
    tablet: { width: 1024, height: 683, quality: 85 },
    desktop: { width: 1440, height: 960, quality: 90 },
  },
  // Small thumbnail / gallery strip
  thumb: {
    mobile: { width: 120, height: 80, quality: 70 },
    tablet: { width: 160, height: 107, quality: 75 },
    desktop: { width: 200, height: 133, quality: 80 },
  },
  // Admin panel previews
  admin: {
    mobile: { width: 300, height: 200, quality: 75 },
    tablet: { width: 400, height: 267, quality: 80 },
    desktop: { width: 500, height: 333, quality: 85 },
  },
  // Payslip / document thumbnails
  document: {
    mobile: { width: 200, height: 283, quality: 80 },
    tablet: { width: 300, height: 424, quality: 85 },
    desktop: { width: 400, height: 566, quality: 90 },
  },
};

// ─── URL parsing ───────────────────────────────────────────────────────────

/**
 * Extract `{ bucket, path, origin }` from a Supabase public storage URL:
 *   {origin}/storage/v1/object/public/{bucket}/{path...}
 */
export function parseSupabaseUrl(url: string): {
  bucket: string;
  path: string;
  origin: string;
} | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(
    /^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/([^/?]+)\/([^?]+)/,
  );
  if (!match) return null;
  try {
    return {
      origin: match[1],
      bucket: decodeURIComponent(match[2]),
      path: decodeURIComponent(match[3]),
    };
  } catch {
    return null;
  }
}

/** True when the URL is a Supabase public storage object URL. */
export function isSupabaseStorageUrl(url: string): boolean {
  const parsed = parseSupabaseUrl(url);
  if (!parsed) return false;
  return parsed.origin.includes('supabase.co') || parsed.origin.includes('supabase.in');
}

/** Full public URL for an object path on the configured Supabase project. */
export function supabaseObjectUrl(bucket: string, path: string): string {
  const cleanPath = String(path).replace(/^\/+/, '');
  const origin = (supabaseDataUrl || '').replace(/\/+$/, '');
  if (!origin) return cleanPath; // data layer off — nothing to rewrite onto
  return `${origin}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

/** Strip the transformation query params, returning the plain object URL. */
export function stripTransformParams(url: string): string {
  if (!url || !url.includes('?')) return url;
  const parsed = parseSupabaseUrl(url);
  return parsed ? `${parsed.origin}/storage/v1/object/public/${parsed.bucket}/${parsed.path}` : url;
}

// ─── Transform URL builder ────────────────────────────────────────────────

function buildTransformUrl(
  baseUrl: string,
  width: number,
  height: number,
  quality: number,
  resize: ResizeMode,
  format?: OutputFormat,
): string {
  const params = new URLSearchParams();
  params.set('width', String(Math.round(width)));
  params.set('height', String(Math.round(height)));
  params.set('resize', resize);
  params.set('quality', String(Math.round(quality)));
  // Supabase auto-serves WebP by default once the transformation add-on is on;
  // 'origin' keeps the source format (best for pixel-art / transparent PNGs).
  if (format && format !== 'origin') params.set('format', format);
  return `${baseUrl}?${params.toString()}`;
}

// ─── Smart URL generator ───────────────────────────────────────────────────

/**
 * Optimized URL for a storage object. `path` may be a bare object path or a
 * full Supabase URL — anything else is returned unchanged.
 */
export function getOptimizedImageUrl(
  bucket: string,
  path: string,
  preset: ImagePreset = 'card',
  options?: TransformOptions,
): string {
  if (!path) return '';
  if (path.startsWith('http')) {
    // Full URL — reuse optimizeSupabaseUrl so non-Supabase hosts pass through.
    return optimizeSupabaseUrl(path, preset, options);
  }
  if (!bucket) return path;

  const device = getDeviceType();
  const spec = IMAGE_PRESETS[presestSafe(preset)][device];
  const width = options?.width || spec.width;
  const height = options?.height || spec.height;
  const quality = options?.quality || spec.quality;
  const resize = options?.resize || 'cover';
  const format = options?.format;

  const baseUrl = supabaseObjectUrl(bucket, path);
  const cacheKey = `${baseUrl}`;
  const suffix = `${width}x${height}q${quality}r${resize}f${format ?? ''}`;
  const cached = getCachedOptimizedUrl(cacheKey, preset, device, suffix);
  if (cached) return cached;

  const url = buildTransformUrl(baseUrl, width, height, quality, resize, format);
  setCachedOptimizedUrl(cacheKey, preset, device, url, suffix);
  return url;
}

function presestSafe(preset: ImagePreset): ImagePreset {
  return IMAGE_PRESETS[preset] ? preset : 'card';
}

// ─── Smart URL from a full URL ─────────────────────────────────────────────

/** Optimize any Supabase storage URL; non-Supabase URLs come back untouched. */
export function optimizeSupabaseUrl(
  fullUrl: string,
  preset: ImagePreset = 'card',
  options?: TransformOptions,
): string {
  if (!fullUrl) return '';
  if (!isSupabaseStorageUrl(fullUrl)) return fullUrl;

  const parsed = parseSupabaseUrl(fullUrl);
  if (!parsed) return fullUrl;

  const device = getDeviceType();
  const spec = IMAGE_PRESETS[presestSafe(preset)][device];
  const width = options?.width || spec.width;
  const height = options?.height || spec.height;
  const quality = options?.quality || spec.quality;
  const resize = options?.resize || 'cover';
  const format = options?.format;

  const suffix = `${width}x${height}q${quality}r${resize}f${format ?? ''}`;
  const cached = getCachedOptimizedUrl(fullUrl, preset, device, suffix);
  if (cached) return cached;

  const baseUrl = `${parsed.origin}/storage/v1/object/public/${parsed.bucket}/${parsed.path}`;
  const url = buildTransformUrl(baseUrl, width, height, quality, resize, format);
  setCachedOptimizedUrl(fullUrl, preset, device, url, suffix);
  return url;
}

// ─── Srcset generator ──────────────────────────────────────────────────────

const SRC_SET_WIDTHS: Record<ImagePreset, number[]> = {
  hero: [768, 1024, 1280, 1440, 1920],
  card: [320, 480, 640, 800],
  thumb: [120, 200, 320, 480],
  admin: [240, 400, 500],
  document: [200, 300, 400],
};

/**
 * Responsive srcset for a Supabase storage URL. Only emits candidates for the
 * URL's own origin; when a non-Supabase URL is passed, returns ''.
 */
export function getSupabaseSrcSet(
  fullUrl: string,
  preset: ImagePreset = 'card',
  baseQuality?: number,
): string {
  if (!fullUrl || !isSupabaseStorageUrl(fullUrl)) return '';
  const parsed = parseSupabaseUrl(fullUrl);
  if (!parsed) return '';

  const device = getDeviceType();
  const spec = IMAGE_PRESETS[presestSafe(preset)][device];
  const quality = baseQuality || spec.quality;
  const resize = 'cover';
  const widths = SRC_SET_WIDTHS[presestSafe(preset)];
  const suffix = `srcset${quality}${resize}`;
  const cached = getCachedOptimizedUrl(fullUrl, preset, device, suffix);
  if (cached) return cached;

  const baseUrl = `${parsed.origin}/storage/v1/object/public/${parsed.bucket}/${parsed.path}`;
  const parts = widths.map((w) => {
    const h = Math.round((w * parsedHeightRatio(preset)));
    return `${buildTransformUrl(baseUrl, w, h, quality, resize)} ${w}w`;
  });
  const srcset = parts.join(', ');
  setCachedOptimizedUrl(fullUrl, preset, device, srcset, suffix);
  return srcset;
}

function parsedHeightRatio(preset: ImagePreset): number {
  const spec = IMAGE_PRESETS[presestSafe(preset)].desktop;
  return spec.height / spec.width;
}

// ─── Blur placeholder ──────────────────────────────────────────────────────

/**
 * Tiny transformed URL for blur-up placeholders. Callers decide whether to use
 * it — transformed requests are only cheap once the Image Transformations
 * add-on is enabled, otherwise Supabase returns the full-size original.
 */
export function getBlurPlaceholderUrl(
  fullUrl: string,
  bucketFallback = 'property-images',
): string {
  if (!fullUrl) return '';
  if (isSupabaseStorageUrl(fullUrl)) {
    return optimizeSupabaseUrl(fullUrl, 'thumb', {
      width: 20,
      height: 15,
      quality: 20,
      resize: 'cover',
    });
  }
  const parsed = parseSupabaseUrl(fullUrl);
  if (parsed) return getOptimizedImageUrl(parsed.bucket || bucketFallback, parsed.path, 'thumb', {
    width: 20,
    height: 15,
    quality: 20,
    resize: 'cover',
  });
  return fullUrl;
}

export type { TransformOptions };
