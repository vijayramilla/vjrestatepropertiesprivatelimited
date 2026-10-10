import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  BadgeCheck, Ban, CheckCircle2, ChevronRight, Clock, History, Loader2,
  RefreshCw, Search, ShieldCheck, UserPlus, X,
} from 'lucide-react';
import { leadSupabase } from '@/services/leadSupabase';
import { auth } from '@/lib/firebase';
import { isSuperAdminEmail } from '@/lib/crmAdminConfig';
import {
  CRM_MODULE_REGISTRY, CRM_ACTION_LABELS, CRM_PERMISSION_PRESETS,
  type CrmActionKey,
} from '@/lib/crmAccessRegistry';

/* ─────────────────────────── shared bits ─────────────────────────────── */

type ModulesPayload = Record<string, { actions: CrmActionKey[]; recordScope: string }>;

interface EmpRow {
  id: number;
  employee_id: number;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  status?: string;
  access_enabled?: boolean;
  photo_url?: string | null;
  last_login?: string | null;
}

type GrantStatus = 'active' | 'suspended' | 'revoked';

interface GrantRow {
  employee_id: number;
  email: string;
  status: GrantStatus;
  modules: ModulesPayload;
  record_scope: string;
  granted_by: string;
  expires_at?: string | null;
  updated_at?: string;
}

const STATUS_BADGE: Record<GrantStatus | 'none', string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-50 text-amber-700 border-amber-200',
  revoked: 'bg-red-50 text-red-700 border-red-200',
  none: 'bg-slate-50 text-slate-500 border-slate-200',
};
const STATUS_TEXT: Record<GrantStatus | 'none', string> = {
  active: 'Access Granted',
  suspended: 'Suspended',
  revoked: 'Revoked',
  none: 'No CRM Access',
};

