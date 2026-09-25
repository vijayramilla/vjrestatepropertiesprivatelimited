/**
 * VJR Estate — PG & Building Management System (Bangalore).
 *
 * Domain layer for the admin "PG Building Management" module:
 * properties/beds, Bangalore compliance tracker, tenant lifecycle,
 * rent & owner payouts, complaints, and PG-specific ops.
 *
 * Firestore collections (pg_* prefix keeps the project namespace tidy):
 *   pg_properties   — managed buildings (PG / co-living / rental blocks)
 *   pg_rooms        — rooms + beds with per-bed pricing
 *   pg_tenants      — tenant lifecycle records with KYC + police verification
 *   pg_invoices     — recurring rent invoices + payment status
 *   pg_payouts      — monthly owner statements (rent collected, fee, net)
 *   pg_complaints   — complaint tickets with SLA + approval workflow
 *   pg_compliance   — per-property licence/NO Computed expiry tracker
 *   pg_visitors     — gate visitor/parcel log
 *   pg_notices      — notice board (BBMP 1533 / Police 101 pinned)
 *   pg_menu         — weekly mess menu
 *   pg_shifts       — staff duty roster with coverage check
 *   pg_expenses     — maintenance costs against a property
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/* ─────────────────────────── Types ─────────────────────────── */

export type FeeModel = 'flat' | 'percentage' | 'vacancy_protected';

/** The appointed PG management operator running day-to-day operations on VJR Estate's behalf. */
export const PG_OPERATOR_NAME = 'Sqyar Yards';

export interface PgFeeConfig {
  model: FeeModel;
  flatMonthlyFee: number; // ₹, when model = flat
  percentOfRent: number; // %, when model = percentage/vacancy_protected
  skipFeeOnVacancy: boolean; // pay-for-performance option
  onboardingFee: number; // one-time ₹1,000–5,000
  tenantPlacementFee: number; // per new tenant placed
  placementFeeType: 'fixed' | 'one_month_rent' | 'half_rent';
  maintenanceMarginPct: number; // 10–15%, disclosed on statements
  spendCapWithoutOwnerApproval: number; // operator authority ₹5k–10k
  platformFeePct: number; // VJR Estate coordination fee, % of collected rent
}

export const DEFAULT_FEE_CONFIG: PgFeeConfig = {
  model: 'percentage',
  flatMonthlyFee: 8000,
  percentOfRent: 10,
  skipFeeOnVacancy: false,
  onboardingFee: 2500,
  tenantPlacementFee: 12000,
  placementFeeType: 'fixed',
  maintenanceMarginPct: 12,
  spendCapWithoutOwnerApproval: 5000,
  platformFeePct: 2.5,
};

export interface PgComplianceItem {
  id: string;
  name: string;
  category:
    | 'trade_licence'
    | 'fire_noc'
    | 'fssai'
    | 'occupancy_cert'
    | 'cctv'
    | 'police_verification'
    | 'utility'
    | 'rera';
  status: 'valid' | 'expiring' | 'expired' | 'missing';
  issuedOn?: string; // ISO date
  expiresOn: string; // ISO date
  docUrl?: string;
  note?: string;
}

export interface PgProperty {
  id: string;
  name: string;
  locality: string;
  address: string;
  ownerName: string;
  ownerPhone: string;
  ownerType: 'Indian' | 'NRI';
  ownerUid?: string; // Firebase auth uid of the owner portal user
  operatorName: string; // appointed PG management operator (e.g. Sqyar Yards)
  managerName: string;
  managerPhone: string;
  totalBeds: number;
  occupiedBeds: number;
  monthlyPotential: number; // sum of all bed rents
  monthlyCollected: number; // collected this month
  gender: 'Male' | 'Female' | 'Co-ed';
  hasKitchen: boolean; // drives FSSAI requirement
  waterConnection: 'commercial' | 'residential';
  feeConfig: PgFeeConfig;
  compliance: PgComplianceItem[];
  pocNumber?: string; // POA document tracker (NRI)
  nroAccount?: string; // FEMA/NRO routing note
  createdAt?: Timestamp;
}

export interface PgRoom {
  id: string;
  propertyId: string;
  roomNo: string;
  floor: number;
  sharing: 1 | 2 | 3;
  areaSqFt: number;
  beds: PgBed[];
}

