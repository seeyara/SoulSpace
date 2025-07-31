'use client';

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { CuddleId } from '@/types/api';
import { cuddlePrompts } from '@/data/cuddles';

interface FlatJournalProps {
  cuddleId: CuddleId;
  cuddleName: string;
  cuddleImage: string;
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
  className?: string;
}

const INTRO_MESSAGE = "Hey, I'm your companion for this journey. Let's take this time to reset and rejuvenate";

// Function to get the current day of the 21-day challenge
const getDayOfChallenge = (): number => {
  const challengeStartDate = new Date('2024-08-01'); // September 1st, 2024
  const today = new Date();
  
  // Calculate difference in days
  const diffTime = today.getTime() - challengeStartDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Return day number (0-based), capped at 21 days
  return Math.max(0, Math.min(diffDays, cuddlePrompts.length - 1));
};

// Function to get today's prompt
const getTodaysPrompt = (): string => {
  const challengeStartDate = new Date('2024-09-01'); // September 1st, 2024
  const challengeEndDate = new Date('2024-09-21');   // September 21st, 2024
  const today = new Date();
  
  // If before or after challenge period, use the default gratitude prompt
  if (today < challengeStartDate || today > challengeEndDate) {
    return "What are 5 things you are grateful for today?";
  }
  
  // During challenge period, use sequential prompts
  const dayIndex = getDayOfChallenge();
  return cuddlePrompts[dayIndex] || cuddlePrompts[0];
};

export const FlatJournal = memo(function FlatJournal({
  cuddleId,
  cuddleName,
  cuddleImage,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  className = ''
}: FlatJournalProps) {
  const [content, setContent] = useState('');
  const [showIntro, setShowIntro] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [typingIntro, setTypingIntro] = useState(true);
  const [typingPrompt, setTypingPrompt] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  // Show typing indicator for intro, then show intro, then typing for prompt, then show prompt
  useEffect(() => {
    setTypingIntro(true);
    setShowIntro(false);
    setShowPrompt(false);
    setTypingPrompt(false);
    const introTimer = setTimeout(() => {
      setTypingIntro(false);
      setShowIntro(true);
      setTypingPrompt(true);
      const promptTimer = setTimeout(() => {
        setTypingPrompt(false);
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(promptTimer);
    }, 2000);
    return () => clearTimeout(introTimer);
  }, []);

  // Auto-resize on content change
  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Focus textarea when prompt appears
  useEffect(() => {
    if (showPrompt && textareaRef.current && !disabled) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showPrompt, disabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting || disabled) return;

    try {
      await onSubmit(trimmedContent);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to submit journal entry:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const canSubmit = content.trim().length > 0 && !isSubmitting && !disabled;
  const characterCount = content.length;
  const maxLength = 10000;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Typing indicator for intro */}
            {typingIntro && (
              <motion.div
                key="typing-intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-start space-x-4 mb-8"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-md px-6 py-4">
                    <p className="text-gray-800 leading-relaxed">Typing…</p>
                  </div>
                </div>
              </motion.div>
            )}
            {/* Intro message */}
            {showIntro && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-start space-x-4 mb-8"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-100">
                    <Image
                      src={cuddleImage}
                      alt={cuddleName}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-md px-6 py-4">
                    <p className="text-gray-800 leading-relaxed">
                      {INTRO_MESSAGE}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            {/* Typing indicator for prompt */}
            {typingPrompt && (
              <motion.div
                key="typing-prompt"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-start space-x-4 mb-8"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-md px-6 py-4">
                    <p className="text-gray-800 leading-relaxed">Typing…</p>
                  </div>
                </div>
              </motion.div>
            )}
            {/* Prompt message */}
            {showPrompt && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start space-x-4 mb-8"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-100">
                    <Image
                      src={cuddleImage}
                      alt={cuddleName}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-md px-6 py-4">
                    <p className="text-gray-800 leading-relaxed font-medium">
                      {getTodaysPrompt()}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Journal input area */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border-t border-gray-200 bg-white"
          >
            <div className="max-w-4xl mx-auto px-6 py-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Large text area */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleInputChange}
                    placeholder="Take your time and share what's on your mind..."
                    disabled={disabled || isSubmitting}
                    maxLength={maxLength}
                    className={`
                      w-full px-6 py-4 border border-gray-300 rounded-2xl resize-none
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                      placeholder:text-gray-400 text-gray-800 leading-relaxed
                      min-h-[200px] text-base
                    `}
                    style={{ 
                      minHeight: '200px',
                      fontFamily: 'inherit'
                    }}
                  />
                  {/* Character count */}
                  <div className="absolute bottom-4 right-4 text-xs text-gray-400">
                    {characterCount}/{maxLength}
                  </div>
                </div>
                {/* Submit button */}
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`
                      px-8 py-3 rounded-2xl font-medium transition-all duration-200
                      ${canSubmit
                        ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                      focus:outline-none
                    `}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>
              </form>
              {/* Helper text */}
              <div className="text-center mt-4">
                <p className="text-sm text-gray-500">
                  Your journal entry will be saved for today's date
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Hook for managing flat journal state
export function useFlatJournal() {
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [lastSubmissionDate, setLastSubmissionDate] = useState<string | null>(null);

  const checkTodaySubmission = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const submitted = lastSubmissionDate === today;
    setHasSubmittedToday(submitted);
    return submitted;
  }, [lastSubmissionDate]);

  const markSubmittedToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setLastSubmissionDate(today);
    setHasSubmittedToday(true);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('last-journal-submission', today);
    }
  }, []);

  const loadSubmissionStatus = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('last-journal-submission');
      if (stored) {
        setLastSubmissionDate(stored);
        const today = new Date().toISOString().split('T')[0];
        setHasSubmittedToday(stored === today);
      }
    }
  }, []);

  useEffect(() => {
    loadSubmissionStatus();
  }, [loadSubmissionStatus]);

  return {
    hasSubmittedToday,
    checkTodaySubmission,
    markSubmittedToday,
    loadSubmissionStatus
  };
}