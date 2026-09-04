import { useEffect, useRef, useState } from 'react';
import {
  optimizeSupabaseUrl,
  getSupabaseSrcSet,
  stripTransformParams,
  isSupabaseStorageUrl,
  type ImagePreset,
} from '@/utils/supabaseImageLoader';

/**
 * Drop-in replacement for <img> / LazyImage that renders Supabase storage
 * images with responsive transformed URLs.
 *
 * Design notes:
 *  - Renders a plain <img> and passes className through untouched, so existing
 *    layouts (absolute fills inside aspect boxes, in-flow images, hover zoom)
 *    behave exactly as before. No wrapper div is introduced.
 *  - Non-Supabase URLs (Firebase download URLs, blob: previews, external
 *    images) pass through unchanged.
 *  - On load failure the src falls back from the transformed URL to the plain
 *    object URL, then to `fallback`, then to the caller's onError — so a
 *    broken transformation can never blank an image.
 *  - Lazy loads via IntersectionObserver (300px preload margin) unless
 *    `priority` is set, matching LazyImage semantics.
 */

const SVG_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmMWYxZjEiLz48L3N2Zz4=';

interface SupabaseImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Size preset — card (default), hero, thumb, admin, document. */
  preset?: ImagePreset;
  objectFit?: 'cover' | 'contain' | 'fill';
  objectPosition?: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export default function SupabaseImage({
  src,
  alt,
  className = '',
  preset = 'card',
  objectFit,
  objectPosition,
  width,
  height,
  quality,
  priority = false,
  fetchPriority,
  sizes,
  placeholder = SVG_PLACEHOLDER,
  fallback = '',
  onLoad,
  onError,
}: SupabaseImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const [stage, setStage] = useState(0); // 0 = transform URL, 1 = plain URL, 2 = failed
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset when the src changes (e.g. gallery navigation, new data).
  useEffect(() => {
    setStage(0);
    setIsLoaded(false);
  }, [src]);

  // Lazy loading via IntersectionObserver (skipped for priority images).
  useEffect(() => {
    if (priority || isVisible || stage >= 2) return;
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.01, rootMargin: '300px' },
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority, isVisible, stage, src]);

  const optimizedSrc =
    isVisible && src && stage === 0
      ? optimizeSupabaseUrl(src, preset, {
          width,
          height,
          quality,
          resize: objectFit,
        })
      : '';

  // srcset only for real Supabase object URLs; browser fetches one candidate.
  const srcSet =
    isVisible && src && stage === 0 && isSupabaseStorageUrl(src)
      ? getSupabaseSrcSet(src, preset, quality)
      : '';

  const defaultSizes =
    sizes ??
    (preset === 'hero'
      ? '100vw'
      : preset === 'card'
        ? '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
        : '(max-width: 768px) 50vw, 25vw');

  const handleError = () => {
    if (stage === 0 && src && isSupabaseStorageUrl(src)) {
      // Transformed URL failed — retry the plain object URL.
      setStage(1);
      return;
    }
    if (stage === 1 && fallback) {
      setStage(2);
      setIsLoaded(true);
      return;
    }
    setStage(2);
    setIsLoaded(true);
    onError?.();
  };

  if (!src || stage === 2) {
    // Nothing to show: empty src or exhausted fallbacks. Still render an img
    // so onError-based parent placeholders keep working, with the fallback
    // image when provided.
    return (
      <img
        ref={imgRef}
        src={stage === 2 && fallback ? fallback : placeholder}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(fetchPriority ? { fetchpriority: fetchPriority } : {})}
        onLoad={() => {
          setIsLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          setIsLoaded(true);
          onError?.();
        }}
      />
    );
  }

  const currentSrc =
    stage === 0 && isVisible
      ? optimizedSrc
      : stage === 1 && isVisible
        ? stripTransformParams(src)
        : placeholder;

  return (
    <img
      ref={imgRef}
      src={currentSrc || placeholder}
      srcSet={stage === 0 ? srcSet || undefined : undefined}
      sizes={stage === 0 ? defaultSizes : undefined}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{
        objectFit,
        objectPosition,
      }}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...(fetchPriority ? { fetchpriority: fetchPriority } : {})}
      onLoad={() => {
        setIsLoaded(true);
        onLoad?.();
      }}
      onError={handleError}
    />
  );
}
