import { useEffect, useState, useRef, useMemo } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { leadSupabase } from '@/services/leadSupabase';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Shield, Trash2, Plus, RefreshCw, UserCog, Pencil, Camera, Calendar } from 'lucide-react';
import {
  canManageAdmins,
  assignablePermissions,
  canAssignPermission,
  isSuperAdminEmail,
  SUPER_ADMIN_EMAILS,
} from '@/lib/crmAdminConfig';

interface AdminUser {
  id: string;
  email: string;
  display_name?: string;
  role: string;
  permissions?: string[];
  created_at: string;
}

type CrmProfile = {
  data: {
    id?: string;
    email?: string;
    display_name?: string;
    role?: string;
    permissions?: string[];
    avatar_url?: string;
    created_at?: string;
  } | null;
  email: string;
  role?: string;
  permissions?: string[] | null;
};

function buildSuperAdminProfile(user: User): CrmProfile {
  const email = (user.email ?? '').toLowerCase();
  return {
    data: null,
    email,
    role: 'super_admin',
    permissions: null,
  };
}

interface PermRow { key: string; label: string; hasEdit: boolean }
const PERM_ROWS: PermRow[] = [
  { key: 'earnings', label: 'Earnings', hasEdit: false },
  { key: 'clients', label: 'Clients', hasEdit: false },
  { key: 'requirements', label: 'Requirements', hasEdit: true },
  { key: 'agents', label: 'Agents', hasEdit: true },
  { key: 'data', label: 'Data', hasEdit: false },
  { key: 'database', label: 'Database', hasEdit: false },
];
const PERM_COLORS: Record<string, string> = {
  manage_admins: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  earnings: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  clients: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  requirements: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  agents: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
  data: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
  database: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
};

function togglePerm(value: string[], key: string, sub: string, on: boolean) {
  const full = `${key}.${sub}`;
  if (on) return [...value, full];
  const rest = value.filter(v => v !== full);
  if (sub === 'edit') return rest;
  return rest.filter(v => v !== `${key}.edit`);
}

function hasPerm(value: string[], key: string, sub: string) {
  return value.includes(`${key}.${sub}`);
}

