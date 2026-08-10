import { useEffect, useState, startTransition } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useUnreviewedApplicationsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'job_applications'),
      where('viewedByAdmin', '==', false),
    );
    const unsub = onSnapshot(
      q,
      (snap) => startTransition(() => setCount(snap.size)),
      () => startTransition(() => setCount(0)),
    );
    return () => unsub();
  }, []);

  return count;
}
