import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import { callDataProxy, isSupabaseDataEnabled } from '@/lib/supabaseData';

interface PropertyAccessState {
  loading: boolean;
  /** True when the signed-in user may create listings (admin or granted). */
  canAdd: boolean;
}

/**
 * Reads the admin-granted "Add Property" permission for the signed-in user.
 * Super admins and admin_users rows always have access (the proxy's
 * user.accessStatus already applies that rule — this hook just mirrors the
 * fast path so admins never wait on a network round trip).
 */
export function usePropertyAccess(): PropertyAccessState {
  const [state, setState] = useState<PropertyAccessState>({ loading: true, canAdd: false });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setState({ loading: false, canAdd: false });
        return;
      }
      if (isAuthorizedAdmin(user)) {
        setState({ loading: false, canAdd: true });
        return;
      }
      if (!isSupabaseDataEnabled()) {
        setState({ loading: false, canAdd: false });
        return;
      }
      void callDataProxy('user.accessStatus')
        .then((res) => setState({ loading: false, canAdd: Boolean(res?.canAddProperty) }))
        .catch(() => setState({ loading: false, canAdd: false }));
    });

    return () => unsubscribe();
  }, []);

  return state;
}
