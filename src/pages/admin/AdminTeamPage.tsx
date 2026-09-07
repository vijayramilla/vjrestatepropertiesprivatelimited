import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
  AdminSkeletonList,
  AdminBadge,
} from '@/components/admin/AdminUi';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Trash,
  NotePencil,
  Plus,
  Users,
  X,
  UploadSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  subscribeToTeamMembers,
  createTeamMember,
  updateTeamMember,
  toggleTeamMemberActive,
  deleteTeamMember,
  uploadTeamPhoto,
  type TeamMember,
  type TeamMemberInput,
} from '@/lib/team';

const inputCls =
  'min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-all placeholder:text-gray-400 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20';
const labelCls = 'mb-2 block text-xs font-medium uppercase tracking-[0.1em] text-gray-500';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

// ── Member form modal (create / edit) ───────────────────────────────────

interface MemberFormState {
  name: string;
  title: string;
  sortOrder: string;
  isActive: boolean;
}

function emptyMemberForm(): MemberFormState {
  return { name: '', title: '', sortOrder: '0', isActive: true };
}

function MemberFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: TeamMember | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<MemberFormState>(emptyMemberForm());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setPhotoError('');
    setPhotoFile(null);
    setPhotoPreview(editing?.photoUrl ?? '');
    setForm(
      editing
        ? { name: editing.name, title: editing.title, sortOrder: String(editing.sortOrder), isActive: editing.isActive }
        : emptyMemberForm(),
    );
  }, [open, editing]);

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Photo must be an image (JPG, PNG or WebP)');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Photo must be under 8 MB');
      return;
    }
    setPhotoError('');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: TeamMemberInput = {
        name: form.name.trim(),
        title: form.title.trim(),
        photoUrl: editing?.photoUrl ?? '',
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };

      let memberId = editing?.id ?? '';
      if (editing) {
        await updateTeamMember(editing.id, payload);
      } else {
        memberId = await createTeamMember(payload);
      }

      if (photoFile) {
        const url = await uploadTeamPhoto(photoFile, memberId);
        await updateTeamMember(memberId, { photoUrl: url });
      }

      onClose();
    } catch (err) {
      console.error('Save team member error:', err);
      setError('Could not save the team member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => !saving && onClose()}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {editing ? 'Edit' : 'New'} Team Member
                </p>
                <h2 className="admin-heading mt-0.5 text-lg font-medium text-black sm:text-xl">
                  {editing ? editing.name : 'Add Team Member'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-[#C9A84C] hover:text-black disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                  {error}
                </div>
              )}

              {/* Photo */}
              <div>
                <label className={labelCls}>Photo</label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[#C9A84C]/40 bg-gray-100">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-400">
                        {initials(form.name) || '—'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-black transition-colors hover:bg-gray-100">
                      <UploadSimple size={14} />
                      {photoPreview ? 'Replace' : 'Upload Photo'}
                      <input type="file" accept="image/*" className="sr-only" onChange={pickPhoto} />
                    </label>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="ml-2 text-xs font-medium text-gray-500 underline hover:text-black"
                      >
                        Remove
                      </button>
                    )}
                    <p className="mt-1.5 text-[11px] text-gray-400">JPG, PNG or WebP · max 8 MB</p>
                    {photoError && (
                      <p className="mt-1 text-[12px] font-medium text-red-600" role="alert">
                        {photoError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Vijay Ram" />
              </div>
              <div>
                <label className={labelCls}>Title</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Founder & CEO" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Sort Order</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    placeholder="0"
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400">Lower numbers appear first on the team page.</p>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="h-4 w-4 accent-[#0A1628]"
                    />
                    Visible on team page
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button type="button" onClick={onClose} disabled={saving} className="admin-btn-secondary flex-1 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="admin-btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main page ───────────────────────────────────────────────────────────

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToTeamMembers((list) => {
      setMembers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const member = members.find((m) => m.id === deleteId);
    setDeleting(true);
    try {
      if (member) await deleteTeamMember(member);
      setDeleteId(null);
    } catch (err) {
      console.error('Delete team member error:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout title="Team">
      <AdminPageShell>
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <AdminPageHeader
            eyebrow="Website"
            title="Team Members"
            description="Manage the people shown on the public team page — add members, upload photos, and control the display order."
          />
          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="admin-btn-primary shrink-0 gap-2 self-start sm:self-auto"
          >
            <Plus size={16} weight="bold" />
            Add Team Member
          </button>
        </div>

        {loading ? (
          <AdminSkeletonList count={3} />
        ) : members.length === 0 ? (
          <AdminEmptyState
            icon={<Users size={40} weight="thin" />}
            title="No Team Members"
            description="Add your first team member to show them on the public team page."
            action={
              <button
                type="button"
                onClick={() => { setEditing(null); setFormOpen(true); }}
                className="admin-btn-primary gap-2"
              >
                <Plus size={16} /> Add Team Member
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <motion.div
                key={member.id}
                variants={fadeUp}
                initial="initial"
                animate="animate"
                className={`admin-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${!member.isActive ? 'opacity-70' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#C9A84C]/40 bg-gray-100">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-400">
                        {initials(member.name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold text-black">{member.name}</p>
                      {!member.isActive && <AdminBadge variant="muted">Hidden</AdminBadge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {member.title || '—'} · order {member.sortOrder}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Visible</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={member.isActive}
                      aria-label={`Toggle visibility for ${member.name}`}
                      onClick={() => toggleTeamMemberActive(member.id, !member.isActive)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${member.isActive ? 'bg-[#0A1628]' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform ${member.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setEditing(member); setFormOpen(true); }}
                    className="admin-btn-secondary !min-h-[40px] !px-4 !text-[10px]"
                  >
                    <NotePencil size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(member.id)}
                    className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-100 px-4 text-[10px] font-semibold uppercase tracking-wide text-black transition-colors hover:bg-gray-200"
                  >
                    <Trash size={13} /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AdminPageShell>

      {/* ── Member form ── */}
      <MemberFormModal
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
      />

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => !deleting && setDeleteId(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <h3 className="admin-heading text-xl font-medium text-black sm:text-2xl">Remove Team Member?</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:mt-4">
                This removes the member and their photo from the team page.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:mt-8 sm:flex-row sm:gap-3">
                <button type="button" onClick={() => setDeleteId(null)} disabled={deleting} className="admin-btn-secondary flex-1 disabled:opacity-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-black px-5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
                >
                  {deleting ? 'Removing…' : <><WarningCircle size={15} /> Remove</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
