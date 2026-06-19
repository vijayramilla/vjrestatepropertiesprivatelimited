import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import { Eye, EyeSlash } from 'phosphor-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      localStorage.setItem('userEmail', userCredential.user.email || '');
      navigate('/admin/properties');
    } catch (err) {
      setError('Invalid credentials. Try again.');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-theme relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-white px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#f5f5f5_0%,_#ffffff_50%)]" />

      <div className="admin-card relative w-full max-w-[420px] border-gray-200 p-6 shadow-lg shadow-black/10 sm:p-10">
        <div className="text-center">
          <h1 className="admin-heading text-2xl font-medium text-black sm:text-3xl">VJR Estate</h1>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
            Admin Portal
          </p>
        </div>

        <div className="my-6 h-px bg-gray-200 sm:my-8" />

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
              {showPassword ? <EyeSlash size={18} weight="regular" /> : <Eye size={18} weight="regular" />}
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
      </div>
    </div>
  );
}
