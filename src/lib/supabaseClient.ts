import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = 'CRITICAL: Supabase environment variables are missing! Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your Vercel project settings.';
  console.error(msg);
  // We throw an error here so the global error handler in main.tsx catches it and displays it on screen
  throw new Error(msg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

