export const SUPER_ADMIN_EMAILS = [
  'vijaykodamasuru2023@gmail.com',
  'vijay@vjrestate.in',
  'vijayramv229@gmail.com',
] as const;

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase() as (typeof SUPER_ADMIN_EMAILS)[number]);
}

export function canManageAdmins(profile: {
  role?: string;
  permissions?: string[] | null;
} | null): boolean {
  if (!profile) return false;
  if (profile.role === 'super_admin') return true;
  const perms = profile.permissions;
  if (perms === null || perms === undefined) return true;
  if (perms.length === 0) return true;
  return perms.includes('manage_admins');
}

export function assignablePermissions(profile: {
  role?: string;
  permissions?: string[] | null;
} | null): string[] | null {
  if (!profile) return [];
  if (profile.role === 'super_admin' || profile.permissions === null || profile.permissions === undefined) {
    return null;
  }
  if (!profile.permissions.length) return null;
  return profile.permissions;
}

export function canAssignPermission(
  allowed: string[] | null,
  perm: string,
): boolean {
  if (allowed === null) return true;
  return allowed.includes(perm);
}
