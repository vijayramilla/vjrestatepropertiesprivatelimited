import {
  collection,
  onSnapshot,
  query,
  type DocumentData,
  type QueryConstraint,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { startTransition } from 'react';
import { db } from '@/lib/firebase';
import { normalizePropertyRecord } from '@/lib/propertyFilters';
import { useSupabaseData, subscribeSupabaseProperties } from '@/lib/supabaseData';

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
  ...constraints: QueryConstraint[]
): Unsubscribe {
  if (useSupabaseData()) {
    // Firestore constraints are only used for owner-scoping in MyListingsPage;
    // that page passes { uid } explicitly via subscribeSupabaseProperties, so
    // the generic path here is the public all-properties subscription.
    return subscribeSupabaseProperties(
      (docs) => startTransition(() => onData(docs)),
      { uid: extractUidConstraint(constraints) },
    );
  }

  const ref = constraints.length > 0
    ? query(collection(db, 'properties'), ...constraints)
    : collection(db, 'properties');
  return onSnapshot(
    ref,
    (snap: QuerySnapshot) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        data: normalizePropertyRecord(d.data()),
      }));
      // Defer the state update out of the commit phase: Firestore delivers
      // cached snapshots synchronously, and React 18.3.1 crashes with
      // "Should have a queue" when setState runs during that window.
      startTransition(() => onData(sortDocsByNewest(docs)));
    },
    (error) => {
      console.error('Firestore properties listener error:', error);
      onError?.(error);
    },
  );
}

/**
 * Best-effort extraction of `where('uid', '==', …)` from Firestore
 * constraints (used by MyListingsPage). Falls back to undefined.
 */
function extractUidConstraint(constraints: QueryConstraint[]): string | undefined {
  for (const constraint of constraints) {
    const c = constraint as unknown as {
      _field?: { canonicalString?: () => string };
      _value?: unknown;
    };
    if (c?._field?.canonicalString?.() === 'uid' && typeof c._value === 'string') {
      return c._value;
    }
  }
  return undefined;
}
