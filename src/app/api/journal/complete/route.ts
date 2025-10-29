import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/errors';
import { validateRequestBody, CompleteJournalRequestSchema } from '@/lib/validation';
import { getFarewellMessage } from '@/lib/utils/journalCompletion';
import { saveChatMessage } from '@/lib/utils/chatUtils';

export const POST = withErrorHandler(async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.error('Invalid JSON in journal completion request:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }
  const { userId, cuddleId, messages, mode, date } = validateRequestBody(CompleteJournalRequestSchema)(body);

  const sanitizedMessages = messages
    .map(message => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter(message => message.content.length > 0);

  if (sanitizedMessages.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No messages to save' },
      { status: 400 }
    );
  }

  const farewellMessage = getFarewellMessage(cuddleId);
  const finalMessages = [
    ...sanitizedMessages,
    { role: 'assistant' as const, content: farewellMessage },
  ];

  const { error } = await saveChatMessage({
    messages: finalMessages,
    userId,
    cuddleId,
    mode,
    date,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save journal entry' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    farewellMessage,
    messages: finalMessages,
  });
});
