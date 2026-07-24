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
  const API_BASE = import.meta.env.VITE_API_URL ?? '';
  const res = await fetch(`${API_BASE}/crm-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'admin.verify', params: {} }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ role?: string; data?: { id?: string } | null }>;
}

export async function checkCrmAccess(user: User | null | undefined): Promise<boolean> {
  if (!user?.email) return false;
  if (isSuperAdminEmail(user.email)) return true;
  try {
    const body = await fetchCrmVerify(user);
    if (!body) return false;
    if (body.role === 'super_admin') return true;
    return Boolean(body.data?.id);
  } catch {
    return false;
  }
}

export async function checkAdminViaProxy(user: User | null | undefined): Promise<boolean> {
  return checkCrmAccess(user);
}
