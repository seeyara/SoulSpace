'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { CuddleId } from '@/types/api';
// import { storage } from '@/lib/storage'; // Not used in this component
import { chatSessionManager } from '@/lib/sessionStorage';
import { upsertGuidedJournalEntry } from '@/lib/utils/journalDb';

interface VercelAIChatProps {
  cuddleId: CuddleId;
  cuddleName: string;
  cuddleImage: string;
  userId: string;
  onChatComplete?: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
  className?: string;
}

const WELCOME_BACK_MESSAGE = "Welcome back! Would you like to continue or finish our conversation?";

export function VercelAIChat({
  cuddleId,
  cuddleName,
  userId,
  onChatComplete,
  className = ''
}: VercelAIChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    reload
  } = useChat({
    api: '/api/chat-completion',
    body: {
      cuddleId,
      userId,
    },
    initialMessages: [],
    onFinish: (message) => {
      // Save to session storage after each message
      const updatedMessages = [...messages, message];
      const sessionMessages = updatedMessages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          createdAt: msg.createdAt
        }));
      chatSessionManager.saveChatSession(userId, cuddleId, sessionMessages);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Load messages from session storage on mount
  useEffect(() => {
    const savedSession = chatSessionManager.loadChatSession(userId, cuddleId);
    if (savedSession && savedSession.messages.length > 0) {
      // Convert session messages back to the format expected by useChat
      const chatMessages = savedSession.messages.map(msg => ({
        id: msg.id || `${Date.now()}-${Math.random()}`,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt || new Date()
      }));
      setMessages(chatMessages);
    }
  }, [userId, cuddleId, setMessages]);

  // Save to session storage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const sessionMessages = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          createdAt: msg.createdAt
        }));
      chatSessionManager.saveChatSession(userId, cuddleId, sessionMessages);
    }
  }, [messages, userId, cuddleId]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle finishing the chat and saving to database
  const handleFinishChat = useCallback(async () => {
    if (messages.length === 0) return;

    try {
      // Convert messages to the expected format
      const messagesToSave = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      // Save to database
      const { error } = await upsertGuidedJournalEntry({
        userId,
        cuddleId,
        messages: messagesToSave
      });

      if (error) {
        console.error('Error saving chat to database:', error);
        return;
      }

      // Clear session storage
      chatSessionManager.clearChatSession(userId, cuddleId);

      // Call completion callback
      if (onChatComplete) {
        onChatComplete(messagesToSave);
      }
    } catch (error) {
      console.error('Error finishing chat:', error);
    }
  }, [messages, userId, cuddleId, onChatComplete]);

  // Check if this is a welcome back scenario
  const isWelcomeBack = messages.length > 0 && 
    messages[messages.length - 1]?.content === WELCOME_BACK_MESSAGE;

  const getCuddleImage = (id: string) => {
    switch (id) {
      case 'olly-sr':
        return '/assets/Olly Sr.png';
      case 'olly-jr':
        return '/assets/Olly Jr.png';
      case 'ellie-jr':
        return '/assets/Ellie Jr.png';
      default:
        return '/assets/Ellie Sr.png';
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => {
              const isLastAssistantMessage = message.role === 'assistant' &&
                (index === messages.length - 1 || messages[index + 1]?.role === 'user');
              const isFirstAssistantMessage = message.role === 'assistant' &&
                (index === 0 || messages[index - 1]?.role === 'user');

              if (message.role === 'user') {
                return (
                  <motion.div
                    key={message.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex justify-end"
                  >
                    <div className="flex flex-col max-w-[85%] items-end">
                      <div className="p-4 rounded-2xl bg-primary text-white">
                        {message.content}
                      </div>
                    </div>
                  </motion.div>
                );
              } else {
                return (
                  <motion.div
                    key={message.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex justify-start gap-3"
                  >
                    {/* Icon column */}
                    <div className="flex-shrink-0 w-10 flex justify-center items-start">
                      {isFirstAssistantMessage && (
                        <Image
                          src={getCuddleImage(cuddleId)}
                          alt={cuddleName}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full"
                        />
                      )}
                    </div>

                    {/* Message content and name column */}
                    <div className="flex flex-col max-w-[85%] items-start">
                      <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                        {message.content}
                      </div>
                      {isLastAssistantMessage && (
                        <span className="text-sm text-primary/60 mt-1 ml-2 tracking-[0.02em]">
                          {cuddleName} 💭
                        </span>
                      )}
                      
                      {/* Show Continue/End chat buttons for welcome back message */}
                      {isLastAssistantMessage && message.content === WELCOME_BACK_MESSAGE && (
                        <div className="mt-3 flex flex-row gap-4 w-full">
                          <button
                            onClick={handleFinishChat}
                            className="text-primary/70 border-2 border-primary/20 px-6 py-3 rounded-2xl font-medium hover:bg-primary/5 transition-colors flex-1"
                          >
                            End chat
                          </button>
                          <button
                            onClick={() => {
                              // Continue conversation by removing the welcome back message
                              const updatedMessages = messages.slice(0, -1);
                              setMessages(updatedMessages);
                            }}
                            className="bg-primary text-white px-6 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors flex-1"
                          >
                            Continue
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              }
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start gap-3"
              >
                <div className="flex-shrink-0 w-10 flex justify-center items-start">
                  <Image
                    src={getCuddleImage(cuddleId)}
                    alt={cuddleName}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full"
                  />
                </div>
                <div className="flex flex-col max-w-[85%] items-start">
                  <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                  <span className="text-sm text-primary/60 mt-1 ml-2 tracking-[0.02em]">
                    {cuddleName} is typing...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      {!isWelcomeBack && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-2">
              <textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Type your response..."
                rows={3}
                disabled={isLoading}
                className="w-full px-6 py-4 rounded-2xl border-2 border-primary/20 focus:border-primary outline-none bg-white resize-none disabled:opacity-50"
              />
              <div className="flex justify-end items-center gap-2">
                <button
                  type="button"
                  onClick={handleFinishChat}
                  className="text-primary/70 border-2 border-primary/20 px-4 py-2 rounded-2xl font-medium hover:bg-primary/5 transition-colors"
                >
                  End chat
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-primary text-white px-6 py-2 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mx-4 mb-4">
          <p className="text-sm">Something went wrong. Please try again.</p>
          <button
            onClick={() => reload()}
            className="text-red-600 hover:text-red-800 underline text-sm mt-1"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}