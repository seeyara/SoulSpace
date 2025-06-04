'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { cuddleData } from '@/data/cuddles';
import type { CuddleId } from '@/types/cuddles';
import StreakModal from '@/components/StreakModal';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

function JournalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCuddle = (searchParams.get('cuddle') || 'ellie-sr') as CuddleId;
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isTyping, setIsTyping] = useState(true);
  const [userResponse, setUserResponse] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [userId, setUserId] = useState<string>('');
  const [showInput, setShowInput] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [usedPrompts, setUsedPrompts] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize user and start intro message
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const storedUserId = localStorage.getItem('soul_journal_user_id');
        
        if (storedUserId) {
          console.log('Using stored user ID:', storedUserId);
          setUserId(storedUserId);
          return;
        }

        const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        console.log('Generated temp session ID:', tempSessionId);

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
        }
      } catch (error) {
        console.error('Error in initializeUser:', error);
      }
    };

    initializeUser();
  }, []);

  // Handle intro and first prompt
  useEffect(() => {
    let isMounted = true;
    
    const startConversation = async () => {
      if (!isMounted) return;
      
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!isMounted) return;
      
      // Add intro message
      const cuddle = cuddleData.cuddles[selectedCuddle];
      setMessages([{ 
        role: 'assistant', 
        content: cuddle.intro
      }]);
      
      setIsTyping(false);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (!isMounted) return;
      
      // Add first prompt
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!isMounted) return;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: cuddle.prompts[0]
      }]);
      
      setIsTyping(false);
      setShowInput(true);
    };

    startConversation();

    return () => {
      isMounted = false;
    };
  }, [selectedCuddle]);

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
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      const storedUserId = localStorage.getItem('soul_journal_user_id');
      if (!storedUserId) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      
      try {
        const response = await fetch(`/api/chat?userId=${storedUserId}&date=${today}`);
        const { data } = await response.json();
        
        if (data?.messages) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    fetchChatHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userResponse.trim()) return;

    // Get stored user ID
    const storedUserId = localStorage.getItem('soul_journal_user_id');
    if (!storedUserId) {
      console.error('No user ID available');
      router.push('/');
      return;
    }

    const userMessage = { role: 'user' as const, content: userResponse.trim() };
    setMessages(prev => [...prev, userMessage]);
    setUserResponse('');
    setShowInput(false);
    setIsTyping(true);

    try {
      // Get AI response
      const response = await fetch('/api/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          cuddleId: selectedCuddle,
          messageHistory: messages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { response: aiResponse, shouldEnd } = await response.json();
      
      const assistantMessage = { 
        role: 'assistant' as const, 
        content: aiResponse
      };

      setIsTyping(false);
      setMessages(prev => [...prev, assistantMessage]);

      // Save the conversation
      try {
        await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, userMessage, assistantMessage],
            userId: storedUserId,
            cuddleId: selectedCuddle
          }),
        });
      } catch (error) {
        console.error('Error saving chat:', error);
      }

      // Handle conversation ending
      if (shouldEnd) {
        setShowStreakModal(true);
        return;
      }

      // Always show input after AI response unless conversation ended
      setShowInput(true);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setIsTyping(false);
      setShowInput(true);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble responding right now. Could you try again?" 
      }]);
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
    window.location.href = '/';
  };

  const getCuddleName = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getCuddleImage = (id: string) => {
    switch(id) {
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
      // Get final AI response
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

      setIsTyping(false);
      setMessages(prev => [...prev, farewellMessage]);

      // Save the final conversation
      try {
        await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, farewellMessage],
            userId: storedUserId,
            cuddleId: selectedCuddle
          }),
        });

        // Show streak modal after 5 seconds
        setTimeout(() => {
          setShowStreakModal(true);
        }, 5000);
      } catch (error) {
        console.error('Error saving chat:', error);
      }
    } catch (error) {
      console.error('Error in handleFinishEntry:', error);
      setIsTyping(false);
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
          <div className="flex items-center gap-2">
            <Image
              src={getCuddleImage(selectedCuddle)}
              alt={getCuddleName(selectedCuddle)}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full"
            />
            <span className="text-primary font-medium">
              {getCuddleName(selectedCuddle)}
            </span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4 px-4 pt-20 pb-24">
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
                          {getCuddleName(selectedCuddle)} 💭
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              }
            })}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start gap-3"
            >
              {/* Icon container for typing indicator */} 
              <div className="flex-shrink-0 w-10 flex justify-center items-start">
                <Image
                  src={getCuddleImage(selectedCuddle)}
                  alt={getCuddleName(selectedCuddle)}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full"
                />
              </div>
              {/* Typing indicator content */}
              <div className="flex flex-col max-w-[85%]">
                <div className="bg-primary/10 p-4 rounded-2xl text-primary">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
                <span className="text-sm text-primary/60 mt-1 ml-2 tracking-[0.02em]">
                  {getCuddleName(selectedCuddle)}
                </span>
              </div>
            </motion.div>
          )}

          {/* Add ref for auto-scrolling */}
          <div ref={messagesEndRef} />

          {/* User Response Input */}
          {showInput && (
            <div className="flex justify-end">
              <div className="w-[80%]">
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
                      Finish Entry
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