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
  mode: 'guided' | 'flat';
}

export interface ChatHistory {
  messages: ChatMessage[];
  cuddleId: string;
  hasMore: boolean;
  totalCount?: number;
  mode?: 'guided' | 'flat';
}

export interface PaginatedChatHistory {
  entries: Array<{
    date: string;
    messages: ChatMessage[];
    cuddleId: string;
    mode?: 'guided' | 'flat';
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

export async function saveChatMessage({ messages, userId, cuddleId, mode: mode }: SaveChatMessageParams) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Trim messages to prevent excessive storage
  const trimmedMessages = messages.slice(-MAX_MESSAGE_HISTORY);

  const payload = {
    date: today,
    user_id: userId,
    messages: trimmedMessages,
    cuddle_id: cuddleId,
    updated_at: new Date().toISOString(), 
    mode: mode
  };

  const result = await supabase
    .from(prefixedTable('chats'))
    .upsert(payload);

  return result;
}

export async function fetchUnfinishedEntry(userId: string): Promise<UnfinishedEntry | null> {
  try {
    // Use optimized query with specific field selection and indexing
    const { data, error } = await supabase
      .from(prefixedTable('chats'))
      .select('messages, cuddle_id, date, mode')
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
        const derivedMode = data.mode === 'flat' ? 'free-form' : 'guided';
        return {
          lastUnfinished: {
            mode: derivedMode,
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

export async function fetchChatHistory(
  date: string,
  userId?: string,
  tempSessionId?: string
): Promise<ChatHistory | null> {
  console.log('Querying with userId:', userId, 'tempSessionId:', tempSessionId, 'and date:', date);

  try {
    // Determine the query based on the available identifier
    let query = supabase
      .from(prefixedTable('chats'))
      .select('messages, cuddle_id, mode')
      .eq('date', date);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (tempSessionId) {
      query = query.eq('temp_session_id', tempSessionId);
    } else {
      console.error('No userId or tempSessionId provided');
      return null;
    }

    // Execute the query
    const { data, error } = await query.maybeSingle();

    // Log the results for debugging
    console.log('Chat data:', data, 'Error:', error);

    if (error) {
      throw error;
    }

    if (data) {
      return {
        messages: data.messages || [],
        cuddleId: data.cuddle_id,
        hasMore: false,
        totalCount: Array.isArray(data.messages) ? data.messages.length : 0,
        mode: data.mode as 'guided' | 'flat' | undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return null;
  }
}

// New function for paginated chat history
export async function fetchPaginatedChatHistory(
  userId: string,
  limit: number = MESSAGES_PER_PAGE,
  cursor?: string
): Promise<PaginatedChatHistory> {
  let query = supabase
    .from(prefixedTable('chats'))
    .select('date, messages, cuddle_id, mode, created_at')
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
    cuddleId: item.cuddle_id,
    mode: item.mode as 'guided' | 'flat' | undefined
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
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  return {
    totalChats: count || 0,
    recentActivity: (data || []).map(chat => chat.date),
    favoriteCompanion
  };
}

export async function generateJournalResponse(
  prompt: string,
  userResponse: string,
  cuddleName: string
): Promise<string> {
  const fallbackMessage = "Thank you for sharing this, it means so much to me 🫶🏼. Im always here for you";

  try {
    const systemPrompt = `You are a warm, caring companion helping users with daily journaling.
The user just responded to today’s journaling prompt.
Write exactly 2 short, conversational sentences:

Gently acknowledge or validate their response (keep it warm but light).

Encourage them to keep reflecting, and casually remind them to return tomorrow to maintain their streak.
Avoid sounding preachy, overly formal, or dramatic — aim for friendly and human.`;

    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt,
        userMessage: `Today's prompt: "${prompt}"\n\nMy response: "${userResponse}"`,
        model: 'gpt-4',
        maxTokens: 150,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      console.log(response.status);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.response?.trim();

    if (!aiMessage) {
      throw new Error('No content in API response');
    }

    console.log('Journal AI response generated successfully');
    return aiMessage;

  } catch (error) {
    console.error('Failed to generate journal response:', error);
    return fallbackMessage;
  }
} 