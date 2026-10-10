import { auth } from '@/lib/firebase';
import { callDataProxy } from '@/lib/supabaseData';

/**
 * Partnership CRM module — partner lifecycle management (Partner 360°).
 * All actions are admin-gated server-side via the data-proxy.
 */

export type PartnerLifecycle = 'pending' | 'active' | 'suspended' | 'terminated' | 'rejected';
export type PartnerType = 'Owner' | 'Builder' | 'Agent';
export type VerificationStatus = 'UNVERIFIED' | 'PARTIALLY VERIFIED' | 'VERIFIED' | 'VERIFICATION REQUIRED' | 'REJECTED';

export interface PartnerRow {
  id: string;
  partner_code: string | null;
  uid: string | null;
  email: string;
  partner_type: PartnerType;
  full_name: string;
  mobile: string;
  company_name: string | null;
  rera_number: string | null;
  experience_years: number | null;
  city: string;
  areas: string[];
  commission_percent: number;
  status: PartnerLifecycle;
  status_reason: string | null;
  status_note: string | null;
  status_changed_at: string | null;
  status_changed_by: string | null;
  verification_status: VerificationStatus;
  verification_items: Record<string, { status: string; at: string; by: string; notes?: string }> | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  consents: Record<string, unknown> | null;
  last_activity_at: string | null;
  // Device-reported registration location (server-validated at submit).
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  captured_at: string | null;
  resolved_address: string | null;
  capture_method: string | null;
  location_capture_status: string | null;
  created_at: string;
  updated_at: string;
  // Enriched by partner.admin.list
  listingsCount?: number;
  activeListings?: number;
  leadsCount?: number;
  transactionsCount?: number;
  vjrRevenue?: number;
  partnerRevenue?: number;
  pendingPayments?: number;
}

