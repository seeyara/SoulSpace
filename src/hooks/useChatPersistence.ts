import { useCallback, useEffect, useRef } from 'react';
import { storage } from '@/lib/storage';
import { saveChatMessage } from '@/lib/utils/chatUtils';
import type { CuddleId } from '@/types/api';

export type PersistableMessage = {
  role: 'user' | 'assistant';
  content: string;
  [key: string]: unknown;
};

interface ChatPersistenceOptions {
  userId?: string;
  cuddleId: CuddleId;
  mode: 'guided' | 'flat';
  storageEnabled?: boolean;
  debounceMs?: number;
}

interface QueuePersistenceOptions {
  immediate?: boolean;
  mode?: 'guided' | 'flat';
  cuddleId?: CuddleId;
  saveToStorage?: boolean;
}

interface ChatPersistenceService {
  queuePersistence: (
    messages: PersistableMessage[],
    options?: QueuePersistenceOptions
  ) => Promise<boolean>;
  flushBeforeUnload: () => Promise<boolean>;
  clearPersistence: () => void;
}

export function useChatPersistence({
  userId,
  cuddleId,
  mode,
  storageEnabled = true,
  debounceMs = 800
}: ChatPersistenceOptions): ChatPersistenceService {
  const latestMessagesRef = useRef<PersistableMessage[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextRef = useRef({ userId, cuddleId, mode });

  useEffect(() => {
    contextRef.current.userId = userId;
  }, [userId]);

  useEffect(() => {
    contextRef.current.cuddleId = cuddleId;
  }, [cuddleId]);

  useEffect(() => {
    contextRef.current.mode = mode;
  }, [mode]);

  const persistToSupabase = useCallback(async () => {
    const { userId: activeUserId, cuddleId: activeCuddleId, mode: activeMode } = contextRef.current;

    if (!activeUserId) {
      return false;
    }

    const sanitizedMessages = latestMessagesRef.current
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .map(message => ({
        role: message.role,
        content: typeof message.content === 'string' ? message.content : ''
      }))
      .filter(message => message.content.trim().length > 0);

    if (sanitizedMessages.length === 0) {
      return true;
    }

    try {
      const { error } = await saveChatMessage({
        messages: sanitizedMessages,
        userId: activeUserId,
        cuddleId: activeCuddleId,
        mode: activeMode
      });

      if (error) {
        console.error('Failed to persist chat messages:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to persist chat messages:', error);
      return false;
    }
  }, []);

  const queuePersistence = useCallback<ChatPersistenceService['queuePersistence']>(
    (messages, options) => {
      const effectiveMessages = Array.isArray(messages)
        ? messages.filter(message => (message as { status?: string }).status !== 'failed')
        : [];

      latestMessagesRef.current = effectiveMessages;

      if (options?.mode) {
        contextRef.current.mode = options.mode;
      }

      if (options?.cuddleId) {
        contextRef.current.cuddleId = options.cuddleId;
      }

      const shouldStore = options?.saveToStorage ?? storageEnabled;
      if (shouldStore) {
        if (effectiveMessages.length > 0) {
          storage.setOngoingConversation({
            messages: effectiveMessages,
            cuddle: contextRef.current.cuddleId
          });
        } else {
          storage.removeOngoingConversation();
        }
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (options?.immediate) {
        return persistToSupabase();
      }

      return new Promise<boolean>(resolve => {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          persistToSupabase().then(resolve).catch(() => resolve(false));
        }, debounceMs);
      });
    },
    [debounceMs, persistToSupabase, storageEnabled]
  );

  const flushBeforeUnload = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    return persistToSupabase();
  }, [persistToSupabase]);

  const clearPersistence = useCallback(() => {
    latestMessagesRef.current = [];

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (storageEnabled) {
      storage.clearOngoingConversation();
    }
  }, [storageEnabled]);

  return {
    queuePersistence,
    flushBeforeUnload,
    clearPersistence
  };
}
