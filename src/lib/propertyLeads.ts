import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { startTransition } from 'react';
import { db } from '@/lib/firebase';
import { sanitizeForFirestore } from '@/lib/firestoreHelpers';
import { useSupabaseData, subscribeSupabasePropertyLeads, supabaseSavePropertyLead } from '@/lib/supabaseData';

export type LeadType = 'whatsapp' | 'book_visit';
export type LeadSource = 'card' | 'detail';
export type LeadStatus = 'new' | 'contacted' | 'closed';

export interface PropertyLeadInput {
  propertyId: string;
  propertyTitle: string;
  propertyType: string;
  propertyArea: string;
  propertyPrice: string;
  propertyMonthlyRental?: string;
  propertyUrl: string;
  leadType: LeadType;
  visitDate?: string;
  visitTime?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerLat?: number;
  buyerLng?: number;
  message: string;
  source: LeadSource;
  ownerUid?: string;
  listedBy?: string;
  ipAddress?: string;
}

export interface PropertyLead extends PropertyLeadInput {
  id: string;
  status: LeadStatus;
  createdAt: Date | null;
}

export async function savePropertyLead(input: PropertyLeadInput): Promise<void> {
  if (useSupabaseData()) {
    await supabaseSavePropertyLead(input as unknown as Record<string, unknown>);
    return;
  }
  await addDoc(
    collection(db, 'property_leads'),
    sanitizeForFirestore({
      ...input,
      status: 'new' satisfies LeadStatus,
      createdAt: serverTimestamp(),
    }),
  );
}

export function subscribePropertyLeads(
  onData: (leads: PropertyLead[]) => void,
  onError?: (error: Error) => void,
  uid?: string,
): Unsubscribe {
  if (useSupabaseData()) {
    return subscribeSupabasePropertyLeads((leads) => startTransition(() => onData(leads)), uid);
  }
  // Non-admin owners must be scoped to their own leads or Firestore rules reject the query.
  const q = uid
    ? query(collection(db, 'property_leads'), where('ownerUid', '==', uid), orderBy('createdAt', 'desc'))
    : query(collection(db, 'property_leads'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const leads: PropertyLead[] = snap.docs.map((d) => {
        const data = d.data();
        const createdAt = data.createdAt?.toDate?.() ?? null;
        return {
          id: d.id,
          propertyId: data.propertyId ?? '',
          propertyTitle: data.propertyTitle ?? '',
          propertyType: data.propertyType ?? '',
          propertyArea: data.propertyArea ?? '',
          propertyPrice: data.propertyPrice ?? '',
          propertyMonthlyRental: data.propertyMonthlyRental,
          propertyUrl: data.propertyUrl ?? '',
          leadType: data.leadType ?? 'whatsapp',
          visitDate: data.visitDate,
          visitTime: data.visitTime,
          buyerName: data.buyerName,
          buyerPhone: data.buyerPhone,
          message: data.message ?? '',
          source: data.source ?? 'card',
          ownerUid: data.ownerUid,
          listedBy: data.listedBy,
          ipAddress: data.ipAddress,
          status: data.status ?? 'new',
          createdAt,
        };
      });
      startTransition(() => onData(leads));
    },
    (error) => {
      console.error('property_leads listener error:', error);
      onError?.(error);
    },
  );
}
