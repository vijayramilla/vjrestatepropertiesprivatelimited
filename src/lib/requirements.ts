import {
  collection,
  doc,
  getCountFromServer,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
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
const REQUIREMENT_PRIVATE_COLLECTION = 'requirement_private';

export interface RequirementPrivateDoc {
  paymentMode: PaymentMode;
  buyerName: string;
  buyerPhone: string;
}

function splitRequirementUpdate(data: Partial<RequirementDoc>) {
  const publicFields: Record<string, unknown> = {};
  const privateFields: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'reqId') continue;
    if (PRIVATE_KEYS.includes(key as (typeof PRIVATE_KEYS)[number])) {
      privateFields[key] = value;
    } else {
      publicFields[key] = value;
    }
  }

  return { publicFields, privateFields };
}

function emptyPrivateFields(): RequirementPrivateDoc {
  return { paymentMode: 'Other', buyerName: '', buyerPhone: '' };
}

function readPrivateFromLegacy(data: Record<string, unknown>): RequirementPrivateDoc {
  return {
    paymentMode: (data.paymentMode as PaymentMode) ?? 'Other',
    buyerName: String(data.buyerName ?? ''),
    buyerPhone: String(data.buyerPhone ?? ''),
  };
}

export function toPublicRequirement(
  id: string,
  data: RequirementDoc,
): PublicRequirement {
  const rest = { ...data };
  delete (rest as any).paymentMode;
  delete (rest as any).buyerName;
  delete (rest as any).buyerPhone;
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
  const { paymentMode, buyerName, buyerPhone, ...publicInput } = input;
  const reqId = await generateReqId();
  const batch = writeBatch(db);
  const requirementRef = doc(collection(db, 'requirements'));

  batch.set(requirementRef, {
    ...publicInput,
    reqId,
    status: 'open',
    clickCount: 0,
    postedAt: serverTimestamp(),
  });

  batch.set(doc(db, REQUIREMENT_PRIVATE_COLLECTION, requirementRef.id), {
    paymentMode,
    buyerName,
    buyerPhone,
  });

  await batch.commit();
  return { id: requirementRef.id, reqId };
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
  'JD Land',
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
      const items = snap.docs.map((d) => {
        const stripped = stripPrivateRequirementFields(d.data() as Record<string, unknown>);
        return {
          id: d.id,
          ...stripped,
          ...emptyPrivateFields(),
        } as RequirementDoc;
      });
      onData(items);
    },
    (err) => {
      console.error('requirements listener error:', err);
      onError?.(err as Error);
    },
  );
}

/** Admin-only: merges public requirements with private buyer contact fields */
export function subscribeAdminRequirements(
  onData: (items: RequirementDoc[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let publicItems: RequirementDoc[] = [];
  let privateById = new Map<string, RequirementPrivateDoc>();

  const emit = () => {
    onData(
      publicItems.map((item) => {
        const privateDoc = privateById.get(item.id!);
        const legacyPrivate = readPrivateFromLegacy(item as unknown as Record<string, unknown>);
        const hasLegacy =
          legacyPrivate.buyerName.length > 0 || legacyPrivate.buyerPhone.length > 0;

        return {
          ...stripPrivateRequirementFields(item as unknown as Record<string, unknown>),
          ...(privateDoc ?? (hasLegacy ? legacyPrivate : emptyPrivateFields())),
          id: item.id,
        } as RequirementDoc;
      }),
    );
  };

  const unsubPublic = onSnapshot(
    query(collection(db, 'requirements'), orderBy('postedAt', 'desc')),
    (snap) => {
      publicItems = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<RequirementDoc, 'id'>),
      }));
      emit();
    },
    (err) => {
      console.error('requirements listener error:', err);
      onError?.(err as Error);
    },
  );

  const unsubPrivate = onSnapshot(
    collection(db, REQUIREMENT_PRIVATE_COLLECTION),
    (snap) => {
      privateById = new Map(
        snap.docs.map((d) => [d.id, d.data() as RequirementPrivateDoc]),
      );
      emit();
    },
    (err) => {
      console.error('requirement_private listener error:', err);
      onError?.(err as Error);
    },
  );

  return () => {
    unsubPublic();
    unsubPrivate();
  };
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
  const { publicFields, privateFields } = splitRequirementUpdate(data);

  if (Object.keys(publicFields).length > 0) {
    await updateDoc(doc(db, 'requirements', id), publicFields as Record<string, any>);
  }

  if (Object.keys(privateFields).length > 0) {
    await setDoc(doc(db, REQUIREMENT_PRIVATE_COLLECTION, id), privateFields as Record<string, any>, {
      merge: true,
    });
  }
}

export async function deleteRequirement(id: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'requirements', id));
  batch.delete(doc(db, REQUIREMENT_PRIVATE_COLLECTION, id));
  await batch.commit();
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
