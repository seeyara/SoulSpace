import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');

  if (!questionId) {
    return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
  }

  try {
    const { data: repliesData, error } = await supabase
      .from('community_replies')
      .select(`
        id,
        content,
        created_at,
        user_name,
        community_likes (count)
      `)
      .eq('question_id', questionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const userId = request.headers.get('x-user-id');
    
    // Get likes for current user if logged in
    let likedReplyIds = new Set();
    if (userId) {
      const { data: userLikes } = await supabase
        .from('community_likes')
        .select('reply_id')
        .eq('user_id', userId);

      likedReplyIds = new Set(userLikes?.map(like => like.reply_id) || []);
    }

    const formattedReplies = repliesData.map(reply => ({
      ...reply,
      likes: reply.community_likes[0].count,
      is_liked: likedReplyIds.has(reply.id)
    }));

    return NextResponse.json(formattedReplies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { questionId, content, userId } = await request.json();

    if (!questionId || !content || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use default name if user hasn't set one
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    const userName = userData?.name || 'Username';

    const { data: reply, error } = await supabase
      .from('community_replies')
      .insert({
        question_id: questionId,
        content,
        user_name: userName,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(reply);
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
  }
} 