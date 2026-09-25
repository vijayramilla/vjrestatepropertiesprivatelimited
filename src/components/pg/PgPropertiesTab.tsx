import { useEffect, useMemo, useState } from 'react';
import {
  Bed,
  Plus,
  Users,
  Coin,
  GearSix,
  Lock,
  Buildings,
} from '@phosphor-icons/react';
import { AdminBadge } from '@/components/admin/AdminUi';
import type { PgData } from '@/pages/admin/AdminPgManagement';
import {
  subscribeRooms,
  addProperty,
  updateProperty,
  occupancyPct,
  feeGst,
  PG_OPERATOR_NAME,
  complianceHealthScore,
  money,
  DEFAULT_FEE_CONFIG,
  type PgProperty,
  type PgRoom,
  type PgFeeConfig,
  type FeeModel,
} from '@/lib/pgManagement';

const MODELS: { value: FeeModel; label: string; hint: string }[] = [
  { value: 'flat', label: 'Flat monthly fee', hint: 'Fixed ₹ per month per PG building (₹5,000–15,000 typical, tiered by beds)' },
  { value: 'percentage', label: '% of rent collected', hint: 'Typically 8–12% of rent collected for Bangalore PG buildings' },
  { value: 'vacancy_protected', label: '% of rent · vacancy protected', hint: 'Pay-for-performance: no fee for months beds sit vacant' },
];

