import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  const val = import.meta.env[key] || 
         (globalThis as any)?.process?.env?.[key] || 
         (typeof process !== 'undefined' ? process.env[key] : '') ||
         '';
  return val.trim().replace(/^['"]|['"]$/g, '').trim();
};

let supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  supabaseUrl = 'https://' + supabaseUrl;
}
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase: Variáveis de ambiente ausentes.", { 
    url: !!supabaseUrl, 
    key: !!supabaseAnonKey 
  });
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
