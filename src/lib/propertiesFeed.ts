import { collection, getDocs, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizePropertyRecord } from '@/lib/propertyFilters';
import { getCreatedAtMs } from '@/lib/firestoreHelpers';

export interface PropertyFeedRecord extends Record<string, unknown> {
  id: string;
}

/**
 * Heavy fields cards never render — stripped before caching so IndexedDB
 * writes and memory stay lean. The detail page fetches its own full doc.
 * extra_details is kept: land cards render DC conversion from it.
 */
const HEAVY_FIELDS = ['description', 'highlights', 'amenities'] as const;

function slimPropertyRecord(record: DocumentData): DocumentData {
  for (const field of HEAVY_FIELDS) delete record[field];
  return record;
}

/**
 * One-shot fetch for the listing feed — deliberately NOT a realtime
 * listener, so visiting the properties page never keeps a persistent
 * watch on the whole collection (the previous onSnapshot cost a full
 * download + re-render on every change anywhere in the collection).
 * The feed refreshes on each page visit via stale-while-revalidate.
 */
export async function fetchPropertyFeed(): Promise<PropertyFeedRecord[]> {
  const snap = await getDocs(collection(db, 'properties'));

  const docs = snap.docs.map((d) => ({
    id: d.id,
    data: slimPropertyRecord(normalizePropertyRecord(d.data())),
  }));

  // Sort once at fetch time (newest first) and cache the resulting order,
  // so the listing page never re-parses dates on every render/sort.
  docs.sort((a, b) => getCreatedAtMs(b.data) - getCreatedAtMs(a.data));

  return docs.map(({ id, data }) => ({ id, ...data }));
}

/* ------------------------------------------------------------------ */
/* IndexedDB cache — async, non-blocking, no 5MB localStorage limit.  */
/* ------------------------------------------------------------------ */

const DB_NAME = 'vjr-property-feed';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* storage unavailable / quota — memory cache still works */
  }
}
