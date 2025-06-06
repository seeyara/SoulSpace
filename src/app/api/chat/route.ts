import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

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

// Get chat history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId || !date) {
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
      return NextResponse.json({ 
        data: {
          messages: data.messages,
          cuddleId: data.cuddle_id
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