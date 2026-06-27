import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  where,
  type Unsubscribe,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatINR } from '@/lib/formatPrice';

export type RequirementPurpose = 'Self Purchase' | 'Investment' | 'Other';
export type RequirementTimeline =
  | 'Immediately'
  | '1-3 Months'
  | '3-6 Months'
  | '6-12 Months'
  | 'Just Exploring';
export type RequirementStatus = 'open' | 'matched' | 'closed';
export type PaymentMode =
  | 'Full Cash'
  | 'Bank Loan'
  | 'Part Cash + Part Loan'
  | 'NRI Transfer'
  | 'Other';

export interface RequirementDoc {
  id?: string;
  reqId: string;
  purpose: RequirementPurpose;
  purposeOther?: string;
  propertyType: string;
  propertyTypeOther?: string;
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  timeline: RequirementTimeline;
  notes?: string;
  status: RequirementStatus;
  clickCount: number;
  postedAt?: Timestamp | { toDate?: () => Date };
  paymentMode: PaymentMode;
  buyerName: string;
  buyerPhone: string;
}

export type PublicRequirement = Omit<
  RequirementDoc,
  'paymentMode' | 'buyerName' | 'buyerPhone'
>;

const PRIVATE_KEYS = ['paymentMode', 'buyerName', 'buyerPhone'] as const;

export function toPublicRequirement(
  id: string,
  data: RequirementDoc,
): PublicRequirement {
  const { paymentMode: _p, buyerName: _n, buyerPhone: _ph, ...rest } = data;
  return { ...rest, id };
}

export function stripPrivateRequirementFields(
  data: Record<string, unknown>,
): PublicRequirement {
  const copy = { ...data };
  for (const key of PRIVATE_KEYS) {
    delete copy[key];
  }
  return copy as PublicRequirement;
}

export async function generateReqId(): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await getCountFromServer(collection(db, 'requirements'));
  const count = snap.data().count + 1;
  return `VJR-REQ-${year}-${String(count).padStart(4, '0')}`;
}

export async function createRequirement(
  input: Omit<RequirementDoc, 'reqId' | 'status' | 'clickCount' | 'postedAt'>,
): Promise<{ id: string; reqId: string }> {
  const reqId = await generateReqId();
  const ref = await addDoc(collection(db, 'requirements'), {
    ...input,
    reqId,
    status: 'open',
    clickCount: 0,
    postedAt: serverTimestamp(),
  });
  return { id: ref.id, reqId };
}

export async function incrementRequirementClickCount(requirementId: string): Promise<void> {
  await updateDoc(doc(db, 'requirements', requirementId), {
    clickCount: increment(1),
  });
}

export function formatBudgetRange(min: number, max: number): string {
  const minLabel = formatINR(min) || '₹0';
  const maxLabel = formatINR(max) || '₹0';
  return `${minLabel} – ${maxLabel}`;
}

export function maskPhoneLast4(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return digits.slice(-4);
}

export const REQUIREMENT_PROPERTY_TYPES = [
  'PG Building',
  'Residential Rental',
  'Commercial Property',
  'Residential Plot',
  'Commercial Plot',
  'Agriculture Land',
  'Other',
] as const;

export const REQUIREMENT_PURPOSES: RequirementPurpose[] = [
  'Self Purchase',
  'Investment',
  'Other',
];

export const REQUIREMENT_TIMELINES: RequirementTimeline[] = [
  'Immediately',
  '1-3 Months',
  '3-6 Months',
  '6-12 Months',
  'Just Exploring',
];

export const PAYMENT_MODES: PaymentMode[] = [
  'Full Cash',
  'Bank Loan',
  'Part Cash + Part Loan',
  'NRI Transfer',
  'Other',
];

function parsePostedAt(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const ts = value as { toDate?: () => Date };
  return ts.toDate?.() ?? null;
}

export function subscribeRequirements(
  onData: (items: RequirementDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'requirements'), orderBy('postedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<RequirementDoc, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      console.error('requirements listener error:', err);
      onError?.(err as Error);
    },
  );
}

export function subscribeOpenRequirementsCount(
  onCount: (count: number) => void,
): Unsubscribe {
  const q = query(collection(db, 'requirements'), where('status', '==', 'open'));
  return onSnapshot(
    q,
    (snap) => onCount(snap.size),
    (err) => console.error('open requirements count error:', err),
  );
}

export async function updateRequirement(
  id: string,
  data: Partial<RequirementDoc>,
): Promise<void> {
  const { id: _id, reqId: _req, ...rest } = data;
  await updateDoc(doc(db, 'requirements', id), rest);
}

export async function deleteRequirement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'requirements', id));
}

export function formatRequirementPostedAt(
  postedAt: RequirementDoc['postedAt'],
): string {
  const date = parsePostedAt(postedAt);
  if (!date) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getStatusBadge(status: RequirementStatus): {
  label: string;
  variant: 'success' | 'warning' | 'muted';
} {
  if (status === 'matched') {
    return { label: 'Matched', variant: 'warning' };
  }
  if (status === 'closed') {
    return { label: 'Closed', variant: 'muted' };
  }
  return { label: 'Open', variant: 'success' };
}
