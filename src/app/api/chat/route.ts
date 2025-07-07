import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

const MESSAGES_PER_PAGE = 5;

// Save chat messages
export async function POST(request: Request) {
  try {
    const { messages, userId, cuddleId } = await request.json();
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('chats')
      .upsert({
        date: today,
        user_id: userId,
        messages: messages,
        cuddle_id: cuddleId
      });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving chat:', error);
    return NextResponse.json(
      { error: 'Failed to save chat' },
      { status: 500 }
    );
  }
}

// Get chat history with pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const page = parseInt(searchParams.get('page') || '1');
    const unfinished = searchParams.get('unfinished');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Handle unfinished parameter
    if (unfinished === '1') {
      try {
        const { data, error } = await supabase
          .from('chats')
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
          // Check if the last message is from the user (indicating an unfinished conversation)
          if (lastMessage.role === 'user') {
            return NextResponse.json({
              data: {
                lastUnfinished: {
                  mode: 'guided',
                  content: lastMessage.content
                }
              }
            });
          }
        }

        return NextResponse.json({ data: null });
      } catch (error) {
        console.error('Error fetching unfinished entry:', error);
        return NextResponse.json({ data: null });
      }
    }

    // Regular chat history fetch
    if (!date) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('chats')
      .select('messages, cuddle_id')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is the "not found" error code
      throw error;
    }

    if (data) {
      const allMessages = data.messages;
      const startIndex = Math.max(0, allMessages.length - (page * MESSAGES_PER_PAGE));
      const endIndex = Math.max(0, allMessages.length - ((page - 1) * MESSAGES_PER_PAGE));
      const paginatedMessages = allMessages.slice(startIndex, endIndex);

      return NextResponse.json({ 
        data: {
          messages: paginatedMessages,
          cuddleId: data.cuddle_id,
          hasMore: startIndex > 0
        }
      });
    }

    return NextResponse.json({ data: null });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
} 