import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_CLI_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_CLI_ANON_KEY ?? '';

export const supabaseCrm = createClient(supabaseUrl, supabaseAnonKey);
