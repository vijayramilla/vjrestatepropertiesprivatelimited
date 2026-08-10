import { useEffect, useMemo, useState } from 'react';
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
  Clock,
  CalendarCheck,
  CheckCircle,
  MagnifyingGlass,
  Eye,
  DownloadSimple,
  X,
  Star,
  Briefcase,
  ChartBar,
  ChartLine,
  ListChecks,
  WarningCircle,
} from 'phosphor-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import {
  subscribeToJobs,
  subscribeToApplications,
  seedJobOpeningsIfEmpty,
  appendStatusHistory,
  updateApplicationRating,
  updateApplicationNotes,
  toggleApplicationViewed,
  toggleJobActive,
  deleteJobOpening,
  createJobOpening,
  updateJobOpening,
  type JobOpening,
  type JobApplication,
  type ApplicationStatus,
  type Department,
  formatSalary,
  type JobType,
  type JobLocation,
} from '@/lib/careers';

const GOLD = '#C9A84C';

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; chip: string; dot: string; hex: string }
> = {
  Applied: { label: 'Applied', chip: 'bg-gray-100 text-gray-700', dot: '#6B7280', hex: '#6B7280' },
  Screening: { label: 'Screening', chip: 'bg-blue-50 text-blue-700', dot: '#3B82F6', hex: '#3B82F6' },
  Interview: { label: 'Interview', chip: 'bg-yellow-50 text-yellow-700', dot: '#F59E0B', hex: '#F59E0B' },
  Selected: { label: 'Selected', chip: 'bg-green-50 text-green-700', dot: '#22C55E', hex: '#22C55E' },
  Rejected: { label: 'Rejected', chip: 'bg-red-50 text-red-700', dot: '#EF4444', hex: '#EF4444' },
  'On Hold': { label: 'On Hold', chip: 'bg-orange-50 text-orange-700', dot: '#F97316', hex: '#F97316' },
};

const STATUS_ORDER: ApplicationStatus[] = ['Applied', 'Screening', 'Interview', 'Selected', 'Rejected', 'On Hold'];
const DEPARTMENTS: Department[] = ['Sales', 'Technology', 'Marketing', 'Customer Relations', 'HR', 'Operations'];
const JOB_TYPES: JobType[] = ['Full Time', 'Part Time', 'Internship'];
const JOB_LOCATIONS: JobLocation[] = ['Bangalore', 'Remote', 'Hybrid'];
const DEPT_COLORS = ['#EF4444', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#C9A84C'];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function timeAgo(date?: Date): string {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.chip}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: cfg.dot }} />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      </span>
      {cfg.label}
    </span>
  );
}

