// Fetch all chat entry dates for a user (for calendar/streak)
export async function fetchUserChatDates(userId: string, dates: string[]) {
  const { data, error } = await supabase
    .from(prefixedTable('chats'))
    .select('date')
    .eq('user_id', userId)
    .in('date', dates);
  return { data, error };
}
import { supabase, prefixedTable } from '@/lib/supabase';
import { format } from 'date-fns';
import type { CuddleId } from '@/types/api';
import { storage } from '../storage';

export async function upsertFlatJournalEntry({ userId, cuddleId, content }: { userId: string, cuddleId: CuddleId, content: string }) {
  const { error } = await supabase
    .from(prefixedTable('chats'))
    .insert({
      user_id: userId,
      cuddle_id: cuddleId,
      messages: [{ role: 'user', content: content.trim() }],
      date: format(new Date(), 'yyyy-MM-dd'),
      mode: 'flat',
    });
  return { error };
}

export async function upsertGuidedJournalEntry({ userId, cuddleId, content }: { userId: string, cuddleId: CuddleId, content: string }) {
  const { error } = await supabase
    .from(prefixedTable('chats'))
    .insert({
      user_id: userId,
      cuddle_id: cuddleId,
      messages: [{ role: 'user', content: content.trim() }],
      date: format(new Date(), 'yyyy-MM-dd'),
      mode: 'guided',
    });
  return { error };
}

export async function fetchChatHistory(userId: string, date: string) {
  // You can adjust the query as needed for pagination, etc.
  const { data, error } = await supabase
    .from(prefixedTable('chats'))
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function fetchChatHistoryWithTempSessionId(tempSessionId: string, date: string) {
  // You can adjust the query as needed for pagination, etc.
  const { data, error } = await supabase
    .from(prefixedTable('chats'))
    .select('*')
    .eq('temp_session_id', tempSessionId)
    .eq('date', date)
    .order('created_at', { ascending: true });
  return { data, error };
}

// USERS TABLE HELPERS
export async function upsertUser({ userId, email, name, tempSessionId, cuddleId, cuddleName }: {
  email?: string;
  userId?: string;
  name?: string;
  tempSessionId?: string;
  cuddleId?: string;
  cuddleName?: string;
}) {
  let isExistingUser = false;
  
  // If email is provided, check if user already exists
  if (email) {
    const { data: existingUser } = await supabase
      .from(prefixedTable('users'))
      .select('*')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      console.log("Existing user found with email:", email);
      storage.setUserId(existingUser.id);
      isExistingUser = true;
      // Return existing user without creating new record
      return { data: existingUser, error: null, isExistingUser };
    }
  }

   // If tempSessionId is provided, check if user already exists
  if (tempSessionId) {
    const { data: existingUser } = await supabase
      .from(prefixedTable('users'))
      .select('*')
      .eq('temp_session_id', tempSessionId)
      .single();
    
    if (existingUser) {
      console.log("Existing user found with tempSessionId:", tempSessionId);
      storage.setUserId(existingUser.id);
      isExistingUser = true;
      // Return existing user without creating new record
      return { data: existingUser, error: null, isExistingUser };
    }
  }
  
  console.log("No existing user found. Creating new user.");
  const upsertData: Record<string, any> = {};
  if (email) upsertData.email = email;
  if (userId) upsertData.id = userId;
  if (name) upsertData.name = name;
  if (tempSessionId) upsertData.temp_session_id = tempSessionId;
  if (cuddleId) upsertData.cuddle_id = cuddleId;
  if (cuddleName) upsertData.cuddle_name = cuddleName;
  
  const { data, error } = await supabase
    .from(prefixedTable('users'))
    .upsert([upsertData])
    .select()
    .single();
  console.log('Created new user:', data.id);
  if (data) {
    storage.setUserId(data.id);
  }
  return { data, error, isExistingUser };
}

export async function fetchUserById(id: string) {
  const { data, error } = await supabase
    .from(prefixedTable('users'))
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function fetchUserByTempSessionId(id: string) {
  const { data, error } = await supabase
    .from(prefixedTable('users'))
    .select('*')
    .eq('temp_session_id', id)
    .single();
  return { data, error };
}

export async function fetchUserByEmail(email: string) {
  const { data, error } = await supabase
    .from(prefixedTable('users'))
    .select('*')
    .eq('email', email)
    .single();
  return { data, error };
}
