import { supabase, prefixedTable } from '@/lib/supabase';
import { format } from 'date-fns';

export const MESSAGES_PER_PAGE = 5;

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
}

export interface UnfinishedEntry {
  lastUnfinished: {
    mode: 'guided' | 'free-form';
    content: string;
  };
}

export async function saveChatMessage({ messages, userId, cuddleId }: SaveChatMessageParams) {
  const today = format(new Date(), 'yyyy-MM-dd');
  return await supabase
    .from(prefixedTable('chats'))
    .upsert({
      date: today,
      user_id: userId,
      messages: messages,
      cuddle_id: cuddleId
    }, { onConflict: 'user_id,date' });
}

export async function fetchUnfinishedEntry(userId: string): Promise<UnfinishedEntry | null> {
  try {
    const { data, error } = await supabase
      .from(prefixedTable('chats'))
      .select('messages, cuddle_id')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data && data.messages && data.messages.length > 0) {
      const lastMessage = data.messages[data.messages.length - 1];
      if (lastMessage.role === 'user') {
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
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (data) {
    return {
      messages: data.messages,
      cuddleId: data.cuddle_id,
      hasMore: false
    };
  }
  return null;
} 