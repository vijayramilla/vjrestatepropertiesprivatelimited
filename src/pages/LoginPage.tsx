import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';

/**
 * Public login/register page (/login). Google-only, matching what the backend
 * actually supports. Preserves ?next= so a guest who was gated mid-action
 * resumes the original destination after sign-in — the redirect is validated
 * to be internal (no open-redirect).
 */
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  // Must be an internal absolute path — block protocol-relative, //, and any
  // scheme (https:, javascript:). No back-navigation out of our domain.
  if (!raw.startsWith('/') || raw.startsWith('//') || /^(?:[a-z][a-z0-9+.-]*:)/i.test(raw)) return null;
  return raw;
}

export default function LoginPage() {
  const { user, signInWithGoogle, error: authError, clearError } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));

  useEffect(() => { clearError(); }, [clearError]);

  // If a session already exists (or appears), validate & route onward by
  // partner status — the same logic the gated actions use.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      let target = next ?? '/';
      try {
        const { callDataProxy, isSupabaseDataEnabled } = await import('@/lib/supabaseData');
        if (isSupabaseDataEnabled()) {
          const res = await callDataProxy('partner.check', {}, {});
          if (res?.registered) {
            // Partner: honour next only if it's a partner-safe destination;
            // otherwise dashboard.
            if (!next || next === '/partner' || next === '/partner-register') target = '/partner-dashboard';
          }
        }
      } catch { /* non-partner or offline — go to next/'/' */ }
      if (!cancelled) navigate(target, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [user, next, navigate]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F8F9FB] pt-[calc(var(--vjr-header-h)+0.25rem)]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-[#E4E7EC] bg-white p-6 shadow-[0_10px_36px_rgba(10,22,40,0.06)] sm:p-8">
          <div className="flex items-center justify-center gap-2.5">
            <img src="/favicon.png" alt="VJR Estate logo" className="h-10 w-10 shrink-0 object-contain" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#0A1628]">VJR Estate</h1>
          </div>
          <h2 className="mt-5 text-center text-[17px] font-bold text-[#101828]">Welcome to VJR Estate</h2>
          <p className="mt-1 text-center text-[13px] leading-relaxed text-[#667085]">
            Sign in or create an account to manage your property journey.
          </p>

          <div className="mt-7">
            <GoogleSignInButton onClick={async () => {
              try { await signInWithGoogle(); } catch { /* cancelled */ }
            }} />
          </div>
          {authError && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-[12px] font-medium text-red-700">{authError}</p>
          )}

          <ul className="mt-6 space-y-1.5" aria-label="What signing in is used for">
            {['List your property as an Owner, Builder or Agent',
              'Track enquiries, bookings and revenue on your partner dashboard',
              'Save properties and pick up where you left off'].map((line) => (
            <li key={line} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#667085]">
              <CheckCircle size={13} weight="fill" className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
              {line}
            </li>
          ))}
          </ul>

          <p className="mt-7 border-t border-[#F2F4F7] pt-4 text-center text-[10.5px] leading-relaxed text-[#98A2B3]">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="font-medium text-[#475467] underline underline-offset-2">Terms of Service</Link>{' '}and{' '}
            <Link to="/privacy" className="font-medium text-[#475467] underline underline-offset-2">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Visual and behavioural twin of the Navbar's Google button. */
function GoogleSignInButton({ onClick }: { onClick: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const { loading: authLoading } = useAuth();
  return (
    <button
      type="button"
      onClick={async () => { if (busy || authLoading) return; setBusy(true); try { await onClick(); } finally { setBusy(false); } }}
      disabled={busy || authLoading}
      className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#DADCE0] bg-white px-4 text-[13.5px] font-semibold text-[#101828] shadow-sm transition-colors hover:bg-[#F8F9FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C] disabled:opacity-60"
    >
      {busy || authLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" aria-hidden="true" />
      ) : (
        <GoogleG aria-hidden="true" />
      )}
      Continue with Google
    </button>
  );
}

function GoogleG({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-[18px] w-[18px] shrink-0 ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3a7.15 7.15 0 0 1-4.07 1.17c-3.13 0-5.78-2.11-6.72-4.96H1.29v3.1A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.28 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.3V6.6H1.29a11.99 11.99 0 0 0 0 10.8l3.99-3.1z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.6l3.99 3.1C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}
