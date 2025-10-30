import { supabase, prefixedTable } from '@/lib/supabase';
import { format } from 'date-fns';
import type { CuddleId } from '@/types/api';
import { storage } from '../storage';

// Fetch all chat entry dates for a user (for calendar/streak)
export async function fetchUserChatDates(userId: string, dates: string[]) {
  const { data, error } = await supabase
    .from(prefixedTable('chats'))
    .select('date')
    .eq('user_id', userId)
    .in('date', dates);
  return { data, error };
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
    .select('id, user_id, temp_session_id, date, messages, cuddle_id, mode, created_at, updated_at')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function fetchChatHistoryWithTempSessionId(tempSessionId: string, date: string) {
  // You can adjust the query as needed for pagination, etc.
  const { data, error } = await supabase
    .from(prefixedTable('chats'))
    .select('id, user_id, temp_session_id, date, messages, cuddle_id, mode, created_at, updated_at')
    .eq('temp_session_id', tempSessionId)
    .eq('date', date)
    .order('created_at', { ascending: true });
  return { data, error };
}

// USERS TABLE HELPERS
interface UpsertUserProfileFields {
  cuddleOwnership?: string;
  gender?: string;
  lifeStage?: string;
}

interface UpsertUserParams {
  email?: string;
  userId?: string;
  name?: string;
  tempSessionId?: string;
  cuddleId?: string;
  cuddleName?: string;
  profile?: UpsertUserProfileFields;
  cuddleOwnership?: string;
  gender?: string;
  lifeStage?: string;
}

export async function upsertUser({
  userId,
  email,
  name,
  tempSessionId,
  cuddleId,
  cuddleName,
  profile,
  cuddleOwnership,
  gender,
  lifeStage,
}: UpsertUserParams) {
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
  const upsertData: Record<string, unknown> = {};
  if (email) upsertData.email = email;
  if (userId) upsertData.id = userId;
  if (name) upsertData.name = name;
  if (tempSessionId) upsertData.temp_session_id = tempSessionId;
  if (cuddleId) upsertData.cuddle_id = cuddleId;
  if (cuddleName) upsertData.cuddle_name = cuddleName;

  const mergedProfile: UpsertUserProfileFields = {
    cuddleOwnership: profile?.cuddleOwnership ?? cuddleOwnership,
    gender: profile?.gender ?? gender,
    lifeStage: profile?.lifeStage ?? lifeStage,
  };

  if (mergedProfile.cuddleOwnership) {
    upsertData.cuddle_ownership = mergedProfile.cuddleOwnership;
  }
  if (mergedProfile.gender) {
    upsertData.gender = mergedProfile.gender;
  }
  if (mergedProfile.lifeStage) {
    upsertData.life_stage = mergedProfile.lifeStage;
  }

  const { data, error } = await supabase
    .from(prefixedTable('users'))
    .upsert([upsertData])
    .select()
    .single();

  if (data) {
    console.log('Created new user:', data.id);
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

interface UpsertUserProfileParams {
  userId?: string;
  tempSessionId?: string;
  profile: UpsertUserProfileFields;
}

const normalizeProfileForStorage = (profile: UpsertUserProfileFields) => {
  const normalized: Record<string, string> = {};

  if (profile.cuddleOwnership) {
    normalized.cuddle_ownership = profile.cuddleOwnership;
  }

  if (profile.gender) {
    normalized.gender = profile.gender;
  }

  if (profile.lifeStage) {
    normalized.life_stage = profile.lifeStage;
  }

  return normalized;
};

export async function upsertUserProfile({ userId, tempSessionId, profile }: UpsertUserProfileParams) {
  if (!userId && !tempSessionId) {
    throw new Error('A user identifier is required to update the profile.');
  }

  const profileData = normalizeProfileForStorage(profile);
  const upsertData: Record<string, unknown> = {
    ...profileData,
    updated_at: format(new Date(), 'yyyy-MM-dd'),
  };

  if (userId) {
    upsertData.id = userId;
  }

  if (tempSessionId) {
    upsertData.temp_session_id = tempSessionId;
  }

  const conflictTarget = userId ? 'id' : 'temp_session_id';

  const { data, error } = await supabase
    .from(prefixedTable('users'))
    .upsert(upsertData, { onConflict: conflictTarget })
    .select('id, temp_session_id, cuddle_ownership, gender, life_stage, cuddle_name, cuddle_id')
    .single();

  return { data, error };
}

interface FetchUserProfileParams {
  userId?: string;
  tempSessionId?: string;
}

export async function fetchUserProfile({ userId, tempSessionId }: FetchUserProfileParams) {
  if (!userId && !tempSessionId) {
    throw new Error('A user identifier is required to fetch the profile.');
  }

  const query = supabase
    .from(prefixedTable('users'))
    .select('id, temp_session_id, cuddle_ownership, gender, life_stage, cuddle_name, cuddle_id');

  if (userId) {
    query.eq('id', userId);
  } else if (tempSessionId) {
    query.eq('temp_session_id', tempSessionId);
  }

  const { data, error } = await query.single();

  return { data, error };
}
