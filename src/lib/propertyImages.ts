import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function uploadPropertyImage(
  file: File,
  propertyId: string,
  uid: string,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `properties/${uid}/${propertyId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function uploadPropertyImages(
  files: File[],
  propertyId: string,
  uid: string,
): Promise<string[]> {
  return Promise.all(files.map((file) => uploadPropertyImage(file, propertyId, uid)));
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
