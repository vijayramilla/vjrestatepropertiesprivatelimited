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
  return res.json() as Promise<{ role?: string; data?: { id?: string } | null }>;
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
