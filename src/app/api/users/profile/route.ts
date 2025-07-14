import { NextResponse } from 'next/server';
import { supabase, prefixedTable } from '@/lib/supabase';

export async function POST(request: Request) {
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

    // Update user profile in Supabase
    const { data, error } = await supabase
      .from(prefixedTable('users'))
      .update({
        age: profile.age,
        gender: profile.gender,
        city: profile.city
      })
      .eq('id', cleanUserId)
      .select();

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Error in profile update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 