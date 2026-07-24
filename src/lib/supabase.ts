import { createClient } from '@supabase/supabase-js';
import type { SheetClient } from '@/data/crmClientsData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const hasCredentials = !!supabaseUrl && !!supabaseAnonKey;

if (!hasCredentials) {
  console.warn('Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = hasCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);

export function isSupabaseReady(): boolean {
  return hasCredentials;
}

interface CrmRow extends SheetClient {
  id: number;
  created_at: string;
  updated_at: string;
}

export async function getMaxSno(): Promise<number> {
  if (!hasCredentials || !supabase) return 0;
  const { data } = await supabase.from('crm_clients').select('sno').order('sno', { ascending: false }).limit(1);
  return data?.[0]?.sno ?? 0;
}

export async function fetchCrmClients(): Promise<CrmRow[]> {
  if (!hasCredentials || !supabase) return [];
  const { data, error } = await supabase
    .from('crm_clients')
    .select('*')
    .order('sno', { ascending: true });

  if (error) {
    console.error('Failed to fetch CRM clients:', error);
    return [];
  }
  return data ?? [];
}

export async function upsertCrmClient(client: SheetClient): Promise<boolean> {
  if (!hasCredentials || !supabase) return false;
  const { client_role, property_link, comm_date, property_subtype, paid_comm, ...dbFields } = client;
  const { error } = await supabase
    .from('crm_clients')
    .upsert({ ...dbFields, paid_comm: paid_comm || '', client_role: client_role || '', property_link: property_link || '', comm_date: comm_date || '', property_subtype: property_subtype || '', updated_at: new Date().toISOString() }, { onConflict: 'sno' });
  if (error) console.error('Failed to save client:', error);
  return !error;
}
