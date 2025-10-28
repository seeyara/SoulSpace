import { NextResponse } from 'next/server';
import { upsertUser } from '@/lib/utils/journalDb';
import { withRateLimit } from '@/lib/rateLimiter';

export const POST = withRateLimit('users', async (request: Request) => {
  try {
    const { userId, profile } = await request.json();

    if (!userId || !profile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Clean and validate userId - remove any extra quotes or whitespace
    const cleanUserId = userId.toString().trim().replace(/^"+|"+$/g, '');

    // Use upsertUser utility for updating profile
    const { data: newUserId, error } = await upsertUser({
      id: cleanUserId,
      ...profile
    });
    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
    return NextResponse.json({ 
      success: true, 
      newUserId 
    });
  } catch (error) {
    console.error('Error in profile update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
