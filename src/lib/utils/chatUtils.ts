import { supabase, prefixedTable } from '@/lib/supabase';
import { format } from 'date-fns';

export const MESSAGES_PER_PAGE = 20;
export const MAX_MESSAGE_HISTORY = 100;

// Types
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export interface SaveChatMessageParams {
  messages: ChatMessage[];
  userId: string;
  cuddleId: string;
}

export interface ChatHistory {
  messages: ChatMessage[];
  cuddleId: string;
  hasMore: boolean;
  totalCount?: number;
}

export interface PaginatedChatHistory {
  entries: Array<{
    date: string;
    messages: ChatMessage[];
    cuddleId: string;
  }>;
  hasMore: boolean;
  nextCursor?: string;
  totalCount: number;
}

export interface UnfinishedEntry {
  lastUnfinished: {
    mode: 'guided' | 'free-form';
    content: string;
  };
}

export async function saveChatMessage({ messages, userId, cuddleId }: SaveChatMessageParams) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Trim messages to prevent excessive storage
  const trimmedMessages = messages.slice(-MAX_MESSAGE_HISTORY);
  
  return await supabase
    .from(prefixedTable('chats'))
    .upsert({
      date: today,
      user_id: userId,
      messages: trimmedMessages,
      cuddle_id: cuddleId,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'user_id,date',
      ignoreDuplicates: false 
    });
}

export async function fetchUnfinishedEntry(userId: string): Promise<UnfinishedEntry | null> {
  try {
    // Use optimized query with specific field selection and indexing
    const { data, error } = await supabase
      .from(prefixedTable('chats'))
      .select('messages, cuddle_id, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors

    if (error) {
      throw error;
    }

    if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
      const lastMessage = data.messages[data.messages.length - 1];
      if (lastMessage?.role === 'user' && lastMessage?.content) {
        return {
          lastUnfinished: {
            mode: 'guided',
            content: lastMessage.content
          }
        };
      }
    }
    return null;
  } catch (error) {
    throw error;
  }
}

export async function fetchChatHistory(userId: string, date: string): Promise<ChatHistory | null> {
  const { data, error } = await supabase
    .from(prefixedTable('chats'))
    .select('messages, cuddle_id')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return {
      messages: data.messages || [],
      cuddleId: data.cuddle_id,
      hasMore: false,
      totalCount: Array.isArray(data.messages) ? data.messages.length : 0
    };
  }
  return null;
}

// New function for paginated chat history
export async function fetchPaginatedChatHistory(
  userId: string,
  limit: number = MESSAGES_PER_PAGE,
  cursor?: string
): Promise<PaginatedChatHistory> {
  let query = supabase
    .from(prefixedTable('chats'))
    .select('date, messages, cuddle_id, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  // Add cursor-based pagination
  if (cursor) {
    query = query.lt('date', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const entries = (data || []).map(item => ({
    date: item.date,
    messages: item.messages || [],
    cuddleId: item.cuddle_id
  }));

  const hasMore = entries.length === limit;
  const nextCursor = hasMore && entries.length > 0 
    ? entries[entries.length - 1].date 
    : undefined;

  return {
    entries,
    hasMore,
    nextCursor,
    totalCount: entries.length
  };
}

// New function to get user's chat statistics
export async function fetchUserChatStats(userId: string): Promise<{
  totalChats: number;
  recentActivity: string[];
  favoriteCompanion?: string;
}> {
  const { data, error, count } = await supabase
    .from(prefixedTable('chats'))
    .select('date, cuddle_id', { count: 'exact' })
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30); // Last 30 days for recent activity

  if (error) {
    throw error;
  }

  // Calculate favorite companion
  const companionCounts = (data || []).reduce((acc, chat) => {
    acc[chat.cuddle_id] = (acc[chat.cuddle_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const favoriteCompanion = Object.entries(companionCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0];

  return {
    totalChats: count || 0,
    recentActivity: (data || []).map(chat => chat.date),
    favoriteCompanion
  };
} 