export default function PgPropertiesTab({
  data,
  selectedPropertyId,
  onSelectProperty,
}: {
  data: PgData;
  selectedPropertyId: string | null;
  onSelectProperty: (id: string | null) => void;
}) {
  const [rooms, setRooms] = useState<PgRoom[]>([]);
  const [editing, setEditing] = useState(false);

  const isNew = selectedPropertyId === 'new';
  const selectedProperty = useMemo(
    () => data.properties.find((p) => p.id === selectedPropertyId) ?? null,
    [data.properties, selectedPropertyId],
  );

  const propertyId = selectedProperty?.id ?? null;
  useEffect(() => {
    if (!propertyId) {
      setRooms([]);
      return;
    }
    return subscribeRooms(propertyId, setRooms);
  }, [propertyId]);

  // Auto-select the first property when nothing is selected (and we are not
  // in create mode — 'new' must never be overridden).
  useEffect(() => {
    if (!selectedPropertyId && data.properties.length > 0) onSelectProperty(data.properties[0].id);
  }, [selectedPropertyId, data.properties, onSelectProperty]);

  const occupancyWarning = useMemo(() => {
    if (!selectedProperty || !rooms.length) return null;
    const tight = rooms.flatMap((r) => r.beds).filter((b) => (b.areaSqFtPerPerson ?? 0) > 0 && b.areaSqFtPerPerson! < 70);
    return tight.length ? `${tight.length} bed(s) below the 70 sq ft/person Karnataka minimum` : null;
  }, [selectedProperty, rooms]);

  if (data.loading) return <div className="admin-card h-40 animate-pulse bg-gray-100/70" />;

  if (isNew) {
    return (
      <PgPropertyForm
        onCancel={() => onSelectProperty(data.properties[0]?.id ?? null)}
        onSaved={(id) => onSelectProperty(id)}
      />
    );
  }

  if (editing && selectedProperty) {
    return (
      <PgPropertyForm
        existing={selectedProperty}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  if (data.properties.length === 0 || !selectedProperty) {
    return (
      <div className="admin-card flex flex-col items-center px-6 py-14 text-center">
        <p className="admin-heading text-xl font-semibold text-[#0A1628]">No property selected</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
          Add your first managed building to start tracking beds, compliance and payouts.
        </p>
        <button type="button" onClick={() => onSelectProperty('new')} className="admin-btn-primary mt-6">
          <Plus size={15} /> Add Property
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
      {/* Property list */}
      <div className="space-y-2.5">
        {data.properties.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectProperty(p.id)}
            className={`admin-card w-full p-4 text-left transition-all ${
              selectedProperty?.id === p.id ? 'ring-2 ring-[#C9A84C]' : 'hover:border-[#C9A84C]/50'
            }`}
          >
            <p className="truncate text-sm font-semibold text-[#0A1628]">{p.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-gray-500">{p.locality} · PG Building · {p.operatorName}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <AdminBadge variant="muted">{occupancyPct(p)}% occupied</AdminBadge>
              <AdminBadge variant={p.ownerType === 'NRI' ? 'whatsapp' : 'default'}>
                {p.ownerType === 'NRI' ? 'NRI Owner' : 'Owner'}
              </AdminBadge>
            </div>
          </button>
        ))}
        <button type="button" onClick={() => onSelectProperty('new')} className="admin-btn-secondary w-full">
          <Plus size={15} /> Add Property
        </button>
      </div>

      {/* Detail */}
      {selectedProperty && (
        <div className="space-y-5">
          <div className="admin-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="admin-heading text-xl font-semibold text-[#0A1628]">{selectedProperty.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{selectedProperty.address}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminBadge variant="success">Health {complianceHealthScore(selectedProperty)}</AdminBadge>
                  <AdminBadge variant="muted">{selectedProperty.gender}</AdminBadge>
                  <AdminBadge variant="muted">{selectedProperty.waterConnection} utilities</AdminBadge>
                  {selectedProperty.hasKitchen && <AdminBadge variant="whatsapp">Kitchen · FSSAI req.</AdminBadge>}
                </div>
              </div>
              <button type="button" onClick={() => setEditing(true)} className="admin-btn-secondary !min-h-[38px] !px-3 !text-[10px]">
                <GearSix size={14} /> Edit
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat icon={<Users size={16} />} label="Owner" value={selectedProperty.ownerName} sub={selectedProperty.ownerPhone} />
              <Stat icon={<Buildings size={16} />} label="Warden" value={selectedProperty.managerName} sub={selectedProperty.managerPhone} />
              <Stat icon={<Coin size={16} />} label="Rent collected" value={`₹${money(selectedProperty.monthlyCollected)}`} sub={`Potential ₹${money(selectedProperty.monthlyPotential)}`} />
              <Stat icon={<Bed size={16} />} label="Beds" value={`${selectedProperty.occupiedBeds}/${selectedProperty.totalBeds}`} sub={`${occupancyPct(selectedProperty)}% occupancy`} />
            </div>

            {selectedProperty.ownerType === 'NRI' && (
              <div className="mt-4 rounded-xl border border-[#C9A84C]/30 bg-[#FBF7EC] p-4 text-xs leading-relaxed text-gray-700">
                <p className="mb-1 font-semibold text-[#0A1628]">NRI owner compliance</p>
                POA document: {selectedProperty.pocNumber || '⚠ registered POA not on record — required before executing any transaction on the owner’s behalf'} · NRO routing: {selectedProperty.nroAccount || 'not set'} · TDS 30% reminder issued quarterly (Form 16A).
              </div>
            )}

            {occupancyWarning && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                ⚠ {occupancyWarning}
              </p>
            )}
          </div>

          {/* Bed map */}
          <div className="admin-card p-5 sm:p-6">
            <h3 className="admin-section-title">Room & bed occupancy map</h3>
            {rooms.length === 0 ? (
              <p className="text-sm text-gray-500">No rooms recorded for this property yet.</p>
            ) : (
              <div className="space-y-5">
                {[...rooms]
                  .sort((a, b) => a.floor - b.floor || a.roomNo.localeCompare(b.roomNo))
                  .map((room) => (
                    <div key={room.id}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Room {room.roomNo} · Floor {room.floor} · {room.sharing}-sharing · {room.areaSqFt} sq ft
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {room.beds.map((bed) => (
                          <div
                            key={bed.id}
                            className={`flex min-w-[104px] flex-col rounded-xl border px-3 py-2.5 transition-colors ${
                              bed.status === 'occupied'
                                ? 'border-emerald-200 bg-emerald-50'
                                : bed.status === 'notice'
                                  ? 'border-amber-200 bg-amber-50'
                                  : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#0A1628]">Bed {bed.label}</span>
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  bed.status === 'occupied' ? 'bg-emerald-500' : bed.status === 'notice' ? 'bg-amber-500' : 'bg-gray-300'
                                }`}
                              />
                            </div>
                            <span className="mt-1 text-[11px] font-medium tabular-nums text-gray-600">₹{money(bed.rent)}/mo</span>
                            <span className="text-[10px] uppercase tracking-wide text-gray-400">
                              {bed.status === 'occupied' ? 'Occupied' : bed.status === 'notice' ? 'On notice' : 'Vacant'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <PgFeeEditor property={selectedProperty} />
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[#FBF9F3] p-3.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
        <span className="text-[#96782A]">{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 truncate text-sm font-semibold text-[#0A1628]">{value}</p>
      {sub && <p className="truncate text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

/* ───────────────── Fee model editor ───────────────── */

function PgFeeEditor({ property }: { property: PgProperty }) {
  const [cfg, setCfg] = useState<PgFeeConfig>(property.feeConfig ?? DEFAULT_FEE_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setCfg(property.feeConfig ?? DEFAULT_FEE_CONFIG), [property.id, property.feeConfig]);

  const fee = cfg.model === 'flat' ? cfg.flatMonthlyFee : Math.round((property.monthlyCollected * cfg.percentOfRent) / 100);
  const platform = Math.round((property.monthlyCollected * cfg.platformFeePct) / 100);

  const save = async () => {
    setSaving(true);
    try {
      await updateProperty(property.id, { feeConfig: cfg });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-card p-5 sm:p-6">
      <h3 className="admin-section-title">Fee model — operator &amp; VJR Estate (per property, admin-configurable)</h3>
      <p className="-mt-3 mb-5 text-xs leading-relaxed text-gray-500">
        Day-to-day operations are run by the appointed PG management operator ({property.operatorName});
        VJR Estate earns a separate coordination fee for appointing, auditing and reporting. Both are
        configurable per building and disclosed on every owner statement.
      </p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-3.5">
          {MODELS.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all ${
                cfg.model === m.value ? 'border-[#C9A84C] bg-[#FBF7EC]' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name={`fee-model-${property.id}`}
                checked={cfg.model === m.value}
                onChange={() => setCfg({ ...cfg, model: m.value, skipFeeOnVacancy: m.value === 'vacancy_protected' ? true : cfg.skipFeeOnVacancy })}
                className="mt-1 accent-[#C9A84C]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#0A1628]">{m.label}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{m.hint}</span>
              </span>
            </label>
          ))}
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 p-3.5">
            <span className="text-sm text-gray-700">
              Skip fee on vacant months
              <span className="block text-xs text-gray-400">Applies to %-of-rent models</span>
            </span>
            <input
              type="checkbox"
              checked={cfg.skipFeeOnVacancy}
              onChange={(e) => setCfg({ ...cfg, skipFeeOnVacancy: e.target.checked })}
              className="h-5 w-5 accent-[#C9A84C]"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Operator flat fee ₹/month" value={cfg.flatMonthlyFee} onChange={(v) => setCfg({ ...cfg, flatMonthlyFee: v })} disabled={cfg.model !== 'flat'} />
          <NumberField label="Operator fee %" value={cfg.percentOfRent} onChange={(v) => setCfg({ ...cfg, percentOfRent: v })} disabled={cfg.model === 'flat'} />
          <NumberField label="VJR Estate platform fee %" value={cfg.platformFeePct} onChange={(v) => setCfg({ ...cfg, platformFeePct: v })} />
          <NumberField label="Onboarding fee ₹" value={cfg.onboardingFee} onChange={(v) => setCfg({ ...cfg, onboardingFee: v })} />
          <NumberField label="Placement fee ₹" value={cfg.tenantPlacementFee} onChange={(v) => setCfg({ ...cfg, tenantPlacementFee: v })} />
          <NumberField label="Maintenance margin %" value={cfg.maintenanceMarginPct} onChange={(v) => setCfg({ ...cfg, maintenanceMarginPct: v })} />
          <NumberField label="Operator spend cap ₹" value={cfg.spendCapWithoutOwnerApproval} onChange={(v) => setCfg({ ...cfg, spendCapWithoutOwnerApproval: v })} />
          <div className="col-span-2 rounded-xl bg-[#0A1628] p-4 text-white">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#C9A84C]">This month (preview)</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">Operator ₹{money(fee)} · VJR Estate ₹{money(platform)} + GST ₹{money(feeGst(fee + platform))}</p>
            <p className="mt-1 text-[11px] text-white/60">18% GST auto-applied on both fee invoices · margin shown as disclosed line item on owner statement</p>
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button type="button" onClick={save} disabled={saving} className="admin-btn-primary flex-1">
              <Lock size={14} weight="fill" /> {saving ? 'Saving…' : 'Save fee config'}
            </button>
            {saved && <span className="text-xs font-semibold text-emerald-600">Saved ✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="admin-input disabled:opacity-40"
      />
    </label>
  );
}

/* ───────────────── Add / edit property ───────────────── */

function PgPropertyForm({
  existing,
  onCancel,
  onSaved,
}: {
  existing?: PgProperty;
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    locality: existing?.locality ?? '',
    address: existing?.address ?? '',
    gender: existing?.gender ?? ('Co-ed' as PgProperty['gender']),
    ownerName: existing?.ownerName ?? '',
    ownerPhone: existing?.ownerPhone ?? '',
    ownerType: existing?.ownerType ?? ('Indian' as PgProperty['ownerType']),
    operatorName: existing?.operatorName ?? PG_OPERATOR_NAME,
    managerName: existing?.managerName ?? '',
    managerPhone: existing?.managerPhone ?? '',
    totalBeds: existing?.totalBeds ?? 12,
    monthlyPotential: existing?.monthlyPotential ?? 0,
    hasKitchen: existing?.hasKitchen ?? true,
    waterConnection: existing?.waterConnection ?? ('commercial' as PgProperty['waterConnection']),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.locality || !form.ownerName) {
      setError('Name, locality and owner name are required.');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateProperty(existing.id, form);
        onSaved(existing.id);
      } else {
        const id = await addProperty({
          ...form,
          occupiedBeds: 0,
          monthlyCollected: 0,
          feeConfig: DEFAULT_FEE_CONFIG,
          compliance: [],
        });
        onSaved(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="admin-card mx-auto w-full max-w-2xl p-6 sm:p-8">
      <h3 className="admin-heading text-xl font-semibold text-[#0A1628]">
        {existing ? 'Edit PG building' : 'Add PG building'}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {existing ? 'Update the building master record.' : 'Create the master record — PG buildings only. Rooms/beds, compliance and tenants attach to it.'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Building name"><input className="admin-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="VJR Estate Signature PG · Indiranagar" /></Field>
        <Field label="Locality"><input className="admin-input" value={form.locality} onChange={(e) => set('locality', e.target.value)} placeholder="Indiranagar" /></Field>
        <Field label="Address"><input className="admin-input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="12, 100 Feet Road, Bangalore 560038" /></Field>
        <Field label="Property type (fixed)"><input className="admin-input bg-gray-50" value="PG Building" disabled /></Field>
        <Field label="Gender preference"><select className="admin-select" value={form.gender} onChange={(e) => set('gender', e.target.value)}>{['Male', 'Female', 'Co-ed'].map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Owner type"><select className="admin-select" value={form.ownerType} onChange={(e) => set('ownerType', e.target.value)}>{['Indian', 'NRI'].map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Owner name"><input className="admin-input" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} /></Field>
        <Field label="Owner phone"><input className="admin-input" value={form.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} placeholder="+91 98450 00000" /></Field>
        <Field label="Appointed PG operator"><input className="admin-input" value={form.operatorName} onChange={(e) => set('operatorName', e.target.value)} placeholder="Sqyar Yards" /></Field>
        <Field label="Warden (deployed by operator)"><input className="admin-input" value={form.managerName} onChange={(e) => set('managerName', e.target.value)} /></Field>
        <Field label="Warden phone"><input className="admin-input" value={form.managerPhone} onChange={(e) => set('managerPhone', e.target.value)} /></Field>
        <Field label="Total beds / units"><input type="number" min={1} className="admin-input" value={form.totalBeds} onChange={(e) => set('totalBeds', Number(e.target.value))} /></Field>
        <Field label="Monthly potential rent ₹"><input type="number" min={0} className="admin-input" value={form.monthlyPotential} onChange={(e) => set('monthlyPotential', Number(e.target.value))} /></Field>
        <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3.5 sm:col-span-2">
          <input type="checkbox" checked={form.hasKitchen} onChange={(e) => set('hasKitchen', e.target.checked)} className="h-5 w-5 accent-[#C9A84C]" />
          <span className="text-sm text-gray-700">Runs its own kitchen <span className="text-gray-400">(FSSAI licence required within 3 months of trade licence)</span></span>
        </label>
        <Field label="Water/electricity connection"><select className="admin-select" value={form.waterConnection} onChange={(e) => set('waterConnection', e.target.value)}>{['commercial', 'residential'].map((g) => <option key={g}>{g}</option>)}</select></Field>
        <p className="text-[11px] leading-relaxed text-gray-400 sm:col-span-2">
          VJR Estate does not run PG operations itself — the appointed operator places the warden, kitchen
          and gate staff. VJR Estate supervises compliance, audits collections and issues owner statements.
        </p>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onCancel} className="admin-btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="admin-btn-primary flex-1">{saving ? 'Saving…' : existing ? 'Save changes' : 'Create property'}</button>
      </div>
    </form>
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
