import { NextResponse } from 'next/server';
import { supabase, prefixedTable } from '@/lib/supabase';
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    console.log("Table " + prefixedTable('chats'));
    // Get all chat data joined with user emails
    const { data: allChats, error: chatsError } = await supabase
      .from(prefixedTable('chats'))
      .select(`
    user_id,
    date,
    cuddle_id,
    messages,
    updated_at,
    ${prefixedTable('users')}!${prefixedTable('chats')}_user_id_fkey (
      email
    )
  `)
      .order('date', { ascending: true });


    if (chatsError) {
      console.error('Error fetching chats with user emails:', chatsError);
      throw chatsError;
    }

    const chats = allChats || [];

    // 1. Daily Active Journalers (last 30 days)
    const dailyActiveData = calculateDailyActiveJournalers(chats);

    // 2. Total Unique Users
    const totalUniqueUsers = new Set(chats.map(chat => (chat as any)[prefixedTable('users')].email)).size;

    // 3. Cohort Retention (weekly cohorts)
    const cohortRetention = calculateCohortRetention(chats);

    // 4. Streak Leaderboard
    const streakLeaderboard = calculateStreakLeaderboard(chats);

    // 5. Prompt-level Engagement (cuddle companion usage)
    const promptEngagement = calculatePromptEngagement(chats);

    return NextResponse.json({
      dailyActiveJournalers: dailyActiveData,
      totalUniqueUsers,
      cohortRetention,
      streakLeaderboard,
      promptEngagement,
    });

  } catch (error) {
    Sentry.captureException(error);
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

function calculateDailyActiveJournalers(chats: any[]) {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const dailyData = new Map<string, Set<string>>();

  chats
    .filter(chat => new Date(chat.date) >= last30Days)
    .forEach(chat => {
      if (!dailyData.has(chat.date)) {
        dailyData.set(chat.date, new Set());
      }
      dailyData.get(chat.date)!.add(chat.user_id);
    });

  // Fill in missing dates with 0
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    result.push({
      date: dateStr,
      activeUsers: dailyData.get(dateStr)?.size || 0
    });
  }

  return result;
}

function calculateCohortRetention(chats: any[]) {
  const weeks = [];
  const today = new Date();

  // Last 4 weeks
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const weeklyUsers = new Set(
      chats
        .filter(chat => chat.date >= weekStartStr && chat.date <= weekEndStr)
        .map(chat => chat.user_id)
    );

    const firstWeekUsers: number = i === 3 ? weeklyUsers.size : weeks[0]?.activeUsers || 1;
    const retentionRate = firstWeekUsers > 0 ? Math.round((weeklyUsers.size / firstWeekUsers) * 100) : 0;

    weeks.push({
      week: `Week ${4 - i}`,
      activeUsers: weeklyUsers.size,
      retentionRate: i === 3 ? 100 : retentionRate
    });
  }

  return weeks;
}

function calculateStreakLeaderboard(chats: any[]) {
  const userDates = new Map<string, Set<string>>();

  // Group dates by user
  chats.forEach(chat => {
    if (!userDates.has(chat.user_id)) {
      userDates.set(chat.user_id, new Set());
    }
    userDates.get(chat.user_id)!.add(chat.date);
  });

  const userStreaks: Array<{ email: string; streak: number; totalEntries: number }> = [];

  userDates.forEach((dates, userId) => {
    const sortedDates = Array.from(dates).sort();
    let currentStreak = 0;
    let maxStreak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }

      maxStreak = Math.max(maxStreak, currentStreak);
    }

    const email = chats.find(chat => chat.user_id === userId)?.users?.email || 'Unknown';
    userStreaks.push({
      email: email,
      streak: maxStreak,
      totalEntries: dates.size,
    });
  });

  return userStreaks
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 10);
}

function calculatePromptEngagement(chats: any[]) {
  const cuddleEngagement = new Map<string, number>();

  chats.forEach(chat => {
    const count = cuddleEngagement.get(chat.cuddle_id) || 0;
    cuddleEngagement.set(chat.cuddle_id, count + 1);
  });

  // Map cuddle IDs to readable names
  const cuddleNames: { [key: string]: string } = {
    'ellie-jr': 'Ellie Jr.',
    'ellie-sr': 'Ellie Sr.',
    'olly-jr': 'Olly Jr.',
    'olly-sr': 'Olly Sr.',
  };

  return Array.from(cuddleEngagement.entries())
    .map(([cuddleId, count]) => ({
      prompt: cuddleNames[cuddleId] || cuddleId,
      count
    }))
    .sort((a, b) => b.count - a.count);
}