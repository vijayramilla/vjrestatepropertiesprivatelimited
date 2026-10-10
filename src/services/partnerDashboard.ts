import { callDataProxy } from '@/lib/supabaseData';

/**
 * Partner (self-service) dashboard data — one auth-scoped backend action,
 * `partner.dashboard`, whose ownership checks live entirely server-side
 * (the partner record is derived from the verified session token).
 */

export interface DashPartner {
  id: string;
  partner_code: string | null;
  partner_type: 'Owner' | 'Builder' | 'Agent';
  full_name: string;
  company_name: string | null;
  email: string;
  mobile: string | null;
  status: 'pending' | 'needs_info' | 'active' | 'suspended' | 'terminated' | 'rejected';
  verification_status: string | null;
  commission_percent: number | null;
  areas: string[] | null;
  experience_years: number | null;
  photo_url: string | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  consents: { terms?: { at: string | null; version?: string }; privacy?: { at: string | null }; [k: string]: unknown } | null;
  created_at: string;
  updated_at: string;
}

export interface DashListing {
  id: string;
  property_code: string | null;
  title: string;
  type: string | null;
  status: string | null;
  area: string | null;
  location: string | null;
  price: string | number | null;
  price_label: string | null;
  monthly_rental: string | number | null;
  monthly_rental_label: string | null;
  images: string[] | string | null;
  created_at: string;
  updated_at: string;
}

export interface DashLead {
  id: string;
  property_id: string;
  property_title: string | null;
  property_type: string | null;
  property_area: string | null;
  property_price: string | null;
  visit_date: string | null;
  visit_time: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  message: string | null;
  lead_type: string | null;
  source: string | null;
  status: string | null;
  created_at: string;
}

export interface DashTxn {
  id: string;
  property_title: string | null;
  counterparty_name: string | null;
  txn_type: string | null;
  transaction_value: string | number | null;
  txn_status: string | null;
  payment_status: string | null;
  vjr_amount: number | string | null;
  partner_amount: number | string | null;
  paid_amount: number | string | null;
  closure_date: string | null;
  created_at: string;
}

export interface DashActivity {
  id: string;
  action: string;
  description: string | null;
  actor_type: string | null;
  actor: string | null;
  created_at: string;
}

export type PartnerDashboardView =
  | 'overview' | 'properties' | 'leads' | 'visits' | 'offers'
  | 'transactions' | 'revenue' | 'documents' | 'messages'
  | 'activity' | 'terms' | 'profile' | 'support';

export interface PartnerDashboardData {
  partner: DashPartner;
  listings: DashListing[];
  leads: DashLead[];
  transactions: DashTxn[];
  disputes: { id: string; dispute_type: string | null; dispute_status: string | null; resolution: string | null; created_at: string }[];
  activity: DashActivity[];
  counts: {
    properties: number;
    leads: number;
    visitsUpcoming: number;
    transactionsOpen: number;
    transactionsClosed: number;
    partnerEarnings: number;
    partnerPaid: number;
    partnerDue: number;
    vjrDue: number;
  };
}

/** Aliases for shorter imports in the page component. */
export type PDashPartner = DashPartner;
export type PDashListing = DashListing;
export type PDashLead = DashLead;
export type PDashTxn = DashTxn;
export type PDashActivity = DashActivity;
export type PDashView = PartnerDashboardView;
export type PDashData = PartnerDashboardData;

const money = (n: number) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function fmtMoney(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? '—' : money(n);
}

export function fmtDateProps(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTimeProps(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Lead lifecycle — partner-viewable stage names (display only). */
export const PARTNER_STAGES = ['New', 'Contacted', 'Interested', 'Site Visit Planned', 'Offer / Negotiation', 'Converted', 'Closed / Lost'] as const;

export function partnerStageFromLead(l: DashLead): string {
  const s = String(l.status ?? '').trim().toLowerCase();
  if (['converted', 'won', 'closed won'].includes(s)) return 'Converted';
  if (['closed', 'lost', 'closed lost'].includes(s)) return 'Closed / Lost';
  if (['offer', 'negotiation'].includes(s)) return 'Offer / Negotiation';
  if (['site visit', 'visit planned', 'visit done', 'token done'].includes(s)) return 'Site Visit Planned';
  if (['contacted', 'in progress'].includes(s)) return 'Contacted';
  if (['interested'].includes(s)) return 'Interested';
  return 'New';
}

export async function fetchPartnerDashboard(): Promise<PartnerDashboardData> {
  return callDataProxy('partner.dashboard', {}, {});
}

export { money as inrFmtPartner };
