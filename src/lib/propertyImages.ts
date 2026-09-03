import {
  supabaseUploadImages,
  supabaseDeleteImage,
} from '@/lib/supabaseData';

export async function uploadPropertyImage(
  file: File,
  propertyId: string,
  _uid: string,
): Promise<string> {
  const [url] = await supabaseUploadImages('property-images', propertyId, [file]);
  return url;
}

export async function uploadPropertyImages(
  files: File[],
  propertyId: string,
  _uid: string,
): Promise<string[]> {
  return supabaseUploadImages('property-images', propertyId, files);
}

export async function uploadAuctionImage(
  file: File,
  auctionId: string,
  _uid: string,
): Promise<string> {
  const [url] = await supabaseUploadImages('auction-images', auctionId, [file]);
  return url;
}

export async function uploadAuctionImages(
  files: File[],
  auctionId: string,
  _uid: string,
): Promise<string[]> {
  return supabaseUploadImages('auction-images', auctionId, files);
}

export async function deletePropertyImageByUrl(url: string): Promise<void> {
  await supabaseDeleteImage(url);
}
