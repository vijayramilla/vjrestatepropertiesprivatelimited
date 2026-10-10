import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { crmModulesAllow, getCrmGrantModules } from '@/lib/adminAuth';
import { CRM_MODULE_REGISTRY } from '@/lib/crmAccessRegistry';

/** Flattened route→module lookup derived from the central registry. */
const CRM_MODULE_ROUTES_FLAT: { key: string; route: string }[] = CRM_MODULE_REGISTRY.flatMap((m) => {
  const routes = [m.route, ...(m.routes ?? [])];
  return routes.map((route) => ({ key: m.key, route: route.replace(/\/:\w+$/, '') }));
});

/**
 * Module-level CRM route guard.
 *
 * Resolves the visited URL to a registry module key and requires that
 * module's 'view' permission for employees. Super Admin passes everything;
 * an employee whose grant lacks the module is redirected with default-deny.
 * The unauthorised employee workspace routes (/crm/dashboard, /crm/my-clients,
 * /crm/my-bookings) stay open to any active login as today.
 */

const EMPLOYEE_SELF_ROUTES = new Set(['/crm/dashboard', '/crm/my-clients', '/crm/my-bookings']);

/** /crm/xyz/... → registry module key (longest route match wins). */
function resolveRouteModule(pathname: string): string | null {
  const p = pathname.replace(/\/$/, '') || '/crm';
  let best: { key: string; route: string; len: number } | null = null;
  for (const m of MODULE_ROUTES) {
    if (p === m.route || p.startsWith(m.route + '/')) {
      if (!best || m.route.length > best.len) best = { key: m.key, route: m.route, len: m.route.length };
    }
  }
  return best?.key ?? null;
}

/** Flattened route→module lookup derived from the central registry. */
const MODULE_ROUTES: { key: string; route: string }[] = CRM_MODULE_ROUTES_FLAT;

interface CrmModuleRouteProps {
  children: ReactNode;
  /** Optional explicit module key (for shared components across routes). */
  moduleKey?: string;
}

export default function CrmModuleRoute({ children, moduleKey }: CrmModuleRouteProps) {
  const [state, setState] = useState<'loading' | 'allow' | 'deny-module' | 'unauth' | 'employee-self'>('loading');
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        setState('unauth');
        return;
      }
      const path = location.pathname;
      const selfRoute = EMPLOYEE_SELF_ROUTES.has(path);
      const modules = await getCrmGrantModules(user);
      // Super admin (null modules) sees everything.
      if (modules === null) {
        setState('allow');
        return;
      }
      // Guests with NO grant at all: only the self routes render their
      // personal workspace; everything else denies.
      if (selfRoute && Object.keys(modules).length === 0) {
        setState('employee-self');
        return;
      }
      if (selfRoute) {
        setState('employee-self');
        return;
      }
      const modKey = moduleKey ?? resolveRouteModule(path) ?? routeFallbackKey(path);
      const allowed = modKey ? crmModulesAllow(modules, modKey, 'view') : false;
      setState(allowed ? 'allow' : 'deny-module');
    });
    return () => unsub();
  }, [location.pathname, moduleKey]);

  if (state === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
          </div>
          <p className="mt-4 font-sans text-sm text-gray-600">Checking access…</p>
        </div>
      </div>
    );
  }

  if (state === 'unauth') {
    return <Navigate to="/admin/login" replace />;
  }

  if (state === 'employee-self') {
    return <Navigate to="/crm/dashboard" replace />;
  }

  if (state === 'deny-module') {
    return <CrmAccessDenied />;
  }

  return <>{children}</>;
}

/** Admin routes not in the registry keep legacy CrmRoute behaviour. */
function routeFallbackKey(path: string): string | null {
  if (path === '/crm' || path.startsWith('/crm/profile')) return 'crmAccess';
  return null;
}

/**
 * Access-denied page — no sensitive module info, route back to dashboard.
 */
export function CrmAccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.5 3.75L2.25 19.5h16.5L10.5 3.75z" />
        </svg>
      </div>
      <h2 className="mt-4 font-sans text-[17px] font-bold text-[#0A1628]">Access denied</h2>
      <p className="mt-1.5 max-w-sm font-sans text-[13px] text-[#6b7280]">
        Your CRM access doesn't include this section. If you believe this is a mistake, ask the Super Admin to update your permissions.
      </p>
      <button
        type="button"
        onClick={() => { window.location.href = '/crm/dashboard'; }}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#0A1628] px-5 font-sans text-[12.5px] font-bold uppercase tracking-[0.06em] text-white hover:bg-[#1E3852]"
      >
        Back to my workspace
      </button>
    </div>
  );
}
