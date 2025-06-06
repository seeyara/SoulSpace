'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DateSelector from '@/components/DateSelector';
import ChatHistoryModal from '@/components/ChatHistoryModal';
import { Sparkles } from 'lucide-react';

// Add animation keyframes to your global CSS or add them here
const floatAnimation = {
  '0%, 100%': { transform: 'translateY(0)' },
  '50%': { transform: 'translateY(-20px)' }
};

const fadeIn = {
  '0%': { opacity: 0, transform: 'translateY(10px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' }
};

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
    title: 'Private by Default',
    description: 'Your space, your pace',
    icon: '/assets/Key Round Icon.svg'
  },
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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [userId, setUserId] = useState<string>('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCuddle, setSelectedCuddle] = useState<string | null>(null);

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
        // If no user ID, prompt them to start journaling first
        return; // Don't open modal, they need to start journaling first
      }

      // Fetch chat messages using the API route
      const response = await fetch(`/api/chat?userId=${storedUserId}&date=${date}`);
      const { data } = await response.json();
      
      if (data?.messages) {
        setChatMessages(data.messages);
        if (data.cuddleId) {
          setSelectedCuddle(data.cuddleId);
        }
        setIsHistoryModalOpen(true);
      } else {
        setChatMessages([]);
        setIsHistoryModalOpen(true);
      }
    } catch (error) {
      console.error('Error in handleDateSelect:', error);
      setChatMessages([]);
      setIsHistoryModalOpen(true);
    }
  };

  const handleStartJournaling = async () => {
    if (!selectedCuddle) return;
    router.push(`/journal?cuddle=${selectedCuddle}`);
  };

  const startJournaling = () => {
    handleStartJournaling();
  };

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
          priority
            className="h-8 w-auto cursor-pointer"
            onClick={() => router.push('/')}
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen bg-gradient-to-br from-cream via-warm-cream to-soft-pink relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-xl animate-float"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-primary/10 rounded-full blur-lg animate-float" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-light-purple/30 rounded-full blur-2xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-40 right-10 w-20 h-20 bg-primary/8 rounded-full blur-lg animate-float" style={{animationDelay: '0.5s'}}></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20 flex flex-col lg:flex-row items-center justify-between min-h-screen">
          {/* Left side - Content */}
          <div className="flex-1 pt-20max-w-2xl animate-fade-in ">
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-5xl lg:text-7xl font-bold text-gray-800 mb-6 leading-tight text-center"
            >
              Let's{" "}
              <span className="text-primary relative">
                untangle
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary/40 to-primary/20 rounded-full"></div>
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-mg text-gray-500 mb-6 leading-relaxed max-w-xl text-center"
            >
              A soft-hearted companion that listens, comforts, and helps you find calm in the chaos 💜🫶🏼
            </motion.p>

            {/* Cuddle Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-xl text-primary font-medium mb-4 text-center" 
            >
              Select your favorite Cuddle to begin✨
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mb-6"
            >
              {['olly-sr', 'ellie-sr', 'olly-jr', 'ellie-jr'].map((cuddle) => (
                <motion.button
                  key={cuddle}
                  onClick={() => setSelectedCuddle(cuddle)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2 sm:p-3 rounded-2xl border-2 transition-colors 
                    ${selectedCuddle === cuddle 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:border-primary/50 hover:bg-primary/5'}`}
                >
                  <div className="aspect-square relative mb-2">
                    <Image
                      src={`/assets/${cuddle.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}.png`}
                      alt={cuddle}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <p className="text-center font-medium text-sm">
                    {cuddle.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </p>
                </motion.button>
              ))}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="flex justify-center"
            >
              <motion.button
                onClick={() => selectedCuddle ? router.push(`/journal?cuddle=${selectedCuddle}`) : null}
                whileHover={selectedCuddle ? { scale: 1.05 } : {}}
                whileTap={selectedCuddle ? { scale: 0.95 } : {}}
                className={`px-8 py-3 rounded-xl font-medium text-lg transition-all
                  ${selectedCuddle 
                    ? 'bg-primary text-white shadow-lg hover:shadow-xl' 
                    : 'bg-primary/10 text-primary cursor-not-allowed'}`}
              >
                {selectedCuddle ? 'Start Journalling' : 'Select a Cuddle Buddy'}
              </motion.button>
            </motion.div>

          </div>
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
      <section className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-semibold text-primary mb-4 text-center tracking-[0.02em]"
          >
            Your Space 🏡
          </motion.h2>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center max-w-2xl mx-auto mb-8 text-gray-500"
          >
            This is your personal reflection space. <br />
            Once you start journaling, your entries will be safely stored here.
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <DateSelector
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleStartJournaling}
                className="bg-primary text-white px-8 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors"
              >
                {selectedCuddle ? 'Continue Your Journey' : 'Start Your Journey'}
              </button>
            </div>
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
                  <h3 className="text-xl font-semibold text-primary mb-4 tracking-[0.02em] ">{feature.title}</h3>
                  <p className="text-primary/80 leading-relaxed">{feature.description}</p>
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
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        date={selectedDate}
        messages={chatMessages}
        onStartJournaling={handleStartJournaling}
        selectedCuddle={selectedCuddle ?? ''}
        cuddleName={selectedCuddle 
          ? selectedCuddle.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
          : ''}
      />
    </main>
  );
}