function PermissionCheckboxes({
  value,
  onChange,
  allowedPerms,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  allowedPerms?: string[] | null;
}) {
  const canAssign = (perm: string) => canAssignPermission(allowedPerms ?? null, perm);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-muted-foreground mb-1">Permissions</label>
      <p className="text-[11px] text-muted-foreground/60 mb-0.5">Leave all unchecked for full access.</p>
      <div className="border border-border rounded-md divide-y divide-border">
        {PERM_ROWS.map(r => {
          const v = hasPerm(value, r.key, 'view');
          const e = hasPerm(value, r.key, 'edit');
          const viewPerm = `${r.key}.view`;
          const editPerm = `${r.key}.edit`;
          return (
            <div key={r.key} className="flex items-center gap-3 px-3 py-2">
              <span className="text-sm text-foreground min-w-[100px]">{r.label}</span>
              <label className={`flex items-center gap-1.5 text-xs text-muted-foreground ${canAssign(viewPerm) ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  checked={v}
                  disabled={!canAssign(viewPerm)}
                  onChange={e2 => onChange(togglePerm(value, r.key, 'view', e2.target.checked))}
                  className="rounded border-border"
                />
                View
              </label>
              {r.hasEdit && (
                <label className={`flex items-center gap-1.5 text-xs text-muted-foreground ${canAssign(editPerm) ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                  <input
                    type="checkbox"
                    checked={e}
                    disabled={!canAssign(editPerm)}
                    onChange={e2 => {
                      let next = togglePerm(value, r.key, 'edit', e2.target.checked);
                      if (e2.target.checked && !hasPerm(next, r.key, 'view')) next = togglePerm(next, r.key, 'view', true);
                      onChange(next);
                    }}
                    className="rounded border-border"
                  />
                  Edit
                </label>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="text-sm text-foreground min-w-[100px]">Manage Admins</span>
          <label className={`flex items-center gap-1.5 text-xs text-muted-foreground ${canAssign('manage_admins') ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
            <input
              type="checkbox"
              checked={value.includes('manage_admins')}
              disabled={!canAssign('manage_admins')}
              onChange={e2 => onChange(e2.target.checked ? [...value, 'manage_admins'] : value.filter(v => v !== 'manage_admins'))}
              className="rounded border-border"
            />
            Full access
          </label>
        </div>
      </div>
    </div>
  );
}

export default function AdminProfile() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 640);
  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [profile, setProfile] = useState<CrmProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>([]);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [listError, setListError] = useState('');
  const [profileError, setProfileError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = isSuperAdminEmail(authUser?.email) || profile?.role === 'super_admin';
  const effectiveProfile = useMemo((): CrmProfile | null => {
    if (profile) return profile;
    if (authUser && isSuperAdminEmail(authUser.email)) return buildSuperAdminProfile(authUser);
    return null;
  }, [profile, authUser]);

  const canManage = isSuperAdmin || canManageAdmins(effectiveProfile);
  const allowedPerms = isSuperAdmin ? null : assignablePermissions(effectiveProfile);

  const displayName = effectiveProfile?.data?.display_name || authUser?.displayName || 'Admin';
  const avatarUrl = effectiveProfile?.data?.avatar_url || authUser?.photoURL || '';
  const joinedAt = effectiveProfile?.data?.created_at || '';

  const refresh = () => {
    if (!authUser) return;
    setProfile(null);
    setAdmins([]);
    loadData(authUser);
  };

  async function loadData(user: User) {
    setLoading(true);
    setListError('');
    setProfileError('');
    try {
      const prof = await leadSupabase.admin.verify();
      setProfile(prof);
    } catch (err: any) {
      if (isSuperAdminEmail(user.email)) {
        setProfile(buildSuperAdminProfile(user));
      } else {
        setProfile(null);
        setProfileError(err.message || 'Failed to load profile');
      }
    }
    try {
      const list = await leadSupabase.admin.list();
      setAdmins(list.data ?? []);
    } catch (err: any) {
      if (isSuperAdminEmail(user.email)) {
        setAdmins([]);
      } else {
        setAdmins([]);
        setListError(err.message || 'Failed to load admin users');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const uid = auth.currentUser?.uid || 'unknown';
      const path = `profiles/${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      await leadSupabase.admin.updateAvatar(authUser?.email || '', url);
      if (authUser) await loadData(authUser);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) loadData(user);
      else {
        setProfile(null);
        setAdmins([]);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  function openAdd() {
    setFormEmail('');
    setFormName('');
    setFormPerms([]);
    setError('');
    setAddOpen(true);
  }

  function openEdit(a: AdminUser) {
    setEditTarget(a);
    setEditPerms(a.permissions ?? []);
    setError('');
    setEditOpen(true);
  }

  async function handleAdd() {
    const email = formEmail.trim().toLowerCase();
    if (!email) return;
    setSaving(true);
    setError('');
    try {
      await leadSupabase.admin.add(email, formName.trim() || undefined, formPerms);
      setAddOpen(false);
      await loadData(authUser!);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    setSaving(true);
    setError('');
    try {
      await leadSupabase.admin.update(editTarget.email, { permissions: editPerms, displayName: editTarget.display_name });
      setEditOpen(false);
      if (authUser) loadData(authUser);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(email: string) {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    try {
      await leadSupabase.admin.remove(email);
      if (authUser) loadData(authUser);
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
      <div className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between h-14 border-b border-border px-6 bg-card">
          <div className="flex items-center gap-3">
            <UserCog className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h1 className="font-semibold text-foreground text-[15px]">Profile & Admin Management</h1>
          </div>
          <button
            onClick={refresh}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>
        </header>

        <div className="p-6 space-y-8">
          <section className="bg-card border border-[#c9a962]/30 rounded-lg p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e8d8ae] to-[#c9a962] flex items-center justify-center shrink-0">
                <span className="text-[11px] font-extrabold text-[#0a0d12]">V</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Super Admin Vijay Ram</div>
                <div className="text-xs text-muted-foreground">VJR Estate · Managing Director (MD)</div>
              </div>
            </section>
          {profileError && (
            <p className="text-xs text-red-500">{profileError}</p>
          )}
          {effectiveProfile && (
            <section className="bg-card border border-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Your Profile</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {displayName[0]?.toUpperCase() || effectiveProfile.email[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm">
                    <Camera className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-foreground truncate">{displayName}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Mail className="w-3 h-3" strokeWidth={1.5} />
                    {effectiveProfile.email}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" strokeWidth={1.5} />
                      <span className={isSuperAdmin ? 'text-amber-600 font-medium' : ''}>
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                      </span>
                    </span>
                    {joinedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" strokeWidth={1.5} />
                        Joined {new Date(joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {effectiveProfile.permissions && effectiveProfile.permissions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {effectiveProfile.permissions.map(p => {
                    const [cat, sub] = p.split('.');
                    const row = PERM_ROWS.find(r => r.key === cat);
                    const label = row ? `${row.label} (${sub})` : p;
                    return (
                      <span key={p} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${PERM_COLORS[cat] ?? 'bg-gray-50 text-gray-700'}`}>
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section className="bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Admin Users</h2>
              {canManage && (
                <button
                  onClick={openAdd}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-black hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 px-3 py-1.5 rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3" strokeWidth={2} />
                  Add Admin
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : listError ? (
              <div className="p-8 text-center text-sm text-red-500">{listError}</div>
            ) : admins.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No admin users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-medium">Email</th>
                      <th className="text-left px-5 py-3 font-medium">Display Name</th>
                      <th className="text-left px-5 py-3 font-medium">Role</th>
                      <th className="text-left px-5 py-3 font-medium">Permissions</th>
                      <th className="text-left px-5 py-3 font-medium">Added</th>
                      {canManage && <th className="text-right px-5 py-3 font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a) => {
                      const perms = a.permissions ?? [];
                      const isMe = a.email === effectiveProfile?.email;
                      const isSuperAdmin = a.role === 'super_admin' || isSuperAdminEmail(a.email);
                      return (
                        <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3 text-foreground">{a.email}</td>
                          <td className="px-5 py-3 text-muted-foreground">{a.display_name ?? '—'}</td>
                          <td className="px-5 py-3">
                            <span className={isSuperAdmin ? 'text-amber-600 font-medium text-xs' : 'text-muted-foreground text-xs'}>
                              {isSuperAdmin ? 'Super Admin' : 'Admin'}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {perms.length === 0 ? (
                              <span className="text-[11px] text-muted-foreground italic">Full access</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {perms.map(p => {
                                  const [cat, sub] = p.split('.');
                                  const row = PERM_ROWS.find(r => r.key === cat);
                                  const label = row ? `${row.label} (${sub})` : p === 'manage_admins' ? 'Manage Admins' : p;
                                  return (
                                    <span key={p} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${PERM_COLORS[cat] ?? 'bg-gray-50 text-gray-700'}`}>
                                      {label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground text-xs">
                            {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                          </td>
                          {canManage && (
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!isSuperAdmin && (
                                  <>
                                    <button
                                      onClick={() => openEdit(a)}
                                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                      title="Edit permissions"
                                    >
                                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                                    </button>
                                    {!isMe && (
                                      <button
                                        onClick={() => handleRemove(a.email)}
                                        className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); setError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
              <input
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Display Name</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="John Doe"
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
            </div>
            <PermissionCheckboxes value={formPerms} onChange={setFormPerms} allowedPerms={allowedPerms} />
            <button
              onClick={handleAdd}
              disabled={saving || !formEmail}
              className="w-full text-xs font-medium text-white bg-black hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 px-4 py-2.5 rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Admin'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); setError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {error && <p className="text-xs text-red-500">{error}</p>}
            {editTarget && (
              <p className="text-sm text-muted-foreground">{editTarget.email}</p>
            )}
            <PermissionCheckboxes value={editPerms} onChange={setEditPerms} allowedPerms={allowedPerms} />
            <button
              onClick={handleEdit}
              disabled={saving}
              className="w-full text-xs font-medium text-white bg-black hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 px-4 py-2.5 rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}