import { NextResponse } from 'next/server';
import { saveChatMessage, fetchUnfinishedEntry, fetchChatHistory } from '@/lib/utils/chatUtils';

// Save chat messages
export async function POST(request: Request) {
  try {
    const { messages, userId, cuddleId } = await request.json();
    const { data, error } = await saveChatMessage({ messages, userId, cuddleId });

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
    // const page = parseInt(searchParams.get('page') || '1');
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
        const unfinishedData = await fetchUnfinishedEntry(userId);
        if (unfinishedData) {
          return NextResponse.json({ data: unfinishedData });
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

    const chatData = await fetchChatHistory(userId, date);
    if (chatData) {
      return NextResponse.json({ data: chatData });
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