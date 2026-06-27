import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useOpenRequirementsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'requirements'), where('status', '==', 'open'));
    const unsub = onSnapshot(
      q,
      (snap) => setCount(snap.size),
      () => setCount(0),
    );
    return () => unsub();
  }, []);

  return count;
}
