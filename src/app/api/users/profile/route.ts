import { NextResponse } from 'next/server';
import { fetchUserById, upsertUser } from '@/lib/utils/journalDb';
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
      userId: cleanUserId,
      profile,
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
      newUserId,
      profile,
    });
  } catch (error) {
    console.error('Error in profile update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const GET = withRateLimit('users', async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const cleanUserId = userId.toString().trim().replace(/^"+|"+$/g, '');

    const { data, error } = await fetchUserById(cleanUserId);

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return NextResponse.json({ profile: null });
      }
      console.error('Error fetching user profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ profile: null });
    }

    const responseProfile = {
      cuddleOwnership: data.cuddle_ownership ?? null,
      gender: data.gender ?? null,
      lifeStage: data.life_stage ?? data.lifestage ?? null,
    };

    return NextResponse.json({ profile: responseProfile });
  } catch (error) {
    console.error('Error retrieving profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
