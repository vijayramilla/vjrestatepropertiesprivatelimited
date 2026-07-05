import type { User } from 'firebase/auth';

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID ?? 'AhaNy8oyMHOFsB3u0dQhG0E0by43';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? 'vijayramv229@gmail.com';

export function isAuthorizedAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.uid === ADMIN_UID || user.email === ADMIN_EMAIL;
}
