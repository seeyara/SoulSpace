'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat';

interface ChatMessageProps {
  message: ChatMessageType;
  cuddleImage?: string;
  cuddleName?: string;
  onRetry?: (messageId: string) => void;
  isLatest?: boolean;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  cuddleImage,
  cuddleName,
  onRetry,
  isLatest = false
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-start max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isUser && cuddleImage && (
          <div className="flex-shrink-0 mr-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100">
              <Image
                src={cuddleImage}
                alt={cuddleName || 'Companion'}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div className="relative">
          <div
            className={`
              px-4 py-3 rounded-2xl relative
              ${isUser 
                ? 'bg-purple-600 text-white rounded-br-md' 
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }
              ${isFailed ? 'bg-red-100 border-2 border-red-300' : ''}
              ${isSending ? 'opacity-60' : ''}
              transition-all duration-200
            `}
          >
            {/* Message content */}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>

            {/* Status indicators */}
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center space-x-2">
                {/* Timestamp */}
                {message.timestamp && (
                  <span className={isUser ? 'text-purple-200' : 'text-gray-500'}>
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                )}

                {/* Status icons */}
                {isSending && (
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}

                {message.status === 'sent' && isUser && (
                  <svg className="w-3 h-3 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}

                {isFailed && (
                  <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Retry button for failed messages */}
              {isFailed && onRetry && message.id && (
                <button
                  onClick={() => onRetry(message.id!)}
                  className="text-red-600 hover:text-red-800 underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded"
                  aria-label="Retry sending message"
                >
                  Retry
                </button>
              )}
            </div>
          </div>

          {/* Tail for speech bubble */}
          <div
            className={`
              absolute top-3 w-0 h-0
              ${isUser 
                ? 'right-0 border-l-8 border-l-purple-600 border-t-4 border-b-4 border-t-transparent border-b-transparent' +
                  (isFailed ? ' border-l-red-100' : '')
                : 'left-0 border-r-8 border-r-gray-100 border-t-4 border-b-4 border-t-transparent border-b-transparent'
              }
            `}
          />
        </div>
      </div>
    </motion.div>
  );
});

// Typing indicator component
export const TypingIndicator = memo(function TypingIndicator({
  cuddleImage,
  cuddleName
}: {
  cuddleImage?: string;
  cuddleName?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex justify-start mb-4"
    >
      <div className="flex items-start max-w-[80%]">
        {/* Avatar */}
        {cuddleImage && (
          <div className="flex-shrink-0 mr-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-100">
              <Image
                src={cuddleImage}
                alt={cuddleName || 'Companion'}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Typing bubble */}
        <div className="relative">
          <div className="px-4 py-3 bg-gray-100 rounded-2xl rounded-bl-md">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>

          {/* Tail */}
          <div className="absolute top-3 left-0 w-0 h-0 border-r-8 border-r-gray-100 border-t-4 border-b-4 border-t-transparent border-b-transparent" />
        </div>
      </div>
    </motion.div>
  );
});

// Error message component
export const ErrorMessage = memo(function ErrorMessage({
  message,
  onRetry,
  onDismiss
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex justify-center mb-4"
    >
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-md">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          
          <div className="flex-1">
            <p className="text-sm text-red-700 mb-2">{message}</p>
            
            <div className="flex space-x-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                  Try Again
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 rounded"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});