function RatingStars({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          className={`p-0.5 transition-transform ${onChange ? 'cursor-pointer hover:scale-125' : 'cursor-default'}`}
        >
          <Star
            size={14}
            weight={n <= value ? 'fill' : 'regular'}
            className={n <= value ? 'text-[#C9A84C]' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );
}

// ── Job form modal (create / edit) ──────────────────────────────────────

const inputCls =
  'min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-black outline-none transition-all placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10';
const labelCls = 'mb-2 block text-xs font-medium uppercase tracking-[0.1em] text-gray-500';

interface JobFormState {
  title: string;
  department: Department;
  type: JobType;
  location: JobLocation;
  experience: string;
  salary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  niceToHave: string;
  isFeatured: boolean;
  department_color: string;
}

function emptyJobForm(): JobFormState {
  return {
    title: '',
    department: 'Sales',
    type: 'Full Time',
    location: 'Bangalore',
    experience: '',
    salary: '',
    description: '',
    responsibilities: '',
    requirements: '',
    niceToHave: '',
    isFeatured: false,
    department_color: '#EF4444',
  };
}

function JobFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: JobOpening | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<JobFormState>(emptyJobForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editing) {
      setForm({
        title: editing.title,
        department: editing.department,
        type: editing.type,
        location: editing.location,
        experience: editing.experience,
        salary: editing.salary,
        description: editing.description,
        responsibilities: editing.responsibilities.join('\n'),
        requirements: editing.requirements.join('\n'),
        niceToHave: editing.niceToHave.join('\n'),
        isFeatured: editing.isFeatured,
        department_color: editing.department_color,
      });
    } else {
      setForm(emptyJobForm());
    }
  }, [open, editing]);

  const set = (k: keyof JobFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const splitLines = (s: string) =>
    s
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.experience.trim() || !form.salary.trim() || !form.description.trim()) {
      setError('Title, experience, salary and description are required.');
      return;
    }
    const payload = {
      title: form.title.trim(),
      department: form.department,
      type: form.type,
      location: form.location,
      experience: form.experience.trim(),
      salary: form.salary.trim(),
      description: form.description.trim(),
      responsibilities: splitLines(form.responsibilities),
      requirements: splitLines(form.requirements),
      niceToHave: splitLines(form.niceToHave),
      isFeatured: form.isFeatured,
      department_color: form.department_color,
    };
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateJobOpening(editing.id, payload);
      } else {
        await createJobOpening({ ...payload, isActive: true, totalApplications: 0 });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Save job error:', err);
      setError('Could not save the job. Please try again.');
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
            className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {editing ? 'Edit' : 'New'} Job Opening
                </p>
                <h2 className="admin-heading mt-0.5 text-lg font-medium text-black sm:text-xl">
                  {editing ? editing.title : 'Add New Job'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-black hover:text-black disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Job Title *</label>
                  <input className={inputCls} value={form.title} onChange={set('title')} placeholder="e.g. Senior Sales Manager" />
                </div>
                <div>
                  <label className={labelCls}>Department</label>
                  <select className={inputCls} value={form.department} onChange={set('department')}>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select className={inputCls} value={form.type} onChange={set('type')}>
                    {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <select className={inputCls} value={form.location} onChange={set('location')}>
                    {JOB_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Department Color</label>
                  <input type="color" className="h-[44px] w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-1.5" value={form.department_color} onChange={set('department_color')} />
                </div>
                <div>
                  <label className={labelCls}>Experience *</label>
                  <input className={inputCls} value={form.experience} onChange={set('experience')} placeholder="e.g. 2-4 Years" />
                </div>
                <div>
                  <label className={labelCls}>Monthly Salary *</label>
                  <input className={inputCls} value={form.salary} onChange={set('salary')} placeholder="e.g. ₹66K-1.25L per month" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                      className="h-4 w-4 accent-[#0A1628]"
                    />
                    Featured job
                  </label>
                </div>
              </div>
              <div>
                <label className={labelCls}>Description *</label>
                <textarea rows={3} className={`${inputCls} resize-none`} value={form.description} onChange={set('description')} placeholder="Short role summary shown on the careers page" />
              </div>
              <div>
                <label className={labelCls}>Responsibilities (one per line)</label>
                <textarea rows={4} className={`${inputCls} resize-none`} value={form.responsibilities} onChange={set('responsibilities')} placeholder="Drive property sales…" />
              </div>
              <div>
                <label className={labelCls}>Requirements (one per line)</label>
                <textarea rows={4} className={`${inputCls} resize-none`} value={form.requirements} onChange={set('requirements')} placeholder="3+ years in real estate sales…" />
              </div>
              <div>
                <label className={labelCls}>Nice to Have (one per line)</label>
                <textarea rows={3} className={`${inputCls} resize-none`} value={form.niceToHave} onChange={set('niceToHave')} placeholder="Optional…" />
              </div>
            </form>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button type="button" onClick={onClose} disabled={saving} className="admin-btn-secondary flex-1 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="admin-btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Job'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Candidate detail panel ──────────────────────────────────────────────

function CandidateDetail({
  app,
  onClose,
  onStatusChange,
}: {
  app: JobApplication;
  onClose: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
}) {
  const [notes, setNotes] = useState(app.adminNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    setNotes(app.adminNotes);
    setNotesSaved(false);
  }, [app.id, app.adminNotes]);

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateApplicationNotes(app.id, notes);
      setNotesSaved(true);
    } catch (err) {
      console.error('Save notes error:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const history = [...(app.statusHistory ?? [])].reverse();

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0.5 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed inset-y-0 right-0 z-[130] flex w-full max-w-[560px] flex-col bg-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Candidate profile"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-5 py-5 sm:px-7">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Candidate Profile</p>
          <h2 className="admin-heading mt-0.5 truncate text-xl font-medium text-black">{app.fullName}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-black hover:text-black"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
        {/* Contact + role summary */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Email</p><p className="mt-0.5 break-all text-gray-800">{app.email}</p></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Phone</p><p className="mt-0.5 text-gray-800">{app.phone}</p></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Applied</p><p className="mt-0.5 text-gray-800">{timeAgo(app.appliedAt)}</p></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Location</p><p className="mt-0.5 text-gray-800">{app.currentLocation || '—'}</p></div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">PIN Code</p>
              <p className="mt-0.5 text-gray-800">{app.pinCode || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Exact Pin</p>
              <p className="mt-0.5 break-all text-gray-800">
                {app.applicantLat != null && app.applicantLng != null
                  ? `${app.applicantArea ? app.applicantArea + ' · ' : ''}(${app.applicantLat.toFixed(5)}, ${app.applicantLng.toFixed(5)})`
                  : '—'}
              </p>
            </div>
            {app.applicantEmail && (
              <div className="sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Verified Account</p>
                <p className="mt-0.5 break-all text-gray-800">{app.applicantEmail}</p>
              </div>
            )}
          </div>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: app.department === 'Sales' ? '#EF4444' : '#3B82F6' }} />
              <p className="text-sm font-semibold text-black">{app.jobTitle}</p>
              <span className="text-xs text-gray-400">· {app.department}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Experience</p><p className="mt-0.5 text-gray-800">{app.totalExperience}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Current</p><p className="mt-0.5 truncate text-gray-800">{app.currentCompany || '—'} {app.currentRole ? `· ${app.currentRole}` : ''}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Expected</p><p className="mt-0.5 text-gray-800">{app.expectedSalary || '—'}</p></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Notice Period</p><p className="mt-0.5 text-gray-800">{app.noticePeriod}</p></div>
              <div className="col-span-2"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Reference</p><p className="mt-0.5 text-gray-800">{app.referenceId || '—'}</p></div>
            </div>
          </div>
        </div>

        {/* Resume + links */}
        <div className="flex flex-wrap gap-2">
          {app.resumeUrl && (
            <a
              href={app.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn-primary !min-h-[40px] gap-2 !px-4 !text-[10px]"
            >
              <DownloadSimple size={14} />
              Download Resume
            </a>
          )}
          {app.linkedinUrl && (
            <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary !min-h-[40px] !px-4 !text-[10px]">
              LinkedIn
            </a>
          )}
        </div>

        {/* Why VJR */}
        {app.whyVJR && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Why VJR Estate</p>
            <p className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700">
              “{app.whyVJR}”
            </p>
          </div>
        )}
        {app.coverLetter && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Cover Letter</p>
            <p className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700">
              {app.coverLetter}
            </p>
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Rating</p>
          <RatingStars value={app.rating} onChange={(v) => updateApplicationRating(app.id, v)} />
        </div>

        {/* Admin notes */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Admin Notes</p>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
            className="admin-textarea mt-2"
            placeholder="Add internal notes about this candidate…"
          />
          <button
            type="button"
            onClick={saveNotes}
            disabled={savingNotes}
            className="admin-btn-secondary mt-2 !min-h-[38px] !px-4 !text-[10px] disabled:opacity-50"
          >
            {savingNotes ? 'Saving…' : notesSaved ? 'Saved ✓' : 'Save Notes'}
          </button>
        </div>

        {/* Status history */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Status History</p>
          <div className="mt-3 space-y-0">
            {history.map((h, i) => (
              <div key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {i < history.length - 1 && (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-gray-200" />
                )}
                <span className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-white" style={{ background: STATUS_CONFIG[h.status]?.dot ?? '#9ca3af', boxShadow: '0 0 0 1px #e5e7eb' }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black">{STATUS_CONFIG[h.status]?.label ?? h.status}</p>
                  {h.note && <p className="mt-0.5 text-xs text-gray-500">{h.note}</p>}
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {timeAgo(h.updatedAt)} {h.updatedBy ? `· by ${h.updatedBy}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Change status */}
      <div className="shrink-0 border-t border-gray-200 px-5 py-4 sm:px-7">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Change Status</p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              disabled={app.status === s}
              onClick={() => onStatusChange(s)}
              className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold uppercase tracking-wide transition-all disabled:opacity-40 ${
                app.status === s ? STATUS_CONFIG[s].chip : 'border border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_CONFIG[s].dot }} />
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────

type Tab = 'applications' | 'jobs' | 'analytics';

export default function AdminCareersPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('applications');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Admin-only Firestore writes are allowed here (isAdmin passes), so this
    // is the right place to seed the initial job openings on first load.
    seedJobOpeningsIfEmpty();
    const unsubJobs = subscribeToJobs((list) => {
      setJobs(list);
      setLoading(false);
    });
    const unsubApps = subscribeToApplications(setApps);
    return () => {
      unsubJobs();
      unsubApps();
    };
  }, []);

  const stats = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return {
      total: apps.length,
      newToday: apps.filter((a) => a.appliedAt && a.appliedAt >= startOfToday).length,
      screening: apps.filter((a) => a.status === 'Screening').length,
      interview: apps.filter((a) => a.status === 'Interview').length,
      selected: apps.filter((a) => a.status === 'Selected').length,
      activeJobs: jobs.filter((j) => j.isActive).length,
      unreviewed: apps.filter((a) => !a.viewedByAdmin).length,
    };
  }, [apps, jobs]);

  const selected = useMemo(
    () => apps.find((a) => a.id === selectedId) ?? null,
    [apps, selectedId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const day = 86400000;
    return [...apps]
      .filter((a) => {
        const matchesSearch =
          !q ||
          a.fullName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.jobTitle.toLowerCase().includes(q) ||
          (a.referenceId ?? '').toLowerCase().includes(q);
        const matchesDept = deptFilter === 'All' || a.department === deptFilter;
        const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
        const applied = a.appliedAt?.getTime() ?? 0;
        const matchesDate =
          dateFilter === 'All' ||
          (dateFilter === 'today' && applied >= now - day) ||
          (dateFilter === '7d' && applied >= now - 7 * day) ||
          (dateFilter === '30d' && applied >= now - 30 * day);
        const matchesRating =
          ratingFilter === 'All' ||
          (ratingFilter === '1' && a.rating >= 1) ||
          (ratingFilter === '2' && a.rating >= 2) ||
          (ratingFilter === '3' && a.rating >= 3) ||
          (ratingFilter === '4' && a.rating >= 4) ||
          (ratingFilter === '5' && a.rating >= 5);
        return matchesSearch && matchesDept && matchesStatus && matchesDate && matchesRating;
      })
      .sort((a, b) => (b.appliedAt?.getTime() ?? 0) - (a.appliedAt?.getTime() ?? 0));
  }, [apps, search, deptFilter, statusFilter, dateFilter, ratingFilter]);

  const handleStatusChange = async (status: ApplicationStatus, note?: string) => {
    if (!selected) return;
    try {
      await appendStatusHistory(selected.id, { status, note, updatedBy: 'admin' });
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  const handleScheduleInterview = async (id: string) => {
    try {
      await appendStatusHistory(id, {
        status: 'Interview',
        note: 'Interview scheduled',
        updatedBy: 'admin',
      });
    } catch (err) {
      console.error('Schedule interview error:', err);
    }
  };

  const handleOpenCandidate = (app: JobApplication) => {
    setSelectedId(app.id);
    if (!app.viewedByAdmin) toggleApplicationViewed(app.id);
  };

  const handleDeleteJob = async () => {
    if (!deleteJobId) return;
    setDeleting(true);
    try {
      await deleteJobOpening(deleteJobId);
      setDeleteJobId(null);
    } catch (err) {
      console.error('Delete job error:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Analytics
  const analytics = useMemo(() => {
    const byDept = DEPARTMENTS.map((d) => ({
      name: d,
      value: apps.filter((a) => a.department === d).length,
      fill: DEPT_COLORS[DEPARTMENTS.indexOf(d)],
    })).filter((d) => d.value > 0);

    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });
    const overTime = last14.map((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      return {
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        count: apps.filter((a) => a.appliedAt && a.appliedAt >= d && a.appliedAt < next).length,
      };
    });

    const funnel = STATUS_ORDER.map((s) => ({
      name: STATUS_CONFIG[s].label,
      value: apps.filter((a) => a.status === s).length,
      fill: STATUS_CONFIG[s].hex,
    }));

    const byJob = Object.entries(
      apps.reduce<Record<string, number>>((acc, a) => {
        acc[a.jobTitle] = (acc[a.jobTitle] || 0) + 1;
        return acc;
      }, {}),
    )
      .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value, fill: GOLD }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Avg days from applied → first non-Applied status change.
    const hired = apps.filter((a) => a.statusHistory.length > 1 && a.appliedAt);
    const totalDays = hired.reduce((sum, a) => {
      const firstChange = a.statusHistory.find((h) => h.status !== 'Applied');
      if (!firstChange?.updatedAt) return sum;
      return sum + Math.max(0, (firstChange.updatedAt.getTime() - (a.appliedAt as Date).getTime()) / 86400000);
    }, 0);
    const avgDaysToHire = hired.length ? totalDays / hired.length : 0;

    return { byDept, overTime, funnel, byJob, avgDaysToHire };
  }, [apps]);

  const statCards = [
    { label: 'Total Applications', value: stats.total, icon: Users, sub: `${stats.unreviewed} new / unreviewed` },
    { label: 'New Today', value: stats.newToday, icon: Clock, sub: 'since midnight' },
    { label: 'Screening', value: stats.screening, icon: ListChecks, sub: 'in review' },
    { label: 'Interview', value: stats.interview, icon: CalendarCheck, sub: 'scheduled' },
    { label: 'Selected', value: stats.selected, icon: CheckCircle, sub: 'offered / hired' },
    { label: 'Active Jobs', value: stats.activeJobs, icon: Briefcase, sub: `${jobs.length} total` },
  ];

  return (
    <AdminLayout title="Careers Dashboard">
      <AdminPageShell>
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <AdminPageHeader
            eyebrow="Recruiting"
            title="Careers Dashboard"
            description="Track job openings, review candidate applications, and manage the hiring pipeline in real time."
          />
          <button
            type="button"
            onClick={() => { setEditingJob(null); setJobFormOpen(true); }}
            className="admin-btn-primary shrink-0 gap-2 self-start sm:self-auto"
          >
            <Plus size={16} weight="bold" />
            Add New Job
          </button>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="admin-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A1628]/5 text-[#0A1628]">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="admin-stat-label truncate">{stat.label}</p>
                    <p className="admin-stat-value mt-0.5 !text-2xl tabular-nums">{stat.value}</p>
                  </div>
                </div>
                <p className="mt-2 truncate text-[11px] text-gray-500">{stat.sub}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── TABS ── */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              { key: 'applications', label: 'Applications', icon: Users },
              { key: 'jobs', label: 'Job Openings', icon: Briefcase },
              { key: 'analytics', label: 'Analytics', icon: ChartBar },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-[12px] font-semibold uppercase tracking-[0.1em] transition-all sm:px-4 ${
                  active
                    ? 'bg-[#0A1628] text-[#C9A84C] shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-500 hover:border-black hover:text-black'
                }`}
              >
                <Icon size={15} />
                {t.label}
                {t.key === 'applications' && stats.unreviewed > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C9A84C] px-1 text-[10px] font-bold text-[#0A1628]">
                    {stats.unreviewed > 99 ? '99+' : stats.unreviewed}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB: APPLICATIONS ── */}
        {tab === 'applications' && (
          <>
            {/* Toolbar */}
            <div className="admin-card mb-4 flex flex-col gap-3 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                  <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search name, email, job…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="admin-input-ghost !pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="admin-select flex-1 sm:flex-none" aria-label="Filter by department">
                    <option value="All">All Departments</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-select flex-1 sm:flex-none" aria-label="Filter by status">
                    <option value="All">All Status</option>
                    {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="admin-select flex-1 sm:flex-none" aria-label="Filter by date">
                    <option value="All">Any Date</option>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                  <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="admin-select flex-1 sm:flex-none" aria-label="Filter by rating">
                    <option value="All">Any Rating</option>
                    <option value="1">1★ &amp; up</option>
                    <option value="2">2★ &amp; up</option>
                    <option value="3">3★ &amp; up</option>
                    <option value="4">4★ &amp; up</option>
                    <option value="5">5★ only</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">Showing {filtered.length} of {apps.length} applications</p>
            </div>

            {loading ? (
              <AdminSkeletonList count={5} />
            ) : filtered.length === 0 ? (
              <AdminEmptyState
                icon={<Users size={40} weight="thin" />}
                title="No Applications Found"
                description={
                  apps.length === 0
                    ? 'Applications submitted through the careers page will appear here in real time.'
                    : 'Try adjusting your search or filters.'
                }
              />
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {filtered.map((app) => (
                    <div key={app.id} className="admin-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-black">{app.fullName}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{app.email}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: app.department === 'Sales' ? '#EF4444' : '#3B82F6' }} />
                            {app.jobTitle}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">{timeAgo(app.appliedAt)} · {app.totalExperience} · PIN {app.pinCode || '—'}</p>
                        </div>
                        <StatusBadge status={app.status} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <RatingStars value={app.rating} onChange={(v) => updateApplicationRating(app.id, v)} />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenCandidate(app)}
                            className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-[10px] font-semibold uppercase tracking-wide text-gray-700 hover:border-black hover:text-black"
                          >
                            <Eye size={13} /> View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="admin-card hidden overflow-hidden md:block">
                  <div className="grid grid-cols-12 gap-3 border-b border-gray-200 bg-gray-50/50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    <p className="col-span-3">Candidate</p>
                    <p className="col-span-3">Job Applied</p>
                    <p className="col-span-1">Dept</p>
                    <p className="col-span-1">Exp</p>
                    <p className="col-span-1">Applied</p>
                    <p className="col-span-1">Status</p>
                    <p className="col-span-1">Rating</p>
                    <p className="col-span-1">Actions</p>
                  </div>
                  {filtered.map((app) => (
                    <motion.div
                      key={app.id}
                      variants={fadeUp}
                      initial="initial"
                      animate="animate"
                      className={`grid grid-cols-12 items-center gap-3 border-b border-gray-50 px-5 py-3.5 transition-colors last:border-0 hover:bg-gray-50/40 ${
                        !app.viewedByAdmin ? 'bg-[#C9A84C]/[0.04]' : ''
                      }`}
                    >
                      <div className="col-span-3 min-w-0">
                        <p className="truncate text-sm font-medium text-black">{app.fullName}</p>
                        <p className="truncate text-[11px] text-gray-500">{app.email}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          {app.pinCode && (
                            <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">
                              PIN {app.pinCode}
                            </span>
                          )}
                          {!app.viewedByAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#C9A84C]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#B8953A]">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="truncate text-[13px] font-medium text-gray-800">{app.jobTitle}</p>
                        <p className="text-[11px] text-gray-400">{app.referenceId}</p>
                      </div>
                      <p className="col-span-1 truncate text-xs text-gray-700">{app.department}</p>
                      <p className="col-span-1 truncate text-xs text-gray-700">{app.totalExperience}</p>
                      <p className="col-span-1 text-xs text-gray-500">{timeAgo(app.appliedAt)}</p>
                      <div className="col-span-1"><StatusBadge status={app.status} /></div>
                      <div className="col-span-1">
                        <RatingStars value={app.rating} onChange={(v) => updateApplicationRating(app.id, v)} />
                      </div>
                      <div className="col-span-1 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenCandidate(app)}
                          className="flex min-h-[36px] items-center gap-1 rounded-lg border border-gray-200 px-2 text-[10px] font-semibold uppercase text-gray-700 transition-colors hover:border-black hover:text-black"
                        >
                          <Eye size={12} /> View
                        </button>
                        {app.status !== 'Interview' && (
                          <button
                            type="button"
                            onClick={() => handleScheduleInterview(app.id)}
                            className="flex min-h-[36px] items-center gap-1 rounded-lg border border-gray-200 px-2 text-[10px] font-semibold uppercase text-gray-700 transition-colors hover:border-black hover:text-black"
                          >
                            <CalendarCheck size={12} /> Interview
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── TAB: JOB OPENINGS ── */}
        {tab === 'jobs' && (
          <>
            {jobs.length === 0 ? (
              <AdminEmptyState
                icon={<Briefcase size={40} weight="thin" />}
                title="No Job Openings"
                description="Create your first job opening to start receiving applications."
                action={
                  <button
                    type="button"
                    onClick={() => { setEditingJob(null); setJobFormOpen(true); }}
                    className="admin-btn-primary gap-2"
                  >
                    <Plus size={16} /> Add New Job
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    className={`admin-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${!job.isActive ? 'opacity-70' : ''}`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ background: job.department_color }}
                      >
                        <Briefcase size={17} weight="bold" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-semibold text-black">{job.title}</p>
                          {job.isFeatured && (
                            <AdminBadge variant="success">Featured</AdminBadge>
                          )}
                          {!job.isActive && (
                            <AdminBadge variant="muted">Inactive</AdminBadge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {job.department} · {job.location} · {job.type} · {job.experience} · {formatSalary(job.salary)}
                        </p>
                        <p className="mt-2 line-clamp-1 text-xs text-gray-400">{job.description}</p>
                        <p className="mt-2 text-[11px] font-semibold text-[#0A1628]">
                          {job.totalApplications} application{job.totalApplications === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Active</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={job.isActive}
                          aria-label={`Toggle active for ${job.title}`}
                          onClick={() => toggleJobActive(job.id, !job.isActive)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${job.isActive ? 'bg-[#0A1628]' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform ${job.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                        </button>
                      </label>
                      <button
                        type="button"
                        onClick={() => { setEditingJob(job); setJobFormOpen(true); }}
                        className="admin-btn-secondary !min-h-[40px] !px-4 !text-[10px]"
                      >
                        <NotePencil size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteJobId(job.id)}
                        className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-100 px-4 text-[10px] font-semibold uppercase tracking-wide text-black transition-colors hover:bg-gray-200"
                      >
                        <Trash size={13} /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: ANALYTICS ── */}
        {tab === 'analytics' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Apps by department */}
            <div className="admin-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="admin-section-title !mb-0">Applications by Department</h2>
                <ChartBar size={16} className="text-gray-400" />
              </div>
              {analytics.byDept.length === 0 ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.byDept} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {analytics.byDept.map((d) => <Cell key={d.name} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Over time */}
            <div className="admin-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="admin-section-title !mb-0">Applications Over Time</h2>
                <ChartLine size={16} className="text-gray-400" />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.overTime} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={2} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="count" stroke={GOLD} strokeWidth={2.5} dot={{ r: 3, fill: GOLD, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Status funnel */}
            <div className="admin-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="admin-section-title !mb-0">Status Funnel</h2>
                <span className="text-[11px] text-gray-400">Applied → Hired</span>
              </div>
              <div className="space-y-3">
                {analytics.funnel.map((f) => {
                  const pct = apps.length ? Math.round((f.value / apps.length) * 100) : 0;
                  return (
                    <div key={f.name}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-2 font-medium text-gray-700">
                          <span className="h-2 w-2 rounded-full" style={{ background: f.fill }} />
                          {f.name}
                        </span>
                        <span className="font-semibold text-gray-900 tabular-nums">{f.value} · {pct}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                          className="h-full rounded-full"
                          style={{ background: f.fill }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top roles + time to hire */}
            <div className="admin-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="admin-section-title !mb-0">Top Performing Roles</h2>
                <span className="text-[11px] text-gray-400">by applications</span>
              </div>
              {analytics.byJob.length === 0 ? (
                <div className="flex h-[180px] items-center justify-center text-sm text-gray-400">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.byJob} margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="value" fill={GOLD} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0A1628] px-4 py-3.5">
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9fb0c4]">
                  <Clock size={14} className="text-[#C9A84C]" />
                  Avg. time to first review
                </span>
                <span className="text-lg font-semibold text-[#C9A84C] tabular-nums">
                  {analytics.avgDaysToHire ? `${analytics.avgDaysToHire.toFixed(1)} days` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </AdminPageShell>

      {/* ── Candidate detail ── */}
      <AnimatePresence>
        {selected && (
          <CandidateDetail
            app={selected}
            onClose={() => setSelectedId(null)}
            onStatusChange={(s) => handleStatusChange(s)}
          />
        )}
      </AnimatePresence>

      {/* ── Job form ── */}
      <JobFormModal
        open={jobFormOpen}
        editing={editingJob}
        onClose={() => setJobFormOpen(false)}
        onSaved={() => {}}
      />

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {deleteJobId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => !deleting && setDeleteJobId(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <h3 className="admin-heading text-xl font-medium text-black sm:text-2xl">Delete Job Opening?</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:mt-4">
                This removes the job from the careers page. Existing applications are kept.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:mt-8 sm:flex-row sm:gap-3">
                <button type="button" onClick={() => setDeleteJobId(null)} disabled={deleting} className="admin-btn-secondary flex-1 disabled:opacity-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteJob}
                  disabled={deleting}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-black px-5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : <><WarningCircle size={15} /> Delete</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
