'use client';

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void> | void;
  onFinishEntry?: () => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  showFinishButton?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const ChatInput = memo(function ChatInput({
  onSendMessage,
  onFinishEntry,
  placeholder = "Type your message...",
  disabled = false,
  isLoading = false,
  maxLength = 5000,
  showFinishButton = true,
  autoFocus = true,
  className = ''
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // Maximum height in pixels
    
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  }, [maxLength]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || disabled || isLoading) return;

    setIsSending(true);
    
    try {
      await onSendMessage(trimmedMessage);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, disabled, isLoading, onSendMessage]);

  // Handle finish entry
  const handleFinish = useCallback(async () => {
    if (!onFinishEntry || isSending || disabled || isLoading) return;

    setIsSending(true);
    
    try {
      await onFinishEntry();
    } catch (error) {
      console.error('Failed to finish entry:', error);
    } finally {
      setIsSending(false);
    }
  }, [onFinishEntry, isSending, disabled, isLoading]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Send on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }, []);

  // Auto-resize on message change
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled) {
      const timeout = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [autoFocus, disabled]);

  const canSend = message.trim().length > 0 && !isSending && !disabled && !isLoading;
  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <div className={`bg-white border-t border-gray-200 ${className}`}>
      <div className="px-4 py-3">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
          {/* Input area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              rows={1}
              className={`
                w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                placeholder:text-gray-400
                ${isNearLimit ? 'border-orange-300 focus:ring-orange-500' : ''}
                ${characterCount >= maxLength ? 'border-red-300 focus:ring-red-500' : ''}
              `}
              style={{ maxHeight: '120px' }}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!canSend}
              className={`
                absolute bottom-2 right-2 p-2 rounded-full transition-all duration-200
                ${canSend
                  ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
                focus:outline-none
              `}
              aria-label="Send message"
            >
              {isSending ? (
                <div className="w-5 h-5">
                  <div className="w-full h-full border-2 border-current border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between">
            {/* Character count */}
            <div className="text-xs text-gray-500">
              <span className={isNearLimit ? 'text-orange-500' : characterCount >= maxLength ? 'text-red-500' : ''}>
                {characterCount}
              </span>
              <span className="text-gray-400">/{maxLength}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              {showFinishButton && onFinishEntry && (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isSending || disabled || isLoading}
                  className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? 'Finishing...' : 'Finish Entry'}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Offline indicator */}
        <AnimatePresence>
          {typeof window !== 'undefined' && !navigator.onLine && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded-lg"
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-orange-700">
                  You're offline. Messages will be sent when connection is restored.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

// Hook for managing input state
export function useChatInput() {
  const [isComposing, setIsComposing] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  
  const saveDraft = useCallback((message: string) => {
    setDraftMessage(message);
    // Could also save to localStorage here
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat-draft', message);
    }
  }, []);
  
  const loadDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem('chat-draft');
      if (draft) {
        setDraftMessage(draft);
        return draft;
      }
    }
    return '';
  }, []);
  
  const clearDraft = useCallback(() => {
    setDraftMessage('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chat-draft');
    }
  }, []);
  
  return {
    isComposing,
    setIsComposing,
    draftMessage,
    saveDraft,
    loadDraft,
    clearDraft
  };
}