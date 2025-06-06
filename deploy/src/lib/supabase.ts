import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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