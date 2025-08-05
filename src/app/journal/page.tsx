'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { prefixedTable, supabase } from '@/lib/supabase';
import { cuddleData, cuddleIntro } from '@/data/cuddles';
import type { CuddleId } from '@/types/api';
import StreakModal from '@/components/StreakModal';
import PrivacyModal from '@/components/PrivacyModal';
import { useRouter } from 'next/navigation';
import { format, set } from 'date-fns';
import axios from 'axios';
import { event as gaEvent } from '@/lib/utils/gtag';
import { storage } from '@/lib/storage';
import { cuddlePrompts } from '@/data/cuddles';
import { saveChatMessage, generateJournalResponse } from '@/lib/utils/chatUtils';
// import * as Sentry from '@sentry/nextjs';

// Import mode toggle components
import { JournalModeRadioToggle } from '@/components/JournalModeToggle';
import { JournalSuccessModal } from '@/components/JournalSuccessModal';
import BaseModal from '@/components/BaseModal';
import TypingIndicator from '@/components/TypingIndicator';

// Journal mode type
export type JournalMode = 'flat' | 'guided';

const WELCOME_BACK_MESSAGE = "Welcome back! Would you like to continue or finish our conversation?";
// const INITIAL_GRATITUDE_PROMPT = "What are 5 things you are grateful for today?";
const INTRO_MESSAGE = "Hello, I'm {{cuddle_name}}, your companion for this journey. Let's take this time to reset and rejuvenate";


// Function to get the current day of the 21-day challenge
const getDayOfChallenge = (): number => {
  const challengeStartDate = new Date('2025-08-01'); // September 1st, 2024
  const today = new Date();

  // Calculate difference in days
  const diffTime = today.getTime() - challengeStartDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Return day number (0-based), capped at 21 days
  return Math.max(0, Math.min(diffDays, cuddlePrompts.length - 1));
};

// Function to get today's prompt
const getTodaysPrompt = (): string => {
  const challengeStartDate = new Date('2025-08-01');
  const challengeEndDate = new Date('2025-08-21');
  const today = new Date();

  // If before or after challenge period, use the default gratitude prompt
  if (today <= challengeStartDate || today >= challengeEndDate) {
    return "What are 5 things you are grateful for today?";
  }

  // During challenge period, use sequential prompts
  const dayIndex = getDayOfChallenge();
  return cuddlePrompts[dayIndex] || cuddlePrompts[0];
};

function JournalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [selectedCuddle, setSelectedCuddle] = useState<CuddleId>('ellie-sr');
  const [selectedDate] = useState<string>(searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'));
  const [isTyping, setIsTyping] = useState(true);
  const [userResponse, setUserResponse] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [showInput, setShowInput] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isWelcomeBack, setIsWelcomeBack] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [userName, setUserName] = useState<string>('Username');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [page, setPage] = useState(1);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [journalingMode, setJournalingMode] = useState<'guided' | 'free-form' | null>(null);
  const [freeFormContent, setFreeFormContent] = useState('');
  const [showSuggestedReplies, setShowSuggestedReplies] = useState(false);
  const [lastUnfinishedEntry, setLastUnfinishedEntry] = useState<null | { mode: 'guided' | 'free-form', content: string }>(null);
  const isSavingRef = useRef(false);

  // New dual-mode state
  const [journalMode, setJournalMode] = useState<JournalMode>('flat');
  const [showGuidedDisclaimer, setShowGuidedDisclaimer] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [flatJournalContent, setFlatJournalContent] = useState('');
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [showIntroMessage, setShowIntroMessage] = useState(false);
  const [showGratitudePrompt, setShowGratitudePrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle mode change
  const handleModeChange = (mode: JournalMode) => {
    if (mode === 'guided' && journalMode === 'flat') {
      setShowGuidedDisclaimer(true);
    } else {
      setJournalMode(mode);
      localStorage.setItem('journal-mode', mode);

      if (mode === 'flat') {
        initializeFlatMode();
      }
    }
  };

  // Initialize flat mode
  const initializeFlatMode = () => {
    // Check if already submitted today
    const today = format(new Date(), 'yyyy-MM-dd');
    const submissionKey = `journal-submitted-${today}`;
    const hasSubmitted = localStorage.getItem(submissionKey) === 'true';
    setHasSubmittedToday(hasSubmitted);

    if (!hasSubmitted) {
      setMessages([]);
      setShowInput(false);
      setIsTyping(false);
      setJournalingMode(null);
      // Show both intro and prompt together after a short delay
      setTimeout(() => {
        setShowIntroMessage(true);
        setShowGratitudePrompt(true);
      }, 800);
    }
  };

  // Handle flat journal submission
  const handleFlatJournalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!flatJournalContent.trim() || !userId) return;

    // Set user context for Sentry
    // Sentry.setUser({ id: userId });

    const userMessage = { role: 'user' as const, content: flatJournalContent.trim() };

    // Include intro messages in the conversation
    const introMessage = { role: 'assistant' as const, content: INTRO_MESSAGE.replace("{{cuddle_name}}", getDisplayCuddleName(selectedCuddle)) };
    const promptMessage = { role: 'assistant' as const, content: getTodaysPrompt() };

    try {
      gaEvent({
        action: 'flat_journal_submit',
        category: 'journal',
      });

      // Immediately update UI with user message and show typing indicator
      const newMessages = [...messages, introMessage, promptMessage, userMessage];
      setMessages(newMessages);
      setFlatJournalContent('');
      setShowGratitudePrompt(false);
      setShowIntroMessage(false);
      setIsTyping(true);

      // Generate AI response
      setTimeout(async () => {
        try {
          const aiResponse = await generateJournalResponse(
            getTodaysPrompt(),
            userMessage.content,
            getDisplayCuddleName(selectedCuddle)
          );

          // Split response into sentences and create two messages
          const sentences = aiResponse.split(/(?<=[.!?])\s+/).filter(s => s.trim());
          const firstMessage = sentences.slice(0, Math.ceil(sentences.length / 2)).join(' ');
          const secondMessage = sentences.slice(Math.ceil(sentences.length / 2)).join(' ');

          // Create final messages array upfront
          const firstReply = { role: 'assistant' as const, content: firstMessage };
          const secondReply = { role: 'assistant' as const, content: secondMessage };
          const finalMessages = [...newMessages, firstReply, secondReply];

          // UI flow: Show first message
          const messagesWithFirst = [...newMessages, firstReply];
          setMessages(messagesWithFirst);

          setTimeout(() => {
            setTimeout(() => {
              setMessages(finalMessages);
              setIsTyping(false);
            }, 1500);
          }, 2000);

          // Save messages (independent of UI timing)
          try {
            const { error } = await saveChatMessage({
              messages: finalMessages,
              userId,
              cuddleId: selectedCuddle
            });

            if (error) {
              console.error('Error saving flat journal entry:', error);
              setErrorMessage('Having trouble saving your journal entry. Please try again in a moment.');
              return;
            }

            // Mark as submitted and show modal
            const today = format(new Date(), 'yyyy-MM-dd');
            localStorage.setItem(`journal-submitted-${today}`, 'true');
            setHasSubmittedToday(true);

          } catch (saveError) {
            console.error('Error saving flat journal entry:', saveError);
            setErrorMessage('Having trouble saving your journal entry. Please try again in a moment.');
          }

        } catch (aiError) {
          console.error('Error generating AI response:', aiError);
          const fallbackReply = { role: 'assistant' as const, content: "Thank you for sharing this, it means so much to me 🫶🏼. Im always here for you" };
          const fallbackMessages = [...newMessages, fallbackReply];
          setMessages(fallbackMessages);
          setIsTyping(false);

          // Save fallback message
          try {
            await saveChatMessage({
              messages: fallbackMessages,
              userId,
              cuddleId: selectedCuddle
            });
            
            const today = format(new Date(), 'yyyy-MM-dd');
            localStorage.setItem(`journal-submitted-${today}`, 'true');
            setHasSubmittedToday(true);
          } catch (error) {
            setErrorMessage('Having trouble saving your journal entry. Please try again in a moment.');
          }
        }

      }, 1000);

    } catch (error) {
      // Sentry.captureException(error, { 
      //   extra: { 
      //     context: 'flat_journal_submission',
      //     userId,
      //     cuddleId: selectedCuddle,
      //     contentLength: flatJournalContent.length,
      //     timestamp: new Date().toISOString(),
      //     submissionError: error
      //   },
      //   tags: {
      //     feature: 'flat_journal',
      //     action: 'submission_error'
      //   }
      // });
      console.error('Error in flat journal submission:', error);
      setErrorMessage('Having trouble processing your journal entry. Please try again in a moment.');
      // Reset UI state on error
      setMessages(messages); // Revert to previous state
      setFlatJournalContent(userMessage.content); // Restore user input
      setShowGratitudePrompt(true);
      setShowIntroMessage(true);
    }
  };

  // Initialize user and start intro message
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const storedUserId = storage.getUserId();

        if (storedUserId) {
          console.log('Using stored user ID:', storedUserId);
          setUserId(storedUserId);

          // Check if user has a custom name
          const { data } = await supabase
            .from(prefixedTable('users'))
            .select('name')
            .eq('id', storedUserId)
            .single();

          setUserName(data?.name || 'Username');
          return;
        }

        // Create new user without setting a name
        const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        try {
          const { data: newUser, error: createError } = await supabase
            .from(prefixedTable('users'))
            .insert({
              temp_session_id: tempSessionId
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Error creating user:', createError);
            return;
          }

          if (newUser) {
            const newUserId = newUser.id;
            console.log('Created new user:', newUserId);
            storage.setUserId(newUserId);
            setUserId(newUserId);
            setUserName('Username');

            // Show privacy modal for new users
            setShowPrivacyModal(true);
          }
        } catch (error) {
          console.error('Error in user creation:', error);
        }
      } catch (error) {
        console.error('Error in initializeUser:', error);
      }
    };

    initializeUser();
  }, []);

  // Load userId and selectedCuddle from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserId(storage.getUserId() || '');
      setSelectedCuddle((storage.getCuddleId() || searchParams.get('cuddle') || 'ellie-sr') as CuddleId);
    }
  }, [searchParams]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 10) {
      scrollToBottom();
    }
    setIsInitialLoad(false);
  }, [messages, isInitialLoad]);

  // Add logging for key state changes
  useEffect(() => {
    console.log('userId changed:', userId);
  }, [userId]);
  useEffect(() => {
    console.log('selectedCuddle changed:', selectedCuddle);
  }, [selectedCuddle]);
  useEffect(() => {
    console.log('selectedDate changed:', selectedDate);
  }, [selectedDate]);
  useEffect(() => {
    console.log('showPrivacyModal changed:', showPrivacyModal);
  }, [showPrivacyModal]);

  // Main chat history fetch effect with logging
  useEffect(() => {
    console.log('Fetching chat history with:', { userId, selectedCuddle, selectedDate, showPrivacyModal });
    const fetchChatHistory = async () => {
      const storedUserId = storage.getUserId();
      if (!storedUserId) {
        // Don't start conversation yet if no user ID (wait for privacy modal)
        return;
      }
      try {
        const response = await fetch(`/api/chat?userId=${storedUserId}&date=${selectedDate}&page=1`);
        const { data } = await response.json();
        if (data?.messages && data.messages.length > 0) {
          // Returning user: Entry exists for today
          setMessages(data.messages);
          setHasMoreMessages(data.hasMore);
          setPage(1);

          // Check if this is a flat journal entry
          if (data.mode === 'flat') {
            // For flat journal, just show the entry in chat without welcome back message
            setIsWelcomeBack(true);
            setShowInput(true);
            setShowSuggestedReplies(true);
            setJournalingMode('free-form');
            console.log('Loaded flat journal entry:', data.messages);
          } else {
            setShowInput(true);
            setShowSuggestedReplies(false);
            setJournalingMode('guided');
          }
        } else {
          if (journalMode === 'guided') {
            // New user or no entry for today
            const cuddle = cuddleData.cuddles[selectedCuddle];
            setIsTyping(true);
            setTimeout(() => {
              setMessages([
                {
                  role: 'assistant',
                  content: `Hi! I’m ${getCuddleName(selectedCuddle)}, I'm always here when your mind feels a little too full. Let's take it slow and gently sort through your thoughts together..`
                },
                {
                  role: 'assistant',
                  content: "What's on your mind today?"
                }
              ]);
              setIsTyping(false);
              setShowSuggestedReplies(false);
              setIsWelcomeBack(false);
              setShowInput(true);
              setJournalingMode('guided');
              console.log('Started new user flow');
            }, 1000);
          } else {
            // New user or no entry for today - let mode-specific initialization handle this
            console.log('Fresh user - waiting for mode-specific initialization');
          }
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
        // Fallback to new user flow
        const cuddle = cuddleData.cuddles[selectedCuddle];
        setIsTyping(true);
        setTimeout(() => {
          setMessages([
            {
              role: 'assistant',
              content: `Hi! I’m ${getCuddleName(selectedCuddle)}. I’m here to listen. Let’s journal together today.`
            },
            {
              role: 'assistant',
              content: "What's on your mind today?"
            }
          ]);
          setIsTyping(false);
          setShowSuggestedReplies(false);
          setIsWelcomeBack(false);
          setShowInput(true);
          setJournalingMode('guided');
          console.log('Started new user flow (error fallback)');
        }, 1000);
      }
    };
    fetchChatHistory();
  }, [selectedCuddle, selectedDate, userId, showPrivacyModal, journalMode]);

  // Separate effect to handle privacy modal state changes
  useEffect(() => {
    if (!showPrivacyModal && userId && messages.length === 0) {
      const storedUserId = storage.getUserId();
      if (storedUserId) {
        // Check if this is a new user (has temp_session_id)
        const checkIfNewUser = async () => {
          try {
            const { data } = await supabase
              .from(prefixedTable('users'))
              .select('temp_session_id')
              .eq('id', storedUserId)
              .single();

            if (data?.temp_session_id) {
              // This is a new user, start the conversation
              const cuddle = cuddleData.cuddles[selectedCuddle];
              setIsTyping(true);
              setTimeout(() => {
                setMessages([{
                  role: 'assistant',
                  content: cuddleIntro.replace('{cuddle-name}', cuddle.name)
                }]);
                setIsTyping(false);
              }, 1500);
            }
          } catch (error) {
            console.error('Error checking if new user:', error);
          }
        };

        checkIfNewUser();
      }
    }
  }, [showPrivacyModal, userId, selectedCuddle, messages.length]);

  useEffect(() => {
    // Load ongoing conversation from localStorage if exists
    const ongoingConversation = storage.getOngoingConversation();
    if (ongoingConversation) {
      const { messages: savedMessages, cuddle } = ongoingConversation;
      if (cuddle === selectedCuddle) {
        setMessages(savedMessages);
        setShowInput(true);
        setJournalingMode('guided'); // Assume guided mode for ongoing conversations
      }
    }
  }, [selectedCuddle]);

  // Fetch last unfinished entry on mount
  useEffect(() => {
    const fetchLastUnfinishedEntry = async () => {
      const storedUserId = storage.getUserId();
      if (!storedUserId) return;
      try {
        const res = await fetch(`/api/chat?userId=${storedUserId}&unfinished=1`);
        const { data } = await res.json();
        if (data && data.lastUnfinished) {
          setLastUnfinishedEntry(data.lastUnfinished);
          if (data.lastUnfinished.mode === 'free-form') {
            setJournalingMode('free-form');
            setFreeFormContent(data.lastUnfinished.content);
          }
        }
      } catch {
        // ignore
      }
    };
    fetchLastUnfinishedEntry();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userResponse.trim()) return;

    const storedUserId = storage.getUserId();
    if (!storedUserId) {
      console.error('No user ID available');
      router.push('/');
      return;
    }

    const userMessage = { role: 'user' as const, content: userResponse.trim() };
    // Always append user message to the full previous messages
    setMessages(prev => {
      const updated = [...prev, userMessage];
      return updated;
    });
    setUserResponse('');
    setShowInput(false);
    setIsTyping(true);

    try {
      // Get user profile from localStorage
      const userProfile = storage.getUserProfile();

      // For OpenAI, skip the first two assistant messages if present (but keep for display)
      let messageHistoryToSend = messages;
      if (messages.length > 2 && messages[0].role === 'assistant' && messages[1].role === 'assistant') {
        messageHistoryToSend = messages.slice(2);
      }

      let response;
      try {
        response = await axios.post('/api/chat-completion', {
          message: userMessage.content,
          cuddleId: selectedCuddle,
          messageHistory: messageHistoryToSend
        }, {
          headers: {
            'Content-Type': 'application/json',
            'x-user-profile': userProfile ? JSON.stringify(userProfile) : ''
          },
        })
      } catch (error) {
        console.error('Error:', error);
      }

      console.log("response", response)

      if (!response) {
        throw new Error('Failed to get AI response or response is null');
      }

      const { response: aiResponse, shouldEnd } = response.data;

      // Split the AI response into two messages
      const responseParts = aiResponse.split('\n\n');
      const firstMessage = responseParts[0] || aiResponse;
      const secondMessage = responseParts[1] || '';

      // Add the first message immediately
      const firstAssistantMessage = {
        role: 'assistant' as const,
        content: firstMessage
      };

      setMessages(prev => {
        let updated = [...prev, firstAssistantMessage];
        if (secondMessage) {
          updated = [
            ...updated,
            { role: 'assistant' as const, content: secondMessage }
          ];
        }
        return updated;
      });
      setIsTyping(false);
      storage.setOngoingConversation({
        messages: [
          ...messages,
          userMessage,
          firstAssistantMessage,
          ...(secondMessage ? [{ role: 'assistant' as const, content: secondMessage }] : [])
        ],
        cuddle: selectedCuddle
      });
      if (shouldEnd) {
        return;
      }
      setShowInput(true);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      // Batch error state updates
      setIsTyping(false);
      setShowInput(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble responding right now. Could you try again?"
      }]);
    }
  };

  const handleFreeFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeFormContent.trim()) return;

    const storedUserId = storage.getUserId();
    if (!storedUserId) {
      console.error('No user ID available');
      router.push('/');
      return;
    }

    try {
      // Save free-form journal entry
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: freeFormContent
          }],
          userId: storedUserId,
          cuddleId: selectedCuddle
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save journal entry');
      }

      // Batch state updates to prevent multiple re-renders
      setFreeFormContent('');
      setShowInput(false);
      setIsTyping(true);
      setJournalingMode('free-form');

      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { role: 'user', content: freeFormContent },
          {
            role: 'assistant',
            content: "Thank you for sharing your thoughts with me. I've saved your journal entry. 💜 \n Come back tomorrow for more journaling!"
          }
        ]);
        setIsTyping(false);
        setShowSuggestedReplies(true);

        // Show streak modal after the thank you message
      }, 1000);

    } catch (error) {
      console.error('Error saving journal entry:', error);
      // Batch error state updates
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble saving your entry right now. Could you try again?"
      }]);
      setShowInput(true);
    }
  };

  // Remove all UI and logic related to mode selection and suggested replies
  // Remove handleModeSelection and showSuggestedReplies logic
  // Remove the button for guided journaling in the chat area

  const handleCloseStreakModal = () => {
    setShowStreakModal(false);
    router.push('/account');
  };

  const getCuddleName = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getDisplayCuddleName = (id: string) => {
    // Check localStorage first for custom cuddle name
    const customName = storage.getCuddleName();
    const storedCuddleId = storage.getCuddleId();

    // If we have a custom name and it matches the current cuddle, use it
    if (customName && storedCuddleId === id) {
      return customName;
    }

    // Otherwise, fall back to the generic name
    return getCuddleName(id);
  };

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

  const handleFinishEntry = async () => {
    gaEvent({
      action: 'end_chat_button',
      category: 'journal',
    });
    const storedUserId = storage.getUserId();
    if (!storedUserId) {
      console.error('No user ID available');
      router.push('/');
      return;
    }

    setShowInput(false);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "_finish_entry_",
          cuddleId: selectedCuddle,
          messageHistory: messages,
          forceEnd: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { response: aiResponse } = await response.json();

      const farewellMessage = {
        role: 'assistant' as const,
        content: aiResponse
      };

      const finalMessages = [...messages, farewellMessage];
      setIsTyping(false);
      setMessages(finalMessages);

      try {
        // Final save to database
        await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: finalMessages,
            userId: storedUserId,
            cuddleId: selectedCuddle
          }),
        });

      } catch (error) {
        console.error('Error saving chat:', error);
      }
    } catch (error) {
      console.error('Error in handleFinishEntry:', error);
      setIsTyping(false);
    }
  };

  const handleContinue = async () => {
    console.log('[handleContinue] lastUnfinishedEntry:', lastUnfinishedEntry);
    gaEvent({
      action: 'continue_button',
      category: 'journal',
    });
    setIsWelcomeBack(false);
    setShowInput(false);
    setIsTyping(true);

    // If last unfinished entry is free-form, load it
    if (lastUnfinishedEntry && lastUnfinishedEntry.mode === 'free-form') {
      setJournalingMode('free-form');
      setFreeFormContent(lastUnfinishedEntry.content);
      setIsTyping(false);
      setShowInput(true);
      return;
    }
    // If not, always show input for guided journaling
    setJournalingMode('guided');
    setIsTyping(false);
    setShowInput(true);
    setShowSuggestedReplies(false);
  };

  // Add this effect to update the name in the database when finishing entry
  useEffect(() => {
    if (showStreakModal && userId && userName) {
      fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: userName
        }),
      }).catch(error => {
        console.error('Error updating user name:', error);
      });
    }
  }, [showStreakModal, userId, userName]);

  // Auto-dismiss error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = async () => {
      if (isLoadingMore || !hasMoreMessages) return;

      const { scrollTop } = container;
      // If we're near the top (scrollTop is small), load more messages
      if (scrollTop < 100) {
        setIsLoadingMore(true);
        try {
          const storedUserId = storage.getUserId();
          if (!storedUserId) return;

          const today = format(new Date(), 'yyyy-MM-dd');
          const response = await fetch(`/api/chat?userId=${storedUserId}&date=${today}&page=${page + 1}`);
          const { data } = await response.json();

          if (data?.messages && data.messages.length > 0) {
            // Preserve scroll position
            const prevHeight = container.scrollHeight;

            setMessages(prev => [...data.messages, ...prev]);
            setPage(prev => prev + 1);

            // Restore scroll position
            requestAnimationFrame(() => {
              const newHeight = container.scrollHeight;
              container.scrollTop = newHeight - prevHeight;
            });
          } else {
            setHasMoreMessages(false);
          }
        } catch (error) {
          console.error('Error loading more messages:', error);
        } finally {
          setIsLoadingMore(false);
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [page, isLoadingMore, hasMoreMessages]);


  useEffect(() => {
    const saveOnUnload = () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      const storedUserId = storage.getUserId();
      if (!storedUserId) return;
      // Only save if there is content
      if ((journalingMode === 'free-form' && freeFormContent.trim()) || (journalingMode === 'guided' && messages.length > 0)) {
        const payload = {
          messages: journalingMode === 'free-form'
            ? [{ role: 'user', content: freeFormContent }]
            : messages,
          userId: storedUserId,
          cuddleId: selectedCuddle,
          date: selectedDate,
          implicit: true,
        };
        const url = '/api/chat';
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        console.log('fallback for browsers without sendBeacon');
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, blob);
        } else {
          // fallback for browsers without sendBeacon
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          });
        }
      }
      isSavingRef.current = false;
    };
    const handleBeforeUnload = () => {
      saveOnUnload();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [journalingMode, freeFormContent, messages, selectedCuddle, selectedDate]);

  // Helper to check if user profile is complete
  interface UserProfile {
    cuddleOwnership?: string;
    gender?: string;
    lifeStage?: string;
  }

  const isProfileComplete = (profile: UserProfile | null | undefined): boolean => {
    return Boolean(profile?.cuddleOwnership && profile?.gender && profile?.lifeStage);
  };

  // Load saved mode preference and initialize mode
  useEffect(() => {
    const savedMode = localStorage.getItem('journal-mode') as JournalMode;
    if (savedMode && ['flat', 'guided'].includes(savedMode)) {
      setJournalMode(savedMode);
    }

    // Initialize flat mode if selected
    if (userId && (savedMode === 'flat' || journalMode === 'flat') && !isWelcomeBack) {
      initializeFlatMode();
    }
  }, [userId, isWelcomeBack]);

  // Show PrivacyModal until profile is complete
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const profileStr = localStorage.getItem('user_profile');
      let profile = null;
      try {
        profile = profileStr ? JSON.parse(profileStr) : null;
      } catch { }
      if (!isProfileComplete(profile)) {
        setShowPrivacyModal(true);
      } else {
        setShowPrivacyModal(false);
      }
    }
  }, []);

  // When PrivacyModal closes, re-check profile completeness
  const handlePrivacyModalClose = () => {
    if (typeof window !== 'undefined') {
      const profileStr = localStorage.getItem('user_profile');
      let profile = null;
      try {
        profile = profileStr ? JSON.parse(profileStr) : null;
      } catch { }
      if (!isProfileComplete(profile)) {
        setShowPrivacyModal(true);
      } else {
        setShowPrivacyModal(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-sm z-50 p-4 border-b border-primary/10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Image
            src="/assets/Logo.png"
            alt="Soul Logo"
            width={100}
            height={32}
            className="h-8 w-auto cursor-pointer"
            onClick={() => router.push('/')}
          />
          <div className="flex items-center gap-4">
            <JournalModeRadioToggle
              mode={journalMode}
              onModeChange={handleModeChange}
              disabled={isTyping}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        {journalMode === 'flat' ? (
          // Flat Journal Mode
          <div className="max-w-4xl mx-auto px-4 pt-20 pb-24">
            <AnimatePresence mode="wait">
              {showIntroMessage && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-start space-x-4 mb-8"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <Image
                        src={getCuddleImage(selectedCuddle)}
                        alt={getDisplayCuddleName(selectedCuddle)}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-primary/10 rounded-2xl rounded-tl-md px-6 py-4">
                      <p className="text-primary leading-relaxed">
                        {INTRO_MESSAGE.replace("{{cuddle_name}}", getDisplayCuddleName(selectedCuddle))}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {showGratitudePrompt && (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start space-x-4 mb-8"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <Image
                        src={getCuddleImage(selectedCuddle)}
                        alt={getDisplayCuddleName(selectedCuddle)}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-primary/10 rounded-2xl rounded-tl-md px-6 py-4">
                      <p className="text-primary leading-relaxed font-medium">
                        {getTodaysPrompt()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Display messages in flat journal mode */}
            <AnimatePresence>
              {messages.length > 0 && messages.map((message, index) => {
                const isLastAssistantMessage = message.role === 'assistant' &&
                  (index === messages.length - 1 || messages[index + 1]?.role === 'user');
                const isFirstAssistantMessage = message.role === 'assistant' &&
                  (index === 0 || messages[index - 1]?.role === 'user');
                const isLastMessage = index === messages.length - 1;

                if (message.role === 'user') {
                  return (
                    <motion.div
                      key={`flat-message-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex justify-end mb-6"
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
                      key={`flat-message-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex justify-start gap-3 mb-6"
                    >
                      <div className="flex-shrink-0 w-10 flex justify-center items-start">
                        {isFirstAssistantMessage && (
                          <Image
                            src={getCuddleImage(selectedCuddle)}
                            alt={getCuddleName(selectedCuddle)}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full"
                          />
                        )}
                      </div>
                      <div className="flex flex-col max-w-[85%] items-start">
                        <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                          {message.content}
                        </div>
                        {isLastAssistantMessage && (
                          <span className="text-sm text-primary/60 mt-1 ml-2 tracking-[0.02em]">
                            {getDisplayCuddleName(selectedCuddle)} 💭
                          </span>
                        )}
                        {isLastMessage && hasSubmittedToday && !isTyping && (
                          <div className="mt-4 ml-2">
                            <button
                              onClick={() => {
                                const userEmail = storage.getEmail();
                                userEmail ? setShowSuccessModal(true) : setShowStreakModal(true);
                              }}
                              className="bg-primary text-white px-6 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 flex items-center gap-2"
                            >
                              <span>Save my streak 🔥</span>
                              
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                }
              })}
            </AnimatePresence>

            {/* Typing Indicator for Flat Journal Mode */}
            <AnimatePresence>
              {isTyping && journalMode === 'flat' && (
                <TypingIndicator
                  cuddleImage={getCuddleImage(selectedCuddle)}
                  cuddleName={getCuddleName(selectedCuddle)}
                  displayName={getDisplayCuddleName(selectedCuddle)}
                />
              )}
            </AnimatePresence>

            {/* Flat Journal Input */}
            <AnimatePresence>
              {showGratitudePrompt && !hasSubmittedToday && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8"
                >
                  <form onSubmit={handleFlatJournalSubmit} className="space-y-4">
                    <div className="relative max-w-2xl mx-auto w-full sm:px-0 px-2">
                      <textarea
                        value={flatJournalContent}
                        onChange={(e) => setFlatJournalContent(e.target.value)}
                        placeholder={`Hey ${selectedCuddle} this is ....\n\nLately I've been...`}
                        maxLength={10000}
                        className="w-full px-6 py-4 border-2 border-primary/20 rounded-2xl resize-none focus:outline-none focus:border-primary placeholder:text-gray-400 text-primary leading-relaxed min-h-[200px] text-base bg-white"
                        style={{ minHeight: '200px', fontFamily: 'inherit' }}
                      />
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="submit"
                        disabled={!flatJournalContent.trim()}
                        className={`px-8 py-3 rounded-2xl font-medium transition-all duration-200 ${flatJournalContent.trim()
                          ? 'bg-primary text-white hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          } focus:outline-none`}
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* {hasSubmittedToday && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <div className="bg-pri-50 border border-green-200 rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      You've already journaled today! ✨
                    </h3>
                    <p className="text-green-700">
                      Come back tomorrow for your next reflection session with {getDisplayCuddleName(selectedCuddle)}.
                    </p>
                  </div>
                </motion.div>
              )} */}
            </AnimatePresence>
          </div>
        ) : (
          // Guided Journal Mode (existing chat interface)
          <div className="max-w-3xl mx-auto space-y-4 px-4 pt-20 pb-24">
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
            {isWelcomeBack && messages.length > 0 && (
              <div className="mb-4 text-primary font-medium text-lg">Here’s what you shared earlier today…</div>
            )}
            <AnimatePresence>
              {messages.map((message, index) => {
                const isLastAssistantMessage = message.role === 'assistant' &&
                  (index === messages.length - 1 || messages[index + 1]?.role === 'user');
                const isFirstAssistantMessage = message.role === 'assistant' &&
                  (index === 0 || messages[index - 1]?.role === 'user');
                const isLastMessage = index === messages.length - 1;

                if (message.role === 'user') {
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex justify-end"
                    >
                      <div className="flex flex-col max-w-[85%] items-end">
                        <div
                          className="p-4 rounded-2xl bg-primary text-white"
                        >
                          {message.content}
                        </div>
                      </div>
                    </motion.div>
                  );
                } else { // Assistant message
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex justify-start gap-3"
                    >
                      {/* Icon column */}
                      <div className="flex-shrink-0 w-10 flex justify-center items-start">
                        {isFirstAssistantMessage && (
                          <Image
                            src={getCuddleImage(selectedCuddle)}
                            alt={getCuddleName(selectedCuddle)}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full"
                          />
                        )}
                      </div>

                      {/* Message content and name column */}
                      <div className="flex flex-col max-w-[85%] items-start">
                        <div
                          className="p-4 rounded-2xl bg-primary/10 text-primary"
                        >
                          {message.content}
                        </div>
                        {isLastAssistantMessage && (
                          <span className="text-sm text-primary/60 mt-1 ml-2 tracking-[0.02em]">
                            {getDisplayCuddleName(selectedCuddle)} 💭
                          </span>
                        )}
                        {/* Show suggested replies only if not welcome back message and not in journaling mode */}
                        {/* Mode selection and suggested replies removed */}
                        {/* Show Continue/End chat only for welcome back message */}
                        {isLastAssistantMessage && message.content === WELCOME_BACK_MESSAGE && (
                          <div className="mt-3 flex flex-row gap-4 w-full">
                            <button
                              onClick={handleFinishEntry}
                              className="text-primary/70 border-2 border-primary/20 px-6 py-3 rounded-2xl font-medium hover:bg-primary/5 transition-colors flex-1"
                            >
                              End chat
                            </button>
                            <button
                              onClick={handleContinue}
                              className="bg-primary text-white px-6 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors flex-1"
                            >
                              Continue
                            </button>
                          </div>
                        )}
                        {isLastMessage && !showInput && !isTyping && message.content !== WELCOME_BACK_MESSAGE && (
                          <div className="mt-4 ml-2">
                            <button
                              onClick={() => {
                                const userEmail = storage.getEmail();
                                userEmail ? setShowSuccessModal(true) : setShowStreakModal(true);
                              }}
                              className="bg-primary text-white px-6 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 flex items-center gap-2"
                            >
                              <span>Save my streak 🔥</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                }
              })}
            </AnimatePresence>

            {/* Typing Indicator */}
            <AnimatePresence>
              {isTyping && journalMode === 'guided' && (
                <TypingIndicator
                  cuddleImage={getCuddleImage(selectedCuddle)}
                  cuddleName={getCuddleName(selectedCuddle)}
                  displayName={getDisplayCuddleName(selectedCuddle)}
                />
              )}
            </AnimatePresence>

            {/* Add ref for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* User Response Input - only show for guided mode */}
        {journalMode === 'guided' && showInput && (
          <div className="flex justify-end">
            <div className="max-w-2xl mx-auto w-full sm:px-0 px-2">
              {isWelcomeBack ? (
                <div className="flex justify-end items-center gap-2">
                  <button
                    onClick={handleFinishEntry}
                    className="text-primary/70 border-2 border-primary/20 px-6 py-3 rounded-2xl font-medium hover:bg-primary/5 transition-colors"
                  >
                    End chat
                  </button>
                  <button
                    onClick={handleContinue}
                    className="bg-primary text-white px-6 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              ) : journalingMode === 'free-form' ? (
                <form onSubmit={handleFreeFormSubmit} className="space-y-4">
                  <textarea
                    value={freeFormContent}
                    onChange={(e) => setFreeFormContent(e.target.value)}
                    placeholder="Write down your thoughts or feelings or experiences that you'd like to reflect on..."
                    rows={8}
                    className="w-full px-6 py-4 rounded-2xl border-2 border-primary/20 focus:border-primary outline-none bg-white resize-none text-base"
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleFinishEntry}
                        className="text-primary/70 border-2 border-primary/20 px-4 py-2 rounded-2xl font-medium hover:bg-primary/5 transition-colors"
                      >
                        End entry
                      </button>
                      <button
                        type="submit"
                        disabled={!freeFormContent.trim()}
                        className="bg-primary text-white px-6 py-2 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                      >
                        Save Entry
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2">
                  <textarea
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                    className="w-full px-6 py-4 rounded-2xl border-2 border-primary/20 focus:border-primary outline-none bg-white resize-none"
                  />
                  <div className="flex justify-end items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFinishEntry}
                      className="text-primary/70 border-2 border-primary/20 px-2 py-2 rounded-2xl font-medium hover:bg-primary/5 transition-colors"
                    >
                      End chat
                    </button>
                    <button
                      type="submit"
                      disabled={!userResponse.trim()}
                      className="bg-primary text-white px-6 py-2 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <StreakModal
        isOpen={showStreakModal}
        onClose={handleCloseStreakModal}
        date={format(new Date(), 'MMMM d, yyyy')}
        userId={userId}
      />

      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={handlePrivacyModalClose}
      />

      {/* Guided Mode Disclaimer Modal */}
      <BaseModal
        isOpen={showGuidedDisclaimer}
        onClose={() => setShowGuidedDisclaimer(false)}
        maxWidth="max-w-md"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full overflow-hidden">
            <Image
              src={getCuddleImage(selectedCuddle)}
              alt={getDisplayCuddleName(selectedCuddle)}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Switch to Guided Journaling?
          </h3>

          <div className="bg-secondary border border-primary/10 rounded-lg p-4 mb-4">
            <p className="text-sm">
              Guided Journalling is experimental and uses GPT to guide reflection.
              <br />For medical advice, please seek professional help.
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                setJournalMode('guided');
                localStorage.setItem('journal-mode', 'guided');
                setShowGuidedDisclaimer(false);
                setJournalingMode('guided');
                setShowInput(true);
              }}
              className="w-full px-4 py-3 text-sm font-medium text-white bg-primary border border-transparent rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors duration-200"
            >
              Okay, got it
            </button>
            <button
              onClick={() => setShowGuidedDisclaimer(false)}
              className="w-full px-4 py-3 text-sm font-medium text-primary bg-secondary border border-primary/10 rounded-lg hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Error Message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
          >
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="ml-4 inline-flex text-red-400 hover:text-red-600 focus:outline-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <JournalSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onGoToAccount={() => router.push('/account')}
        cuddleName={getDisplayCuddleName(selectedCuddle)}
        entryDate={selectedDate}
      />
    </main>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JournalContent />
    </Suspense>
  );
} 