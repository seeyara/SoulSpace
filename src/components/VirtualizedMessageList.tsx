'use client';

import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChatMessage, TypingIndicator, ErrorMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat';

interface VirtualizedMessageListProps {
  messages: ChatMessageType[];
  isTyping?: boolean;
  error?: string | null;
  cuddleImage?: string;
  cuddleName?: string;
  onRetryMessage?: (messageId: string) => void;
  onRetryError?: () => void;
  onDismissError?: () => void;
  className?: string;
  autoScroll?: boolean;
}

export const VirtualizedMessageList = memo(function VirtualizedMessageList({
  messages,
  isTyping = false,
  error,
  cuddleImage,
  cuddleName,
  onRetryMessage,
  onRetryError,
  onDismissError,
  className = '',
  autoScroll = true
}: VirtualizedMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Check if user is near bottom of container
  const checkIfNearBottom = useCallback(() => {
    if (!containerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 100; // pixels from bottom
    
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const nearBottom = checkIfNearBottom();
    setIsNearBottom(nearBottom);
    setShouldAutoScroll(nearBottom);
  }, [checkIfNearBottom]);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior,
        block: 'end'
      });
    }
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (autoScroll && shouldAutoScroll && (messages.length > 0 || isTyping)) {
      // Small delay to allow DOM to update
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isTyping, autoScroll, shouldAutoScroll, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('auto');
    }
  }, []); // Only run once on mount

  // Throttled scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', throttledScroll, { passive: true });
    return () => container.removeEventListener('scroll', throttledScroll);
  }, [handleScroll]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-1"
        style={{ 
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain'
        }}
      >
        <AnimatePresence mode="popLayout">
          {/* Regular messages */}
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id || `${message.role}-${index}`}
              message={message}
              cuddleImage={message.role === 'assistant' ? cuddleImage : undefined}
              cuddleName={cuddleName}
              onRetry={onRetryMessage}
              isLatest={index === messages.length - 1}
            />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <TypingIndicator
              key="typing"
              cuddleImage={cuddleImage}
              cuddleName={cuddleName}
            />
          )}

          {/* Error message */}
          {error && (
            <ErrorMessage
              key="error"
              message={error}
              onRetry={onRetryError}
              onDismiss={onDismissError}
            />
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      {!isNearBottom && messages.length > 0 && (
        <div className="absolute bottom-20 right-6 z-10">
          <button
            onClick={() => scrollToBottom()}
            className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-200"
            aria-label="Scroll to bottom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading indicator for message history */}
      {messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Loading conversation...</p>
          </div>
        </div>
      )}
    </div>
  );
});

// Hook for managing scroll behavior
export function useMessageScroll() {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior
      });
    }
  }, []);
  
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 50;
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom && scrollHeight > clientHeight * 1.5);
  }, []);
  
  return {
    containerRef,
    isAtBottom,
    showScrollButton,
    scrollToBottom,
    handleScroll
  };
}