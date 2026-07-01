import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, X, Plus, Lock } from '@phosphor-icons/react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminEmptyState,
  AdminFilterChip,
  AdminPageHeader,
  AdminPageShell,
  AdminSkeletonList,
  AdminStatCard,
  AdminStatGrid,
  AdminToolbar,
} from '@/components/admin/AdminUi';
import {
  subscribeAdminRequirements,
  updateRequirement,
  deleteRequirement,
  formatBudgetRange,
  formatRequirementPostedAt,
  REQUIREMENT_PROPERTY_TYPES,
  REQUIREMENT_PURPOSES,
  REQUIREMENT_TIMELINES,
  PAYMENT_MODES,
  type RequirementDoc,
  type RequirementStatus,
  type RequirementPurpose,
  type RequirementTimeline,
  type PaymentMode,
} from '@/lib/requirements';
import RequirementStatusBadge from '@/components/requirements/RequirementStatusBadge';

export default function AdminRequirementsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<RequirementDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequirementStatus>('all');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [timelineFilter, setTimelineFilter] = useState('All Timelines');
  const [viewItem, setViewItem] = useState<RequirementDoc | null>(null);
  const [editItem, setEditItem] = useState<RequirementDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeRequirements(
      (data) => {
        setItems(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const stats = useMemo(
    () => ({
      total: items.length,
      open: items.filter((r) => r.status === 'open').length,
      matched: items.filter((r) => r.status === 'matched').length,
      closed: items.filter((r) => r.status === 'closed').length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'All Types' && r.propertyType !== typeFilter) return false;
      if (timelineFilter !== 'All Timelines' && r.timeline !== timelineFilter) return false;
      if (!q) return true;
      const hay = [
        r.reqId,
        r.buyerName,
        r.buyerPhone,
        r.locations.join(' '),
        r.propertyType,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, statusFilter, typeFilter, timelineFilter]);

  const handleStatusChange = async (id: string, status: RequirementStatus) => {
    await updateRequirement(id, { status });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteRequirement(deleteId);
    setDeleteId(null);
    setViewItem(null);
  };

  const handleSaveEdit = async () => {
    if (!editItem?.id) return;
    setSaving(true);
    try {
      const { id, ...data } = editItem;
      await updateRequirement(id, data);
      setEditItem(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Requirements">
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Buyer Requirements"
          title="Requirements"
          description="Manage buyer requirements posted to the public board. Use Post Requirement to add new listings."
        />

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/requirements/new')}
            className="admin-btn-primary gap-2"
          >
            <Plus size={16} weight="bold" />
            Post Requirement
          </button>
          <a
            href="/requirements"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn-secondary"
          >
            Preview Public Board
          </a>
        </div>

        <AdminStatGrid>
          <AdminStatCard label="Total" value={stats.total} />
          <AdminStatCard label="Open" value={stats.open} />
          <AdminStatCard label="Matched" value={stats.matched} />
          <AdminStatCard label="Closed" value={stats.closed} />
        </AdminStatGrid>

        <AdminToolbar>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search REQ ID, name, phone, location…"
            className="admin-input w-full"
          />
          <div className="flex flex-wrap gap-2">
            {(['all', 'open', 'matched', 'closed'] as const).map((s) => (
              <AdminFilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
              </AdminFilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="admin-input text-sm"
            >
              <option>All Types</option>
              {REQUIREMENT_PROPERTY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              value={timelineFilter}
              onChange={(e) => setTimelineFilter(e.target.value)}
              className="admin-input text-sm"
            >
              <option>All Timelines</option>
              {REQUIREMENT_TIMELINES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </AdminToolbar>

        {loading ? (
          <AdminSkeletonList count={5} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            title="No Requirements"
            description="Buyer requirements submitted from the public form will appear here."
          />
        ) : (
          <div className="admin-card overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">REQ ID</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Budget</th>
                  <th className="px-4 py-3">Timeline</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Resp.</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{r.reqId}</td>
                      <td className="px-4 py-3 text-xs">{r.purpose}</td>
                      <td className="px-4 py-3 text-xs">{r.propertyType}</td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-xs">
                        {r.locations.join(', ')}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {formatBudgetRange(r.budgetMin, r.budgetMax)}
                      </td>
                      <td className="px-4 py-3 text-xs">{r.timeline}</td>
                      <td className="px-4 py-3 text-xs">{r.buyerName}</td>
                      <td className="px-4 py-3 text-xs">{r.buyerPhone}</td>
                      <td className="px-4 py-3 text-xs">{r.paymentMode}</td>
                      <td className="px-4 py-3 text-xs">{r.clickCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <RequirementStatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setViewItem(r)}
                            className="admin-btn-secondary !min-h-[32px] !px-2 !text-[10px]"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditItem({ ...r })}
                            className="admin-btn-secondary !min-h-[32px] !px-2 !text-[10px]"
                          >
                            Edit
                          </button>
                          <select
                            value={r.status}
                            onChange={(e) =>
                              r.id && handleStatusChange(r.id, e.target.value as RequirementStatus)
                            }
                            className="rounded-lg border border-gray-200 px-1 py-1 text-[10px]"
                            aria-label="Change status"
                          >
                            <option value="open">Open</option>
                            <option value="matched">Matched</option>
                            <option value="closed">Closed</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => r.id && handleStatusChange(r.id, 'closed')}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-[10px]"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPageShell>

      <AnimatePresence>
        {viewItem && (
          <DetailModal
            item={viewItem}
            onClose={() => setViewItem(null)}
            onEdit={() => {
              setEditItem({ ...viewItem });
              setViewItem(null);
            }}
            onMatched={() => viewItem.id && handleStatusChange(viewItem.id, 'matched')}
            onCloseReq={() => viewItem.id && handleStatusChange(viewItem.id, 'closed')}
            onDelete={() => viewItem.id && setDeleteId(viewItem.id)}
          />
        )}
        {editItem && (
          <EditModal
            item={editItem}
            saving={saving}
            onChange={setEditItem}
            onClose={() => setEditItem(null)}
            onSave={handleSaveEdit}
          />
        )}
        {deleteId && (
          <ConfirmDeleteModal
            onCancel={() => setDeleteId(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

function DetailModal({
  item,
  onClose,
  onEdit,
  onMatched,
  onCloseReq,
  onDelete,
}: {
  item: RequirementDoc;
  onClose: () => void;
  onEdit: () => void;
  onMatched: () => void;
  onCloseReq: () => void;
  onDelete: () => void;
}) {
  const maskedPhone =
    item.buyerPhone.length >= 10
      ? `${item.buyerPhone.slice(0, 4)}XXXXXX`
      : item.buyerPhone;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-mono text-lg font-bold">{item.reqId}</h3>
          <div className="flex items-center gap-2">
            <RequirementStatusBadge status={item.status} />
            <button type="button" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <Row label="Purpose" value={item.purpose} />
          <Row label="Property Type" value={item.propertyType} />
          <Row label="Location" value={item.locations.join(', ')} />
          <Row label="Budget" value={formatBudgetRange(item.budgetMin, item.budgetMax)} />
          <Row label="Timeline" value={item.timeline} />
          {item.notes && <Row label="Notes" value={item.notes} />}
        </dl>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <Lock size={14} weight="thin" />
            Private Details
          </p>
          <dl className="mt-3 space-y-3 text-sm">
            <Row label="Name" value={item.buyerName} />
            <div className="flex items-center justify-between gap-2">
              <Row label="Phone" value={maskedPhone} />
              <a
                href={`tel:+91${item.buyerPhone}`}
                className="flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-xs text-white"
              >
                <Phone size={14} /> Call
              </a>
            </div>
            <Row label="Payment Mode" value={item.paymentMode} />
          </dl>
        </div>

        <dl className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-600">
          <Row label="Submitted" value={formatRequirementPostedAt(item.postedAt)} />
          <Row
            label="Responses"
            value={`${item.clickCount ?? 0} people responded`}
          />
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="admin-btn-secondary">
            Edit
          </button>
          <button type="button" onClick={onMatched} className="admin-btn-primary">
            Mark Matched
          </button>
          <button type="button" onClick={onCloseReq} className="admin-btn-secondary">
            Close
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-red-200 px-4 py-2 text-xs text-red-600"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="col-span-2 text-gray-900">{value}</dd>
    </div>
  );
}

function EditModal({
  item,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  item: RequirementDoc;
  saving: boolean;
  onChange: (item: RequirementDoc) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = <K extends keyof RequirementDoc>(key: K, value: RequirementDoc[K]) => {
    onChange({ ...item, [key]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit {item.reqId}</h3>
          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Purpose">
            <select
              value={item.purpose}
              onChange={(e) => set('purpose', e.target.value as RequirementPurpose)}
              className="admin-input w-full"
            >
              {REQUIREMENT_PURPOSES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Property Type">
            <select
              value={item.propertyType}
              onChange={(e) => set('propertyType', e.target.value)}
              className="admin-input w-full"
            >
              {REQUIREMENT_PROPERTY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Locations (comma-separated)">
            <input
              value={item.locations.join(', ')}
              onChange={(e) =>
                set(
                  'locations',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                )
              }
              className="admin-input w-full"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Budget Min">
              <input
                type="number"
                value={item.budgetMin}
                onChange={(e) => set('budgetMin', Number(e.target.value))}
                className="admin-input w-full"
              />
            </Field>
            <Field label="Budget Max">
              <input
                type="number"
                value={item.budgetMax}
                onChange={(e) => set('budgetMax', Number(e.target.value))}
                className="admin-input w-full"
              />
            </Field>
          </div>
          <Field label="Timeline">
            <select
              value={item.timeline}
              onChange={(e) => set('timeline', e.target.value as RequirementTimeline)}
              className="admin-input w-full"
            >
              {REQUIREMENT_TIMELINES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea
              value={item.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className="admin-input w-full resize-none"
            />
          </Field>
          <Field label="Status">
            <select
              value={item.status}
              onChange={(e) => set('status', e.target.value as RequirementStatus)}
              className="admin-input w-full"
            >
              <option value="open">Open</option>
              <option value="matched">Matched</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
          <Field label="Name">
            <input
              value={item.buyerName}
              onChange={(e) => set('buyerName', e.target.value)}
              className="admin-input w-full"
            />
          </Field>
          <Field label="Phone">
            <input
              value={item.buyerPhone}
              onChange={(e) => set('buyerPhone', e.target.value)}
              className="admin-input w-full"
            />
          </Field>
          <Field label="Payment Mode">
            <select
              value={item.paymentMode}
              onChange={(e) => set('paymentMode', e.target.value as PaymentMode)}
              className="admin-input w-full"
            >
              {PAYMENT_MODES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="admin-btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="admin-btn-primary flex-1 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function ConfirmDeleteModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6"
      >
        <h3 className="text-lg font-semibold">Delete requirement?</h3>
        <p className="mt-2 text-sm text-gray-600">This cannot be undone.</p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onCancel} className="admin-btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 py-2 text-sm text-white"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
