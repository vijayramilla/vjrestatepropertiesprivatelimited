import { callDataProxy } from '@/lib/supabaseData';
import { parseSupabaseStoragePath } from '@/lib/supabaseConfig';

/**
 * Upload helpers with client-side compression.
 *
 * Files are validated and re-encoded to WebP in the browser BEFORE they leave
 * the device (60-80% smaller than JPEG/PNG for photos), then uploaded through
 * the Vercel data-proxy — the same authenticated path the site already uses,
 * so the Supabase service-role key never needs to exist in this bundle and
 * the storage RLS/bucket policies stay untouched.
 */

interface UploadOptions {
  bucket: 'property-images' | 'auction-images';
  /** Folder/entity id inside the bucket (the property or auction id). */
  entityId: string;
  maxSizeMB?: number;
  maxWidthPx?: number;
  quality?: number;
  allowedTypes?: string[];
  onProgress?: (percent: number) => void;
}

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: string;
}

const DEFAULT_ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Re-encode an image file as WebP at maxWidthPx, downscaling when needed.
 * Falls back to the original file when the browser can't decode or encode it.
 */
export async function compressImageFile(
  file: File,
  opts: { maxWidthPx?: number; quality?: number } = {},
): Promise<{ file: File; originalSize: number; compressedSize: number }> {
  const maxWidthPx = opts.maxWidthPx || 2400;
  const quality = opts.quality || 0.85;
  const originalSize = file.size;
  if (!file.type.startsWith('image/') || typeof document === 'undefined') {
    return { file, originalSize, compressedSize: originalSize };
  }

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxWidthPx) {
      height = Math.round((height * maxWidthPx) / width);
      width = maxWidthPx;
    }
    if (height > maxWidthPx) {
      width = Math.round((width * maxWidthPx) / height);
      height = maxWidthPx;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return { file, originalSize, compressedSize: originalSize };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, 'image/webp', quality);
      } catch {
        resolve(null);
      }
    });
    if (!blob) return { file, originalSize, compressedSize: originalSize };

    const baseName = (file.name.replace(/\.[^.]+$/, '') || 'photo')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 60);
    const webpFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
    return { file: webpFile, originalSize, compressedSize: blob.size };
  } catch {
    return { file, originalSize, compressedSize: originalSize };
  }
}

/** Validate type + size before spending work on compression/upload. */
export function validateUploadFile(
  file: File,
  options: Pick<UploadOptions, 'maxSizeMB' | 'allowedTypes'>,
): string | null {
  const allowed = options.allowedTypes ?? DEFAULT_ALLOWED;
  const type = (file.type || '').toLowerCase();
  if (!allowed.includes(type)) {
    return `File type ${file.type || 'unknown'} not supported. Use JPG, PNG or WebP.`;
  }
  const maxBytes = (options.maxSizeMB ?? 10) * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum ${options.maxSizeMB ?? 10} MB.`;
  }
  return null;
}

/**
 * Compress + upload a single image through the data proxy.
 * Returns the public URL and the object path inside the bucket.
 */
export async function uploadToSupabase(
  file: File,
  options: UploadOptions,
): Promise<UploadResult> {
  const { bucket, entityId, maxWidthPx = 2400, quality = 0.85, onProgress } = options;
  if (!entityId) return { success: false, error: 'entityId (property or auction id) is required' };

  const validationError = validateUploadFile(file, options);
  if (validationError) return { success: false, error: validationError };

  onProgress?.(10);
  try {
    const compressed = await compressImageFile(file, { maxWidthPx, quality });
    onProgress?.(50);
    const uploadFile = compressed.file;
    const originalSize = compressed.originalSize;
    const compressedSize = compressed.compressedSize;

    // Convert to base64 for the proxy's existing JSON body contract.
    const dataBase64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
      reader.readAsDataURL(uploadFile);
    });
    if (!dataBase64) return { success: false, error: 'Could not read file' };

    onProgress?.(70);
    const res = await callDataProxy('image.upload', {
      bucket,
      entityId,
      name: uploadFile.name,
      contentType: uploadFile.type || 'image/webp',
      dataBase64,
    });
    const url = res?.url as string | undefined;
    if (!url) return { success: false, error: 'Upload completed but no URL was returned' };

    onProgress?.(100);
    const parsed = parseSupabaseStoragePath(url);
    const ratio =
      originalSize > 0 && compressedSize > 0
        ? `${Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))}% smaller`
        : '';

    return {
      success: true,
      url,
      path: parsed?.path ?? res?.path ?? url,
      originalSize,
      compressedSize,
      compressionRatio: ratio,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Upload failed' };
  }
}

/** Upload several files, reporting overall progress (0-100). */
export async function uploadMultipleToSupabase(
  files: File[],
  options: UploadOptions,
  onOverallProgress?: (percent: number) => void,
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  for (let i = 0; i < files.length; i++) {
    const base = files.length > 1 ? (i / files.length) * 100 : 0;
    const span = files.length > 1 ? 100 / files.length : 100;
    const result = await uploadToSupabase(files[i], {
      ...options,
      onProgress: (p) => onOverallProgress?.(Math.round(base + (p * span) / 100)),
    });
    results.push(result);
  }
  onOverallProgress?.(100);
  return results;
}

/** Delete an object by its public URL or storage path (bucket, path). */
export async function deleteFromSupabase(
  bucketOrUrl: string,
  path?: string,
): Promise<boolean> {
  try {
    if (path) {
      await callDataProxy('image.delete', { bucket: bucketOrUrl, path });
      return true;
    }
    const parsed = parseSupabaseStoragePath(bucketOrUrl);
    if (!parsed) return false;
    await callDataProxy('image.delete', { bucket: parsed.bucket, path: parsed.path });
    return true;
  } catch {
    return false;
  }
}

export type { UploadOptions, UploadResult };
