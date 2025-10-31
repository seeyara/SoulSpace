import { NextResponse } from 'next/server';
import { fetchUserProfile, upsertUserProfile } from '@/lib/utils/journalDb';
import { withRateLimit } from '@/lib/rateLimiter';

export const POST = withRateLimit('users', async (request: Request) => {
  try {
    const { userId, tempSessionId, email, profile } = await request.json();

    if (!profile || (!userId && !tempSessionId)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const cleanUserId = userId
      ? userId.toString().trim().replace(/^"+|"+$/g, '')
      : undefined;
    const cleanTempSessionId = tempSessionId
      ? tempSessionId.toString().trim().replace(/^"+|"+$/g, '')
      : undefined;

    const cleanEmail = typeof email === 'string'
      ? email.trim().replace(/^"+|"+$/g, '').toLowerCase()
      : undefined;

    const { data, error } = await upsertUserProfile({
      userId: cleanUserId,
      email: cleanEmail,
      tempSessionId: cleanTempSessionId,
      profile,
    });

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    const responseProfile = {
      cuddleOwnership: data?.cuddle_ownership ?? null,
      gender: data?.gender ?? null,
      lifeStage: data?.life_stage ?? null,
    };

    return NextResponse.json({
      success: true,
      userId: data?.id ?? cleanUserId ?? null,
      tempSessionId: data?.temp_session_id ?? cleanTempSessionId ?? null,
      profile: responseProfile,
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
    const tempSessionId = searchParams.get('tempSessionId');
    const email = searchParams.get('email');

    if (!userId && !email && !tempSessionId) {
      return NextResponse.json({ error: 'A user identifier is required' }, { status: 400 });
    }

    const cleanUserId = userId
      ? userId.toString().trim().replace(/^"+|"+$/g, '')
      : undefined;
    const cleanTempSessionId = tempSessionId
      ? tempSessionId.toString().trim().replace(/^"+|"+$/g, '')
      : undefined;

    const cleanEmail = email
      ? email.toString().trim().replace(/^"+|"+$/g, '').toLowerCase()
      : undefined;

    const { data, error } = await fetchUserProfile({
      userId: cleanUserId,
      tempSessionId: cleanTempSessionId,
      email: cleanEmail,
    });

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
      lifeStage: data.life_stage ?? null,
    };

    return NextResponse.json({
      profile: responseProfile,
      userId: data.id ?? null,
      tempSessionId: data.temp_session_id ?? null,
    });
  } catch (error) {
    console.error('Error retrieving profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
