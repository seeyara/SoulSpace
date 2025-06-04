'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import introData from '../intro.json';
import StreakModal from '@/components/StreakModal';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const prompts = introData.prompts;

export default function Journal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCuddle = searchParams.get('cuddle') || 'ellie-sr';
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isTyping, setIsTyping] = useState(true);
  const [userResponse, setUserResponse] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [userId, setUserId] = useState<string>('');
  const [showInput, setShowInput] = useState(false);
  const [showSuggestedReplies, setShowSuggestedReplies] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [usedPrompts, setUsedPrompts] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize user and start intro messages
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Check if we have a user ID in localStorage
        const storedUserId = localStorage.getItem('soul_journal_user_id');
        
        if (storedUserId) {
          console.log('Using stored user ID:', storedUserId);
          setUserId(storedUserId);
          return;
        }

        // Generate a temporary session ID for new users
        const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        console.log('Generated temp session ID:', tempSessionId);

        // Create new user
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
          // Store the user ID in localStorage
          localStorage.setItem('soul_journal_user_id', newUserId);
          setUserId(newUserId);
        } else {
          console.error('Failed to create user');
        }

      } catch (error) {
        console.error('Error in initializeUser:', error);
      }
    };

    initializeUser();
  }, []);

  // Handle intro messages separately
  useEffect(() => {
    let isMounted = true;
    
    const startIntro = async () => {
      for (const message of introData.intro) {
        if (!isMounted) break;
        
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, message.delay));
        
        if (!isMounted) break;
        setIsTyping(false);
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: message.text.replace('{{cuddle_name}}', getCuddleName(selectedCuddle))
        }]);

        if (message.suggested_replies) {
          setShowSuggestedReplies(true);
          setShowInput(true);
        }
      }
    };

    startIntro();

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
    setShowSuggestedReplies(false);
    setIsTyping(true);

    try {
      // Add initial response
      const initialResponse = { 
        role: 'assistant' as const, 
        content: `Thank you for sharing that with me. I'm here to listen and support you through whatever you're experiencing.` 
      };

      setTimeout(() => {
        setMessages(prev => [...prev, initialResponse]);
        setIsTyping(false);

        // Show post response message
        setTimeout(() => {
          const postResponse = {
            role: 'assistant' as const,
            content: introData.post_response.text
          };
          setMessages(prev => [...prev, postResponse]);
          setShowSuggestedReplies(true);
          setShowInput(true);
        }, 1000);
      }, 1000);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setIsTyping(false);
    }
  };

  const handleSuggestedReply = async (reply: string) => {
    if (reply === "Begin Journaling") {
      handleStartJournaling();
    } else if (reply === "Another Prompt") {
      handleStartJournaling();
    } else if (reply === "Come back tomorrow") {
      const storedUserId = localStorage.getItem('soul_journal_user_id');
      if (!storedUserId) {
        console.error('No user ID available');
        router.push('/');
        return;
      }

      // Hide suggested replies and input immediately
      setShowSuggestedReplies(false);
      setShowInput(false);

      try {
        // Add farewell message
        setIsTyping(true);
        setTimeout(async () => {
          const farewellMessage = {
            role: 'assistant' as const,
            content: "Okay, see you tomorrow! Take care 🌙"
          };
          setMessages(prev => [...prev, farewellMessage]);
          setIsTyping(false);

          // Wait a moment before saving and showing modal
          setTimeout(async () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            console.log('Saving chat for date:', today, 'user:', storedUserId);

            // Save the entire chat session including farewell message
            const { error } = await supabase
              .from('chats')
              .upsert({
                date: today,
                user_id: storedUserId,
                messages: [...messages, farewellMessage],
                cuddle_id: selectedCuddle
              });

            if (error) {
              console.error('Error saving chat:', error);
              return;
            }

            // Show streak modal
            setShowStreakModal(true);
          }, 1000);
        }, 1000);

      } catch (error) {
        console.error('Error in handleSuggestedReply:', error);
      }
    }
  };

  const handleStartJournaling = () => {
    setShowInput(false);
    setShowSuggestedReplies(false);
    
    // Filter out used prompts
    const availablePrompts = prompts.filter(p => !usedPrompts.includes(p.text));
    let selectedPrompt;
    
    if (availablePrompts.length === 0) {
      // If all prompts are used, reset the used prompts
      setUsedPrompts([]);
      selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    } else {
      selectedPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    }

    setCurrentPrompt(selectedPrompt.text);
    setUsedPrompts(prev => [...prev, selectedPrompt.text]);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: selectedPrompt.text }]);
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
      <div className="flex-1 pt-24 pb-32 px-4 overflow-y-auto">
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
                {showSuggestedReplies ? (
                  <div className="space-y-2">
                    {messages.length === introData.intro.length ? (
                      <button
                        onClick={() => handleSuggestedReply("Begin Journaling")}
                        className="bg-primary text-white px-8 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors w-full"
                      >
                        Begin Journaling
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSuggestedReply("Another Prompt")}
                          className="bg-primary text-white px-8 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors w-full"
                        >
                          Another Prompt
                        </button>
                        <button
                          onClick={() => handleSuggestedReply("Come back tomorrow")}
                          className="bg-white text-primary px-8 py-3 rounded-2xl font-medium hover:bg-white/90 transition-colors w-full border-2 border-primary"
                        >
                          Come back tomorrow
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-2">
                    <textarea
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      placeholder="Type your response..."
                      rows={3}
                      className="w-full p-4 rounded-2xl border-2 border-primary/20 focus:border-primary outline-none bg-white resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!userResponse.trim()}
                        className="bg-primary text-white px-8 py-3 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
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
    </main>
  );
} 