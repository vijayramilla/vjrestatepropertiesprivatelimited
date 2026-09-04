import {
  supabaseUploadImages,
  supabaseDeleteImage,
} from '@/lib/supabaseData';
import { compressImageFile } from '@/utils/supabaseUploader';

/**
 * Property & auction image upload helpers.
 *
 * Every image is re-encoded to WebP and downscaled on the client before it
 * leaves the device, then uploaded through the authenticated data-proxy
 * (never a browser-embedded service key). Callers keep the same API: pass
 * Files and receive public URLs back.
 */

async function optimizeEach(files: File[]): Promise<File[]> {
  const optimized: File[] = [];
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const result = await compressImageFile(file, { maxWidthPx: 1600, quality: 0.85 });
      optimized.push(result.file);
    } else {
      optimized.push(file);
    }
  }
  return optimized;
}

export async function uploadPropertyImage(
  file: File,
  propertyId: string,
  _uid: string,
): Promise<string> {
  const [url] = await uploadPropertyImages([file], propertyId, _uid);
  return url;
}

export async function uploadPropertyImages(
  files: File[],
  propertyId: string,
  _uid: string,
): Promise<string[]> {
  const optimized = await optimizeEach(files);
  return supabaseUploadImages('property-images', propertyId, optimized);
}

export async function uploadAuctionImage(
  file: File,
  auctionId: string,
  _uid: string,
): Promise<string> {
  const [url] = await uploadAuctionImages([file], auctionId, _uid);
  return url;
}

export async function uploadAuctionImages(
  files: File[],
  auctionId: string,
  _uid: string,
): Promise<string[]> {
  const optimized = await optimizeEach(files);
  return supabaseUploadImages('auction-images', auctionId, optimized);
}

export async function deletePropertyImageByUrl(url: string): Promise<void> {
  await supabaseDeleteImage(url);
}
