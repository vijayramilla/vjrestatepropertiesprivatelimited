import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import { callDataProxy, isSupabaseDataEnabled } from '@/lib/supabaseData';

interface PropertyAccessContextValue {
  /** True while the access check for the signed-in user is in flight. */
  loading: boolean;
  /** True when the signed-in user may create listings (admin or granted). */
  canAdd: boolean;
  /**
   * Optimistic local flip used by the admin Users dashboard right after a
   * successful user.access call, so the navbar/menu react without a refetch.
   */
  setCanAddOverride: (uid: string | null, canAdd: boolean) => void;
}

const PropertyAccessContext = createContext<PropertyAccessContextValue | null>(null);

/**
 * Single source of truth for the admin-granted "Add Property" permission.
 *
 * The proxy's user.accessStatus already grants super admins/admin_users rows
 * unconditionally; isAuthorizedAdmin here is just the fast path so admins
 * never wait on a network round trip.
 */
export function PropertyAccessProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [canAdd, setCanAdd] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCanAdd(false);
        setLoading(false);
        return;
      }
      if (isAuthorizedAdmin(user)) {
        setCanAdd(true);
        setLoading(false);
        return;
      }
      if (!isSupabaseDataEnabled()) {
        setCanAdd(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      void callDataProxy('user.accessStatus')
        .then((res) => setCanAdd(Boolean(res?.canAddProperty)))
        .catch(() => setCanAdd(false))
        .finally(() => setLoading(false));
    });

    return () => unsubscribe();
  }, []);

  const setCanAddOverride = useCallback((_uid: string | null, value: boolean) => {
    setCanAdd(value);
  }, []);

  return (
    <PropertyAccessContext.Provider value={{ loading, canAdd, setCanAddOverride }}>
      {children}
    </PropertyAccessContext.Provider>
  );
}

export function usePropertyAccess() {
  const ctx = useContext(PropertyAccessContext);
  if (!ctx) throw new Error('usePropertyAccess must be used within PropertyAccessProvider');
  return ctx;
}
