import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (isAuthorizedAdmin(user)) navigate('/admin/properties', { replace: true });
    });
    return unsub;
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!isAuthorizedAdmin(userCredential.user)) {
        await signOut(auth);
        setError('You do not have admin access.');
        return;
      }
      navigate('/admin/properties');
    } catch (err) {
      setError('Invalid credentials. Try again.');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (isAuthorizedAdmin(result.user)) {
        navigate('/admin/properties');
      } else {
        await signOut(auth);
        setError('This Google account does not have admin access.');
      }
    } catch (err) {
      if ((err as { code?: string }).code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="admin-theme relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-white px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#f5f5f5_0%,_#ffffff_50%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="admin-card relative w-full max-w-[420px] border-gray-200 p-6 shadow-lg shadow-black/10 sm:p-10"
      >
        <div className="text-center">
          <h1 className="admin-heading text-2xl font-medium text-black sm:text-3xl">VJR Estate</h1>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
            Admin Portal
          </p>
        </div>

        <div className="my-6 h-px bg-gray-200 sm:my-8" />

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {googleLoading ? 'Signing in with Google...' : 'Sign in with Google'}
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label htmlFor="admin-email" className="admin-label">Email</label>
            <input
              id="admin-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="admin-input"
            />
          </div>

          <div className="relative">
            <label htmlFor="admin-password" className="admin-label">Password</label>
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="admin-input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-[calc(50%+10px)] flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-black"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="admin-btn-primary mt-2 w-full min-h-[48px]">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
