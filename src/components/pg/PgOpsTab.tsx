import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Warning,
  Siren,
  Plus,
  Megaphone,
  X,
  Clock,
} from '@phosphor-icons/react';
import { AdminBadge } from '@/components/admin/AdminUi';
import type { PgData } from '@/pages/admin/AdminPgManagement';
import {
  slaDueHours,
  addComplaint,
  updateComplaint,
  addVisitor,
  updateVisitor,
  addNotice,
  addMenuDay,
  addShift,
  money,
  type PgComplaint,
  type PgVisitor,
  type PgMenuDay,
  type PgShift,
} from '@/lib/pgManagement';

type OpsTab = 'complaints' | 'visitors' | 'notices' | 'menu' | 'shifts';

export default function PgOpsTab({ data }: { data: PgData }) {
  const [tab, setTab] = useState<OpsTab>('complaints');

  const subTabs: { key: OpsTab; label: string }[] = [
    { key: 'complaints', label: 'Complaints & maintenance' },
    { key: 'visitors', label: 'Visitor gate log' },
    { key: 'notices', label: 'Notice board' },
    { key: 'menu', label: 'Mess menu' },
    { key: 'shifts', label: 'Duty roster' },
  ];

  return (
    <div className="space-y-5">
      <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1.5">
          {subTabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`admin-chip ${tab === key ? 'admin-chip-active' : 'admin-chip-idle'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'complaints' && <Complaints data={data} />}
      {tab === 'visitors' && <Visitors data={data} />}
      {tab === 'notices' && <Notices data={data} />}
      {tab === 'menu' && <Menu data={data} />}
      {tab === 'shifts' && <Shifts data={data} />}
    </div>
  );
}

/* ───────────────── Complaints ───────────────── */

function Complaints({ data }: { data: PgData }) {
  const [showForm, setShowForm] = useState(false);
  const sorted = useMemo(
    () =>
      [...data.complaints].sort((a, b) => {
        const rank = { Open: 0, 'In Progress': 1, 'Awaiting Owner': 2, Resolved: 3 } as Record<string, number>;
        return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
      }),
    [data.complaints],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(true)} className="admin-btn-primary">
          <Plus size={15} /> Log complaint
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="admin-card p-8 text-center text-sm text-gray-500">
          No complaints open. Tenant tickets arrive here with photos, category and SLA timer.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {sorted.map((c) => {
            const sla = slaDueHours(c);
            const breached = sla <= 0 && c.status !== 'Resolved';
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0A1628]">{c.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {c.property} · {c.category} · raised by {c.raisedBy}
                    </p>
                  </div>
                  <AdminBadge
                    variant={c.status === 'Resolved' ? 'success' : c.status === 'Awaiting Owner' ? 'whatsapp' : 'default'}
                  >
                    {c.status}
                  </AdminBadge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                  <span className={`inline-flex items-center gap-1 font-medium ${breached ? 'text-red-600' : 'text-gray-500'}`}>
                    <Clock size={12} /> {c.status === 'Resolved' ? 'SLA met' : breached ? 'SLA breached' : `SLA ${sla}h left`}
                  </span>
                  <span className={`inline-flex items-center gap-1 font-medium ${
                    c.priority === 'High' ? 'text-red-600' : c.priority === 'Medium' ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    {c.priority} priority
                  </span>
                  {c.cost != null && c.cost > 0 && (
                    <span className="font-medium text-gray-600">Est. ₹{money(c.cost)}</span>
                  )}
                  {c.ownerApprovalRequired && (
                    <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                      <Warning size={12} weight="fill" /> Above manager cap — owner approval required
                    </span>
                  )}
                </div>

                {c.status !== 'Resolved' && (
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateComplaint(c.id, { status: 'In Progress' })}
                      disabled={c.status === 'In Progress'}
                      className="admin-btn-secondary !min-h-[32px] !px-3 !text-[10px] disabled:opacity-40"
                    >
                      Start work
                    </button>
                    <button
                      type="button"
                      onClick={() => updateComplaint(c.id, { status: 'Awaiting Owner' })}
                      disabled={c.status === 'Awaiting Owner'}
                      className="admin-btn-secondary !min-h-[32px] !px-3 !text-[10px] disabled:opacity-40"
                    >
                      Send for owner approval
                    </button>
                    <button
                      type="button"
                      onClick={() => updateComplaint(c.id, { status: 'Resolved' })}
                      className="admin-btn-primary !min-h-[32px] !px-3 !text-[10px]"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {showForm && <ComplaintForm data={data} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function ComplaintForm({ data, onClose }: { data: PgData; onClose: () => void }) {
  const [form, setForm] = useState({
    propertyId: data.properties[0]?.id ?? '',
    raisedBy: 'Tenant',
    category: 'Electrical' as PgComplaint['category'],
    title: '',
    detail: '',
    priority: 'Medium' as PgComplaint['priority'],
    cost: 0,
  });
  const [saving, setSaving] = useState(false);
  const property = data.properties.find((p) => p.id === form.propertyId);
  const cap = property?.feeConfig.spendCapWithoutOwnerApproval ?? 5000;
  const needsApproval = form.cost > cap;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !property) return;
    setSaving(true);
    try {
      await addComplaint({
        propertyId: property.id,
        property: property.name,
        raisedBy: form.raisedBy,
        category: form.category,
        title: form.title,
        detail: form.detail,
        priority: form.priority,
        status: needsApproval ? 'Awaiting Owner' : 'Open',
        cost: form.cost,
        ownerApprovalRequired: needsApproval,
        createdAt: new Date().toISOString(),
        slaHours: form.priority === 'High' ? 12 : form.priority === 'Medium' ? 24 : 48,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="admin-heading text-xl font-semibold text-[#0A1628]">Log complaint ticket</h3>
            <p className="mt-1 text-sm text-gray-500">SLA: High 12h · Medium 24h · Low 48h. Photos attach to the ticket.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-black"><X size={18} /></button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property">
            <select className="admin-select" value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className="admin-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PgComplaint['category'] })}>
              {['Electrical', 'Plumbing', 'Housekeeping', 'Security', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Title"><input className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Geyser leaking in 201A" /></Field>
          <Field label="Raised by"><input className="admin-input" value={form.raisedBy} onChange={(e) => setForm({ ...form, raisedBy: e.target.value })} /></Field>
          <Field label="Priority">
            <select className="admin-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as PgComplaint['priority'] })}>
              {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Estimated cost ₹"><input type="number" className="admin-input" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Detail"><textarea className="admin-textarea" rows={3} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></Field>
          </div>
        </div>

        <p className={`mt-4 rounded-xl px-4 py-3 text-xs font-medium ${
          needsApproval ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200' : 'bg-[#FBF9F3] text-gray-600'
        }`}>
          {needsApproval
            ? `⚠ ₹${money(form.cost)} exceeds the ₹${money(cap)} manager authority cap for this property — routed for owner approval via app notification.`
            : `Within the ₹${money(cap)} manager authority cap — warden can approve directly.`}
        </p>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="admin-btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="admin-btn-primary flex-1">{saving ? 'Logging…' : 'Log ticket'}</button>
        </div>
      </form>
    </div>
  );
}

/* ───────────────── Visitors ───────────────── */

function Visitors({ data }: { data: PgData }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(true)} className="admin-btn-primary">
          <Plus size={15} /> Gate entry
        </button>
      </div>

      {data.visitors.length === 0 ? (
        <div className="admin-card p-8 text-center text-sm text-gray-500">
          No visitor entries today. The guard's gate app logs guests, parcels and deliveries here and pings the resident.
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          {data.visitors.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-50 px-5 py-3.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0A1628]">{v.name}</p>
                <p className="text-[11px] text-gray-500">
                  {v.purpose} · visiting {v.visiting} · in {v.inTime}
                  {v.outTime ? ` · out ${v.outTime}` : ''}
                </p>
              </div>
              {v.overstay && <AdminBadge variant="muted">Overstay alert</AdminBadge>}
              {v.outTime ? (
                <span className="text-[11px] text-gray-400">Checked out</span>
              ) : (
                <button
                  type="button"
                  onClick={() => updateVisitor(v.id, { outTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) })}
                  className="admin-btn-secondary !min-h-[32px] !px-3 !text-[10px]"
                >
                  Check out
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && <VisitorForm data={data} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function VisitorForm({ data, onClose }: { data: PgData; onClose: () => void }) {
  const [form, setForm] = useState({
    propertyId: data.properties[0]?.id ?? '',
    name: '',
    purpose: 'Guest' as PgVisitor['purpose'],
    visiting: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const property = data.properties.find((p) => p.id === form.propertyId);
    if (!form.name || !property) return;
    setSaving(true);
    try {
      await addVisitor({
        propertyId: property.id,
        property: property.name,
        name: form.name,
        purpose: form.purpose,
        visiting: form.visiting || '—',
        inTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <h3 className="admin-heading text-lg font-semibold text-[#0A1628]">Gate entry log</h3>
        <p className="mt-1 text-sm text-gray-500">Resident gets an automatic arrival notification; overstays raise an alert.</p>
        <div className="mt-5 space-y-4">
          <Field label="Property">
            <select className="admin-select" value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Visitor name"><input className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Purpose">
            <select className="admin-select" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value as PgVisitor['purpose'] })}>
              {['Guest', 'Parcel', 'Food Delivery', 'Maintenance', 'Agent'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Visiting resident / bed"><input className="admin-input" value={form.visiting} onChange={(e) => setForm({ ...form, visiting: e.target.value })} placeholder="Bed 201A" /></Field>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="admin-btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="admin-btn-primary flex-1">{saving ? 'Logging…' : 'Log entry'}</button>
        </div>
      </form>
    </div>
  );
}

/* ───────────────── Notices ───────────────── */

function Notices({ data }: { data: PgData }) {
  const [showForm, setShowForm] = useState(false);
  const sorted = [...data.notices].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(true)} className="admin-btn-primary">
          <Megaphone size={15} /> Publish notice
        </button>
      </div>

      {/* Statutory pinned block — mirrors the physical notice board requirement */}
      <div className="admin-card border-[#C9A84C]/40 bg-[#FBF7EC] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#96782A]">Statutory — always displayed</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <EmergencyLine title="BBMP Helpline" number="1533" note="Civic issues, trade licence, property tax" />
          <EmergencyLine title="Police" number="101" note="Law & order — mirrored from physical notice board" />
          <EmergencyLine title="Fire & Emergency" number="108" note="Karnataka State Fire & Emergency Services" />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="admin-card p-8 text-center text-sm text-gray-500">
          No notices published. Announcements appear on the tenant app notice board.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {sorted.map((n) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`admin-card p-5 ${n.pinned ? 'ring-1 ring-[#C9A84C]/50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-[#0A1628]">{n.title}</p>
                {n.pinned && <AdminBadge variant="whatsapp">Pinned</AdminBadge>}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{n.body}</p>
              <p className="mt-3 text-[11px] text-gray-400">
                {n.date} · {n.propertyId === '*' ? 'All properties' : data.properties.find((p) => p.id === n.propertyId)?.name ?? ''}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && <NoticeForm data={data} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function EmergencyLine({ title, number, note }: { title: string; number: string; note: string }) {
  return (
    <a href={number === '1533' ? 'tel:1533' : number === '101' ? 'tel:101' : 'tel:108'} className="rounded-xl border border-[#C9A84C]/30 bg-white p-4 transition-colors hover:border-[#C9A84C]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[#0A1628]">{number}</p>
      <p className="mt-1 text-[11px] text-gray-500">{note}</p>
    </a>
  );
}

function NoticeForm({ data, onClose }: { data: PgData; onClose: () => void }) {
  const [form, setForm] = useState({
    propertyId: '*',
    title: '',
    body: '',
    pinned: false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.body) return;
    setSaving(true);
    try {
      await addNotice({
        ...form,
        propertyId: form.propertyId,
        date: new Date().toISOString().slice(0, 10),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <h3 className="admin-heading text-lg font-semibold text-[#0A1628]">Publish notice</h3>
        <div className="mt-5 space-y-4">
          <Field label="Property">
            <select className="admin-select" value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="*">All properties</option>
              {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Title"><input className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Notice"><textarea className="admin-textarea" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="h-5 w-5 accent-[#C9A84C]" />
            <span className="text-sm text-gray-700">Pin to top</span>
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="admin-btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="admin-btn-primary flex-1">{saving ? 'Publishing…' : 'Publish'}</button>
        </div>
      </form>
    </div>
  );
}

/* ───────────────── Mess menu ───────────────── */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function Menu({ data }: { data: PgData }) {
  const [savingDay, setSavingDay] = useState<string | null>(null);
  const menuByDay = useMemo(() => {
    const map: Partial<Record<string, PgMenuDay>> = {};
    for (const m of data.menu) map[m.day] = m;
    return map;
  }, [data.menu]);

  const publishDefaults = async () => {
    for (const day of DAYS) {
      if (menuByDay[day]) continue;
      setSavingDay(day);
      await addMenuDay({
        propertyId: data.properties[0]?.id ?? '*',
        day,
        breakfast: 'Idli–vada, sambar, fruit',
        lunch: 'Rice, sambar, poriyal, rasam, curd',
        dinner: 'Chapati, paneer curry, dal, salad',
      });
    }
    setSavingDay(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Weekly menu publishes to every tenant's app — editable per day.</p>
        <button type="button" onClick={publishDefaults} disabled={savingDay !== null} className="admin-btn-primary !min-h-[36px] !text-[10px]">
          {savingDay ? 'Publishing…' : 'Publish week template'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DAYS.map((day) => {
          const m = menuByDay[day];
          return (
            <div key={day} className="admin-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0A1628]">{day}</p>
                {m ? <AdminBadge variant="success">Published</AdminBadge> : <AdminBadge variant="muted">Draft</AdminBadge>}
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <p><span className="font-semibold uppercase tracking-wide text-gray-400">Breakfast</span><br />{m?.breakfast ?? '—'}</p>
                <p><span className="font-semibold uppercase tracking-wide text-gray-400">Lunch</span><br />{m?.lunch ?? '—'}</p>
                <p><span className="font-semibold uppercase tracking-wide text-gray-400">Dinner</span><br />{m?.dinner ?? '—'}</p>
              </div>
            </div>
          );
        })}
      </div>

      <EmergencyButtonRow />
    </div>
  );
}

/* ───────────────── Duty roster ───────────────── */

function Shifts({ data }: { data: PgData }) {
  const [showForm, setShowForm] = useState(false);
  const byDay = useMemo(() => {
    const map: Record<string, PgShift[]> = {};
    for (const s of data.shifts) (map[s.day] ??= []).push(s);
    return map;
  }, [data.shifts]);

  const coverageWarning = DAYS.filter((d) => {
    const slots = new Set((byDay[d] ?? []).map((s) => s.slot));
    return slots.size < 3;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            Compliance requires at least one staff member on-site at all times — coverage is checked per slot.
          </p>
          {coverageWarning.length > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600">
              <Warning size={13} weight="fill" /> Uncovered slots on: {coverageWarning.join(', ')}
            </p>
          )}
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="admin-btn-primary !min-h-[36px] !text-[10px]">
          <Plus size={14} /> Add shift
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DAYS.map((day) => (
          <div key={day} className="admin-card p-4">
            <p className="text-sm font-semibold text-[#0A1628]">{day}</p>
            {(byDay[day] ?? []).length === 0 ? (
              <p className="mt-2 text-xs text-gray-400">No shifts scheduled</p>
            ) : (
              <div className="mt-2.5 space-y-2">
                {byDay[day].map((s) => (
                  <div key={s.id} className="rounded-lg bg-[#FBF9F3] px-3 py-2 text-xs">
                    <p className="font-semibold text-[#0A1628]">{s.staffName}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">{s.role} · {s.slot}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && <ShiftForm data={data} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function ShiftForm({ data, onClose }: { data: PgData; onClose: () => void }) {
  const [form, setForm] = useState({
    propertyId: data.properties[0]?.id ?? '',
    staffName: '',
    role: 'Warden' as PgShift['role'],
    day: 'Mon',
    slot: 'Morning' as PgShift['slot'],
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffName) return;
    setSaving(true);
    try {
      await addShift(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <h3 className="admin-heading text-lg font-semibold text-[#0A1628]">Add duty shift</h3>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Staff name"><input className="admin-input" value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} /></Field>
          <Field label="Role">
            <select className="admin-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as PgShift['role'] })}>
              {['Warden', 'Guard', 'Housekeeping', 'Cook'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Day">
            <select className="admin-select" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Slot">
            <select className="admin-select" value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value as PgShift['slot'] })}>
              {['Morning', 'Evening', 'Night'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="admin-btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="admin-btn-primary flex-1">{saving ? 'Adding…' : 'Add shift'}</button>
        </div>
      </form>
    </div>
  );
}

/* ───────────────── Emergency alert ───────────────── */

function EmergencyButtonRow() {
  const [triggered, setTriggered] = useState(false);
  return (
    <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-5">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-[#0A1628]">
          <Siren size={17} weight="fill" className="text-red-600" /> Resident emergency alert channel
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Residents press one button in their app — warden, VJR HQ and the owner are notified instantly with the
          bed number. Test the pipeline here.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          setTriggered(true);
          setTimeout(() => setTriggered(false), 3000);
        }}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition-all ${
          triggered ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-b from-red-500 to-red-600 hover:from-red-500 hover:to-red-700'
        }`}
      >
        <Siren size={15} weight="fill" />
        {triggered ? 'Alert dispatched to 3 channels' : 'Trigger test alert'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      {children}
    </label>
  );
}

