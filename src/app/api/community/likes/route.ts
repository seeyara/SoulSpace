import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    const { replyId, userId } = await request.json();

    if (!replyId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from('community_likes')
      .select()
      .eq('reply_id', replyId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      await supabase
        .from('community_likes')
        .delete()
        .eq('reply_id', replyId)
        .eq('user_id', userId);
    } else {
      // Like
      await supabase
        .from('community_likes')
        .insert({
          reply_id: replyId,
          user_id: userId
        });
    }

    // Get updated like count
    const { data: likeCount } = await supabase
      .from('community_likes')
      .select('id', { count: 'exact' })
      .eq('reply_id', replyId);

    return NextResponse.json({
      likes: likeCount?.length || 0,
      is_liked: !existingLike
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
} 