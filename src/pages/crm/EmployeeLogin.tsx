import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { checkCrmAccess } from '@/lib/adminAuth';
import { ShieldCheck, Lock } from 'lucide-react';

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const ok = await checkCrmAccess(user);
      if (ok) navigate('/crm/dashboard', { replace: true });
    });
    return unsub;
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const ok = await checkCrmAccess(result.user);
      if (ok) {
        navigate('/crm/dashboard', { replace: true });
      } else {
        await signOut(auth);
        setError('This Google account is not linked to an employee at VJR Estate, or your access has not been activated yet. Please contact your admin.');
      }
    } catch (err) {
      if ((err as { code?: string }).code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-[#0A1628] px-4 py-8">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-[#C9A84C]/[0.08] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-52 -right-32 h-[420px] w-[420px] rounded-full bg-[#1E3852]/60 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative m-auto w-full max-w-[430px]"
      >
        <div className="rounded-3xl border border-white/[0.08] bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-10">
          <div className="flex flex-col items-center text-center">
            <img src="/favicon.png" alt="VJR Estate" className="h-16 w-16 rounded-2xl object-contain shadow-[0_8px_24px_rgba(201,168,76,0.35)]" />
            <h1 className="mt-4 font-['Inter',sans-serif] text-[24px] font-semibold tracking-tight text-[#0A1628] sm:text-[26px]">
              VJR Estate
            </h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#96782A]">
              Employee Portal
            </p>
            <p className="mt-4 max-w-[300px] text-[12.5px] leading-relaxed text-[#6b7280]">
              Sign in with the Google account your employer registered for you to access your clients and workspace.
            </p>
          </div>

          <div className="my-7 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent" />

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-sm font-semibold text-[#0A1628] shadow-[0_2px_10px_rgba(10,22,40,0.08)] transition-all hover:bg-[#fafafa] active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {googleLoading ? 'Signing in with Google…' : 'Continue with Google'}
          </button>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[10.5px] font-medium text-[#9ca3af]">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
            Secured by VJR Estate Properties &middot; Confidential
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[10.5px] text-white/40">
          <Lock className="h-3 w-3" strokeWidth={1.8} />
          Only employees with activated access can sign in
        </div>
      </motion.div>
    </div>
  );
}
