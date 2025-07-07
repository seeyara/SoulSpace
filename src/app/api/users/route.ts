import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId, name, cuddleId, cuddleName } = await request.json();

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

    // Prepare update data
    const updateData: Record<string, unknown> = {
      id: cleanUserId,
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) {
      updateData.name = name || 'Username';
    }

    if (cuddleId !== undefined) {
      updateData.cuddle_id = cuddleId;
    }

    if (cuddleName !== undefined) {
      updateData.cuddle_name = cuddleName;
    }

    // Create or update user
    const { data, error } = await supabase
      .from('users')
      .upsert(updateData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return NextResponse.json(
      { error: 'Failed to create/update user' },
      { status: 500 }
    );
  }
} 