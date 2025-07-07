'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import ChatHistoryModal from '@/components/ChatHistoryModal';
import CuddleSelectionModal from '@/components/CuddleSelectionModal';
import type { CuddleId } from '@/types/cuddles';
import { event as gaEvent } from '@/lib/utils/gtag';

export default function Account() {
  const [userName, setUserName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [entries, setEntries] = useState<Array<{ date: string; cuddleId?: string }>>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userId, setUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCuddleModalOpen, setIsCuddleModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [selectedCuddle, setSelectedCuddle] = useState('olly-sr');
  const [streak, setStreak] = useState(0);
  const [cuddleName, setCuddleName] = useState('');
  const [lastCuddleFromEntries, setLastCuddleFromEntries] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const initializeUser = async () => {
      const storedUserId = localStorage.getItem('soul_journal_user_id');
      if (!storedUserId) {
        setUserName('Username');
        router.push('/journal');
        return;
      }

      setUserId(storedUserId);
      await Promise.all([
        fetchUserData(storedUserId),
        fetchEntries(storedUserId)
      ]);
    };

    initializeUser();
  }, [router]);

  useEffect(() => {
    const fetchCuddle = async () => {
      try {
        const storedUserId = localStorage.getItem('soul_journal_user_id');
        if (!storedUserId) return;
        
        // Try Supabase first
        const { data, error } = await supabase
          .from('users')
          .select('cuddle_id, cuddle_name')
          .eq('id', storedUserId)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error fetching cuddle from Supabase:', error);
        }
        
        if (data && (data.cuddle_id || data.cuddle_name)) {
          // Found data in Supabase
          if (data.cuddle_id) setSelectedCuddle(data.cuddle_id);
          if (data.cuddle_name) setCuddleName(data.cuddle_name);
          
          // Update localStorage to keep it in sync
          localStorage.setItem('soul_journal_cuddle_id', data.cuddle_id || '');
          localStorage.setItem('soul_journal_cuddle_name', data.cuddle_name || '');
        } else {
          // No data in Supabase, fallback to localStorage
          const localCuddleId = localStorage.getItem('soul_journal_cuddle_id');
          const localCuddleName = localStorage.getItem('soul_journal_cuddle_name');
          
          if (localCuddleId) setSelectedCuddle(localCuddleId);
          if (localCuddleName) setCuddleName(localCuddleName);
        }
      } catch (error) {
        console.error('Error in fetchCuddle:', error);
        // Fallback to localStorage on any error
        const localCuddleId = localStorage.getItem('soul_journal_cuddle_id');
        const localCuddleName = localStorage.getItem('soul_journal_cuddle_name');
        if (localCuddleId) setSelectedCuddle(localCuddleId);
        if (localCuddleName) setCuddleName(localCuddleName);
      }
    };
    fetchCuddle();
  }, [userId]); // Only run when userId changes

  const handleNameChange = async (newName: string) => {
    if (newName.trim() === 'Username') {
      setUserName('Username');
      setIsEditingName(false);
      return;
    }

    setUserName(newName);

    gaEvent({
      action: 'update_username',
      category: 'account',
      label: newName,
    });
    if (userId) {
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, name: newName }),
        });
      } catch (error) {
        console.error('Error updating username:', error);
      }
    }
  };

  const handleNameSubmit = () => {
    handleNameChange(userName);
    setIsEditingName(false);
  };

  const calculateStreak = (entries: Array<{ date: string; cuddleId?: string }>): number => {
    if (!entries.length) return 0;
    const dates = entries.map(entry => entry.date);
    const today = new Date();
    let currentStreak = 0;
    let date = today;

    // Check backwards from today until we find a break in the streak
    while (true) {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (!dates.includes(dateStr)) {
        break;
      }
      currentStreak++;
      date = subDays(date, 1);
    }

    return currentStreak;
  };

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        setUserName('Username');
        return;
      }

      if (data?.name) {
        setUserName(data.name);
      } else {
        setUserName('Username');
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setUserName('Username');
    }
  };

  const fetchEntries = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('date, cuddle_id')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching entries:', error);
        return;
      }

      if (data && data.length > 0) {
        const entriesWithCuddle = data.map(entry => ({
          date: entry.date,
          cuddleId: entry.cuddle_id
        }));
        setEntries(entriesWithCuddle);
        setStreak(calculateStreak(entriesWithCuddle));
        
        // Get the last cuddle from entries
        const lastEntry = entriesWithCuddle[entriesWithCuddle.length - 1];
        if (lastEntry.cuddleId) {
          setLastCuddleFromEntries(lastEntry.cuddleId);
        }
        
      } else {
        // No entries yet
        setEntries([]);
        setStreak(0);
      }
    } catch (error) {
      console.error('Error in fetchEntries:', error);
      setEntries([]);
      setStreak(0);
    }
  };

  const fetchChatHistory = async (date: string) => {
    try {
      const response = await fetch(`/api/chat?userId=${userId}&date=${date}`);
      const { data } = await response.json();
      
      if (data?.messages) {
        setChatMessages(data.messages);
        if (data.cuddleId) {
          setSelectedCuddle(data.cuddleId);
        }
        setIsModalOpen(true);
      } else {
        setChatMessages([]);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setChatMessages([]);
      setIsModalOpen(true);
    }
  };

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    fetchChatHistory(dateStr);
  };

  const handleStartJournaling = () => {
    if (selectedDate) {
      router.push(`/journal?cuddle=${selectedCuddle}&date=${selectedDate}`);
    }
  };

  const handleCuddleSelection = async (cuddleId: CuddleId, cuddleName: string) => {
    gaEvent({
      action: 'pick_cuddle',
      category: 'account',
      label: cuddleId,
      value: cuddleName,
    });
    // Update state to reflect the newly selected cuddle
    setSelectedCuddle(cuddleId);
    setCuddleName(cuddleName);
    setIsCuddleModalOpen(false);
    
    // Navigate to journaling with the selected cuddle
    router.push(`/journal?cuddle=${cuddleId}`);
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
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

  const getCuddleName = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-sm z-50 p-4 border-b border-primary/10">
        <div className="max-w-3xl mx-auto">
          <Image
            src="/assets/Logo.png"
            alt="Soul Logo"
            width={100}
            height={32}
            priority
            className="h-8 w-auto cursor-pointer"
            onClick={() => router.push('/')}
          />
        </div>
      </header>

      {/* Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto px-4 pt-20"
      >
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl text-primary font-semibold">
              {userName ? userName[0].toUpperCase() : ''}
            </span>
          </div>
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center space-x-2 max-w-[200px]">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="border rounded px-2 py-1 text-2xl font-semibold text-gray-900 w-full"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleNameSubmit();
                    }
                  }}
                />
                <button
                  onClick={handleNameSubmit}
                  className="text-primary hover:text-primary/80 whitespace-nowrap"
                >
                  Save
                </button>
              </div>
            ) : (
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => setIsEditingName(true)}
              >
                <h1 className="text-2xl font-semibold text-gray-900">
                  {userName || 'Loading...'}
                </h1>
                <span className="text-gray-400 hover:text-gray-600">✏️</span>
              </div>
            )}
          </div>
        </div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8 text-center"
        >
          <p className="text-lg text-primary/80 italic">
            "Eighty percent of success is showing up."
          </p>
          <p className="text-sm text-primary/60 mt-2">
            - Woody Allen
          </p>
        </motion.div>

        {/* Stats and Cuddle Companion */}
        <div className="grid grid-cols-2 gap-4 pb-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border-2 border-primary/5 hover:border-primary/10 transition-all"
          >
            <h3 className="text-sm text-gray-500 mb-1">Current Streak 🔥</h3>
            <p className="text-2xl font-semibold text-primary">{streak} days</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border-2 border-primary/5 hover:border-primary/10 transition-all"
          >
            {(() => {
              // Business logic: 
              // 1. If user has selected a cuddle and set a name (in DB), show that
              // 2. If not, show last cuddle from journal entries (if entries > 0)
              // 3. Else show "Pick a cuddle" button
              
              if (selectedCuddle && cuddleName) {
                // User has selected a cuddle and set a name
                return (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm text-gray-500">Your Cuddle 💜</h3>
                      <button
                        onClick={() => setIsCuddleModalOpen(true)}
                        className="text-xs text-gray-500 hover:text-primary transition-colors underline"
                      >
                        Change cuddle
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                        <Image
                          src={getCuddleImage(selectedCuddle)}
                          alt={getCuddleName(selectedCuddle)}
                          width={100}
                          height={100}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-primary">{cuddleName}</p>
                        <p className="text-xs text-gray-500">{getCuddleName(selectedCuddle)}</p>
                      </div>
                    </div>
                  </>
                );
              } else if (entries.length > 0 && lastCuddleFromEntries) {
                // Show last cuddle from journal entries
                const genericName = lastCuddleFromEntries.includes('ellie') ? 'Ellie' : 'Olly';
                return (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm text-gray-500">Your Cuddle 💜</h3>
                      <button
                        onClick={() => setIsCuddleModalOpen(true)}
                        className="text-xs text-gray-500 hover:text-primary transition-colors underline"
                      >
                        Change cuddle
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                        <Image
                          src={getCuddleImage(lastCuddleFromEntries)}
                          alt={getCuddleName(lastCuddleFromEntries)}
                          width={100}
                          height={100}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-primary">{genericName}</p>
                        <p className="text-xs text-gray-500">{getCuddleName(lastCuddleFromEntries)}</p>
                      </div>
                    </div>
                  </>
                );
              } else {
                // No entries or no cuddle selected - show pick a cuddle button
                return (
                  <div className="text-center">
                    <h3 className="text-sm text-gray-500 mb-2">Your Cuddle Space 💜</h3>
                    <button
                      onClick={() => {
                        gaEvent({
                          action: 'pick_cuddle_button',
                          category: 'account',
                        });
                        setIsCuddleModalOpen(true);
                      }}
                      className="bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm"
                    >
                      Pick Your Cuddle →
                    </button>
                  </div>
                );
              }
            })()}
          </motion.div>
        </div>

        {/* Calendar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/60 backdrop-blur-sm rounded-3xl border-2 border-primary/5 hover:border-primary/10 transition-all p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Journey Calendar
            </h2>
            <p className="text-primary font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </p>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {getDaysInMonth().map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const hasEntry = entries.some(entry => entry.date === dateStr);
              return (
                <div
                  key={dateStr}
                  onClick={() => handleDateClick(date)}
                  className={`aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-sm hover:shadow-md ${
                    hasEntry ? 'bg-primary text-white hover:bg-primary/90' : 'hover:bg-primary/5'
                  }`}
                >
                  <div className="relative">
                    <span className="text-sm">{format(date, 'd')}</span>
                    {hasEntry && (
                      <svg
                        className="w-3 h-3 absolute -top-2 -right-2 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      <ChatHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate || ''}
        messages={chatMessages}
        onStartJournaling={handleStartJournaling}
        selectedCuddle={selectedCuddle}
        cuddleName={getCuddleName(selectedCuddle)}
      />

      <CuddleSelectionModal
        isOpen={isCuddleModalOpen}
        onClose={() => setIsCuddleModalOpen(false)}
        onSelectCuddle={handleCuddleSelection}
      />
    </div>
  );
} 