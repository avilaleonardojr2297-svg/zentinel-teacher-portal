import { createClient } from '@supabase/supabase-js';

// Kopyahin mo dito ang exact URL at ANON KEY mula sa mobile app mo
const supabaseUrl = 'https://vadedhudgychgwikwlur.supabase.co';
const supabaseAnonKey = 'sb_publishable_NJ_L4zLJcJ_7LfBADwbTUg_fnbGKokg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);