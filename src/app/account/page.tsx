'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import ChatHistoryModal from '@/components/ChatHistoryModal';

export default function Account() {
  const [userName, setUserName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [entries, setEntries] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userId, setUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [selectedCuddle, setSelectedCuddle] = useState('olly-sr');
  const [memberSince, setMemberSince] = useState<string>('');
  const [streak, setStreak] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const initializeUser = async () => {
      const storedUserId = localStorage.getItem('soul_journal_user_id');
      if (!storedUserId) {
        setUserName('User');
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

  const handleNameChange = async (newName: string) => {
    if (newName.trim() === 'User') {
      setUserName('User');
      setIsEditingName(false);
      return;
    }

    setUserName(newName);
    
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

  const calculateStreak = (dates: string[]): number => {
    if (!dates.length) return 0;
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
        setUserName('User');
        return;
      }

      if (data?.name) {
        setUserName(data.name);
      } else {
        setUserName('User');
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setUserName('User');
    }
  };

  const fetchEntries = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching entries:', error);
        return;
      }

      if (data && data.length > 0) {
        const entryDates = data.map(entry => entry.date);
        setEntries(entryDates);
        setStreak(calculateStreak(entryDates));
        
        // Set member since to the first entry date
        const firstEntry = new Date(data[0].date);
        setMemberSince(format(firstEntry, 'd MMMM yyyy'));
      } else {
        // No entries yet
        setStreak(0);
        setMemberSince('Today');
      }
    } catch (error) {
      console.error('Error in fetchEntries:', error);
      setStreak(0);
      setMemberSince('Today');
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
      router.push(`/journal?cuddle=${selectedCuddle}`);
    }
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
                  className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
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
            <p className="text-gray-500">
              Member since {memberSince || 'Today'}
            </p>
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
            <h3 className="text-sm text-gray-500 mb-2">Your Cuddle 💜</h3>
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
              <p className="text-lg font-medium text-primary">{getCuddleName(selectedCuddle)}</p>
            </div>
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
              const hasEntry = entries.includes(dateStr);
              return (
                <div
                  key={dateStr}
                  onClick={() => handleDateClick(date)}
                  className={`aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                    hasEntry ? 'bg-primary text-white hover:bg-primary/90' : 'hover:bg-primary/5'
                  }`}
                >
                  <span className="text-sm">{format(date, 'd')}</span>
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
    </div>
  );
} 