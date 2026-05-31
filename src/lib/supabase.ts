import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  return import.meta.env[key] || 
         (globalThis as any)?.process?.env?.[key] || 
         (typeof process !== 'undefined' ? process.env[key] : '') ||
         '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase: Variáveis de ambiente ausentes.", { 
    url: !!supabaseUrl, 
    key: !!supabaseAnonKey 
  });
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
