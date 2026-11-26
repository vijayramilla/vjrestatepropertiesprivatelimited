import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Vercel preview and branch deployments must never be indexed — production is
// the only surface Google should keep. The static shell ships index/follow, so
// flip that tag instead of adding a second, conflicting robots meta.
if (/\.vercel\.app$/i.test(window.location.hostname)) {
  const robots = document.querySelector('meta[name="robots"]');
  if (robots) robots.setAttribute('content', 'noindex, nofollow');
}

window.onerror = (msg, _url, line, col, err) => {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#991b1b;color:#fff;padding:0.75rem 1rem;font:12px/1.4 monospace';
  div.textContent = `[JS Error] ${err?.message || msg} (${line}:${col})`;
  document.body.appendChild(div);
};

// When a lazy-loaded chunk fails to load (stale index.html after deploy),
// reload once to fetch the fresh index.html with correct chunk hashes.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  window.location.reload();
});

function deferAnalytics() {
  const run = () => {
    void import('./lib/firebase').then(({ initFirebaseAnalytics }) => initFirebaseAnalytics());
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1500);
  }
}

const requiredFirebaseConfig = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};
const missingFirebaseConfig = Object.entries(requiredFirebaseConfig)
  .filter(([, value]) => !value?.trim())
  .map(([key]) => key);
const root = createRoot(document.getElementById('root')!);

if (missingFirebaseConfig.length > 0) {
  root.render(
    <main className="flex min-h-screen items-center justify-center bg-[#f3f2ee] px-4 py-10 text-[#0A1628]">
      <section role="alert" className="w-full max-w-xl rounded-2xl border border-[#e4e0d6] bg-white p-6 sm:p-8">
        <div className="mb-5 h-1 w-12 rounded-full bg-[#C9A84C]" />
        <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">CRM setup is incomplete</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#55575d]">
          Firebase authentication is required before the CRM and Calling Centre can start. The following settings are missing:
        </p>
        <ul className="mt-4 space-y-2 rounded-xl bg-[#f7f6f2] p-4 font-mono text-xs text-[#333943]">
          {missingFirebaseConfig.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-[#68645e]">
          Add the missing Firebase web app settings to your local <code>.env</code>, then restart the development server.
        </p>
      </section>
    </main>,
  );
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
        <Analytics />
        <SpeedInsights />
      </ErrorBoundary>
    </StrictMode>,
  );
  deferAnalytics();
}
