import type { CuddleId } from '@/types/api';
import type { ChatMessage } from '@/lib/validation';

export interface CompleteJournalEntryPayload {
  userId: string;
  cuddleId: CuddleId;
  messages: ChatMessage[];
  mode?: 'guided' | 'flat';
  date: string;
}

export interface CompleteJournalEntryResponse {
  success: boolean;
  farewellMessage: string;
  messages: ChatMessage[];
}

export async function completeJournalEntry(payload: CompleteJournalEntryPayload): Promise<CompleteJournalEntryResponse> {
  const sanitizedMessages = payload.messages
    .map(message => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter(message => message.content.length > 0);

  if (sanitizedMessages.length === 0) {
    throw new Error('At least one message is required to finish the journal entry');
  }

  const response = await fetch('/api/journal/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      messages: sanitizedMessages,
      mode: payload.mode ?? 'guided',
      date: payload.date,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = typeof errorBody.error === 'string' ? errorBody.error : 'Failed to finish journal entry';
    throw new Error(message);
  }

  return response.json();
}
