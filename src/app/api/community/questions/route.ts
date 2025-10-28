import { NextResponse } from 'next/server';
import { supabase, prefixedTable } from '@/lib/supabase';
import { withRateLimit } from '@/lib/rateLimiter';

export const GET = withRateLimit('community', async (_request: Request) => {
  void _request;
  try {
    const { data: questionsData, error } = await supabase
      .from(prefixedTable('community_questions'))
      .select(`
        id,
        question,
        created_at,
        tags,
        community_replies (count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedQuestions = questionsData.map(q => ({
      ...q,
      replies: [],
      reply_count: q.community_replies[0].count
    }));

    return NextResponse.json(formattedQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
});