export interface PgBed {
  id: string;
  label: string; // "1A", "1B"…
  rent: number;
  tenantId?: string;
  status: 'occupied' | 'vacant' | 'notice';
  areaSqFtPerPerson?: number;
}

export type PgTenantStage =
  | 'Lead'
  | 'Viewing'
  | 'Application'
  | 'KYC'
  | 'Verification'
  | 'Agreement'
  | 'Deposit Paid'
  | 'Active'
  | 'Notice'
  | 'Checked Out';

export interface PgTenant {
  id: string;
  propertyId: string;
  bedId?: string;
  name: string;
  phone: string;
  stage: PgTenantStage;
  rent: number;
  deposit: number;
  moveIn?: string;
  agreementMonths: number; // 11 typical, 12+ triggers sub-registrar
  employer: string; // employer or college
  kycStatus: 'pending' | 'verified' | 'rejected';
  policeVerification: 'pending' | 'cleared' | 'rejected';
  emergencyContact: string;
  permanentAddress: string;
  isCorporate: boolean; // TDS tracking
  noticeDate?: string;
  checkoutDate?: string;
  createdAt?: Timestamp;
}

export interface PgInvoice {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  month: string; // "2026-09"
  rent: number;
  utilities: number; // split electricity/water per bed
  lateFee: number;
  total: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'bounced';
  dueDate: string;
  method?: 'UPI' | 'Card' | 'NetBanking' | 'Cheque' | 'NACH' | 'Cash';
  paidOn?: string;
}

export interface PgPayout {
  id: string;
  propertyId: string;
  propertyName: string;
  month: string;
  rentCollected: number;
  operatorFee: number; // appointed operator's management fee
  platformFee: number; // VJR Estate coordination fee
  managementFee: number; // legacy alias = operatorFee
  maintenanceCost: number;
  maintenanceMargin: number;
  gstOnFee: number; // 18% on both fees
  onboardingFee?: number;
  placementFee?: number;
  netPayout: number;
  status: 'draft' | 'paid';
  paidOn?: string;
}

export interface PgComplaint {
  id: string;
  propertyId: string;
  property: string;
  raisedBy: string;
  category: 'Electrical' | 'Plumbing' | 'Housekeeping' | 'Security' | 'Other';
  title: string;
  detail?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Awaiting Owner' | 'Resolved';
  cost?: number;
  ownerApprovalRequired: boolean;
  createdAt: string;
  slaHours: number;
}

export interface PgVisitor {
  id: string;
  propertyId: string;
  property: string;
  name: string;
  purpose: 'Guest' | 'Parcel' | 'Food Delivery' | 'Maintenance' | 'Agent';
  visiting: string; // resident name/bed
  inTime: string;
  outTime?: string;
  overstay?: boolean;
}

export interface PgNotice {
  id: string;
  propertyId: string; // '*' = all properties
  title: string;
  body: string;
  pinned: boolean;
  date: string;
}

export interface PgMenuDay {
  id: string;
  propertyId: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  breakfast: string;
  lunch: string;
  dinner: string;
}

export interface PgShift {
  id: string;
  propertyId: string;
  staffName: string;
  role: 'Warden' | 'Guard' | 'Housekeeping' | 'Cook';
  day: string;
  slot: 'Morning' | 'Evening' | 'Night';
}

/* ─────────────────── Bangalore compliance catalog ─────────────────── */

export interface ComplianceCatalogEntry {
  category: PgComplianceItem['category'];
  label: string;
  description: string;
  validityMonths: number | null;
  mandatory: (p: { hasKitchen: boolean }) => boolean;
}

