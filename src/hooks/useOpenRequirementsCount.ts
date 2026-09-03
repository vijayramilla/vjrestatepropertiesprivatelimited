import { useEffect, useState, startTransition } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSupabaseData, subscribeSupabaseOpenRequirementsCount } from '@/lib/supabaseData';

export function useOpenRequirementsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (useSupabaseData()) {
      const unsub = subscribeSupabaseOpenRequirementsCount((value) =>
        startTransition(() => setCount(value)),
      );
      return () => unsub();
    }
    const q = query(collection(db, 'requirements'), where('status', '==', 'open'));
    const unsub = onSnapshot(
      q,
      (snap) => startTransition(() => setCount(snap.size)),
      () => startTransition(() => setCount(0)),
    );
    return () => unsub();
  }, []);

  return count;
}
