'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { fetchChatHistory } from '@/lib/utils/journalDb';

interface Message {
  type: 'cuddle' | 'user';
  content: string;
}

interface ChatHistoryProps {
  date: string;
  selectedCuddle: string;
  onStartJournaling: () => void;
}

export default function ChatHistory({ date, selectedCuddle, onStartJournaling }: ChatHistoryProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChat = async () => {
      try {
        // Assume userId is available via localStorage or context
        const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('soul_journal_user_id') : null;
        if (!storedUserId) {
          setLoading(false);
          return;
        }
        const { data, error } = await fetchChatHistory(storedUserId, date);
        if (error) {
          console.error('Error fetching chat:', error);
          setLoading(false);
          return;
        }
        if (data && data.length > 0 && data[0].messages) {
          setMessages(data[0].messages);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('Error in fetchChat:', error);
      } finally {
        setLoading(false);
      }
    };
    if (date) {
      fetchChat();
    }
  }, [date]);

  const getCuddleName = (id: string) => {
    return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No journal entry for this date</p>
        <button
          onClick={onStartJournaling}
          className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          Start Journaling
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
          >
            {message.type === 'cuddle' && (
              <div className="flex-shrink-0">
                <Image
                  src={getCuddleImage(selectedCuddle)}
                  alt={getCuddleName(selectedCuddle)}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full"
                />
              </div>
            )}
            <div className="flex flex-col">
              <div
                className={`p-4 rounded-2xl ${message.type === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-800'
                  }`}
              >
                {message.content}
              </div>
              {message.type === 'cuddle' && (
                <span className="text-sm text-gray-500 mt-1 ml-2">
                  {getCuddleName(selectedCuddle)}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
} 