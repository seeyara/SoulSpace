import { NextResponse } from 'next/server';
import { upsertUser } from '@/lib/utils/journalDb';
import { withRateLimit } from '@/lib/rateLimiter';

export const POST = withRateLimit('users', async (request: Request) => {
  try {
    const { userId, name, cuddleId, cuddleName, cuddleOwnership, lifeStage, gender } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Clean and validate userId - remove any extra quotes or whitespace
    const cleanUserId = userId.toString().trim().replace(/^"|"$/g, '');
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanUserId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    // Use upsertUser utility
    const { data: newUserId, error } = await upsertUser({
      userId: cleanUserId, // Pass cleaned userId here
      name: name,
      cuddleId: cuddleId,
      cuddleName: cuddleName,
      cuddleOwnership: cuddleOwnership,
      lifeStage: lifeStage,
      gender: gender
    });
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    return NextResponse.json(newUserId);
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return NextResponse.json(
      { error: 'Failed to create/update user' },
      { status: 500 }
    );
  }
});
