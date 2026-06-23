import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  trackUserLogin,
  updateUserPresence,
  checkUserSuspended,
} from '@/lib/userTracking';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PRESENCE_INTERVAL_MS = 2 * 60 * 1000;

function getAuthErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    if (code === 'auth/popup-closed-by-user') return 'Sign-in was cancelled.';
    if (code === 'auth/popup-blocked') return 'Popup was blocked. Allow popups and try again.';
    if (code === 'auth/cancelled-popup-request') return 'Sign-in was cancelled.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Could not sign in with Google. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackedUidRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (!firebaseUser) {
        trackedUidRef.current = null;
        return;
      }

      void (async () => {
        try {
          const suspended = await checkUserSuspended(firebaseUser);
          if (suspended) {
            await firebaseSignOut(auth);
            setUser(null);
            setError('Your account has been suspended. Contact support.');
            trackedUidRef.current = null;
            return;
          }

          if (trackedUidRef.current !== firebaseUser.uid) {
            const result = await trackUserLogin(firebaseUser);
            if (result.suspended) {
              await firebaseSignOut(auth);
              setUser(null);
              setError('Your account has been suspended. Contact support.');
              trackedUidRef.current = null;
              return;
            }
            trackedUidRef.current = firebaseUser.uid;
          }
        } catch (err) {
          console.error('User tracking error:', err);
        }
      })();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const tick = () => {
      updateUserPresence(user).catch(() => {});
    };

    tick();
    const id = window.setInterval(tick, PRESENCE_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    trackedUidRef.current = null;
    await firebaseSignOut(auth);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signInWithGoogle, signOut, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
