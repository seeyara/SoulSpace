import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateAnonymousName } from '@/lib/utils/nameGenerator';

export async function POST(request: Request) {
  try {
    const { userId, name } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Create or update user with name
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        name: name || generateAnonymousName(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Store in localStorage as well
    if (typeof window !== 'undefined') {
      localStorage.setItem('soul_journal_anonymous_name', data.name);
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