export interface PartnerListing {
  id: string;
  property_code: string | null;
  title: string;
  type: string;
  status: string;
  listed_by: string | null;
  area: string;
  location: string;
  price: number | null;
  price_label: string | null;
  monthly_rental: number | null;
  monthly_rental_label: string | null;
  images: string[] | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerLead {
  id: string;
  property_id: string;
  property_title: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  message: string;
  lead_type: string | null;
  source: string | null;
  status: string;
  created_at: string;
}

export interface PartnerActivityEntry {
  id: string;
  partner_id: string;
  action: string;
  description: string;
  actor_type: 'admin' | 'partner' | 'system';
  actor: string;
  related_type: string | null;
  related_id: string | null;
  prev_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PartnerNote {
  id: string;
  partner_id: string;
  author_email: string;
  note_type: string;
  priority: string;
  body: string;
  created_at: string;
}

export interface PartnerTransaction {
  id: string;
  partner_id: string;
  property_id: string | null;
  property_title: string;
  counterparty_name: string;
  txn_type: 'sale' | 'lease' | 'rental';
  transaction_value: number;
  commission_percent: number | null;
  vjr_amount: number;
  partner_amount: number;
  gst_amount: number;
  paid_amount: number;
  txn_status: 'PENDING' | 'NEGOTIATION' | 'AGREED' | 'CLOSED' | 'CANCELLED' | 'DISPUTED';
  payment_status: 'UNPAID' | 'PARTIAL' | 'PAID';
  closure_date: string | null;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerDispute {
  id: string;
  partner_id: string;
  related_property_id: string | null;
  related_lead_id: string | null;
  related_txn_id: string | null;
  dispute_type: string;
  description: string;
  assigned_admin: string;
  dispute_status: 'OPEN' | 'UNDER_REVIEW' | 'WAITING_FOR_DOCUMENTS' | 'RESOLVED' | 'CLOSED';
  resolution: string;
  resolution_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerDetail {
  partner: PartnerRow;
  listings: PartnerListing[];
  leads: PartnerLead[];
  notes: PartnerNote[];
  activity: PartnerActivityEntry[];
  transactions: PartnerTransaction[];
  disputes: PartnerDispute[];
}

export const SUSPENSION_REASONS = [
  'Verification Issue',
  'Invalid RERA Details',
  'Fraud Concern',
  'Misleading Listing',
  'Duplicate Listings',
  'Unauthorized Listing',
  'Partner Request',
  'Payment Issue',
  'Policy Violation',
  'Other',
] as const;

export const TERMINATION_REASONS = [
  'Partner Request',
  'Fraud',
  'Repeated Policy Violations',
  'Invalid Documentation',
  'RERA Compliance Issue',
  'Misrepresentation',
  'Commercial Dispute',
  'Business Closure',
  'Inactive Partner',
  'Other',
] as const;

export const NOTE_TYPES = ['General', 'Verification', 'Legal', 'Commercial', 'Lead', 'Payment', 'Dispute', 'Termination'] as const;

export const VERIFICATION_ITEMS = [
  'Identity Verification',
  'Mobile Verification',
  'Email Verification',
  'RERA Verification',
  'Business Verification',
  'Ownership/Authority Verification',
  'Document Verification',
] as const;

async function call<T>(action: string, params: Record<string, unknown>): Promise<T> {
  if (!auth.currentUser) throw new Error('Not authenticated');
  return callDataProxy(action, params) as Promise<T>;
}

export const partnerCrm = {
  list: () => call<{ partners: PartnerRow[] }>('partner.admin.list', {}),
  detail: (id: string) => call<PartnerDetail>('partner.admin.detail', { id }),
  setStatus: (body: {
    id: string;
    status: PartnerLifecycle;
    reason: string;
    note?: string;
    suspensionType?: 'TEMPORARY' | 'INDEFINITE';
    effectiveDate?: string;
    settlement?: string;
  }) => call<{ ok: true; status: PartnerLifecycle }>('partner.admin.status', body),
  setVerification: (body: { id: string; item: string; verificationStatus: VerificationStatus; notes?: string }) =>
    call<{ ok: true }>('partner.admin.verify', body),
  update: (body: { id: string } & Partial<Pick<PartnerRow, 'full_name' | 'mobile' | 'company_name' | 'rera_number' | 'experience_years' | 'areas' | 'city' | 'partner_type'>>) =>
    call<{ ok: true; changed: boolean }>('partner.admin.update', body),
  addNote: (body: { id: string; body: string; noteType?: string; priority?: string }) => call<{ note: PartnerNote }>('partner.admin.note.add', body),
  createTransaction: (body: Record<string, unknown>) => call<{ transaction: PartnerTransaction }>('partner.admin.transaction.create', body),
  updateTransaction: (body: Record<string, unknown>) => call<{ transaction: PartnerTransaction }>('partner.admin.transaction.update', body),
  createDispute: (body: Record<string, unknown>) => call<{ dispute: PartnerDispute }>('partner.admin.dispute.create', body),
  updateDispute: (body: Record<string, unknown>) => call<{ dispute: PartnerDispute }>('partner.admin.dispute.update', body),
};

export const STATUS_BADGE: Record<PartnerLifecycle, { label: string; cls: string }> = {
  pending: { label: 'PENDING', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  active: { label: 'ACTIVE', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  suspended: { label: 'SUSPENDED', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  terminated: { label: 'TERMINATED', cls: 'bg-red-50 text-red-700 ring-red-200' },
  rejected: { label: 'REJECTED', cls: 'bg-gray-100 text-gray-600 ring-gray-200' },
};

export const VERIFICATION_BADGE: Record<VerificationStatus, { label: string; cls: string }> = {
  UNVERIFIED: { label: 'UNVERIFIED', cls: 'bg-gray-100 text-gray-600 ring-gray-200' },
  'PARTIALLY VERIFIED': { label: 'PARTIALLY VERIFIED', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  VERIFIED: { label: 'VERIFIED', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  'VERIFICATION REQUIRED': { label: 'VERIFICATION REQUIRED', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  REJECTED: { label: 'REJECTED', cls: 'bg-red-50 text-red-700 ring-red-200' },
};

export function fmtINR(n: number): string {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${fmtDate(iso)}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}
