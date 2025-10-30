'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { prefixedTable, supabase } from '@/lib/supabase';
import type { CuddleId } from '@/types/api';
import StreakModal from '@/components/StreakModal';
import PrivacyModal from '@/components/PrivacyModal';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import axios from 'axios';
import { event as gaEvent } from '@/lib/utils/gtag';
import { upsertUser } from '@/lib/utils/journalDb';
import { storage } from '@/lib/storage';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { completeJournalEntry } from '@/lib/api/journal';
import { JournalSuccessModal } from '@/components/JournalSuccessModal';
import TypingIndicator from '@/components/TypingIndicator';

const VALID_CUDDLE_IDS: CuddleId[] = ['ellie-sr', 'olly-sr', 'ellie-jr', 'olly-jr'];
const isValidCuddleId = (id: string | null): id is CuddleId =>
  !!id && (VALID_CUDDLE_IDS as readonly string[]).includes(id);

const WELCOME_BACK_MESSAGE = "Welcome back! Would you like to continue or finish our conversation?";

interface UserProfile {
  cuddleOwnership?: string;
  gender?: string;
  lifeStage?: string;
  lifestage?: string;
}

const isProfileComplete = (profile: UserProfile | null | undefined): boolean => {
  if (!profile) {
    return false;
  }

  const lifeStage = profile.lifeStage ?? profile.lifestage;

  return Boolean(profile.cuddleOwnership && profile.gender && lifeStage);
};

const readStoredProfile = (): UserProfile | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const profileStr = localStorage.getItem('user_profile');
  if (!profileStr) {
    return null;
  }

  try {
    const parsed = JSON.parse(profileStr) as UserProfile;

    return {
      cuddleOwnership: parsed.cuddleOwnership,
      gender: parsed.gender,
      lifeStage: parsed.lifeStage ?? parsed.lifestage
    };
  } catch {
    return null;
  }
};

function JournalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [selectedDate] = useState<string>(searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'));
  const [selectedCuddle, setSelectedCuddle] = useState<CuddleId>(() => {
    const queryCuddle = searchParams.get('cuddle');
    if (isValidCuddleId(queryCuddle)) {
      return queryCuddle;
    }
    if (typeof window !== 'undefined') {
      const storedCuddle = storage.getCuddleId();
      if (isValidCuddleId(storedCuddle)) {
        return storedCuddle;
      }
    }
    return 'ellie-sr';
  });
  const [isTyping, setIsTyping] = useState(true);
  const [userResponse, setUserResponse] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [showInput, setShowInput] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasEvaluatedPrivacy, setHasEvaluatedPrivacy] = useState(false);
  const [hasGlobalAccess, setHasGlobalAccess] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return Boolean(storage.getEmail());
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isContinuingEntry, setIsContinuingEntry] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [userName, setUserName] = useState<string>('Username');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [page, setPage] = useState(1);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasLoadedGuidedEntry, setHasLoadedGuidedEntry] = useState(false);

  const { queuePersistence, flushBeforeUnload, clearPersistence } = useChatPersistence({
    userId,
    cuddleId: selectedCuddle,
    date: selectedDate,
    storageEnabled: true
  });

  const hasHydratedMessagesRef = useRef(false);

  const evaluatePrivacyRequirements = useCallback(() => {
    const storedProfile = readStoredProfile();
    setShowPrivacyModal(!isProfileComplete(storedProfile));
  }, []);

  const getChatHistory = useCallback(async (dateOverride?: string) => {
    const storedUserId = storage.getUserId();

    if (!storedUserId) {
      return false;
    }

    const dateToUse = dateOverride ?? selectedDate;

    try {
      const response = await fetch(`/api/chat?userId=${storedUserId}&date=${dateToUse}`);
      if (!response.ok) {
        console.error('Failed to fetch chat history:', response.statusText);
        return false;
      }

      const { data } = await response.json();

      if (data?.messages?.length && data.mode === 'guided') {
        if (isValidCuddleId(data.cuddleId) && data.cuddleId !== selectedCuddle) {
          setSelectedCuddle(data.cuddleId);
          storage.setCuddleId(data.cuddleId);
        }

        const messagesWithWelcome = [
          ...data.messages,
          { role: 'assistant' as const, content: WELCOME_BACK_MESSAGE }
        ];

        setMessages(messagesWithWelcome);
        setIsTyping(false);
        setIsContinuingEntry(true);
        setHasMoreMessages(Boolean(data.hasMore));
        setPage(1);
        setShowInput(false);
        setHasLoadedGuidedEntry(true);
        return true;
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }

    return false;
  }, [selectedCuddle, selectedDate]);

  useEffect(() => {
    if (!hasHydratedMessagesRef.current) {
      hasHydratedMessagesRef.current = true;
      return;
    }

    if (messages.length > 0) {
      queuePersistence(messages, { cuddleId: selectedCuddle, date: selectedDate });
    } else {
      clearPersistence();
    }
  }, [messages, queuePersistence, selectedCuddle, selectedDate, clearPersistence]);

  // Initialize user and start intro message
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const storedUserId = storage.getUserId();

        if (storedUserId) {
          setUserId(storedUserId);

          // Check if user has a custom name
          const { data } = await supabase
            .from(prefixedTable('users'))
            .select('name, cuddle_ownership, gender, life_stage, lifestage')
            .eq('id', storedUserId)
            .single();

          setUserName(data?.name || 'Username');
          if (data) {
            const profileFromDb = {
              cuddleOwnership: typeof data.cuddle_ownership === 'string' ? data.cuddle_ownership : '',
              gender: typeof data.gender === 'string' ? data.gender : '',
              lifeStage: typeof data.life_stage === 'string'
                ? data.life_stage
                : typeof data.lifestage === 'string'
                  ? data.lifestage
                  : '',
            };

            if (profileFromDb.cuddleOwnership || profileFromDb.gender || profileFromDb.lifeStage) {
              storage.setUserProfile(profileFromDb);
              evaluatePrivacyRequirements();
            }
          }
          return;
        }

        // Create new user without setting a name
        const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const { data: user, error: createError } = await upsertUser({ tempSessionId });
        if (createError) {
          console.error('Error creating user:', createError);
          return;
        }
        if (user) {
          const newUserId = user.id;

          setUserId(newUserId);
          setUserName('Username');
        }
      } catch (error) {
        console.error('Error in initializeUser:', error);
      }
    };

    initializeUser();
  }, [evaluatePrivacyRequirements]);

  // Load userId and selectedCuddle from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setUserId(storage.getUserId() || '');

    const queryCuddle = searchParams.get('cuddle');
    const storedCuddle = storage.getCuddleId();

    const nextCuddle: CuddleId = isValidCuddleId(queryCuddle)
      ? queryCuddle
      : isValidCuddleId(storedCuddle)
        ? storedCuddle
        : 'ellie-sr';

    setSelectedCuddle(nextCuddle);

    if (isValidCuddleId(queryCuddle) && queryCuddle !== storedCuddle) {
      storage.setCuddleId(queryCuddle);
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateAccessAndPrivacy = () => {
      const hasEmail = Boolean(storage.getEmail());
      setHasGlobalAccess(hasEmail);

      if (hasEmail) {
        evaluatePrivacyRequirements();
        setHasEvaluatedPrivacy(true);
      } else {
        setHasEvaluatedPrivacy(false);
      }
    };

    updateAccessAndPrivacy();

    window.addEventListener('soul:global-access-granted', updateAccessAndPrivacy);

    return () => {
      window.removeEventListener('soul:global-access-granted', updateAccessAndPrivacy);
    };
  }, [evaluatePrivacyRequirements]);

  useEffect(() => {
    evaluatePrivacyRequirements();
  }, [evaluatePrivacyRequirements]);

  // Main chat history fetch effect with logging
  useEffect(() => {
    if (!hasGlobalAccess || !hasEvaluatedPrivacy || showPrivacyModal || messages.length > 0) {
      return;
    }

    let isCancelled = false;

    const hydrateGuidedConversation = async () => {
      const foundExistingEntry = await getChatHistory();

      if (isCancelled || foundExistingEntry) {
        return;
      }

      setIsTyping(true);
      setTimeout(() => {
        if (isCancelled) {
          return;
        }

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
        setIsContinuingEntry(false);
        setShowInput(true);
        setHasLoadedGuidedEntry(false);
        setHasMoreMessages(false);
        setPage(1);
      }, 1000);
    };

    hydrateGuidedConversation();

    return () => {
      isCancelled = true;
    };
  }, [selectedCuddle, showPrivacyModal, messages.length, hasGlobalAccess, getChatHistory, hasEvaluatedPrivacy]);

  useEffect(() => {
    // Load ongoing conversation from localStorage if exists
    const ongoingConversation = storage.getOngoingConversation();
    if (ongoingConversation) {
      const { messages: savedMessages, cuddle } = ongoingConversation;
      if (cuddle === selectedCuddle) {
        setMessages(savedMessages);
        setShowInput(true);
      }
    }
  }, [selectedCuddle]);

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
          messageHistory: messageHistoryToSend,
          userId: storedUserId,
        });
      } catch (error) {
        console.error('Error:', error);
      }

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

  // Remove all UI and logic related to mode selection and suggested replies
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
      const { messages: finalMessages } = await completeJournalEntry({
        userId: storedUserId,
        cuddleId: selectedCuddle,
        messages,
        date: selectedDate,
      });

      setIsTyping(false);
      setMessages(finalMessages);
      storage.clearOngoingConversation();
      const today = format(new Date(), 'yyyy-MM-dd');
      localStorage.setItem(`journal-submitted-${today}`, 'true');
    } catch (error) {
      console.error('Error in handleFinishEntry:', error);
      setIsTyping(false);
      setShowInput(true);
    }
  };

  const handleContinue = async () => {
    gaEvent({
      action: 'continue_button',
      category: 'journal',
    });
    setIsContinuingEntry(false);
    setShowInput(false);
    setIsTyping(true);

    setIsTyping(false);
    setShowInput(true);
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleProfileUpdate = () => {
      evaluatePrivacyRequirements();
    };

    window.addEventListener('soul:profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('soul:profile-updated', handleProfileUpdate);
    };
  }, [evaluatePrivacyRequirements]);

  // When PrivacyModal closes, re-check profile completeness
  const handlePrivacyModalClose = () => {
    const storedProfile = readStoredProfile();

    if (!isProfileComplete(storedProfile)) {
      setShowPrivacyModal(true);
      return;
    }

    setShowPrivacyModal(false);
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
          <div className="text-sm font-medium text-primary">
            Guided journaling with {getDisplayCuddleName(selectedCuddle)}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        
          <div className="max-w-3xl mx-auto px-4 pt-20 pb-24">
            {isLoadingMore && (
              <div className="flex justify-center py-4 mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
            {isContinuingEntry && hasLoadedGuidedEntry && messages.length > 0 && (
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
                      className="flex justify-end mb-6"
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
                      className="flex justify-start gap-3 mb-6"
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
                                if (userEmail) {
                                  setShowSuccessModal(true);
                                } else {
                                  setShowStreakModal(true);
                                }
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
            {isTyping && (
              <div className="mt-4">
                <AnimatePresence>
                  <TypingIndicator
                    cuddleImage={getCuddleImage(selectedCuddle)}
                    cuddleName={getCuddleName(selectedCuddle)}
                    displayName={getDisplayCuddleName(selectedCuddle)}
                  />
                </AnimatePresence>
              </div>
            )}

            {/* Add ref for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

        {/* User Response Input */}
        {showInput && (
          <div className="flex justify-end">
            <div className="max-w-2xl mx-auto w-full sm:px-0 px-2">
              {isContinuingEntry ? (
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
        isOpen={hasGlobalAccess && showPrivacyModal}
        onClose={handlePrivacyModalClose}
      />

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