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

export async function upsertFlatJournalEntry({ userId, cuddleId, content }: { userId: string, cuddleId: CuddleId, content: string }) {
  const { error } = await supabase
    .from(prefixedTable('chats'))
    .insert({
      user_id: userId,
      cuddle_id: cuddleId,
      messages: [{ role: 'user' as const, content: content.trim() }],
      date: format(new Date(), 'yyyy-MM-dd'),
      mode: 'flat',
    });
  return { error };
}

export async function upsertGuidedJournalEntry({ userId, cuddleId, messages }: { 
  userId: string, 
  cuddleId: CuddleId, 
  messages: Array<{ role: 'user' | 'assistant', content: string }> 
}) {
  const { error } = await supabase
    .from(prefixedTable('chats'))
    .insert({
      user_id: userId,
      cuddle_id: cuddleId,
      messages: messages,
      date: format(new Date(), 'yyyy-MM-dd'),
      mode: 'guided',
    });
  return { error };
}

export async function fetchChatHistory({ userId, date }: { userId: string, date: string }) {
  // You can adjust the query as needed for pagination, etc.
  const { data, error } = await supabase
    .from(prefixedTable('chats'))
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true });
  return { data, error };
}

// USERS TABLE HELPERS

export async function upsertUser({ id, email, name, tempSessionId, cuddleId, cuddleName }: {
  id?: string;
  email: string; // Make email required since database requires it
  name?: string;
  tempSessionId?: string;
  cuddleId?: string;
  cuddleName?: string;
}) {
  let isExistingUser = false;
  
  // Check if user already exists by email (since email is unique)
  const { data: existingUser } = await supabase
    .from(prefixedTable('users'))
    .select('*')
    .eq('email', email)
    .single();
  
  if (existingUser) {
    isExistingUser = true;
    
    // If updating existing user, only update non-null fields
    const updateData: Record<string, string> = {};
    if (name) updateData.name = name;
    if (tempSessionId) updateData.temp_session_id = tempSessionId;
    if (cuddleId) updateData.cuddle_id = cuddleId;
    if (cuddleName) updateData.cuddle_name = cuddleName;
    
    // Only update if there are fields to update
    if (Object.keys(updateData).length > 0) {
      const { data: updatedUser, error: updateError } = await supabase
        .from(prefixedTable('users'))
        .update(updateData)
        .eq('id', existingUser.id)
        .select()
        .single();
      
      return { data: updatedUser || existingUser, error: updateError, isExistingUser };
    }
    
    // Return existing user without updates
    return { data: existingUser, error: null, isExistingUser };
  }
  
  // Create new user - email is required
  const insertData: Record<string, string> = {
    email: email, // Required field
    name: name || 'Username', // Provide default name if not specified
  };
  
  if (id) insertData.id = id;
  if (tempSessionId) insertData.temp_session_id = tempSessionId;
  if (cuddleId) insertData.cuddle_id = cuddleId;
  if (cuddleName) insertData.cuddle_name = cuddleName;
  
  const { data, error } = await supabase
    .from(prefixedTable('users'))
    .insert(insertData)
    .select()
    .single();
    
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

export async function fetchUserByEmail(email: string) {
  const { data, error } = await supabase
    .from(prefixedTable('users'))
    .select('*')
    .eq('email', email)
    .single();
  return { data, error };
}
