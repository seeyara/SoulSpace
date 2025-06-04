'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import ChatHistoryModal from '@/components/ChatHistoryModal';

export default function Account() {
  const [userName, setUserName] = useState('Divya Singh');
  const [entries, setEntries] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userId, setUserId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const router = useRouter();

  useEffect(() => {
    const storedUserId = localStorage.getItem('soul_journal_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      fetchUserData(storedUserId);
      fetchEntries(storedUserId);
    }
  }, []);

  const fetchUserData = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .single();

    if (data?.name) {
      setUserName(data.name);
    }
  };

  const fetchEntries = async (userId: string) => {
    const { data, error } = await supabase
      .from('chats')
      .select('date')
      .eq('user_id', userId);

    if (data) {
      setEntries(data.map(entry => entry.date));
    }
  };

  const handleDateClick = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    
    try {
      const { data: chat, error } = await supabase
        .from('chats')
        .select('messages')
        .eq('date', dateStr)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No entries for this date
          setChatMessages([]);
        } else {
          console.error('Error fetching chat:', error);
          return;
        }
      } else if (chat?.messages) {
        setChatMessages(chat.messages);
      }

      setIsModalOpen(true);
    } catch (error) {
      console.error('Error in handleDateClick:', error);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  // Group consecutive assistant messages
  const groupedMessages = chatMessages.reduce((acc, message, index) => {
    if (message.role === 'assistant' && 
        index > 0 && 
        acc.length > 0 && 
        acc[acc.length - 1].role === 'assistant') {
      acc[acc.length - 1].content += '\n\n' + message.content;
    } else {
      acc.push({ ...message });
    }
    return acc;
  }, [] as typeof chatMessages);

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
        <div className="flex items-center gap-6 mb-12">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl text-primary font-semibold">
              {userName.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              {userName}
            </h1>
            <p className="text-gray-500">Member since 26 May 2025</p>
          </div>
        </div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-12 text-center"
        >
          <p className="text-lg text-primary/80 italic">
            "Eighty percent of success is showing up."
          </p>
          <p className="text-sm text-primary/60 mt-2">
            - Woody Allen
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border-2 border-primary/5 hover:border-primary/10 transition-all"
          >
            <h3 className="text-sm text-gray-500 mb-2">Current Streak</h3>
            <p className="text-3xl font-semibold text-primary">3 days</p>
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
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(date)}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                    hasEntry 
                      ? 'bg-primary text-white hover:bg-primary/90' 
                      : 'hover:bg-primary/5'
                  }`}
                >
                  <span className="text-sm">{format(date, 'd')}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      <ChatHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate || ''}
        messages={groupedMessages}
        onStartJournaling={() => router.push('/journal')}
        selectedCuddle="ellie-sr"
      />
    </div>
  );
} 