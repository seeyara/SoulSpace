import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Get environment prefix for table names (server vs client)
export const SUPABASE_ENV_PREFIX =
  typeof window === 'undefined'
    ? process.env.SUPABASE_ENV_PREFIX || ''
    : process.env.NEXT_PUBLIC_SUPABASE_ENV_PREFIX || '';

// Helper to prefix table names
export function prefixedTable(table: string) {
  return SUPABASE_ENV_PREFIX ? `${SUPABASE_ENV_PREFIX}-${table}` : table;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type JournalEntry = {
  id: string;
  user_id: string;
  cuddle_id: string;
  prompt: string;
  response: string;
  created_at: string;
};

export type JournalStreak = {
  date: string;
  has_entry: boolean;
}; 