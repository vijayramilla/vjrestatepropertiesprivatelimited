import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck, CalendarClock, CheckCircle2, Download, ExternalLink, FileText,
  Gavel, Landmark, Loader2, Pencil, Plus, Scale, Search, ShieldCheck,
  Trash2, Upload, User, X,
} from 'lucide-react';
import { CrmBtn, CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';
import {
  deleteLedgerRow, upsertLedgerRow, uploadLedgerDocument, ledgerDocumentUrl,
  type LedgerPayment, type LedgerNotice, type LedgerDirector, type LedgerDocument,
} from '@/lib/supabaseData';
import { DIR3_DUE_LABEL, DSC_RENEW_LEAD_DAYS, DSC_STATUS_META, deriveKyc, directorDuties, dscState, kycState, normForm, type KycState } from '@/data/directorKyc';

/* ═══════════════ SHARED HELPERS ═══════════════ */

const fmtINR = (n: number) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${(n ?? 0).toLocaleString('en-IN')}`;

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const daysUntil = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
};

function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span === 2 ? 'sm:col-span-2' : span === 4 ? 'sm:col-span-2 lg:col-span-4' : ''}>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">{label}</label>
      {children}
    </div>
  );
}

function DueBadge({ date }: { date?: string | null }) {
  const d = daysUntil(date);
  if (d === null) return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-gray-400">—</span>;
  if (d < 0) return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-600">{Math.abs(d)}d overdue</span>;
  if (d <= 7) return <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-extrabold text-orange-600">{d}d left</span>;
  if (d <= 30) return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">{d}d left</span>;
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">{d}d left</span>;
}

function EmptyState({ icon: Icon, title, hint }: { icon: typeof Landmark; title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-white p-14 text-center">
      <Icon className="mx-auto h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-[#9ca3af]">{hint}</p>
    </div>
  );
}

function RegisterToolbar({ search, onSearch, onAdd, addLabel, count }: { search: string; onSearch: (v: string) => void; onAdd: () => void; addLabel: string; count: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
        <input value={search} onChange={(e) => onSearch(e.target.value)} className="h-9 w-full rounded-xl border border-black/10 bg-white pl-8 pr-3 text-[12px] outline-none focus:border-[#C9A84C]/60" placeholder="Search…" />
      </div>
      <span className="text-[10.5px] text-[#9ca3af]">{count} record{count === 1 ? '' : 's'}</span>
      <div className="ml-auto">
        <CrmBtn variant="gold" onClick={onAdd}><Plus className="h-3.5 w-3.5" /> {addLabel}</CrmBtn>
      </div>
    </div>
  );
}

/** Modal form shell — open/close animation + shared layout. */
function FormModal({ title, open, onClose, onSave, saving, children }: { title: string; open: boolean; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <CrmCard className="mb-5 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]"><Pencil className="h-3 w-3" /> {title}</p>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1 text-[#9ca3af] hover:bg-black/[0.04]"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
        <div className="mt-4 flex gap-2">
          <CrmBtn onClick={onSave} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{saving ? 'Saving…' : 'Save'}</CrmBtn>
          <CrmBtn variant="ghost" onClick={onClose}>Cancel</CrmBtn>
        </div>
      </CrmCard>
    </motion.div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={onEdit} className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#96782A] transition-colors hover:bg-[#C9A84C]/[0.1]">Edit</button>
      <button type="button" onClick={onDelete} className="inline-flex cursor-pointer items-center rounded-lg px-2 py-1 text-[11px] font-bold text-red-500 transition-colors hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
    </div>
  );
}

/* ═══════════════ PAYMENTS ═══════════════ */

const PAYMENT_TYPES = ['GST', 'TDS', 'Advance tax', 'Professional Tax', 'PF', 'ESI', 'Fee', 'Other'];
const PAYMENT_STATUSES = ['upcoming', 'due', 'paid', 'overdue', 'reconciled'];
const PAYMENT_STATUS_STYLE: Record<string, string> = {
  upcoming: 'bg-amber-50 text-amber-700',
  due: 'bg-orange-50 text-orange-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-red-700',
  reconciled: 'bg-blue-50 text-blue-700',
};

export function PaymentsRegister({ payments, items, fy, loading, onChanged }: {
  payments: LedgerPayment[];
  items: { id?: string; form: string; title: string }[];
  fy: string;
  loading: boolean;
  onChanged: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LedgerPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<LedgerPayment>>({});

  const itemLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) if (it.id) m.set(it.id, `${it.form} · ${it.title}`);
    return m;
  }, [items]);

  const rows = useMemo(() => payments.filter((p) => {
    if (!search) return true;
    return `${p.title ?? ''} ${p.payment_type ?? ''} ${p.period ?? ''} ${p.authority ?? ''}`.toLowerCase().includes(search.toLowerCase());
  }), [payments, search]);

  const openNew = () => { setEditing(null); setForm({ status: 'upcoming', fy }); setShowForm(true); };
  const openEdit = (p: LedgerPayment) => { setEditing(p); setForm(p); setShowForm(true); };

  const save = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    try {
      await upsertLedgerRow('payments', editing ? { ...form, id: editing.id } : form);
      setShowForm(false);
      onChanged();
    } catch (e) { alert(e instanceof Error ? e.message : 'Save failed'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this payment record?')) return;
    try { await deleteLedgerRow('payments', id); onChanged(); } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  };

  return (
    <div>
      <RegisterToolbar search={search} onSearch={setSearch} onAdd={openNew} addLabel="New payment" count={rows.length} />
      <AnimatePresence>
        {showForm && (
          <FormModal title={editing ? 'Edit payment' : 'New payment'} open={showForm} onClose={() => setShowForm(false)} onSave={() => void save()} saving={saving}>
            <Field label="Title *" span={2}><input value={form.title ?? ''} onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} className={CRM_INPUT} placeholder="e.g. GST payment — September 2026" /></Field>
            <Field label="Type">
              <select value={form.payment_type ?? ''} onChange={(e) => setForm((x) => ({ ...x, payment_type: e.target.value }))} className={CRM_INPUT}>
                <option value="">Select…</option>
                {PAYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Authority"><input value={form.authority ?? ''} onChange={(e) => setForm((x) => ({ ...x, authority: e.target.value }))} className={CRM_INPUT} placeholder="GST / IT / KPT…" /></Field>
            <Field label="Period"><input value={form.period ?? ''} onChange={(e) => setForm((x) => ({ ...x, period: e.target.value }))} className={CRM_INPUT} placeholder="Sep 2026 / Q2 FY26-27" /></Field>
            <Field label="FY"><input value={form.fy ?? ''} onChange={(e) => setForm((x) => ({ ...x, fy: e.target.value }))} className={CRM_INPUT} placeholder="FY 2026-27" /></Field>
            <Field label="Amount (₹)"><input inputMode="decimal" value={form.amount ?? ''} onChange={(e) => setForm((x) => ({ ...x, amount: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 }))} className={CRM_INPUT} placeholder="e.g. 14500" /></Field>
            <Field label="Due date"><input type="date" value={form.due_date ?? ''} onChange={(e) => setForm((x) => ({ ...x, due_date: e.target.value || null }))} className={CRM_INPUT} /></Field>
            <Field label="Paid on"><input type="date" value={form.paid_date ?? ''} onChange={(e) => setForm((x) => ({ ...x, paid_date: e.target.value || null }))} className={CRM_INPUT} /></Field>
            <Field label="Status">
              <select value={form.status ?? 'upcoming'} onChange={(e) => setForm((x) => ({ ...x, status: e.target.value }))} className={CRM_INPUT}>
                {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Payment ref / CIN"><input value={form.payment_ref ?? ''} onChange={(e) => setForm((x) => ({ ...x, payment_ref: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Challan link" span={2}><input value={form.challan_url ?? ''} onChange={(e) => setForm((x) => ({ ...x, challan_url: e.target.value }))} className={CRM_INPUT} placeholder="Challan / receipt URL" /></Field>
            <Field label="Linked compliance">
              <select value={form.compliance_item_id ?? ''} onChange={(e) => setForm((x) => ({ ...x, compliance_item_id: e.target.value || null }))} className={CRM_INPUT}>
                <option value="">— none —</option>
                {items.filter((i) => i.id).map((i) => <option key={i.id} value={i.id}>{i.form} · {i.title}</option>)}
              </select>
            </Field>
            <Field label="Notes" span={2}><input value={form.notes ?? ''} onChange={(e) => setForm((x) => ({ ...x, notes: e.target.value }))} className={CRM_INPUT} /></Field>
          </FormModal>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Scale} title={payments.length === 0 ? 'No payments tracked yet' : 'Nothing in this view'} hint="Add GST / TDS / advance-tax dues here — amounts, due dates and challan proofs stay attached to the register." />
      ) : (
        <CrmCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#fafafa]">
                  {['Payment', 'Period', 'Amount', 'Due date', 'Status', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#6b7280] sm:px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {rows.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-[#C9A84C]/[0.04]">
                    <td className="max-w-[240px] px-3 py-3 sm:px-4">
                      <p className="truncate text-[12.5px] font-bold">{p.title}</p>
                      <p className="truncate text-[10.5px] text-[#9ca3af]">
                        {[p.payment_type, p.authority, p.compliance_item_id ? itemLabel.get(p.compliance_item_id) : ''].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[11.5px] font-semibold text-[#374151] sm:px-4">{p.period || '—'}</td>
                    <td className="px-3 py-3 text-[12px] font-extrabold tabular-nums sm:px-4">{fmtINR(p.amount ?? 0)}</td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11.5px] font-bold">{fmtDate(p.due_date)}</span>
                        {(p.status === 'upcoming' || p.status === 'due' || p.status === 'overdue') && <DueBadge date={p.due_date} />}
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold capitalize ${PAYMENT_STATUS_STYLE[p.status ?? 'upcoming'] ?? PAYMENT_STATUS_STYLE.upcoming}`}>
                        {p.status === 'paid' && <CheckCircle2 className="mr-1 inline h-2.5 w-2.5" />}{p.status}
                      </span>
                      {p.paid_date && p.status !== 'paid' && p.status !== 'reconciled' ? <p className="mt-0.5 text-[9.5px] text-[#9ca3af]">paid {fmtDate(p.paid_date)}</p> : null}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-end gap-1">
                        {p.challan_url && (
                          <a href={p.challan_url} target="_blank" rel="noopener noreferrer" className="inline-flex cursor-pointer items-center rounded-lg px-2 py-1 text-[11px] font-bold text-[#96782A] hover:bg-[#C9A84C]/[0.1]"><ExternalLink className="h-3 w-3" /></a>
                        )}
                        <RowActions onEdit={() => openEdit(p)} onDelete={() => p.id && void remove(p.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CrmCard>
      )}
    </div>
  );
}