function fmtDate(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─────────────────────── access management panel ─────────────────────── */

type Tab = 'directory' | 'history';

export default function CrmAccessManager() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);
  const isSuperAdmin = !!user && isSuperAdminEmail(user.email);

  const [tab, setTab] = useState<Tab>('directory');
  const [employees, setEmployees] = useState<EmpRow[] | null>(null);
  const [grants, setGrants] = useState<GrantRow[] | null>(null);
  const [audit, setAudit] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | GrantStatus | 'none'>('all');
  const [grantFor, setGrantFor] = useState<EmpRow | null>(null);
  const [manageFor, setManageFor] = useState<{ emp: EmpRow; grant: GrantRow } | null>(null);

  async function load(keepFilters = true) {
    setLoading(true);
    setErr('');
    try {
      const [em, gr, au] = await Promise.all([
        leadSupabase.access.employees(),
        leadSupabase.access.grants(),
        leadSupabase.access.audit(),
      ]);
      setEmployees(em.data ?? []);
      setGrants(gr.data ?? []);
      setAudit(au.data ?? []);
      if (!keepFilters) { setSearch(''); setStatusFilter('all'); }
    } catch (e: any) {
      setErr(e?.message || 'Failed to load access data');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (isSuperAdmin) void load(); }, [isSuperAdmin]);

  const grantByEmail = useMemo(() => {
    const m = new Map<string, GrantRow>();
    (grants ?? []).forEach((g) => m.set(g.email.toLowerCase(), g));
    return m;
  }, [grants]);

  const empGrant = (e: EmpRow): GrantRow | null => grantByEmail.get(e.email.toLowerCase()) ?? null;
  // Expired grants show as "Expired" even before server flags them; the
  // server always re-checks, this is presentation only.
  const effStatus = (g: GrantRow | null): GrantStatus | 'none' => {
    if (!g) return 'none';
    if (g.status === 'active' && g.expires_at && new Date(g.expires_at).getTime() < Date.now()) return 'revoked';
    return g.status;
  };
  const moduleCount = (g: GrantRow | null) => (g ? Object.keys(g.modules ?? {}).filter((k) => (g.modules?.[k]?.actions?.length ?? 0) > 0).length : 0);

  const filtered = useMemo(() => {
    let rows = employees ?? [];
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((e) => e.name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || String(e.employee_id).includes(q));
    if (statusFilter !== 'all') rows = rows.filter((e) => effStatus(empGrant(e)) === statusFilter);
    return rows;
  }, [employees, search, statusFilter, grants]);

  /* ── Directory table ─────────────────────────────────────────────── */
  if (!isSuperAdmin) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-semibold text-foreground">CRM Access Management</p>
        <p className="mt-1 text-xs text-muted-foreground">Only the Super Admin can view and manage employee CRM access.</p>
      </div>
    );
  }

  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">CRM Access Management</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Grant employees access to specific CRM modules and actions.</p>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Refresh access data"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
        </button>
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-[#fafafa] px-4">
        {(['directory', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2.5 text-xs font-semibold capitalize transition-colors ${
              tab === t ? 'text-[#0a1628]' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'directory' ? 'Employee Directory' : 'Access History'}
            {tab === t && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#C9A84C]" />}
          </button>
        ))}
      </div>

      {err && <p className="mx-5 mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>}
      {!err && loading && !employees && (
        <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading access data…
        </div>
      )}

      {tab === 'directory' && employees && (
        <div className="p-5">
          {/* filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email or ID…"
                className="h-9 w-64 rounded-md border border-input bg-white pl-8 pr-3 text-xs outline-none focus:border-[#C9A84C]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-9 rounded-md border border-input bg-white px-2 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="active">Access Granted (Active)</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked / Expired</option>
              <option value="none">No CRM Access</option>
            </select>
          </div>

          {/* rows */}
          <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border">
            {filtered.length === 0 && (
              <p className="p-6 text-center text-xs text-muted-foreground">No employees match the current filters.</p>
            )}
            {filtered.map((e) => {
              const g = empGrant(e);
              const st = effStatus(g);
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-[#fafafa]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3852] to-[#0A1628] text-[11px] font-bold text-[#D6B85D]">
                    {(e.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">{e.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {e.email}{e.designation ? ` · ${e.designation}` : ''}{e.status ? ` · ${e.status}` : ''}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGE[st]}`}>{STATUS_TEXT[st]}</span>
                  <span className="w-20 text-center text-[11px] text-muted-foreground">{moduleCount(g)} modules</span>
                  <div className="flex items-center gap-1.5">
                    {g && st !== 'none' && (
                      <button
                        onClick={() => setManageFor({ emp: e, grant: g })}
                        className="rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-accent"
                      >
                        Manage
                      </button>
                    )}
                    {(!g || st === 'revoked' || st === 'none') && (
                      <button
                        onClick={() => setGrantFor(e)}
                        className="inline-flex items-center gap-1 rounded-md bg-[#0A1628] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1E3852]"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Grant Access
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <AuditHistory audit={audit ?? []} loading={loading} />
      )}

      {/* ── Grant Access 5-step dialog ── */}
      {grantFor && (
        <GrantDialog
          emp={grantFor}
          existing={empGrant(grantFor)}
          onClose={() => setGrantFor(null)}
          onSaved={() => { setGrantFor(null); void load(); }}
        />
      )}

      {/* ── Manage Access dialog ── */}
      {manageFor && (
        <ManageDialog
          emp={manageFor.emp}
          grant={manageFor.grant}
          onClose={() => setManageFor(null)}
          onChanged={() => { setManageFor(null); void load(); }}
        />
      )}
    </section>
  );
}

/* ─────────────────────────── Grant dialog ────────────────────────────── */

function GrantDialog({ emp, existing, onClose, onSaved }: {
  emp: EmpRow;
  existing: GrantRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const steps = ['Employee', 'Modules', 'Permissions', 'Record Scope', 'Review'];
  const [step, setStep] = useState(0);
  // modules → selected actions
  const [sel, setSel] = useState<Record<string, CrmActionKey[]>>(
    () => {
      const src = (existing?.modules ?? {}) as Record<string, { actions?: CrmActionKey[] }>;
      const out: Record<string, CrmActionKey[]> = {};
      for (const [k, v] of Object.entries(src)) out[k] = [...(v?.actions ?? [])];
      return out;
    },
  );
  const [scope, setScope] = useState<'all' | 'assigned'>((existing?.record_scope as 'all' | 'assigned') ?? 'all');
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');
  const [modSearch, setModSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const modules = useMemo(() => {
    const q = modSearch.trim().toLowerCase();
    return CRM_MODULE_REGISTRY.filter(
      (m) => m.enabled !== false && (!q || m.label.toLowerCase().includes(q) || m.key.includes(q)),
    );
  }, [modSearch]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof modules> = {};
    for (const m of modules) (g[m.group] ??= []).push(m);
    return g;
  }, [modules]);

  const selectedModules = Object.entries(sel).filter(([, v]) => v.length > 0);

  function toggleModule(key: string) {
    setSel((cur) => {
      const next = { ...cur };
      if (next[key]?.length) delete next[key];
      else next[key] = ['view'];
      return next;
    });
  }
  function toggleAction(key: string, a: CrmActionKey) {
    setSel((cur) => {
      const curActs = cur[key] ?? [];
      const next = a === 'view' && curActs.includes('view')
        ? [] // clearing view clears the module
        : curActs.includes(a) ? curActs.filter((x) => x !== a) : [...curActs, a];
      const out = { ...cur };
      if (a !== 'view' && !next.includes('view') && next.length > 0) next.unshift('view');
      if (next.length === 0) delete out[key]; else out[key] = next;
      return out;
    });
  }
  function applyPreset(key: string, presetIdx: number) {
    setSel((cur) => {
      const acts = CRM_PERMISSION_PRESETS[presetIdx].actions;
      const out = { ...cur };
      if (acts.length === 0) delete out[key]; else out[key] = [...acts];
      return out;
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        employeeId: emp.employee_id,
        email: emp.email,
        modules: sel,
        recordScope: scope,
        reason: reason || undefined,
      };
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
      await leadSupabase.access.saveGrant(payload as never);
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to save grant');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-foreground">Grant CRM Access</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {emp.name} · {emp.email} · ID #{emp.employee_id} {emp.designation ? `· ${emp.designation}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* step indicator */}
        <div className="flex items-center gap-1 border-b border-border bg-[#fafafa] px-5 py-2.5">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                i < step ? 'bg-emerald-100 text-emerald-700' : i === step ? 'bg-[#0A1628] text-white' : 'bg-slate-100 text-slate-400'
              }`}>{i < step ? '✓' : i + 1}</span>
              <span className={`text-[10.5px] font-semibold ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
            </div>
          ))}
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === 0 && (
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3852] to-[#0A1628] text-xs font-bold text-[#D6B85D]">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.email}</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${
                  emp.status === 'Active' ? STATUS_BADGE.active : STATUS_BADGE.suspended
                }`}>{emp.status ?? 'Unknown'}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Employment status: <b>{emp.status}</b> · Login access: <b>{emp.access_enabled ? 'Enabled' : 'Disabled'}</b>
                {!emp.access_enabled && ' — enable login access in Employees first; grants only apply to active logins.'}
              </p>
              {existing && (
                <p className="mt-1.5 rounded bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                  This employee already has a grant — saving replaces it (audit-logged).
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <input
                value={modSearch}
                onChange={(e) => setModSearch(e.target.value)}
                placeholder="Search modules…"
                className="mb-3 h-9 w-full rounded-md border border-input bg-white px-3 text-xs outline-none focus:border-[#C9A84C]"
              />
              {Object.entries(grouped).map(([group, mods]) => (
                <div key={group} className="mb-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{group}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {mods.map((m) => {
                      const on = (sel[m.key]?.length ?? 0) > 0;
                      return (
                        <button
                          key={m.key}
                          onClick={() => toggleModule(m.key)}
                          className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                            on ? 'border-[#C9A84C] bg-[#C9A84C]/[0.07]' : 'border-border hover:bg-accent/50'
                          }`}
                        >
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            on ? 'border-[#C9A84C] bg-[#C9A84C] text-white' : 'border-slate-300'
                          }`}>{on && <CheckCircle2 className="h-3 w-3" />}</span>
                          <span className="min-w-0">
                            <span className="block text-[12px] font-semibold text-foreground">{m.label}</span>
                            <span className="block truncate text-[10.5px] text-muted-foreground">{m.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {selectedModules.length === 0 && <p className="text-xs text-muted-foreground">Select at least one module in step 2.</p>}
              {selectedModules.map(([key]) => {
                const m = CRM_MODULE_REGISTRY.find((x) => x.key === key)!;
                const acts = sel[key] ?? [];
                return (
                  <div key={key} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12.5px] font-bold text-foreground">{m.label}</p>
                      <div className="flex flex-wrap gap-1">
                        {CRM_PERMISSION_PRESETS.map((p, i) => (
                          <button
                            key={p.label}
                            onClick={() => applyPreset(key, i)}
                            className="rounded border border-border px-1.5 py-0.5 text-[9.5px] font-semibold text-muted-foreground hover:border-[#C9A84C] hover:text-foreground"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.actions.map((a) => {
                        const on = acts.includes(a);
                        const sensitive = (m.sensitive ?? []).includes(a);
                        return (
                          <button
                            key={a}
                            onClick={() => toggleAction(key, a)}
                            className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                              on
                                ? sensitive ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-[#0A1628] bg-[#0A1628] text-white'
                                : 'border-border text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            {CRM_ACTION_LABELS[a]}
                            {sensitive && ' ⚠'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Record scope</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {(['all', 'assigned'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setScope(s)}
                      className={`rounded-lg border p-2.5 text-left text-[12px] ${scope === s ? 'border-[#C9A84C] bg-[#C9A84C]/[0.07]' : 'border-border'}`}
                    >
                      <span className="block font-semibold text-foreground">{s === 'all' ? 'All records' : 'Assigned records only'}</span>
                      <span className="block text-[10.5px] text-muted-foreground">
                        {s === 'all' ? 'See every record in the permitted modules' : 'Only records assigned to this employee'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Expiration (optional)</p>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-9 rounded-md border border-input bg-white px-3 text-xs"
                />
                <p className="mt-1 text-[10.5px] text-muted-foreground">The server denies access automatically after this date.</p>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Reason (logged to audit)</p>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 300))}
                  placeholder="e.g. Sales team onboarding"
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-xs"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="rounded-lg border border-border">
                <div className="border-b border-border bg-[#fafafa] px-3 py-2">
                  <p className="text-[12px] font-bold text-foreground">{emp.name} · #{emp.employee_id}</p>
                  <p className="text-[10.5px] text-muted-foreground">{emp.email}</p>
                </div>
                {selectedModules.map(([key, acts]) => {
                  const m = CRM_MODULE_REGISTRY.find((x) => x.key === key)!;
                  return (
                    <div key={key} className="border-b border-border/70 px-3 py-2 last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-semibold text-foreground">{m.label}</p>
                        <div className="flex flex-wrap gap-1">
                          {acts.map((a) => (
                            <span key={a} className={`rounded border px-1.5 py-0.5 text-[9.5px] font-bold ${
                              (m.sensitive ?? []).includes(a) ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border text-muted-foreground'
                            }`}>
                              {CRM_ACTION_LABELS[a]}{a === 'view' && acts.length === 1 ? '' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fafafa] px-3 py-2 text-[11px] text-muted-foreground">
                  <span>Record scope: <b className="text-foreground">{scope === 'all' ? 'All records' : 'Assigned only'}</b></span>
                  {expiresAt && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Expires {fmtDate(expiresAt)}</span>}
                </div>
              </div>
              {error && <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
          <button
            onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
            className="rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 ? !emp || emp.status === 'Terminated' : step === 1 && selectedModules.length === 0}
              className="rounded-md bg-[#0A1628] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => void save()}
              disabled={saving || selectedModules.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0A1628] px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? 'Saving…' : existing ? 'Update Access' : 'Confirm Grant'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Manage dialog ───────────────────────────── */

function ManageDialog({ emp, grant, onClose, onChanged }: {
  emp: EmpRow;
  grant: GrantRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<'' | 'revoke'>('');
  const granted = grant.granted_by ? `by ${grant.granted_by}` : '';
  const updated = fmtDate(grant.updated_at);

  async function doAction(kind: 'suspend' | 'restore', ) {
    setBusy(kind);
    setError('');
    try {
      await leadSupabase.access.setStatus(grant.employee_id, kind === 'suspend' ? 'suspended' : 'active', `${kind} via manage dialog`);
      onChanged();
    } catch (e: any) {
      setError(e?.message || 'Action failed');
    } finally {
      setBusy('');
    }
  }
  async function doRevoke() {
    setBusy('revoke');
    setError('');
    try {
      await leadSupabase.access.revoke(grant.employee_id, 'revoked via manage dialog');
      onChanged();
    } catch (e: any) {
      setError(e?.message || 'Revoke failed');
    } finally {
      setBusy('');
      setConfirming('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-foreground">Manage Access — {emp.name}</h3>
            <p className="text-xs text-muted-foreground">Granted {granted} · Last updated {updated} · Status: <b>{grant.status}</b></p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* effective permissions */}
        <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Effective permissions</p>
        <div className="divide-y divide-border/70 rounded-lg border border-border">
          {Object.entries(grant.modules ?? {}).filter(([, v]) => (v?.actions?.length ?? 0) > 0).map(([key, v]) => {
            const m = CRM_MODULE_REGISTRY.find((x) => x.key === key);
            return (
              <div key={key} className="flex items-center justify-between px-3 py-2">
                <p className="text-[12px] font-semibold text-foreground">{m?.label ?? key}</p>
                <div className="flex flex-wrap gap-1">
                  {(v as { actions: string[] }).actions.map((a) => (
                    <span key={a} className="rounded border border-border px-1.5 py-0.5 text-[9.5px] font-semibold text-muted-foreground">{CRM_ACTION_LABELS[a as CrmActionKey] ?? a}</span>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="px-3 py-2 text-[11px] text-muted-foreground">
            Record scope: <b className="text-foreground">{grant.record_scope === 'assigned' ? 'Assigned only' : 'All records'}</b>
            {grant.expires_at && <> · Expires <b className="text-foreground">{fmtDate(grant.expires_at)}</b></>}
          </div>
        </div>

        {/* lifecycle actions */}
        <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Lifecycle</p>
        <div className="flex flex-wrap gap-2">
          {grant.status !== 'active' && (
            <button onClick={() => void doAction('restore')} disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-[11.5px] font-bold text-white disabled:opacity-50">
              {busy === 'restore' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Restore Access
            </button>
          )}
          {grant.status === 'active' && (
            <button onClick={() => void doAction('suspend')} disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11.5px] font-bold text-amber-800 disabled:opacity-50">
              {busy === 'suspend' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />} Suspend
            </button>
          )}
          {grant.status !== 'revoked' && confirming !== 'revoke' && (
            <button onClick={() => setConfirming('revoke')} disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] font-bold text-red-700">
              <Ban className="h-3.5 w-3.5" /> Revoke…
            </button>
          )}
          {confirming === 'revoke' && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-2 py-1">
              <span className="text-[11px] text-red-800">Revoke all access for {emp.name}?</span>
              <button onClick={() => void doRevoke()} disabled={!!busy} className="rounded bg-red-600 px-2 py-1 text-[10.5px] font-bold text-white">
                {busy === 'revoke' ? '…' : 'Yes, revoke'}
              </button>
              <button onClick={() => setConfirming('')} className="text-[10.5px] font-semibold text-red-700">Cancel</button>
            </span>
          )}
        </div>

        {/* re-grant shortcut */}
        <button
          onClick={() => { /* parent reopens grant dialog via onEditRequested */ }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[11.5px] font-semibold text-foreground hover:bg-accent"
          disabled
        >
          <BadgeCheck className="h-3.5 w-3.5" /> Edit permissions (use Grant Access when none/revoked)
        </button>

        {error && <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────── Audit history ───────────────────────────── */

function AuditHistory({ audit, loading }: { audit: any[]; loading: boolean }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return audit;
    return audit.filter((a) =>
      String(a.target_email ?? '').toLowerCase().includes(s) ||
      String(a.action ?? '').toLowerCase().includes(s) ||
      String(a.actor_email ?? '').toLowerCase().includes(s));
  }, [audit, q]);

  return (
    <div className="p-5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by employee, action or admin…"
        className="mb-3 h-9 w-64 rounded-md border border-input bg-white px-3 text-xs outline-none focus:border-[#C9A84C]"
      />
      {loading && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…</p>}
      {!loading && filtered.length === 0 && <p className="text-xs text-muted-foreground">No access changes recorded yet.</p>}
      <div className="overflow-hidden rounded-lg border border-border">
        {filtered.map((a, i) => (
          <div key={a.id ?? i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-border/70 px-3.5 py-2.5 last:border-0">
            <span className="rounded border border-border bg-[#fafafa] px-1.5 py-0.5 text-[9.5px] font-bold text-foreground">{a.action}</span>
            <span className="text-[11.5px] font-semibold text-foreground">{a.target_email}</span>
            <span className="text-[10.5px] text-muted-foreground">by {a.actor_email}{a.reason ? ` · ${a.reason}` : ''}</span>
            <span className="ml-auto text-[10.5px] text-muted-foreground">{fmtDate(a.created_at)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <History className="h-3 w-3" /> Immutable audit — writes flow only through the backend; ordinary users cannot modify history.
      </p>
    </div>
  );
}
