import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Warning, ShieldWarning, FileText } from '@phosphor-icons/react';
import type { PgData } from '@/pages/admin/AdminPgManagement';
import {
  depositFlag,
  depositMonths,
  agreementRoute,
  renewalDue,
  updateTenant,
  addTenant,
  money,
  type PgTenant,
  type PgTenantStage,
  type PgProperty,
} from '@/lib/pgManagement';

const STAGES: PgTenantStage[] = [
  'Lead',
  'Viewing',
  'Application',
  'KYC',
  'Verification',
  'Agreement',
  'Deposit Paid',
  'Active',
  'Notice',
  'Checked Out',
];

const STAGE_COLORS: Record<string, string> = {
  Lead: 'bg-gray-100 text-gray-600 border-gray-200',
  Viewing: 'bg-sky-50 text-sky-700 border-sky-200',
  Application: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  KYC: 'bg-violet-50 text-violet-700 border-violet-200',
  Verification: 'bg-purple-50 text-purple-700 border-purple-200',
  Agreement: 'bg-blue-50 text-blue-700 border-blue-200',
  'Deposit Paid': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Notice: 'bg-amber-50 text-amber-700 border-amber-200',
  'Checked Out': 'bg-gray-100 text-gray-400 border-gray-200',
};

export default function PgTenantsTab({ data }: { data: PgData }) {
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PgTenant | null>(null);

  const filtered = useMemo(
    () =>
      data.tenants.filter((t) => {
        if (propertyFilter !== 'all' && t.propertyId !== propertyFilter) return false;
        if (stageFilter !== 'all' && t.stage !== stageFilter) return false;
        if (search && !`${t.name} ${t.phone} ${t.employer}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [data.tenants, propertyFilter, stageFilter, search],
  );

  const pipelineCounts = useMemo(() => {
    const counts: Partial<Record<PgTenantStage, number>> = {};
    for (const t of data.tenants) counts[t.stage] = (counts[t.stage] ?? 0) + 1;
    return counts;
  }, [data.tenants]);

  return (
    <div className="space-y-5">
      {/* Lifecycle pipeline */}
      <div className="admin-card p-5 sm:p-6">
        <h3 className="admin-section-title">Tenant lifecycle pipeline</h3>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
              className={`flex min-w-[104px] flex-col items-center rounded-xl border px-3 py-2.5 transition-all ${
                stageFilter === stage ? 'border-[#C9A84C] bg-[#FBF7EC] ring-1 ring-[#C9A84C]' : STAGE_COLORS[stage]
              }`}
            >
              <span className="text-lg font-semibold tabular-nums">{pipelineCounts[stage] ?? 0}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide">{stage}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
          Flow: Lead → Viewing → Application + digital KYC → background &amp; police verification → agreement
          (auto-routes to notarisation ≤11 months / Sub-Registrar &gt;11 months) → deposit + first rent → move-in
          inventory sign-off → Active → renewal reminder 2 months before expiry → notice → checkout with
          move-in/move-out inventory comparison → deposit settlement → bed returns to marketing.
        </p>
      </div>

      {/* Filters */}
      <div className="admin-card flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            placeholder="Search name, phone or employer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input-ghost flex-1"
          />
          <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="admin-select sm:max-w-[220px]">
            <option value="all">All properties</option>
            {data.properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tenant list */}
      {data.loading ? (
        <div className="admin-card h-40 animate-pulse bg-gray-100/70" />
      ) : filtered.length === 0 ? (
        <div className="admin-card p-8 text-center text-sm text-gray-500">No tenants match the current filters.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((t) => {
            const property = data.properties.find((p) => p.id === t.propertyId);
            const flag = depositFlag(t);
            return (
              <motion.button
                key={t.id}
                type="button"
                layout
                onClick={() => setSelected(t)}
                whileHover={{ y: -2 }}
                className="admin-card p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0A1628]">{t.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-gray-500">
                      {property?.locality ?? '—'} · Bed {t.bedId ?? '—'} · {t.employer}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${STAGE_COLORS[t.stage]}`}>
                    {t.stage}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-[#FBF9F3] py-1.5">
                    <p className="text-xs font-semibold tabular-nums text-[#0A1628]">₹{money(t.rent)}</p>
                    <p className="text-[9px] uppercase text-gray-400">Rent</p>
                  </div>
                  <div className="rounded-lg bg-[#FBF9F3] py-1.5">
                    <p className="text-xs font-semibold tabular-nums text-[#0A1628]">{depositMonths(t)}mo</p>
                    <p className="text-[9px] uppercase text-gray-400">Deposit</p>
                  </div>
                  <div className="rounded-lg bg-[#FBF9F3] py-1.5">
                    <p className={`text-xs font-semibold ${t.kycStatus === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {t.kycStatus === 'verified' ? '✓' : '⏳'} KYC
                    </p>
                    <p className="text-[9px] uppercase text-gray-400">{t.policeVerification === 'cleared' ? 'Police ✓' : 'Police ⏳'}</p>
                  </div>
                </div>
                {flag && (
                  <p className="mt-2.5 flex items-start gap-1.5 text-[11px] font-medium text-red-600">
                    <Warning size={13} weight="fill" className="mt-0.5 shrink-0" /> {flag}
                  </p>
                )}
                {t.stage === 'Active' && renewalDue(t.moveIn, t.agreementMonths) && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-sky-600">
                    <FileText size={13} className="shrink-0" /> Renewal window open — escalation % applies per agreement
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {selected && (
        <TenantDrawer
          tenant={selected}
          property={data.properties.find((p) => p.id === selected.propertyId) ?? null}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="flex justify-end">
        <button type="button" onClick={() => setSelected(null)} className="sr-only">close</button>
        <AddTenantButton properties={data.properties} />
      </div>
    </div>
  );
}

function AddTenantButton({ properties }: { properties: PgProperty[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="admin-btn-primary">
        <Users size={15} /> Add tenant to pipeline
      </button>
      {open && <AddTenantForm properties={properties} onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />}
    </>
  );
}

function AddTenantForm({
  properties,
  onClose,
  onSaved,
}: {
  properties: PgProperty[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    propertyId: properties[0]?.id ?? '',
    bedId: '',
    rent: 10000,
    deposit: 20000,
    agreementMonths: 11,
    employer: '',
    emergencyContact: '',
    permanentAddress: '',
    isCorporate: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const property = properties.find((p) => p.id === form.propertyId);
  const flag = depositFlag({ deposit: form.deposit, rent: form.rent });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !property) {
      setError('Name, phone and property are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addTenant({
        ...form,
        stage: 'Application',
        kycStatus: 'pending',
        policeVerification: 'pending',
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
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
        <h3 className="admin-heading text-xl font-semibold text-[#0A1628]">New tenant application</h3>
        <p className="mt-1 text-sm text-gray-500">Enters the pipeline at Application — KYC and police verification pending.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name"><input className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="admin-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98450 00000" /></Field>
          <Field label="Property">
            <select className="admin-select" value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Bed label (after allocation)"><input className="admin-input" value={form.bedId} onChange={(e) => setForm({ ...form, bedId: e.target.value })} placeholder="e.g. 201A" /></Field>
          <Field label="Monthly rent ₹"><input type="number" className="admin-input" value={form.rent} onChange={(e) => setForm({ ...form, rent: Number(e.target.value) })} /></Field>
          <Field label="Security deposit ₹">
            <input type="number" className="admin-input" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })} />
          </Field>
          <Field label="Employer / college"><input className="admin-input" value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} /></Field>
          <Field label="Agreement months">
            <select className="admin-select" value={form.agreementMonths} onChange={(e) => setForm({ ...form, agreementMonths: Number(e.target.value) })}>
              {[11, 12, 24, 36].map((m) => <option key={m} value={m}>{m} months</option>)}
            </select>
          </Field>
          <Field label="Emergency contact"><input className="admin-input" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} /></Field>
          <Field label="Permanent address"><input className="admin-input" value={form.permanentAddress} onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })} /></Field>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input type="checkbox" checked={form.isCorporate} onChange={(e) => setForm({ ...form, isCorporate: e.target.checked })} className="h-5 w-5 accent-[#C9A84C]" />
            <span className="text-sm text-gray-700">Corporate tenant <span className="text-gray-400">(TDS tracking + quarterly Form 16A)</span></span>
          </label>
        </div>

        <p className="mt-4 rounded-xl bg-[#FBF9F3] px-4 py-3 text-[11px] leading-relaxed text-gray-600">
          Agreement route: <span className="font-semibold text-[#0A1628]">{agreementRoute(form.agreementMonths)}</span>. Placement is handled by the appointed PG operator under VJR Estate supervision.
          {flag && <span className="mt-1 block font-medium text-red-600">⚠ {flag}</span>}
        </p>

        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="admin-btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="admin-btn-primary flex-1">{saving ? 'Saving…' : 'Add to pipeline'}</button>
        </div>
      </form>
    </div>
  );
}

function TenantDrawer({ tenant, property, onClose }: { tenant: PgTenant; property: PgProperty | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const flag = depositFlag(tenant);

  const advance = async () => {
    const idx = STAGES.indexOf(tenant.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    setSaving(true);
    try {
      await updateTenant(tenant.id, { stage: STAGES[idx + 1] });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const verify = async (patch: Partial<PgTenant>) => {
    setSaving(true);
    try {
      await updateTenant(tenant.id, patch);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="admin-heading text-xl font-semibold text-[#0A1628]">{tenant.name}</h3>
            <p className="mt-0.5 text-sm text-gray-500">{tenant.phone} · {property?.name ?? '—'}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${STAGE_COLORS[tenant.stage]}`}>{tenant.stage}</span>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <Row label="Bed">{tenant.bedId ?? 'Not allocated'}</Row>
          <Row label="Rent / deposit">₹{money(tenant.rent)} / {depositMonths(tenant)} months (₹{money(tenant.deposit)})</Row>
          <Row label="Employer / college">{tenant.employer}</Row>
          <Row label="Emergency contact">{tenant.emergencyContact}</Row>
          <Row label="Permanent address">{tenant.permanentAddress}</Row>
          <Row label="Agreement">{tenant.agreementMonths} months — {agreementRoute(tenant.agreementMonths)}</Row>
          <Row label="Move-in">{tenant.moveIn ?? '—'}</Row>
          {tenant.isCorporate && <Row label="TDS">Corporate tenant — collect/issue Form 16A quarterly</Row>}

          {flag && (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
              <ShieldWarning size={15} weight="fill" className="mt-0.5 shrink-0" /> {flag}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={saving || tenant.kycStatus === 'verified'}
              onClick={() => verify({ kycStatus: 'verified' })}
              className="admin-btn-secondary !text-[10px] disabled:opacity-50"
            >
              {tenant.kycStatus === 'verified' ? 'KYC ✓ verified' : 'Mark KYC verified'}
            </button>
            <button
              type="button"
              disabled={saving || tenant.policeVerification === 'cleared'}
              onClick={() => verify({ policeVerification: 'cleared' })}
              className="admin-btn-secondary !text-[10px] disabled:opacity-50"
            >
              {tenant.policeVerification === 'cleared' ? 'Police ✓ cleared' : 'Mark police cleared'}
            </button>
          </div>

          {tenant.stage !== 'Checked Out' && (
            <button type="button" onClick={advance} disabled={saving} className="admin-btn-primary w-full">
              Advance to {STAGES[STAGES.indexOf(tenant.stage) + 1] ?? '—'}
            </button>
          )}

          <p className="text-[11px] leading-relaxed text-gray-400">
            Every stage transition is audited. Move-out triggers the inventory comparison against move-in photos
            before deposit settlement with itemised deductions.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-50 pb-3 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">{label}</span>
      <span className="text-sm text-gray-700 sm:text-right">{children}</span>
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