/* ═══════════════ NOTICES ═══════════════ */

const NOTICE_TYPES = ['GST', 'Income Tax', 'ROC / MCA', 'Labour', 'RERA', 'Other'];
const NOTICE_STATUSES = ['open', 'drafting', 'response_filed', 'resolved', 'closed'];
const NOTICE_STATUS_STYLE: Record<string, string> = {
  open: 'bg-red-50 text-red-700',
  drafting: 'bg-amber-50 text-amber-700',
  response_filed: 'bg-blue-50 text-blue-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-gray-100 text-gray-500',
};

export function NoticesRegister({ notices, loading, onChanged }: { notices: LedgerNotice[]; loading: boolean; onChanged: () => void }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LedgerNotice | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<LedgerNotice>>({});

  const rows = useMemo(() => {
    const list = notices.filter((n) => {
      if (!search) return true;
      return `${n.subject ?? ''} ${n.notice_no ?? ''} ${n.authority ?? ''} ${n.notice_type ?? ''}`.toLowerCase().includes(search.toLowerCase());
    });
    // Open matters with the nearest response deadline first; closed last.
    return [...list].sort((a, b) => {
      const aClosed = a.status === 'closed' || a.status === 'resolved';
      const bClosed = b.status === 'closed' || b.status === 'resolved';
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      return (a.response_deadline ?? '9999').localeCompare(b.response_deadline ?? '9999');
    });
  }, [notices, search]);

  const openNew = () => { setEditing(null); setForm({ status: 'open' }); setShowForm(true); };
  const openEdit = (n: LedgerNotice) => { setEditing(n); setForm(n); setShowForm(true); };

  const save = async () => {
    if (!form.subject?.trim()) return;
    setSaving(true);
    try {
      await upsertLedgerRow('notices', editing ? { ...form, id: editing.id } : form);
      setShowForm(false);
      onChanged();
    } catch (e) { alert(e instanceof Error ? e.message : 'Save failed'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this notice record?')) return;
    try { await deleteLedgerRow('notices', id); onChanged(); } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  };

  return (
    <div>
      <RegisterToolbar search={search} onSearch={setSearch} onAdd={openNew} addLabel="Record notice" count={rows.length} />
      <AnimatePresence>
        {showForm && (
          <FormModal title={editing ? 'Edit notice' : 'Record notice'} open={showForm} onClose={() => setShowForm(false)} onSave={() => void save()} saving={saving}>
            <Field label="Subject *" span={2}><input value={form.subject ?? ''} onChange={(e) => setForm((x) => ({ ...x, subject: e.target.value }))} className={CRM_INPUT} placeholder="e.g. GST notice — ITC mismatch FY 25-26" /></Field>
            <Field label="Notice type">
              <select value={form.notice_type ?? ''} onChange={(e) => setForm((x) => ({ ...x, notice_type: e.target.value }))} className={CRM_INPUT}>
                <option value="">Select…</option>
                {NOTICE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Authority"><input value={form.authority ?? ''} onChange={(e) => setForm((x) => ({ ...x, authority: e.target.value }))} className={CRM_INPUT} placeholder="GST Dept / IT / ROC…" /></Field>
            <Field label="Notice / DIN no."><input value={form.notice_no ?? ''} onChange={(e) => setForm((x) => ({ ...x, notice_no: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Status">
              <select value={form.status ?? 'open'} onChange={(e) => setForm((x) => ({ ...x, status: e.target.value }))} className={CRM_INPUT}>
                {NOTICE_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Notice date"><input type="date" value={form.notice_date ?? ''} onChange={(e) => setForm((x) => ({ ...x, notice_date: e.target.value || null }))} className={CRM_INPUT} /></Field>
            <Field label="Received on"><input type="date" value={form.received_date ?? ''} onChange={(e) => setForm((x) => ({ ...x, received_date: e.target.value || null }))} className={CRM_INPUT} /></Field>
            <Field label="Response deadline"><input type="date" value={form.response_deadline ?? ''} onChange={(e) => setForm((x) => ({ ...x, response_deadline: e.target.value || null }))} className={CRM_INPUT} /></Field>
            <Field label="Amount involved (₹)"><input inputMode="decimal" value={form.amount_involved ?? ''} onChange={(e) => setForm((x) => ({ ...x, amount_involved: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 }))} className={CRM_INPUT} /></Field>
            <Field label="Responsible"><input value={form.responsible ?? ''} onChange={(e) => setForm((x) => ({ ...x, responsible: e.target.value }))} className={CRM_INPUT} placeholder="Who owns the reply?" /></Field>
            <Field label="Advisor"><input value={form.advisor ?? ''} onChange={(e) => setForm((x) => ({ ...x, advisor: e.target.value }))} className={CRM_INPUT} placeholder="CA / CS / lawyer" /></Field>
            <Field label="Documents link" span={2}><input value={form.documents_url ?? ''} onChange={(e) => setForm((x) => ({ ...x, documents_url: e.target.value }))} className={CRM_INPUT} placeholder="Drive / vault URL" /></Field>
            <Field label="Response summary" span={2}><textarea rows={2} value={form.response_summary ?? ''} onChange={(e) => setForm((x) => ({ ...x, response_summary: e.target.value }))} className={`${CRM_INPUT} min-h-[64px]`} placeholder="What was filed / decided…" /></Field>
            <Field label="Notes" span={2}><input value={form.notes ?? ''} onChange={(e) => setForm((x) => ({ ...x, notes: e.target.value }))} className={CRM_INPUT} /></Field>
          </FormModal>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Gavel} title={notices.length === 0 ? 'No government notices recorded' : 'Nothing in this view'} hint="Record GST / IT / ROC / labour notices here — response deadlines surface on the priority queue automatically." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((n) => (
            <CrmCard key={n.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold">{n.subject}</p>
                  <p className="mt-0.5 text-[11px] text-[#6b7280]">{[n.notice_type, n.authority, n.notice_no].filter(Boolean).join(' · ') || '—'}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${NOTICE_STATUS_STYLE[n.status ?? 'open'] ?? NOTICE_STATUS_STYLE.open}`}>{(n.status ?? 'open').replace('_', ' ')}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[#fafafa] px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Response due</p>
                  <p className="mt-0.5 text-[11.5px] font-bold">{fmtDate(n.response_deadline)}</p>
                  {n.response_deadline && n.status !== 'closed' && n.status !== 'resolved' && <div className="mt-1"><DueBadge date={n.response_deadline} /></div>}
                </div>
                <div className="rounded-xl bg-[#fafafa] px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Received</p>
                  <p className="mt-0.5 text-[11.5px] font-bold">{fmtDate(n.received_date ?? n.notice_date)}</p>
                </div>
                <div className="rounded-xl bg-[#fafafa] px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Amount</p>
                  <p className="mt-0.5 text-[11.5px] font-bold">{(n.amount_involved ?? 0) > 0 ? fmtINR(n.amount_involved ?? 0) : '—'}</p>
                </div>
              </div>
              {n.response_summary && <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-[#6b7280]">{n.response_summary}</p>}
              <div className="mt-3 flex items-center gap-2 border-t border-black/[0.05] pt-3">
                <p className="min-w-0 flex-1 truncate text-[11px] text-[#6b7280]">
                  {n.responsible && <span className="font-bold text-[#0A1628]">{n.responsible}</span>}{n.advisor ? ` · adv. ${n.advisor}` : ''}
                </p>
                {n.documents_url && (
                  <a href={n.documents_url} target="_blank" rel="noopener noreferrer" className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#96782A] hover:bg-[#C9A84C]/[0.1]"><Download className="h-3 w-3" /> Docs</a>
                )}
                <RowActions onEdit={() => openEdit(n)} onDelete={() => n.id && void remove(n.id)} />
              </div>
            </CrmCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ DIRECTORS ═══════════════ */

const DESIGNATIONS = ['Director', 'Managing Director', 'Whole-time Director', 'Additional Director', 'Nominee Director', 'Alternate Director'];
const KYC_STATUSES = ['pending', 'done', 'na'];
const KYC_STATE_META: Record<KycState, { label: string; cls: string }> = {
  done: { label: 'KYC done', cls: 'bg-emerald-50 text-emerald-700' },
  na: { label: 'KYC n/a', cls: 'bg-gray-100 text-gray-500' },
  overdue: { label: 'KYC overdue', cls: 'bg-red-50 text-red-600' },
  due: { label: 'KYC due', cls: 'bg-amber-50 text-amber-700' },
  upcoming: { label: 'KYC upcoming', cls: 'bg-gray-100 text-gray-600' },
};
const DSC_STATUSES = ['active', 'expired', 'na'];
const VERIF_STYLE: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  unverified: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  needs_review: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  conflicting: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  expired: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',
};
const VERIF_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  unverified: 'Unverified',
  needs_review: 'Needs verification',
  conflicting: 'Conflict',
  expired: 'Expired',
};
const VerifBadge = ({ status }: { status?: string }) => (
  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${VERIF_STYLE[status ?? 'unverified'] ?? VERIF_STYLE.unverified}`}>
    {VERIF_LABEL[status ?? 'unverified'] ?? status}
  </span>
);

type DerivedDirector = LedgerDirector & { autoDue: string; override: boolean; state: KycState };

export function DirectorsRegister({ directors, fy, incorporatedOn, items, loading, onChanged }: { directors: LedgerDirector[]; fy: string; incorporatedOn?: string | null; items?: { form: string; status?: string | null; filed_date?: string | null }[]; loading: boolean; onChanged: () => void }) {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<DerivedDirector | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LedgerDirector | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<LedgerDirector>>({});

  // Every active director derives its DIR-3 KYC due from the statutory rule
  // (30 September of FY start + 1) — same source as the compliance calendar.
  // A stored kyc_due_date that differs is treated as an intentional override
  // (e.g. an MCA deadline extension), not as drift.
  const rows = useMemo(() => {
    const derived = deriveKyc({ fy });
    const withDue = directors.map((d) => {
      const state = kycState(d.kyc_status, d.kyc_due_date);
      const override = d.kyc_status === 'pending' && !!d.kyc_due_date && d.kyc_due_date !== derived.dueDate;
      const autoDue = override ? d.kyc_due_date! : derived.dueDate;
      return { ...d, autoDue, override, state };
    });
    if (!search) return withDue;
    return withDue.filter((d) => `${d.name ?? ''} ${d.din ?? ''} ${d.designation ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  }, [directors, search, fy]);

  const openNew = () => { setEditing(null); setForm({ kyc_status: 'pending', dsc_status: 'na', kyc_due_date: deriveKyc({ fy }).dueDate }); setShowForm(true); };
  const openEdit = ({ autoDue, override, state, ...rest }: DerivedDirector) => {
    setEditing(rest);
    setForm({ ...rest, kyc_due_date: rest.kyc_status === 'pending' ? autoDue : rest.kyc_due_date ?? null });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      await upsertLedgerRow('directors', editing ? { ...form, id: editing.id } : form);
      setShowForm(false);
      onChanged();
    } catch (e) { alert(e instanceof Error ? e.message : 'Save failed'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this director record?')) return;
    try { await deleteLedgerRow('directors', id); onChanged(); } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const KycBadge = ({ d }: { d: DerivedDirector }) => {
    const meta = KYC_STATE_META[d.state];
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.cls}`}>
        {d.state === 'done' && <BadgeCheck className="h-2.5 w-2.5" />}
        {meta.label}{(d.state === 'overdue' || d.state === 'due' || d.state === 'upcoming') && d.autoDue ? ` · ${fmtDate(d.autoDue)}` : ''}
        {d.override && <span title="Stored date differs from the statutory 30 September rule — kept as an MCA extension override">· override</span>}
      </span>
    );
  };

  const dscBadge = (d: DerivedDirector) => {
    if (d.dsc_status === 'na') return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-gray-500">DSC n/a</span>;
    const state = d.dsc_expiry_date ? dscState(d.dsc_expiry_date) : d.dsc_status === 'expired' ? 'expired' : 'active';
    const meta = DSC_STATUS_META[state];
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.cls}`}>{meta.label}{state !== 'active' && d.dsc_expiry_date ? ` · ${fmtDate(d.dsc_expiry_date)}` : ''}</span>;
  };

  const markKycFiled = async (d: DerivedDirector) => {
    try { await upsertLedgerRow('directors', { id: d.id, kyc_status: 'done' }); setDetail(null); onChanged(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Could not update KYC status'); }
  };

  return (
    <div>
      <RegisterToolbar search={search} onSearch={setSearch} onAdd={openNew} addLabel="New director" count={rows.length} />
      <AnimatePresence>
        {showForm && (
          <FormModal title={editing ? 'Edit director' : 'New director'} open={showForm} onClose={() => setShowForm(false)} onSave={() => void save()} saving={saving}>
            <Field label="Full name *" span={2}><input value={form.name ?? ''} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="DIN"><input value={form.din ?? ''} onChange={(e) => setForm((x) => ({ ...x, din: e.target.value.toUpperCase() }))} className={CRM_INPUT} maxLength={8} placeholder="8-digit DIN" /></Field>
            <Field label="Designation">
              <select value={form.designation ?? ''} onChange={(e) => setForm((x) => ({ ...x, designation: e.target.value }))} className={CRM_INPUT}>
                <option value="">Select…</option>
                {DESIGNATIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Appointed on"><input type="date" value={form.appointment_date ?? ''} onChange={(e) => setForm((x) => ({ ...x, appointment_date: e.target.value || null }))} className={CRM_INPUT} /></Field>
            <Field label="Resigned on"><input type="date" value={form.resignation_date ?? ''} onChange={(e) => setForm((x) => ({ ...x, resignation_date: e.target.value || null }))} className={CRM_INPUT} /></Field>
            <Field label="KYC status">
              <select value={form.kyc_status ?? 'pending'} onChange={(e) => setForm((x) => ({ ...x, kyc_status: e.target.value }))} className={CRM_INPUT}>
                {KYC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="KYC due — auto from FY (editable for MCA extensions)"><input type="date" value={form.kyc_due_date ?? ''} onChange={(e) => setForm((x) => ({ ...x, kyc_due_date: e.target.value || null }))} className={CRM_INPUT} /></Field>
            <Field label="DSC status">
              <select value={form.dsc_status ?? 'na'} onChange={(e) => setForm((x) => ({ ...x, dsc_status: e.target.value }))} className={CRM_INPUT}>
                {DSC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Email"><input value={form.email ?? ''} onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Phone"><input value={form.phone ?? ''} onChange={(e) => setForm((x) => ({ ...x, phone: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Notes" span={2}><input value={form.notes ?? ''} onChange={(e) => setForm((x) => ({ ...x, notes: e.target.value }))} className={CRM_INPUT} /></Field>
          </FormModal>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Landmark} title={directors.length === 0 ? 'No directors recorded' : 'Nothing in this view'} hint={`DIN, appointment, DSC and DIR-3 KYC per director — KYC due dates auto-derive from the ${DIR3_DUE_LABEL} rule (editable for MCA extensions).`} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => {
            const exited = !!d.resignation_date;
            return (
              <CrmCard key={d.id} className={`cursor-pointer p-4 transition-shadow hover:shadow-[0_4px_16px_rgba(10,22,40,0.10)] sm:p-5 ${exited ? 'opacity-60' : ''}`} onClick={() => setDetail(d)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold">{d.name}</p>
                    <p className="mt-0.5 text-[11px] text-[#6b7280]">{[d.designation, d.din ? `DIN ${d.din}` : ''].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  {exited && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-gray-500">resigned</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5"><KycBadge d={d} />{dscBadge(d)}</div>
                {(d.state === 'overdue' || d.state === 'due' || d.state === 'upcoming') && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-[#6b7280]">
                    <CalendarClock className="h-3 w-3 text-[#C9A84C]" />
                    DIR-3 KYC window closes {fmtDate(d.autoDue)}{d.override ? ' · MCA extension' : ''}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#fafafa] px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Appointed</p>
                    <p className="mt-0.5 text-[11.5px] font-bold">{fmtDate(d.appointment_date)}</p>
                  </div>
                  <div className="rounded-xl bg-[#fafafa] px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Contact</p>
                    <p className="mt-0.5 truncate text-[11.5px] font-bold">{d.email || d.phone || '—'}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end border-t border-black/[0.05] pt-3">
                  <div className="flex w-full items-center justify-between">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setDetail(d); }} className="cursor-pointer text-[11px] font-bold text-[#96782A] hover:underline">Full dossier →</button>
                    <RowActions onEdit={() => openEdit(d)} onDelete={() => d.id && void remove(d.id)} />
                  </div>
                </div>
              </CrmCard>
            );
          })}
        </div>
      )}

      <DirectorDetail detail={detail} fy={fy} incorporatedOn={incorporatedOn} filedForms={items} onClose={() => setDetail(null)} onMarkFiled={markKycFiled} />
    </div>
  );
}

/**
 * Director dossier — everything the company holds on one director plus every
 * derived due date: DIR-3 KYC (from the FY rule), DSC renewal (from the stored
 * expiry), and the first-cycle ROC anchors (from the incorporation date).
 * Derived dates are recomputed on render, never stored — the register's edit
 * form stays the only write path besides “Mark KYC filed”.
 */
export function DirectorDetail({ detail, fy, incorporatedOn, filedForms, onClose, onMarkFiled }: {
  detail: DerivedDirector | null;
  fy: string;
  incorporatedOn?: string | null;
  filedForms?: { form: string; status?: string | null; filed_date?: string | null }[];
  onClose: () => void;
  onMarkFiled: (d: DerivedDirector) => void;
}) {
  if (!detail) return null;
  const exited = !!detail.resignation_date;
  const duties = directorDuties({ incorporatedOn, dscExpiry: detail.dsc_expiry_date, fy }).map((du) => {
    // The compliance calendar is the record of fact — when a generated item
    // for the same form is filed, show that instead of counting overdue days
    // against the statutory anchor (e.g. INC-20A filed 30 Apr 2026).
    const match = filedForms?.find((i) => normForm(i.form) === normForm(du.form) && i.status === 'filed');
    return match ? { ...du, filedOn: match.filed_date ?? undefined } : du;
  });
  const dsc = detail.dsc_expiry_date ? dscState(detail.dsc_expiry_date) : null;
  const facts: [string, string][] = [
    ['DIN', detail.din || 'Not available — never invented from records'],
    ['Designation', detail.designation || '—'],
    ['Category', detail.category ?? '—'],
    ['Appointed', fmtDate(detail.appointment_date)],
    ['Resigned', exited ? fmtDate(detail.resignation_date) : '—'],
    ['Date of birth', detail.date_of_birth ? fmtDate(detail.date_of_birth) : '—'],
    ['Father\u2019s name', detail.father_name || '—'],
    ['Nationality', detail.nationality || '—'],
    ['Occupation', detail.occupation || '—'],
    ['Email', detail.email || '—'],
    ['Phone', detail.phone || '—'],
    ['Source', detail.source || '—'],
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-[#0A1628]/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#0A1628] px-5 pb-5 pt-6 text-white sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">Director dossier</p>
              <h3 className="mt-1 font-['Instrument_Serif',Georgia,serif] text-[26px] leading-tight sm:text-[30px]">{detail.name}</h3>
              <p className="mt-1 text-[12px] text-white/60">
                {[detail.designation, detail.din ? `DIN ${detail.din}` : null, detail.category, exited ? `resigned ${fmtDate(detail.resignation_date)}` : 'active'].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"><X className="h-4.5 w-4.5" /></button>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${KYC_STATE_META[detail.state].cls}`}><BadgeCheck className="h-3 w-3" />{KYC_STATE_META[detail.state].label}{detail.autoDue ? ` · ${fmtDate(detail.autoDue)}` : ''}</span>
            {dsc && <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${DSC_STATUS_META[dsc].cls}`}>{DSC_STATUS_META[dsc].label}</span>}
            {detail.verification_status && <VerifBadge status={detail.verification_status} />}
          </div>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-7">
          <section>
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b7280]"><CalendarClock className="h-3.5 w-3.5 text-[#C9A84C]" /> Dues & obligations — auto-calculated</p>
            <div className="space-y-2">
              {duties.map((du) => {
                if (du.filedOn) {
                  return (
                    <div key={du.form} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold">{du.form} <span className="font-semibold text-[#6b7280]">· {du.label}</span></p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#6b7280]">{du.note}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[12px] font-extrabold text-emerald-700">Filed</p>
                          <p className="text-[10px] font-extrabold text-emerald-700">{fmtDate(du.filedOn)}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                const left = daysUntil(du.dueDate);
                const past = left < 0;
                return (
                  <div key={du.form} className={`rounded-2xl border p-3.5 ${past ? 'border-red-200 bg-red-50/40' : 'border-black/[0.06] bg-[#fafafa]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-bold">{du.form} <span className="font-semibold text-[#6b7280]">· {du.label}</span></p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6b7280]">{du.note}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[12px] font-extrabold">{fmtDate(du.dueDate)}</p>
                        <p className={`text-[10px] font-extrabold ${past ? 'text-red-600' : left <= 30 ? 'text-orange-600' : 'text-emerald-700'}`}>{past ? `${Math.abs(left)}d overdue` : `${left}d left`}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {detail.kyc_status === 'pending' && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.07] px-4 py-3">
                <p className="text-[11.5px] leading-snug text-[#6b7280]">DIR-3 KYC filed on the MCA portal? Mark it done — the reminder job stops tracking this director until next FY.</p>
                <CrmBtn onClick={() => onMarkFiled(detail)} className="shrink-0">Mark KYC filed</CrmBtn>
              </div>
            )}
          </section>

          <section>
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b7280]"><User className="h-3.5 w-3.5 text-[#C9A84C]" /> Record</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-black/[0.06] pb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">{k}</span>
                  <span className="truncate text-right text-[11.5px] font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {detail.notes && (
            <section>
              <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b7280]"><ShieldCheck className="h-3.5 w-3.5 text-[#C9A84C]" /> Verification notes</p>
              <p className="rounded-2xl bg-[#fafafa] px-4 py-3 text-[11.5px] leading-relaxed text-[#6b7280]">{detail.notes}</p>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.05] pt-4">
            <CrmBtn variant="ghost" onClick={onClose}>Close</CrmBtn>
            <p className="text-[10.5px] text-[#9ca3af]">Dues derive from FY {fy} · DSC renewal opens {DSC_RENEW_LEAD_DAYS} days before expiry · confirm every date with your CA/CS before filing.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════ DOCUMENTS (private vault) ═══════════════ */

const DOC_TYPES = ['Return', 'Challan', 'Acknowledgement', 'Notice', 'Certificate', 'Contract', 'Other'];
const ENTITY_TYPES_DOC: { value: string; label: string }[] = [
  { value: 'item', label: 'Compliance' },
  { value: 'case', label: 'Legal case' },
  { value: 'notice', label: 'Notice' },
  { value: 'payment', label: 'Payment' },
  { value: 'director', label: 'Director' },
  { value: 'company', label: 'Company' },
];

export interface DocLink { type: string; id: string; label: string }

export function DocumentsRegister({ documents, fy, links, loading, onChanged }: {
  documents: LedgerDocument[];
  fy: string;
  links: DocLink[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LedgerDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Partial<LedgerDocument>>({});
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  const entityLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of links) m.set(`${l.type}:${l.id}`, l.label);
    return m;
  }, [links]);

  // Version chain: rows sharing a root (their own id or parent_id) — newest first.
  const versionCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const doc of documents) {
      const root = doc.parent_id ?? doc.id;
      if (root) m.set(root, Math.max(m.get(root) ?? 0, doc.version_no ?? 1));
    }
    return m;
  }, [documents]);

  const rows = useMemo(() => documents.filter((doc) => {
    if (!search) return true;
    return `${doc.name ?? ''} ${doc.doc_type ?? ''} ${doc.period ?? ''}`.toLowerCase().includes(search.toLowerCase());
  }), [documents, search]);

  const openNew = () => {
    setEditing(null); setFile(null); setFormError('');
    setForm({ fy, version_no: 1 });
    setShowForm(true);
  };
  const openEdit = (doc: LedgerDocument) => {
    setEditing(doc); setFile(null); setFormError('');
    setForm(doc);
    setShowForm(true);
  };
  // New version: keeps the same root, bumps version — old versions stay.
  const openNewVersion = (doc: LedgerDocument) => {
    const root = doc.parent_id ?? doc.id;
    setEditing(null); setFile(null); setFormError('');
    setForm({
      name: doc.name, doc_type: doc.doc_type, fy: doc.fy, period: doc.period,
      entity_type: doc.entity_type, entity_id: doc.entity_id,
      parent_id: root ?? null,
      version_no: (root ? versionCount.get(root) ?? 1 : 1) + 1,
    });
    setShowForm(true);
  };

  const save = async () => {
    setFormError('');
    if (!form.name?.trim()) { setFormError('Give the document a name.'); return; }
    if (!file && !form.url?.trim() && !(editing?.storage_path)) { setFormError('Attach a file or paste a link.'); return; }
    setSaving(true);
    try {
      let storagePath = form.storage_path;
      if (file) {
        setUploading(true);
        storagePath = await uploadLedgerDocument(file); // private bucket, service-role write
        setUploading(false);
      }
      await upsertLedgerRow('documents', {
        ...form,
        storage_path: storagePath ?? '',
        url: storagePath ? '' : (form.url ?? ''),
        id: editing?.id,
      });
      setShowForm(false);
      onChanged();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    }
    setSaving(false);
    setUploading(false);
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this document record? Uploaded versions of other documents are not affected.')) return;
    try { await deleteLedgerRow('documents', id); onChanged(); } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const openDoc = async (doc: LedgerDocument) => {
    try {
      if (doc.storage_path) {
        const { url } = await ledgerDocumentUrl(doc.storage_path); // 60-min signed URL
        window.open(url, '_blank', 'noopener');
      } else if (doc.url) {
        window.open(doc.url, '_blank', 'noopener');
      }
    } catch (e) { alert(e instanceof Error ? e.message : 'Could not open the document'); }
  };

  const hasLink = (doc: LedgerDocument) => !!doc.storage_path || !!doc.url;

  return (
    <div>
      <RegisterToolbar search={search} onSearch={setSearch} onAdd={openNew} addLabel="Add document" count={rows.length} />
      <AnimatePresence>
        {showForm && (
          <FormModal title={editing ? 'Edit document' : form.parent_id ? `New version — v${form.version_no}` : 'Add document'} open={showForm} onClose={() => setShowForm(false)} onSave={() => void save()} saving={saving}>
            <Field label="Document name *" span={2}><input value={form.name ?? ''} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} className={CRM_INPUT} placeholder="e.g. GSTR-3B Sep 2026 acknowledgement" /></Field>
            <Field label="Type">
              <select value={form.doc_type ?? ''} onChange={(e) => setForm((x) => ({ ...x, doc_type: e.target.value }))} className={CRM_INPUT}>
                <option value="">Select…</option>
                {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="FY"><input value={form.fy ?? ''} onChange={(e) => setForm((x) => ({ ...x, fy: e.target.value }))} className={CRM_INPUT} placeholder="FY 2026-27" /></Field>
            <Field label="Period"><input value={form.period ?? ''} onChange={(e) => setForm((x) => ({ ...x, period: e.target.value }))} className={CRM_INPUT} placeholder="Sep 2026" /></Field>
            <Field label="Expires on"><input type="date" value={form.expiry_date ?? ''} onChange={(e) => setForm((x) => ({ ...x, expiry_date: e.target.value || null }))} className={CRM_INPUT} /></Field>
            <Field label="Link to">
              <select value={form.entity_type ?? ''} onChange={(e) => setForm((x) => ({ ...x, entity_type: e.target.value, entity_id: null }))} className={CRM_INPUT}>
                <option value="">— nothing —</option>
                {ENTITY_TYPES_DOC.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            {form.entity_type && form.entity_type !== 'company' && (
              <Field label="Record">
                <select value={form.entity_id ?? ''} onChange={(e) => setForm((x) => ({ ...x, entity_id: e.target.value || null }))} className={CRM_INPUT}>
                  <option value="">Select…</option>
                  {links.filter((l) => l.type === form.entity_type).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </Field>
            )}
            {form.entity_type === 'company' && (
              <Field label="Record"><input disabled value="The company itself" className={`${CRM_INPUT} opacity-60`} /></Field>
            )}
            {!editing?.storage_path && (
              <Field label="File (PDF / image / Excel / Word / CSV · ≤ 3 MB)" span={2}>
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-black/15 bg-[#fafafa] px-3 text-[12px] font-semibold text-[#6b7280] hover:border-[#C9A84C]/60">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span className="truncate">{file ? file.name : 'Choose a file — stored in a private vault'}</span>
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.doc,.docx,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </Field>
            )}
            {!file && !(editing?.storage_path) && (
              <Field label="…or paste a link" span={2}><input value={form.url ?? ''} onChange={(e) => setForm((x) => ({ ...x, url: e.target.value }))} className={CRM_INPUT} placeholder="Drive / portal URL" /></Field>
            )}
            <Field label="Notes" span={2}><input value={form.notes ?? ''} onChange={(e) => setForm((x) => ({ ...x, notes: e.target.value }))} className={CRM_INPUT} /></Field>
            {formError && <p role="alert" className="col-span-full rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] font-semibold text-red-700">{formError}</p>}
          </FormModal>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title={documents.length === 0 ? 'The vault is empty' : 'Nothing in this view'} hint="Filed returns, challans, acknowledgements, notices — upload files to a private vault or paste links, and link each document to its compliance record."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((doc) => {
            const versions = doc.parent_id ?? doc.id;
            const vCount = versions ? versionCount.get(versions) ?? 1 : 1;
            const expired = doc.expiry_date ? (daysUntil(doc.expiry_date) ?? 0) < 0 : false;
            return (
              <CrmCard key={doc.id} className="flex items-center gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A1628]/[0.06] text-[#0A1628]"><FileText className="h-4 w-4" strokeWidth={1.8} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold">{doc.name}</p>
                  <p className="truncate text-[10.5px] text-[#9ca3af]">
                    {[doc.doc_type, doc.period, doc.entity_type ? `${ENTITY_TYPES_DOC.find((t) => t.value === doc.entity_type)?.label ?? doc.entity_type}${doc.entity_id && doc.entity_type !== 'company' ? `: ${entityLabel.get(`${doc.entity_type}:${doc.entity_id}`) ?? ''}` : ''}` : ''].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {vCount > 1 && <span className="rounded-full bg-[#0A1628]/[0.06] px-2 py-0.5 text-[9.5px] font-extrabold text-[#0A1628]">v{doc.version_no} of {vCount}</span>}
                    {doc.expiry_date && <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${expired ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{expired ? 'expired' : `exp. ${fmtDate(doc.expiry_date)}`}</span>}
                    {doc.storage_path && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-extrabold text-emerald-700">vault</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {hasLink(doc) && (
                    <button type="button" onClick={() => void openDoc(doc)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#96782A] transition-colors hover:bg-[#C9A84C]/[0.1]"><Download className="h-3 w-3" /> Open</button>
                  )}
                  <button type="button" onClick={() => openNewVersion(doc)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#96782A] transition-colors hover:bg-[#C9A84C]/[0.1]"><CalendarClock className="h-3 w-3" /> New version</button>
                  <RowActions onEdit={() => openEdit(doc)} onDelete={() => doc.id && void remove(doc.id)} />
                </div>
              </CrmCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
