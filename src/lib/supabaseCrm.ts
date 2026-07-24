import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eimvaxrmiizdlgonhiov.supabase.co';
const supabaseAnonKey = 'sb_publishable_9E-uIJyNW0QBdhwnNCaMNw_d5jeXvkz';

export const supabaseCrm = createClient(supabaseUrl, supabaseAnonKey);