export const COMPLIANCE_CATALOG: ComplianceCatalogEntry[] = [
  {
    category: 'trade_licence',
    label: 'BBMP Trade Licence',
    description: 'Mandatory for PG hosting 5+ unrelated tenants. Renew annually within 30 days of expiry.',
    validityMonths: 12,
    mandatory: () => true,
  },
  {
    category: 'fire_noc',
    label: 'Fire Safety NOC',
    description: 'Karnataka State Fire & Emergency Services clearance.',
    validityMonths: 12,
    mandatory: () => true,
  },
  {
    category: 'fssai',
    label: 'FSSAI Licence',
    description: 'Required within 3 months of trade licence when the PG runs its own kitchen.',
    validityMonths: 60,
    mandatory: (p) => p.hasKitchen,
  },
  {
    category: 'occupancy_cert',
    label: 'Occupancy Certificate',
    description: 'OC / sanctioned building plan compliance flag from BBMP.',
    validityMonths: null,
    mandatory: () => true,
  },
  {
    category: 'cctv',
    label: 'CCTV Compliance',
    description: 'Entries, exits and corridors covered · 90-day footage retention.',
    validityMonths: 12,
    mandatory: () => true,
  },
  {
    category: 'utility',
    label: 'Commercial Utility Flag',
    description: 'PG buildings are billed at commercial water/electricity rates in Bangalore.',
    validityMonths: null,
    mandatory: () => true,
  },
  {
    category: 'police_verification',
    label: 'Tenant Police Verification',
    description: 'ID proof, permanent address & emergency contact for every PG resident.',
    validityMonths: null,
    mandatory: () => true,
  },
  {
    category: 'rera',
    label: 'VJR RERA Registration',
    description: 'VJR Estate managing-agent RERA number, shown on owner-facing statements.',
    validityMonths: null,
    mandatory: () => true,
  },
];

export const VJR_RERA_NUMBER = 'PRM/KA/RERA/1251/446/AG/xxxxx';

/* ─────────────────────── Derived helpers ─────────────────────── */

const DAY_MS = 86_400_000;

export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS);
}

/** Health score 0–100: licences valid, nothing expired, occupancy within limits. */
export function complianceHealthScore(p: PgProperty): number {
  if (!p.compliance?.length) return 0;
  let score = 0;
  const mandatory = COMPLIANCE_CATALOG.filter((c) => c.mandatory({ hasKitchen: p.hasKitchen }));
  const perItem = 100 / mandatory.length;
  for (const cat of mandatory.map((m) => m.category)) {
    const item = p.compliance.find((c) => c.category === cat);
    if (!item) continue; // missing contributes 0
    if (item.status === 'valid') score += perItem;
    else if (item.status === 'expiring') score += perItem * 0.6;
  }
  return Math.round(score);
}

export function healthGrade(score: number): { label: string; variant: 'success' | 'default' | 'muted' } {
  if (score >= 85) return { label: 'Excellent', variant: 'success' };
  if (score >= 60) return { label: 'Good', variant: 'default' };
  return { label: 'At Risk', variant: 'muted' };
}

/** 45 & 15 day auto-alert thresholds from the spec. */
export function complianceAlerts(p: PgProperty): { item: PgComplianceItem; days: number; level: 'warn' | 'critical' }[] {
  return (p.compliance ?? [])
    .filter((c) => c.status === 'expiring' || c.status === 'expired')
    .map((item) => {
      const days = daysUntil(item.expiresOn);
      return { item, days, level: (days <= 15 || item.status === 'expired' ? 'critical' : 'warn') as 'warn' | 'critical' };
    })
    .sort((a, b) => a.days - b.days);
}

/** Karnataka Rent Control Act ceiling: 10 months' rent for PG/residential premises. */
export const DEPOSIT_CEILING_MONTHS = 10;

export function depositMonths(tenant: Pick<PgTenant, 'deposit' | 'rent'>): number {
  if (tenant.rent <= 0) return 0;
  return Math.round((tenant.deposit / tenant.rent) * 10) / 10;
}

export function depositFlag(tenant: Pick<PgTenant, 'deposit' | 'rent'>): string | null {
  if (tenant.deposit <= 0 || tenant.rent <= 0) return null;
  const months = depositMonths(tenant);
  if (months > DEPOSIT_CEILING_MONTHS) {
    return `Deposit of ${months} months exceeds the Karnataka ceiling of ${DEPOSIT_CEILING_MONTHS} months' rent`;
  }
  return null;
}

/** Occupancy-limit check: minimum 70 sq ft per person (Karnataka PG norms). */
export function occupancyWarning(rooms: PgRoom[]): string | null {
  const beds = rooms.flatMap((r) => r.beds);
  const tight = beds.filter((b) => (b.areaSqFtPerPerson ?? 0) > 0 && b.areaSqFtPerPerson! < 70);
  if (tight.length > 0) {
    return `${tight.length} bed(s) are below the 70 sq ft/person minimum — recheck the sharing configuration`;
  }
  return null;
}

