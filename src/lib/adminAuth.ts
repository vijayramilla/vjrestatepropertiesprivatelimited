import type { User } from 'firebase/auth';
import { isSuperAdminEmail } from './crmAdminConfig';

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID ?? 'AhaNy8oyMHOFsB3u0dQhG0E0by43';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? 'vijayramv229@gmail.com';

export function isAuthorizedAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.uid === ADMIN_UID || user.email === ADMIN_EMAIL;
}

async function fetchCrmVerify(user: User) {
  const token = await user.getIdToken();
  const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const res = await fetch(`${API_BASE || '/api'}/crm-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'admin.verify', params: {} }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ role?: string; data?: { id?: string } | null; crmModules?: Record<string, { actions?: string[]; recordScope?: string }> | null }>;
}

/* ── Employee CRM grant (route-level, registry-driven) ───────────────────
 * Session-cached copy of the employee's trusted grant (from admin.verify →
 * server evaluator) used by the CRM route guard and sidebar. The backend
 * remains the authority: this cache only decides what renders.
 */
export interface CrmGrantModules {
  [moduleKey: string]: { actions?: string[]; recordScope?: string } | undefined;
}

let cachedCrmModules: CrmGrantModules | null = null;
let cachedModulesEmail: string | null = null;

export function invalidateCrmModulesCache(): void {
  cachedCrmModules = null;
  cachedModulesEmail = null;
}

/**
 * Trusted module map for the signed-in employee. Super Admins get null
 * (= full access); employees get their grant or {} when none. Guests and
 * unauthorized users always get {} (deny).
 */
export async function getCrmGrantModules(user: User | null | undefined): Promise<CrmGrantModules | null> {
  if (!user?.email) return {};
  if (isSuperAdminEmail(user.email)) return null;
  if (cachedCrmModules !== null && cachedModulesEmail === user.email) return cachedCrmModules;
  try {
    const body = await fetchCrmVerify(user);
    if (!body) return {};
    cachedModulesEmail = user.email;
    cachedCrmModules = body.crmModules ?? {};
    return cachedCrmModules;
  } catch {
    return {};
  }
}

/**
 * Can the current user open `moduleKey`? null modules (super admin) = yes;
 * {} or missing module = no (default-deny); module needs at least 'view'.
 */
export function crmModulesAllow(
  modules: CrmGrantModules | null,
  moduleKey: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'assign' | 'approve' | 'export' = 'view',
): boolean {
  if (modules === null) return true; // super admin
  const mod = modules?.[moduleKey];
  if (!mod?.actions) return false;
  return mod.actions.includes(action);
}

/**
 * Whether the signed-in user is a CRM admin, an employee, or neither.
 * Employees only get their workspace (/crm/dashboard, /crm/my-clients);
 * admins get the full CRM. Used by the route guards so employees can never
 * open admin pages even by typing a URL.
 */
export async function getCrmUserRole(user: User | null | undefined): Promise<'admin' | 'employee' | null> {
  if (!user?.email) return null;
  if (isSuperAdminEmail(user.email)) return 'admin';
  try {
    const body = await fetchCrmVerify(user);
    if (!body) return null;
    if (body.role === 'employee') return 'employee';
    if (body.role === 'super_admin') return 'admin';
    return body.data?.id ? 'admin' : null;
  } catch {
    return null;
  }
}

export async function checkCrmAccess(user: User | null | undefined): Promise<boolean> {
  const role = await getCrmUserRole(user);
  return role === 'admin' || role === 'employee';
}

export async function checkAdminViaProxy(user: User | null | undefined): Promise<boolean> {
  return checkCrmAccess(user);
}
