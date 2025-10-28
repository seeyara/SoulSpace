import { NextResponse } from 'next/server';
import { supabase, prefixedTable } from '@/lib/supabase';
import { withRateLimit } from '@/lib/rateLimiter';

export const GET = withRateLimit('debugData', async (_request: Request) => {
  void _request;
  try {
    // Get all users with their basic info
    const { data: users, error: usersError } = await supabase
      .from(prefixedTable('users'))
      .select('id, email, name, temp_session_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (usersError) {
      console.error('Users query error:', usersError);
    }

    // Get sample chats with user_id
    const { data: chats, error: chatsError } = await supabase
      .from(prefixedTable('chats'))
      .select('id, user_id, date, cuddle_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (chatsError) {
      console.error('Chats query error:', chatsError);
    }

    // Get unique user_ids from chats
    const uniqueUserIds = [...new Set(chats?.map(c => c.user_id) || [])];
    
    // Check which chat user_ids exist in users table
    const userIds = new Set(users?.map(u => u.id) || []);
    const orphanedChatUserIds = uniqueUserIds.filter(id => !userIds.has(id));
    const validChatUserIds = uniqueUserIds.filter(id => userIds.has(id));

    // Count totals
    const { count: totalUsers } = await supabase
      .from(prefixedTable('users'))
      .select('*', { count: 'exact', head: true });

    const { count: totalChats } = await supabase
      .from(prefixedTable('chats'))
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      summary: {
        totalUsers,
        totalChats,
        uniqueChatUserIds: uniqueUserIds.length,
        orphanedChats: orphanedChatUserIds.length,
        validChats: validChatUserIds.length
      },
      users: users || [],
      chats: chats || [],
      orphanedChatUserIds,
      validChatUserIds,
      analysis: {
        issue: orphanedChatUserIds.length > 0 
          ? `${orphanedChatUserIds.length} chat entries have user_ids that don't exist in users table`
          : 'All chat user_ids match existing users'
      }
    });

  } catch (error) {
    console.error('Debug query error:', error);
    return NextResponse.json(
      { error: 'Failed to query database', details: error },
      { status: 500 }
    );
  }
});