export function occupancyPct(p: PgProperty): number {
  if (!p.totalBeds) return 0;
  return Math.round((p.occupiedBeds / p.totalBeds) * 100);
}

/** Appointed operator's monthly management fee under the configured model. */
export function monthlyManagementFee(p: PgProperty): number {
  const cfg = p.feeConfig ?? DEFAULT_FEE_CONFIG;
  if (cfg.model === 'flat') return cfg.flatMonthlyFee;
  if (cfg.skipFeeOnVacancy && p.occupiedBeds === 0) return 0;
  return Math.round((p.monthlyCollected * cfg.percentOfRent) / 100);
}

/** VJR Estate's coordination fee for appointing & supervising the operator. */
export function platformFee(p: PgProperty): number {
  const pct = p.feeConfig?.platformFeePct ?? DEFAULT_FEE_CONFIG.platformFeePct;
  return Math.round((p.monthlyCollected * pct) / 100);
}

export function feeGst(fee: number): number {
  return Math.round(fee * 0.18);
}

/** Agreement route: ≤11 months → notarised; >11 months → Sub-Registrar registration. */
export function agreementRoute(months: number): 'Notarised (≤11 months)' | 'Sub-Registrar registration (>11 months)' {
  return months <= 11 ? 'Notarised (≤11 months)' : 'Sub-Registrar registration (>11 months)';
}

/** Renewal escalation reminder window: 2 months before 11-month expiry. */
export function renewalDue(moveIn: string | undefined, months: number): boolean {
  if (!moveIn) return false;
  const expiry = new Date(moveIn);
  expiry.setMonth(expiry.getMonth() + months);
  const twoMonths = expiry.getTime() - 62 * DAY_MS;
  return Date.now() >= twoMonths && Date.now() < expiry.getTime();
}

export function slaDueHours(c: PgComplaint): number {
  const elapsed = (Date.now() - new Date(c.createdAt).getTime()) / 3_600_000;
  return Math.max(0, Math.round(c.slaHours - elapsed));
}

export function money(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n));
}

/* ──────────────────────── Firestore CRUD ──────────────────────── */

const COL = {
  properties: 'pg_properties',
  rooms: 'pg_rooms',
  tenants: 'pg_tenants',
  invoices: 'pg_invoices',
  payouts: 'pg_payouts',
  complaints: 'pg_complaints',
  visitors: 'pg_visitors',
  notices: 'pg_notices',
  menu: 'pg_menu',
  shifts: 'pg_shifts',
  expenses: 'pg_expenses',
} as const;

export const PG_COLLECTIONS = COL;

/** Seed-on-first-load: the admin dashboard is empty until seeded or until real properties exist. */
export async function seedDemoDataIfEmpty(): Promise<boolean> {
  const snap = await getDocs(query(collection(db, COL.properties), orderBy('createdAt', 'desc')));
  if (snap.size > 0) return false;
  const demo = buildDemoProperty('Indiranagar', 3);
  const propertyId = await addProperty(demo.property);
  for (const room of demo.rooms) {
    await addDoc(collection(db, COL.rooms), { ...room, propertyId });
  }
  const activeTenants: PgTenant[] = [];
  for (const tenant of demo.tenants) {
    const ref = await addDoc(collection(db, COL.tenants), { ...tenant, propertyId, createdAt: Timestamp.now() });
    if (tenant.stage === 'Active') activeTenants.push({ ...tenant, id: ref.id });
  }
  for (const invoice of buildDemoInvoices(activeTenants)) {
    await addDoc(collection(db, COL.invoices), invoice);
  }
  await addDoc(collection(db, COL.complaints), {
    propertyId,
    property: demo.property.name,
    raisedBy: 'Priya Sharma (Bed 101A)',
    category: 'Plumbing',
    title: 'Geyser leaking in room 101',
    detail: 'Water pooling under the geyser since last night; tenant reports reduced hot water pressure.',
    priority: 'High',
    status: 'Awaiting Owner',
    cost: 7500,
    ownerApprovalRequired: true,
    createdAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    slaHours: 12,
  });
  await addDoc(collection(db, COL.notices), {
    propertyId: '*',
    title: 'Water tank cleaning — Saturday morning',
    body: 'Water supply will be paused between 8 AM and 11 AM this Saturday for scheduled tank cleaning. Please store water in your buckets overnight.',
    pinned: true,
    date: new Date().toISOString().slice(0, 10),
  });
  return true;
}

