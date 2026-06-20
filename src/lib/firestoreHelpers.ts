import {
  collection,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizePropertyRecord } from '@/lib/propertyFilters';

export function sanitizeForFirestore<T extends Record<string, unknown>>(data: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}

export function getCreatedAtMs(data: DocumentData): number {
  const createdAt = data.createdAt;
  if (createdAt && typeof createdAt.toDate === 'function') {
    return createdAt.toDate().getTime();
  }
  return 0;
}

export function sortDocsByNewest(docs: { id: string; data: DocumentData }[]): { id: string; data: DocumentData }[] {
  return [...docs].sort((a, b) => getCreatedAtMs(b.data) - getCreatedAtMs(a.data));
}

export function subscribeProperties(
  onData: (docs: { id: string; data: DocumentData }[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'properties'),
    (snap: QuerySnapshot) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        data: normalizePropertyRecord(d.data()),
      }));
      onData(sortDocsByNewest(docs));
    },
    (error) => {
      console.error('Firestore properties listener error:', error);
      onError?.(error);
    },
  );
}
