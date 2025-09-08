import { NextResponse } from 'next/server';
import { saveChatMessage, fetchUnfinishedEntry, fetchChatHistory } from '@/lib/utils/chatUtils';
import { withErrorHandler } from '@/lib/errors';
import { withRateLimit } from '@/lib/rateLimiter';
import { SaveChatRequestSchema, GetChatRequestSchema, validateRequestBody, validateQueryParams } from '@/lib/validation';
import * as Sentry from "@sentry/nextjs";

// Save chat messages
export const POST = withRateLimit('chat', withErrorHandler(async (request: Request) => {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    Sentry.captureException(error);
    console.error('Invalid JSON in request body:', error);
    return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 });
  }
  let validatedData;
  try {
    validatedData = validateRequestBody(SaveChatRequestSchema)(body);
  } catch (error) {
    Sentry.captureException(error);
    console.error('Validation error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
  const { messages, userId, cuddleId } = validatedData;

  const { data, error } = await saveChatMessage({ 
    messages, 
    userId, 
    cuddleId, 
    mode: validatedData.mode ?? 'flat' // default to 'flat' if undefined
  });

  if (error) {
    console.error('Supabase error:', error);
    Sentry.captureException(error);
    return NextResponse.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}));

// Get chat history with pagination
export const GET = withRateLimit('chat', withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const validatedParams = validateQueryParams(GetChatRequestSchema)(searchParams);
  const { userId, date, unfinished } = validatedParams;

  // Handle unfinished parameter
  if (unfinished === '1') {
    const unfinishedData = await fetchUnfinishedEntry(userId);
    return NextResponse.json({ data: unfinishedData || null });
  }

  const chatData = await fetchChatHistory(date!, userId);
  return NextResponse.json({ data: chatData || null });
})); 