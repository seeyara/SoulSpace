import { storage, STORAGE_KEYS } from './storage';
import type { CuddleId } from '@/types/api';

describe('StorageManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clears the ongoing conversation key', () => {
    const cuddleId: CuddleId = 'ellie-sr';

    storage.setOngoingConversation({
      cuddle: cuddleId,
      messages: [
        {
          role: 'user',
          content: 'Hello there!'
        }
      ]
    });

    expect(localStorage.getItem(STORAGE_KEYS.ONGOING_CONVERSATION)).not.toBeNull();

    const result = storage.clearOngoingConversation();

    expect(result).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.ONGOING_CONVERSATION)).toBeNull();
  });
});
