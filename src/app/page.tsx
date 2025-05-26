'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import JournalCalendar from '@/components/JournalCalendar';
import { format, subDays } from 'date-fns';
import DateSelector from '@/components/DateSelector';
import ChatHistory from '@/components/ChatHistory';
import ChatHistoryModal from '@/components/ChatHistoryModal';

const cuddles = [
  { id: 'ellie-sr', name: 'Ellie Sr.', image: '/assets/Ellie Sr.png' },
  { id: 'ellie-jr', name: 'Ellie Jr.', image: '/assets/Ellie Jr.png' },
  { id: 'olly-sr', name: 'Olly Sr.', image: '/assets/Olly Sr.png' },
  { id: 'olly-jr', name: 'Olly Jr.', image: '/assets/Olly Jr.png' },
];

const benefits = [
  {
    stat: 83,
    suffix: '%',
    text: 'of people say journaling helps them sleep better',
  },
  {
    stat: 44,
    suffix: '%',
    text: 'Writing your thoughts lowers anxiety by up to 44%',
  },
  {
    stat: 2,
    suffix: 'x',
    text: 'People who journal report 2x more emotional clarity',
  },
];

const features = [
  {
    title: 'Thoughtful Prompts',
    description: 'Begin your journey with gentle guidance',
    icon: '/assets/Hand Holding Gift Icon.svg'
  },
  {
    title: 'Gentle Streaks',
    description: 'Build a habit, softly',
    icon: '/assets/Tick Circle Icon.svg'
  },
  {
    title: 'Private by Default',
    description: 'Your space, your pace',
    icon: '/assets/Key Round Icon.svg'
  },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration: 2 });
    return controls.stop;
  }, [value, count]);

  return (
    <motion.span className="text-5xl font-bold text-background">
      <motion.span>{rounded}</motion.span>{suffix}
    </motion.span>
  );
}

export default function Home() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCuddle, setSelectedCuddle] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [userId, setUserId] = useState<string>('');

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

  useEffect(() => {
    // Retrieve user ID from localStorage if it exists
    const storedUserId = localStorage.getItem('soul_journal_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const handleDateSelect = async (date: string) => {
    try {
      setSelectedDate(date);
      
      // Get stored user ID
      const storedUserId = localStorage.getItem('soul_journal_user_id');
      if (!storedUserId) {
        console.error('No user ID available');
        return;
      }

      console.log('Fetching chat for date:', date, 'user:', storedUserId);
      
      // Fetch chat messages for the selected date and user
      const { data: chat, error } = await supabase
        .from('chats')
        .select('*')
        .eq('date', date)
        .eq('user_id', storedUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - this is expected for new dates
          setChatMessages([]);
          setIsModalOpen(true);
          return;
        }
        console.error('Error fetching chat:', error);
        return;
      }

      if (chat?.messages) {
        setChatMessages(chat.messages);
        setIsModalOpen(true);
      } else {
        setChatMessages([]);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error in handleDateSelect:', error);
    }
  };

  const handleCuddleSelect = (cuddleId: string) => {
    setSelectedCuddle(cuddleId);
  };

  const handleStartJournaling = async () => {
    if (!selectedCuddle) return;

    try {
      // Check for existing user ID in both localStorage and Supabase
      const storedUserId = localStorage.getItem('soul_journal_user_id');
      
      if (!storedUserId) {
        // Create new user in Supabase first
        const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        console.log('Creating new user with temp session:', tempSessionId);

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            temp_session_id: tempSessionId
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating user in Supabase:', createError);
          return;
        }

        if (!newUser?.id) {
          console.error('Failed to create user - no ID returned');
          return;
        }

        // Only store in localStorage after successful Supabase creation
        localStorage.setItem('soul_journal_user_id', newUser.id);
        console.log('Successfully created user:', newUser.id);
      }

      // At this point we have a valid user ID either from storage or newly created
      router.push(`/journal?cuddle=${selectedCuddle}`);
    } catch (error) {
      console.error('Error in handleStartJournaling:', error);
    }
  };

  // Load selected cuddle from localStorage on mount
  useEffect(() => {
    const storedCuddle = localStorage.getItem('selectedCuddle');
    if (storedCuddle) {
      setSelectedCuddle(storedCuddle);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-sm z-50 p-4 border-b border-primary/10">
        <div className="max-w-3xl mx-auto">
          <Image
            src="/assets/Logo.png"
            alt="Soul Logo"
            width={100}
            height={32}
            className="h-8 w-auto cursor-pointer"
            onClick={() => router.push('/')}
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-6xl font-semibold text-primary mb-6 tracking-[0.02em] leading-tight"
          >
            Journal with Your Favorite Cuddle ✨
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-700 mb-12 leading-relaxed"
          >
            A cozy space to reflect, breathe, and grow—one entry at a time 🌱
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-4xl mx-auto mb-12"
          >
            {['ellie-sr', 'ellie-jr', 'olly-sr', 'olly-jr'].map((cuddle) => (
              <motion.button
                key={cuddle}
                onClick={() => handleCuddleSelect(cuddle)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-3 sm:p-4 rounded-2xl border-2 transition-colors ${
                  selectedCuddle === cuddle
                    ? 'border-primary bg-primary/5'
                    : 'border-primary/20 hover:border-primary/50'
                }`}
              >
                <div className="aspect-square relative mb-2">
                  <Image
                    src={`/assets/${cuddle.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}.png`}
                    alt={cuddle}
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-center font-medium text-sm sm:text-base">
                  {cuddle.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </p>
              </motion.button>
            ))}
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleStartJournaling}
            className="bg-primary text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Start Your Journey
          </motion.button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-semibold text-background mb-16 text-center tracking-[0.02em]"
          >
            Why Journaling Works✨
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-12">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className="mb-4">
                  <AnimatedNumber value={benefit.stat} suffix={benefit.suffix} />
                </div>
                <p className="text-background/90 text-lg leading-relaxed">{benefit.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Your Space Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-semibold text-primary mb-8 text-center tracking-[0.02em]"
          >
            Your Space 🏡
          </motion.h2>
          <div className="max-w-3xl mx-auto">
            <DateSelector
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-semibold text-primary mb-12 tracking-[0.02em]"
          >
            Not just any journal—this one listens back 💭
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="border-2 border-[#9b046f33] p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col items-center">
                  <Image
                    src={feature.icon}
                    alt={feature.title}
                    width={48}
                    height={48}
                    className="mb-4"
                  />
                  <h3 className="text-xl font-semibold text-black mb-4 tracking-[0.02em]">{feature.title}</h3>
                  <p className="text-gray-700 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-primary">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-semibold text-white mb-8 tracking-[0.02em]">
              Take a minute for yourself today
            </h2>
            <button
              onClick={handleStartJournaling}
              className="bg-white text-primary px-8 py-4 rounded-full text-lg font-medium hover:bg-white/90 transition-colors"
            >
              Start Journaling with Your Cuddle
            </button>
          </motion.div>
        </div>
      </section>

      <ChatHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate || ''}
        messages={groupedMessages}
        onStartJournaling={handleStartJournaling}
        selectedCuddle={selectedCuddle || 'ellie-sr'}
      />
    </main>
  );
}
