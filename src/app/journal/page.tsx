'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { cuddleData } from '@/data/cuddles';
import type { CuddleId } from '@/types/cuddles';
import StreakModal from '@/components/StreakModal';
import PrivacyModal from '@/components/PrivacyModal';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import axios from 'axios';
const WELCOME_BACK_MESSAGE = "Welcome back! Would you like to continue our conversation or finish this entry?";

function JournalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCuddle = (localStorage.getItem('soul_journal_cuddle_id') || searchParams.get('cuddle') || 'ellie-sr') as CuddleId;
  const selectedDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isTyping, setIsTyping] = useState(true);
  const [userResponse, setUserResponse] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [userId, setUserId] = useState<string>('');
  const [showInput, setShowInput] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [usedPrompts, setUsedPrompts] = useState<string[]>([]);
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

  // Initialize user and start intro message
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const storedUserId = localStorage.getItem('soul_journal_user_id');

        if (storedUserId) {
          console.log('Using stored user ID:', storedUserId);
          setUserId(storedUserId);
          
          // Check if user has a custom name
          const { data } = await supabase
            .from('users')
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
            .from('users')
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
            localStorage.setItem('soul_journal_user_id', newUserId);
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

  // Group consecutive assistant messages
  const groupedMessages = messages.reduce((acc, message, index) => {
    if (message.role === 'assistant' &&
      index > 0 &&
      acc.length > 0 &&
      acc[acc.length - 1].role === 'assistant') {
      acc[acc.length - 1].content += '\n\n' + message.content;
    } else {
      acc.push({ ...message });
    }
    return acc;
  }, [] as typeof messages);

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
    const fetchChatHistory = async () => {
      const storedUserId = localStorage.getItem('soul_journal_user_id');
      if (!storedUserId) {
        // Don't start conversation yet if no user ID (wait for privacy modal)
        return;
      }

      try {
        const response = await fetch(`/api/chat?userId=${storedUserId}&date=${selectedDate}&page=1`);
        const { data } = await response.json();

        if (data?.messages && data.messages.length > 0) {
          // Check if the last message is already the welcome back message
          const hasWelcomeBack = data.messages.some((msg: { role: 'user' | 'assistant'; content: string }) =>
            msg.role === 'assistant' &&
            msg.content === WELCOME_BACK_MESSAGE
          );

          setMessages(data.messages);
          setHasMoreMessages(data.hasMore);
          setPage(1);

          if (!hasWelcomeBack) {
            // Add continuation message after loading chat history
            setTimeout(() => {
              setIsTyping(true);
              setTimeout(() => {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: WELCOME_BACK_MESSAGE
                }]);
                setIsTyping(false);
                setIsWelcomeBack(true);
                setShowInput(true);
              }, 1500);
            }, 1000);
          } else {
            setIsWelcomeBack(true);
            setShowInput(true);
          }
        } else {
          // Check if this is a new user (has temp_session_id) before starting conversation
          const { data: userData } = await supabase
            .from('users')
            .select('temp_session_id')
            .eq('id', storedUserId)
            .single();
          
          // Only start conversation if user is not new (no temp_session_id) or privacy modal is closed
          if (!userData?.temp_session_id || !showPrivacyModal) {
          const cuddle = cuddleData.cuddles[selectedCuddle];
          setIsTyping(true);
          setTimeout(() => {
            setMessages([{
              role: 'assistant',
                content: `${cuddle.intro}\n\nHow would you like to journal today?`
            }]);
            setIsTyping(false);
              setShowSuggestedReplies(true);
          }, 1000);
          }
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
        // Only start a new conversation on error if privacy modal is closed
        if (!showPrivacyModal) {
        const cuddle = cuddleData.cuddles[selectedCuddle];
        setIsTyping(true);
        setTimeout(() => {
          setMessages([{
            role: 'assistant',
              content: `${cuddle.intro}\n\nHow would you like to journal today?`
          }]);
          setIsTyping(false);
            setShowSuggestedReplies(true);
        }, 1000);
        }
      }
    };

    fetchChatHistory();
  }, [selectedCuddle, selectedDate, userId]);

  // Separate effect to handle privacy modal state changes
  useEffect(() => {
    if (!showPrivacyModal && userId && messages.length === 0) {
      const storedUserId = localStorage.getItem('soul_journal_user_id');
      if (storedUserId) {
        // Check if this is a new user (has temp_session_id)
        const checkIfNewUser = async () => {
          try {
            const { data } = await supabase
              .from('users')
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
                  content: `${cuddle.intro}\n\nHow would you like to journal today?`
                }]);
                setIsTyping(false);
                setShowSuggestedReplies(true);
              }, 1000);
            }
          } catch (error) {
            console.error('Error checking if new user:', error);
          }
        };
        
        checkIfNewUser();
      }
    }
  }, [showPrivacyModal, userId, selectedCuddle]);

  useEffect(() => {
    // Load ongoing conversation from localStorage if exists
    const ongoingConversation = localStorage.getItem('ongoing_journal_conversation');
    if (ongoingConversation) {
      const { messages: savedMessages, cuddle } = JSON.parse(ongoingConversation);
      if (cuddle === selectedCuddle) {
        setMessages(savedMessages);
        setShowInput(true);
        setJournalingMode('guided'); // Assume guided mode for ongoing conversations
      }
    }
  }, [selectedCuddle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userResponse.trim()) return;

    const storedUserId = localStorage.getItem('soul_journal_user_id');
    if (!storedUserId) {
      console.error('No user ID available');
      router.push('/');
      return;
    }

    const userMessage = { role: 'user' as const, content: userResponse.trim() };
    
    // Batch state updates to prevent multiple re-renders
    setMessages(prev => [...prev, userMessage]);
    setUserResponse('');
    setShowInput(false);
    setIsTyping(true);

    try {
      // Get user profile from localStorage
      const userProfileData = localStorage.getItem('user_profile');
      const userProfile = userProfileData ? JSON.parse(userProfileData) : null;

      let response;
      try {
         response = await axios.post('/api/chat-completion', {
          message: userMessage.content,
          cuddleId: selectedCuddle,
          messageHistory: messages
         },{
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

      const updatedMessagesWithFirst = [...messages, userMessage, firstAssistantMessage];
      
      // Batch state updates for first message
      setIsTyping(false);
      setMessages(updatedMessagesWithFirst);

      // Add the second message after a short delay for natural flow
      if (secondMessage) {
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            const secondAssistantMessage = {
              role: 'assistant' as const,
              content: secondMessage
            };
            const finalMessages = [...updatedMessagesWithFirst, secondAssistantMessage];
            
            // Batch state updates for final messages
            setIsTyping(false);
            setMessages(finalMessages);

            // Save to localStorage
            localStorage.setItem('ongoing_journal_conversation', JSON.stringify({
              messages: finalMessages,
              cuddle: selectedCuddle
            }));

            if (shouldEnd) {
              setTimeout(() => {
                setShowStreakModal(true);
              }, 1500);
              return;
            }

            setShowInput(true);
          }, 1000); // 1 second typing delay for second message
        }, 500); // 0.5 second delay before starting second message
      } else {
        // If no second message, just save and continue
        localStorage.setItem('ongoing_journal_conversation', JSON.stringify({
          messages: updatedMessagesWithFirst,
          cuddle: selectedCuddle
        }));

        if (shouldEnd) {
          setTimeout(() => {
            setShowStreakModal(true);
          }, 1500);
          return;
        }

        setShowInput(true);
      }
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

    const storedUserId = localStorage.getItem('soul_journal_user_id');
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
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Thank you for sharing your thoughts with me. I've saved your journal entry. 💜\n\nHow would you like to journal today?"
        }]);
        setIsTyping(false);
        setShowSuggestedReplies(true);
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

  const handleModeSelection = (mode: 'guided' | 'free-form') => {
    setJournalingMode(mode);
    setShowSuggestedReplies(false);
    
    if (mode === 'guided') {
      // Show a prompt first for guided journaling
      setIsTyping(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "What's on your mind today?"
        }]);
        setIsTyping(false);
        setShowInput(true);
      }, 1000);
    } else {
      // Show free-form journaling interface immediately
      setShowInput(true);
    }
  };

  const handleStartJournaling = () => {
    setShowInput(false);

    // Filter out used prompts
    const availablePrompts = cuddleData.cuddles[selectedCuddle].prompts.filter(p => !usedPrompts.includes(p));
    let selectedPrompt;

    if (availablePrompts.length === 0) {
      // If all prompts are used, reset the used prompts
      setUsedPrompts([]);
      selectedPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    } else {
      selectedPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    }

    setCurrentPrompt(selectedPrompt);
    setUsedPrompts(prev => [...prev, selectedPrompt]);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: selectedPrompt }]);
      setShowInput(true);
    }, 2000);
  };

  const handleCloseStreakModal = () => {
    setShowStreakModal(false);
    router.push('/account');
  };

  const getCuddleName = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getDisplayCuddleName = (id: string) => {
    // Check localStorage first for custom cuddle name
    const customName = localStorage.getItem('soul_journal_cuddle_name');
    const storedCuddleId = localStorage.getItem('soul_journal_cuddle_id');
    
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
    const storedUserId = localStorage.getItem('soul_journal_user_id');
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

        // Clear the ongoing conversation from localStorage
        localStorage.removeItem('ongoing_journal_conversation');

        setTimeout(() => {
          setShowStreakModal(true);
        }, 1500);
      } catch (error) {
        console.error('Error saving chat:', error);
      }
    } catch (error) {
      console.error('Error in handleFinishEntry:', error);
      setIsTyping(false);
    }
  };

  const handleContinue = async () => {
    setIsWelcomeBack(false);
    setShowInput(false);
    setIsTyping(true);

    const continueMessage = {
      role: 'user' as const,
      content: "I'd like to continue our conversation."
    };
    setMessages(prev => [...prev, continueMessage]);

    try {
      const response = await fetch('/api/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: continueMessage.content,
          cuddleId: selectedCuddle,
          messageHistory: messages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { response: aiResponse } = await response.json();

      // Split the AI response into two messages
      const responseParts = aiResponse.split('\n\n');
      const firstMessage = responseParts[0] || aiResponse;
      const secondMessage = responseParts[1] || '';

      // Add the first message immediately
      const firstAssistantMessage = {
        role: 'assistant' as const,
        content: firstMessage
      };

      const updatedMessagesWithFirst = [...messages, continueMessage, firstAssistantMessage];
      setIsTyping(false);
      setMessages(updatedMessagesWithFirst);

      // Add the second message after a short delay for natural flow
      if (secondMessage) {
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            const secondAssistantMessage = {
              role: 'assistant' as const,
              content: secondMessage
            };
            const finalMessages = [...updatedMessagesWithFirst, secondAssistantMessage];
            setIsTyping(false);
            setMessages(finalMessages);
            setShowInput(true);
            setJournalingMode('guided'); // Set guided mode for continued conversations
          }, 1000); // 1 second typing delay for second message
        }, 500); // 0.5 second delay before starting second message
      } else {
        setShowInput(true);
        setJournalingMode('guided'); // Set guided mode for continued conversations
      }
    } catch (error) {
      console.error('Error in handleContinue:', error);
      setIsTyping(false);
      setShowInput(true);
      setJournalingMode('guided'); // Set guided mode for continued conversations
    }
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

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = async () => {
      if (isLoadingMore || !hasMoreMessages) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      // If we're near the top (scrollTop is small), load more messages
      if (scrollTop < 100) {
        setIsLoadingMore(true);
        try {
          const storedUserId = localStorage.getItem('soul_journal_user_id');
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
          <div className="flex items-center gap-2">
            <Image
              src={getCuddleImage(selectedCuddle)}
              alt={getDisplayCuddleName(selectedCuddle)}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
            <span className="text-primary font-medium">
              {getDisplayCuddleName(selectedCuddle)}
            </span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        <div className="max-w-3xl mx-auto space-y-4 px-4 pt-20 pb-24">
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
          <AnimatePresence>
            {messages.map((message, index) => {
              const isLastAssistantMessage = message.role === 'assistant' &&
                (index === messages.length - 1 || messages[index + 1]?.role === 'user');
              const isFirstAssistantMessage = message.role === 'assistant' &&
                (index === 0 || messages[index - 1]?.role === 'user');

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
                      {isLastAssistantMessage && showSuggestedReplies && !journalingMode && (
                        <div className="mt-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleModeSelection('guided')}
                              className="bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm flex-1"
                            >
                              💬 Guided Journaling
                            </button>
                            <button
                              onClick={() => handleModeSelection('free-form')}
                              className="bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm flex-1"
                            >
                              ✍️ Free Journaling
                            </button>
                          </div>
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
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start gap-3"
              >
                <div className="flex-shrink-0 w-10 flex justify-center items-start">
                  <Image
                    src={getCuddleImage(selectedCuddle)}
                    alt={getCuddleName(selectedCuddle)}
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
                    {getDisplayCuddleName(selectedCuddle)} is typing...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add ref for auto-scrolling */}
          <div ref={messagesEndRef} />

          {/* User Response Input */}
          {showInput && (
            <div className="flex justify-end">
              <div className="w-[80%]">
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
                      className="w-full p-6 rounded-2xl border-2 border-primary/20 focus:border-primary outline-none bg-white resize-none text-base"
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
                      className="w-full p-4 rounded-2xl border-2 border-primary/20 focus:border-primary outline-none bg-white resize-none"
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
      </div>

      <StreakModal
        isOpen={showStreakModal}
        onClose={handleCloseStreakModal}
        date={format(new Date(), 'MMMM d, yyyy')}
        userId={userId}
      />

      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
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