import type { User } from 'firebase/auth';

export const ADMIN_EMAIL = 'vijayramv229@gmail.com';
export const ADMIN_UID = 'AhaNy8oyMHOFsB3u0dQhG0E0by43';

export function isAuthorizedAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.uid === ADMIN_UID || user.email === ADMIN_EMAIL;
}
