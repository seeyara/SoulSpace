// Custom hook for robust chat message handling
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { storage } from '@/lib/storage';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import type { CuddleId } from '@/types/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  timestamp?: string;
  status?: 'sending' | 'sent' | 'failed';
}

export interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  isLoading: boolean;
  error: string | null;
  retryCount: number;
}

interface UseChatOptions {
  cuddleId: CuddleId;
  userId: string;
  maxRetries?: number;
  retryDelay?: number;
  saveToStorage?: boolean;
}

export function useChat({
  cuddleId,
  userId,
  maxRetries = 3,
  retryDelay = 1000,
  saveToStorage = true
}: UseChatOptions) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isTyping: false,
    isLoading: false,
    error: null,
    retryCount: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const hasHydratedMessagesRef = useRef(false);

  const { queuePersistence, flushBeforeUnload, clearPersistence } = useChatPersistence({
    userId,
    cuddleId,
    mode: 'guided',
    storageEnabled: saveToStorage
  });

  // Generate unique message ID
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Optimistic update - add message immediately to UI
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date().toISOString(),
      status: message.role === 'user' ? 'sending' : 'sent'
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      error: null
    }));

    return newMessage.id;
  }, []);

  // Update message status
  const updateMessageStatus = useCallback((messageId: string, status: ChatMessage['status']) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === messageId ? { ...msg, status } : msg
      )
    }));
  }, []);

  // Remove message
  const removeMessage = useCallback((messageId: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== messageId)
    }));
  }, []);

  // Send message with retry logic
  const sendMessage = useCallback(async (
    content: string,
    options?: { forceEnd?: boolean; isFinishEntry?: boolean }
  ): Promise<{ success: boolean; shouldEnd?: boolean }> => {
    if (!content.trim() && !options?.forceEnd && !options?.isFinishEntry) {
      return { success: false };
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Add user message optimistically
    const userMessageId = addMessage({ role: 'user', content });

    setState(prev => ({ ...prev, isTyping: true, isLoading: true }));

    const attemptSend = async (attempt: number): Promise<{ success: boolean; shouldEnd?: boolean }> => {
      try {
        const userProfile = storage.getUserProfile();
        
        // Filter out intro messages and failed messages
        const messageHistoryToSend = state.messages
          .filter(msg => msg.status !== 'failed')
          .slice(state.messages.length > 2 && 
                 state.messages[0].role === 'assistant' && 
                 state.messages[1].role === 'assistant' ? 2 : 0);

        const response = await axios.post('/api/chat-completion', {
          message: options?.isFinishEntry ? "_finish_entry_" : content,
          cuddleId,
          messageHistory: messageHistoryToSend,
          forceEnd: options?.forceEnd, 
          mode: 'guided'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'x-user-profile': userProfile ? JSON.stringify(userProfile) : ''
          },
          signal: controller.signal,
          timeout: 30000 // 30 second timeout
        });

        const { response: aiResponse, shouldEnd } = response.data;

        // Mark user message as sent
        updateMessageStatus(userMessageId!, 'sent');

        // Handle AI response
        if (typeof aiResponse === 'string') {
          // Single response
          addMessage({ role: 'assistant', content: aiResponse });
        } else if (Array.isArray(aiResponse)) {
          // Multiple responses
          aiResponse.forEach(responseText => {
            addMessage({ role: 'assistant', content: responseText });
          });
        }

        setState(prev => ({ 
          ...prev, 
          isTyping: false, 
          isLoading: false, 
          error: null, 
          retryCount: 0 
        }));

        return { success: true, shouldEnd };

      } catch (error) {
        console.error(`Send attempt ${attempt} failed:`, error);

        // Handle different error types
        if (axios.isCancel(error)) {
          return { success: false };
        }

        if (attempt < maxRetries) {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          return attemptSend(attempt + 1);
        }

        // All retries failed
        updateMessageStatus(userMessageId!, 'failed');
        
        const errorMessage = getErrorMessage(error as AxiosError);
        setState(prev => ({ 
          ...prev, 
          isTyping: false, 
          isLoading: false, 
          error: errorMessage,
          retryCount: prev.retryCount + 1
        }));

        return { success: false };
      }
    };

    return attemptSend(1);
  }, [state.messages, cuddleId, addMessage, updateMessageStatus, maxRetries, retryDelay]);

  // Retry failed message
  const retryMessage = useCallback(async (messageId: string) => {
    const message = state.messages.find(msg => msg.id === messageId);
    if (!message || message.role !== 'user') return;

    // Remove failed message and resend
    removeMessage(messageId);
    return sendMessage(message.content);
  }, [state.messages, removeMessage, sendMessage]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load messages from storage/API
  const loadMessages = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Try loading from storage first
      const storedConversation = storage.getOngoingConversation();
      if (storedConversation?.messages && storedConversation.cuddle === cuddleId) {
        setState(prev => ({
          ...prev,
          messages: storedConversation.messages.map(msg => ({
            ...msg,
            id: msg.id || generateMessageId(),
            status: 'sent' as const
          })),
          isLoading: false
        }));
        return;
      }

      // Load from API if no stored conversation
      const response = await axios.get(`/api/chat?userId=${userId}&date=${new Date().toISOString().split('T')[0]}`);
      
      if (response.data.data?.messages) {
        setState(prev => ({
          ...prev,
          messages: response.data.data.messages.map((msg: { role: 'user' | 'assistant'; content: string }) => ({
            ...msg,
            id: generateMessageId(),
            status: 'sent' as const
          })),
          isLoading: false
        }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load conversation history' 
      }));
    }
  }, [userId, cuddleId]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setState({
      messages: [],
      isTyping: false,
      isLoading: false,
      error: null,
      retryCount: 0
    });

    clearPersistence();
  }, [clearPersistence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      flushBeforeUnload();
    };
  }, [flushBeforeUnload]);

  // Auto-save on message changes
  useEffect(() => {
    if (!hasHydratedMessagesRef.current) {
      hasHydratedMessagesRef.current = true;
      return;
    }

    const persistableMessages = state.messages.filter(msg => msg.status !== 'failed');
    if (persistableMessages.length > 0) {
      queuePersistence(persistableMessages);
    } else if (state.messages.length === 0) {
      clearPersistence();
    }
  }, [state.messages, queuePersistence, clearPersistence]);

  // Ensure pending writes flush before unload/navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      void flushBeforeUnload();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void flushBeforeUnload();
    };
  }, [flushBeforeUnload]);

  return {
    ...state,
    sendMessage,
    retryMessage,
    clearError,
    loadMessages,
    clearConversation,
    addMessage,
    removeMessage
  };
}

// Helper function to get user-friendly error messages
function getErrorMessage(error: AxiosError): string {
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please check your connection and try again.';
  }
  
  if (error.response?.status === 429) {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  
  if (error.response?.status === 500) {
    return 'Server error. Please try again in a few moments.';
  }
  
  if (!navigator.onLine) {
    return 'You appear to be offline. Please check your connection.';
  }
  
  return 'Something went wrong. Please try again.';
}