export function subscribeProperties(cb: (list: PgProperty[]) => void, err?: (e: Error) => void): Unsubscribe {
  const q = query(collection(db, COL.properties), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PgProperty[]),
    (e) => err?.(e as Error),
  );
}

export function subscribeRooms(propertyId: string, cb: (list: PgRoom[]) => void, err?: (e: Error) => void): Unsubscribe {
  const q = query(collection(db, COL.rooms), where('propertyId', '==', propertyId));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as object) })) as PgRoom[]
      ),
    (e) => err?.(e as Error),
  );
}

export function subscribeTenants(cb: (list: PgTenant[]) => void, err?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, COL.tenants),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PgTenant[]),
    (e) => err?.(e as Error),
  );
}

export function subscribeInvoices(cb: (list: PgInvoice[]) => void, err?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, COL.invoices),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PgInvoice[]),
    (e) => err?.(e as Error),
  );
}

export function subscribePayouts(cb: (list: PgPayout[]) => void, err?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, COL.payouts),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PgPayout[]),
    (e) => err?.(e as Error),
  );
}

export function subscribeComplaints(cb: (list: PgComplaint[]) => void, err?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, COL.complaints),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PgComplaint[]),
    (e) => err?.(e as Error),
  );
}

export function subscribeVisitors(cb: (list: PgVisitor[]) => void, err?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, COL.visitors),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PgVisitor[]),
    (e) => err?.(e as Error),
  );
}

export function subscribeNotices(cb: (list: PgNotice[]) => void, err?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, COL.notices),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PgNotice[]),
    (e) => err?.(e as Error),
  );
}

export function subscribeMenu(cb: (list: PgMenuDay[]) => void, err?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, COL.menu),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PgMenuDay[]),
    (e) => err?.(e as Error),
  );
}

export function subscribeShifts(cb: (list: PgShift[]) => void, err?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    collection(db, COL.shifts),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as PgShift[]),
    (e) => err?.(e as Error),
  );
}

export async function addProperty(p: Omit<PgProperty, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL.properties), {
    ...p,
    compliance: p.compliance ?? buildDefaultCompliance(p.hasKitchen),
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateProperty(id: string, patch: Partial<PgProperty>): Promise<void> {
  await updateDoc(doc(db, COL.properties, id), patch as unknown as Partial<PgProperty>);
}

export async function deleteProperty(id: string): Promise<void> {
  await deleteDoc(doc(db, COL.properties, id));
}

export async function addTenant(t: Omit<PgTenant, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL.tenants), { ...t, createdAt: Timestamp.now() });
  return ref.id;
}

export async function updateTenant(id: string, patch: Partial<PgTenant>): Promise<void> {
  await updateDoc(doc(db, COL.tenants, id), patch);
}

export async function addComplaint(c: Omit<PgComplaint, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL.complaints), c);
  return ref.id;
}

export async function updateComplaint(id: string, patch: Partial<PgComplaint>): Promise<void> {
  await updateDoc(doc(db, COL.complaints, id), patch);
}

export async function addVisitor(v: Omit<PgVisitor, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL.visitors), v);
  return ref.id;
}

export async function updateVisitor(id: string, patch: Partial<PgVisitor>): Promise<void> {
  await updateDoc(doc(db, COL.visitors, id), patch);
}

export async function addNotice(n: Omit<PgNotice, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL.notices), n);
  return ref.id;
}

export async function addMenuDay(m: Omit<PgMenuDay, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL.menu), m);
  return ref.id;
}

export async function addShift(s: Omit<PgShift, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL.shifts), s);
  return ref.id;
}

export async function addInvoice(i: Omit<PgInvoice, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL.invoices), i);
  return ref.id;
}

export async function updateInvoice(id: string, patch: Partial<PgInvoice>): Promise<void> {
  await updateDoc(doc(db, COL.invoices, id), patch);
}

