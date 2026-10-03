/**
 * DIRECTOR KYC — auto due-date derivation (DIR-3 KYC web, Rule 12A).
 *
 * The statutory rule lives server-side in api/ledger-rules.mjs (case 'dir3':
 * due 30 September of FY start + 1, ₹5,000/director penalty, DIN deactivation).
 * This module mirrors that ONE date rule for the browser so every director row
 * derives its own due date from the selected FY — no manual date entry, no
 * drift between the generated compliance calendar and the directors register.
 *
 * Manual kyc_due_date stays as an escape hatch for MCA deadline extensions;
 * the register treats any stored date different from the derived one as an
 * intentional override. Reminder jobs keep reading the persisted column.
 *
 * Unit tests: npx tsx src/data/directorKyc.test.ts
 */
import { daysUntil } from './ledgerComplianceRules';

/** DIR-3 KYC window closes 30 September of the FY following the compliance year. */
export const DIR3_DUE = { month: 9, day: 30 } as const;
export const DIR3_DUE_LABEL = '30 September';

/** FY start year from a label like "FY 2025-26" (matches the engine's parser). */
export const parseFyStartYear = (fy?: string | null): number | null => {
  const m = fy?.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
};

/** Statutory DIR-3 KYC due date for an FY start year — must equal the engine's `case 'dir3'`. */
export const dir3DueDate = (fyStartYear: number): string =>
  `${fyStartYear + 1}-${String(DIR3_DUE.month).padStart(2, '0')}-${DIR3_DUE.day}`;

/** FY start year (April-start) that an ISO date falls in. */
export function fiscalYearOf(iso: string): number {
  const y = Number(iso.slice(0, 4));
  return Number(iso.slice(5, 7)) >= 4 ? y : y - 1;
}

/** FY start year containing `now` (April-start). */
export const latestFyStart = (now = new Date()): number =>
  fiscalYearOf(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);

export interface DerivedKyc {
  fyStartYear: number;
  dueDate: string; // ISO
  source: 'fy' | 'current'; // from the selected FY label vs the live calendar
}

/**
 * Derive the DIR-3 KYC due date for a context: the selected FY label when
 * present, else the current FY. The obligation is per DIN-holder per FY —
 * appointment/resignation nuance belongs to the CA; 'na' status is the
 * human override.
 */
export function deriveKyc(opts: { fy?: string | null; now?: Date }): DerivedKyc {
  const fromLabel = parseFyStartYear(opts.fy ?? null);
  if (fromLabel !== null) return { fyStartYear: fromLabel, dueDate: dir3DueDate(fromLabel), source: 'fy' };
  const y = latestFyStart(opts.now);
  return { fyStartYear: y, dueDate: dir3DueDate(y), source: 'current' };
}

/* ── DSC (Digital Signature Certificate) ──────────────────────────────────
 * Class-3 DSCs are issued for 1, 2 or 3 years; renewal is a fresh issuance
 * with fresh video verification, best started ~1 month before expiry so
 * filings never gap. The stored dsc_expiry_date is the record of fact; the
 * renewal window is derived. */
export const DSC_RENEW_LEAD_DAYS = 30;

export type DscState = 'active' | 'renew_due' | 'expiring' | 'expired';

export function dscState(expiryIso: string | null | undefined, now = new Date()): DscState {
  if (!expiryIso) return 'active';
  const d = daysUntil(expiryIso);
  if (!Number.isFinite(d)) return 'active';
  if (d < 0) return 'expired';
  if (d <= DSC_RENEW_LEAD_DAYS) return 'renew_due';
  if (d <= 90) return 'expiring';
  return 'active';
}

/* ── Statutory director dues benchmark (VJR Estate, incorporated 15 Oct 2025) ──
 * The per-FY DIR-3 KYC dates derive from the engine rule; the first-cycle
 * ROC annual-set anchors derive from the incorporation date, exactly like the
 * server engine's FIRST_YEAR_ANCHOR_RULES. Used by the director dossier so
 * every due date shown is derived, never hand-typed. */
export interface DirectorDuty {
  form: string;
  label: string;
  dueDate: string;
  note: string;
  kind: 'kyc' | 'dsc' | 'roc';
  /** Set by the caller when the compliance calendar shows this form filed. */
  filedOn?: string;
}

const addDays = (iso: string, days: number): string => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** Form-name normaliser so dossier anchors match generated calendar forms
 *  ('First Auditor + ADT-1' ≡ 'First auditor (ADT-1)' ≡ 'firstauditoradt1'). */
export const normForm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function directorDuties(opts: {
  incorporatedOn?: string | null;
  dscExpiry?: string | null;
  fy?: string | null;
  now?: Date;
}): DirectorDuty[] {
  const out: DirectorDuty[] = [];
  const fyStart = parseFyStartYear(opts.fy ?? null) ?? latestFyStart(opts.now);
  out.push({
    form: 'DIR-3 KYC',
    label: `DIR-3 KYC ${fyStart}-${String((fyStart + 1) % 100).padStart(2, '0')}`,
    dueDate: dir3DueDate(fyStart),
    note: 'Annual web KYC for every DIN holder · ₹5,000 penalty + DIN deactivation on miss',
    kind: 'kyc',
  });
  if (opts.dscExpiry) {
    out.push({
      form: 'DSC renewal',
      label: 'DSC renewal window',
      dueDate: opts.dscExpiry,
      note: `Class-3 DSC expiry · start renewal ~${DSC_RENEW_LEAD_DAYS} days before — new cert + video verification`,
      kind: 'dsc',
    });
  }
  if (opts.incorporatedOn) {
    const inc = opts.incorporatedOn;
    out.push(
      { form: 'INC-20A', label: 'Declaration of commencement', dueDate: addDays(inc, 180), note: 'Within 180 days of incorporation · business cannot start borrowing/exercising rights without it', kind: 'roc' },
      { form: 'First auditor (ADT-1)', label: 'First auditor appointment', dueDate: addDays(inc, 45), note: 'Board appoints first auditor within 30 days; ADT-1 filed within 15 more', kind: 'roc' },
      { form: 'First board meeting', label: 'First board meeting', dueDate: addDays(inc, 30), note: 'Within 30 days of incorporation', kind: 'roc' },
    );
  }
  return out.sort((a, z) => a.dueDate.localeCompare(z.dueDate));
}

/** Risk state of one director's KYC: status first, then the clock on the due date. */
export function kycState(kycStatus: string | null | undefined, dueDate: string | null | undefined, now = new Date()): KycState {
  if (kycStatus === 'done') return 'done';
  if (kycStatus === 'na') return 'na';
  if (!dueDate) return 'upcoming';
  const d = daysUntil(dueDate);
  if (!Number.isFinite(d)) return 'upcoming';
  return d < 0 ? 'overdue' : d <= 30 ? 'due' : 'upcoming';
}

export const DSC_STATUS_META: Record<DscState, { label: string; cls: string }> = {
  active: { label: 'DSC active', cls: 'bg-emerald-50 text-emerald-700' },
  expired: { label: 'DSC expired', cls: 'bg-red-50 text-red-600' },
  renew_due: { label: 'DSC renew now', cls: 'bg-orange-50 text-orange-600' },
  expiring: { label: 'DSC expiring', cls: 'bg-amber-50 text-amber-700' },
};
