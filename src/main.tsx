import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

window.onerror = (msg, _url, line, col, err) => {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#991b1b;color:#fff;padding:0.75rem 1rem;font:12px/1.4 monospace';
  div.textContent = `[JS Error] ${err?.message || msg} (${line}:${col})`;
  document.body.appendChild(div);
};

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

deferAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
