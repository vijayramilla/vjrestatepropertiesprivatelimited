import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

async function uploadImage(
  folder: string,
  file: File,
  entityId: string,
  uid: string,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${uid}/${entityId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function uploadPropertyImage(
  file: File,
  propertyId: string,
  uid: string,
): Promise<string> {
  return uploadImage('properties', file, propertyId, uid);
}

export async function uploadPropertyImages(
  files: File[],
  propertyId: string,
  uid: string,
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadPropertyImage(file, propertyId, uid)));
}

export async function uploadAuctionImage(
  file: File,
  auctionId: string,
  uid: string,
): Promise<string> {
  return uploadImage('auctions', file, auctionId, uid);
}

export async function uploadAuctionImages(
  files: File[],
  auctionId: string,
  uid: string,
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadAuctionImage(file, auctionId, uid)));
}

export async function deletePropertyImageByUrl(url: string): Promise<void> {
  try {
    const path = decodeURIComponent(url.split('/o/')[1]?.split('?')[0] ?? '');
    if (!path) return;
    await deleteObject(ref(storage, path));
  } catch {
    // Ignore missing files or permission errors during cleanup
  }
}