export async function addPayout(p: Omit<PgPayout, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL.payouts), p);
  return ref.id;
}

export async function updatePayout(id: string, patch: Partial<PgPayout>): Promise<void> {
  await updateDoc(doc(db, COL.payouts, id), patch);
}

/* ─────────────────── Demo seed (realistic Bangalore) ─────────────────── */

function iso(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

export function buildDefaultCompliance(hasKitchen: boolean): PgComplianceItem[] {
  return COMPLIANCE_CATALOG.filter((c) => c.mandatory({ hasKitchen })).map((c, i) => ({
    id: c.category,
    name: c.label,
    category: c.category,
    status: i === 1 ? 'expiring' : i === 4 ? 'expired' : 'valid',
    issuedOn: iso(-300 - i * 10),
    expiresOn: c.validityMonths ? iso([40, 12, 90, 400, -6, 200, 150, 500][i % 8]) : iso(500),
    note: c.description,
  }));
}

interface DemoResult {
  property: Omit<PgProperty, 'id'>;
  rooms: Omit<PgRoom, 'id'>[];
  tenants: Omit<PgTenant, 'id'>[];
}

export function buildDemoProperty(locality = 'Indiranagar', floors = 3): DemoResult {
  const sharingPlan: (1 | 2 | 3)[] = [3, 2, 1, 3, 2, 2, 1, 3, 2];
  const rooms: Omit<PgRoom, 'id'>[] = [];
  let bedIndex = 0;
  for (let f = 1; f <= floors; f++) {
    for (let r = 1; r <= 3; r++) {
      const sharing = sharingPlan[bedIndex % sharingPlan.length];
      const beds: PgBed[] = [];
      for (let b = 0; b < sharing; b++) {
        const label = `${f}${r}${String.fromCharCode(65 + b)}`;
        const rent = sharing === 1 ? 14000 : sharing === 2 ? 11000 : 9000;
        beds.push({
          id: label,
          label,
          rent,
          status: 'vacant',
          areaSqFtPerPerson: sharing === 3 ? 72 : sharing === 2 ? 100 : 130,
        });
        bedIndex++;
      }
      rooms.push({ propertyId: '', roomNo: `${f}0${r}`, floor: f, sharing, areaSqFt: sharing * 72 + 40, beds });
    }
    bedIndex++; // stagger plans across floors
  }

  const allBeds = rooms.flatMap((r) => r.beds);
  const totalBeds = allBeds.length;
  const occupiedBeds = Math.floor(totalBeds * 0.72);

  const firstNames = ['Rahul', 'Priya', 'Arjun', 'Sneha', 'Karthik', 'Divya', 'Manoj', 'Kavya', 'Vikram', 'Anita', 'Sanjay', 'Meera', 'Rohit', 'Pooja', 'Naveen', 'Shruthi', 'Imran', 'Lakshmi'];
  const companies = ['Infosys', 'Wipro', 'Flipkart', 'Swiggy', 'TCS', 'Accenture', 'RV College', 'Christ University', 'Nimbus Hydraulics'];

  const tenants: Omit<PgTenant, 'id'>[] = [];
  for (let i = 0; i < occupiedBeds; i++) {
    const bed = allBeds[i];
    bed.status = 'occupied';
    bed.tenantId = `demo-t${i + 1}`;
    const name = `${firstNames[i % firstNames.length]} ${['Sharma', 'Iyer', 'Reddy', 'Nair', 'Gowda', 'Khan'][i % 6]}`;
    tenants.push({
      propertyId: '',
      bedId: bed.id,
      name,
      phone: `98${String(45000000 + i * 7919).slice(0, 8)}`,
      stage: 'Active',
      rent: bed.rent,
      deposit: bed.rent * 2,
      moveIn: iso(-120 - i * 9),
      agreementMonths: 11,
      employer: companies[i % companies.length],
      kycStatus: i % 7 === 3 ? 'pending' : 'verified',
      policeVerification: i % 5 === 2 ? 'pending' : 'cleared',
      emergencyContact: `+91 98${String(45100000 + i * 3467).slice(0, 8)}`,
      permanentAddress: `${10 + i} ${['Jayanagar', 'Hubli', 'Mysuru', 'Chennai', 'Hyderabad'][i % 5]}`,
      isCorporate: i % 8 === 0,
    });
  }
  // A few beds in the move-out pipeline (notice → checkout → damage check)
  const pipeline: PgTenantStage[] = ['Notice', 'Notice', 'Checked Out'];
  pipeline.forEach((stage, i) => {
    const bed = allBeds[occupiedBeds + i];
    if (!bed) return;
    bed.status = stage === 'Notice' ? 'notice' : 'vacant';
    tenants.push({
      propertyId: '',
      bedId: bed.id,
      name: `${firstNames[(occupiedBeds + i) % firstNames.length]} ${['Rao', 'Menon'][i % 2]}`,
      phone: `97${String(40000000 + i * 5333).slice(0, 8)}`,
      stage: stage as PgTenantStage,
      rent: bed.rent,
      deposit: bed.rent * 2,
      moveIn: iso(-300),
      agreementMonths: 11,
      employer: companies[(occupiedBeds + i) % companies.length],
      kycStatus: 'verified',
      policeVerification: 'cleared',
      emergencyContact: '+91 9900123456',
      permanentAddress: 'Basavanagudi, Bangalore',
      isCorporate: false,
      noticeDate: iso(-20),
      checkoutDate: stage === 'Checked Out' ? iso(-4) : undefined,
    });
  });

  const monthlyPotential = allBeds.reduce((s, b) => s + b.rent, 0);
  const monthlyCollected = allBeds.filter((b) => b.status === 'occupied').reduce((s, b) => s + b.rent, 0);

  const property: Omit<PgProperty, 'id'> = {
    name: `VJR Estate Signature PG · ${locality}`,
    locality,
    address: `${12 + floors}, ${locality} Main Road, Bangalore 560038`,
    ownerName: 'Suresh Gowda',
    ownerPhone: '+91 98450 11223',
    ownerType: 'Indian',
    operatorName: PG_OPERATOR_NAME,
    managerName: 'Ravi Kumar (Warden)',
    managerPhone: '+91 99001 44556',
    totalBeds,
    occupiedBeds,
    monthlyPotential,
    monthlyCollected,
    gender: 'Co-ed',
    hasKitchen: true,
    waterConnection: 'commercial',
    feeConfig: { ...DEFAULT_FEE_CONFIG },
    compliance: buildDefaultCompliance(true),
    createdAt: Timestamp.now(),
  };

  return { property, rooms, tenants };
}

export const THIS_MONTH = new Date().toISOString().slice(0, 7);

export function buildDemoInvoices(tenants: PgTenant[]): Omit<PgInvoice, 'id'>[] {
  const active = tenants.filter((t) => t.stage === 'Active');
  return active.map((t, i) => {
    const rent = t.rent;
    const utilities = 600 + (i % 5) * 120;
    const bounced = i % 11 === 10;
    const overdue = i % 9 === 8;
    return {
      tenantId: t.id,
      tenantName: t.name,
      propertyId: t.propertyId,
      month: THIS_MONTH,
      rent,
      utilities,
      lateFee: overdue ? 250 : 0,
      total: rent + utilities + (overdue ? 250 : 0),
      status: bounced ? 'bounced' : overdue ? 'overdue' : i % 4 === 3 ? 'pending' : 'paid',
      dueDate: iso(overdue ? -6 : 5),
      method: bounced ? 'Cheque' : i % 3 === 0 ? 'UPI' : i % 3 === 1 ? 'NACH' : 'Card',
    };
  });
}

export function buildDemoPayout(property: PgProperty, month = THIS_MONTH): Omit<PgPayout, 'id'> {
  const operatorFee = monthlyManagementFee(property);
  const platform = platformFee(property);
  const maintenanceCost = 6400;
  const margin = Math.round((maintenanceCost * property.feeConfig.maintenanceMarginPct) / 100);
  const gst = feeGst(operatorFee + platform);
  const net = property.monthlyCollected - operatorFee - platform - maintenanceCost - margin;
  return {
    propertyId: property.id,
    propertyName: property.name,
    month,
    rentCollected: property.monthlyCollected,
    operatorFee,
    platformFee: platform,
    managementFee: operatorFee,
    maintenanceCost,
    maintenanceMargin: margin,
    gstOnFee: gst,
    netPayout: net,
    status: 'draft',
  };
}
