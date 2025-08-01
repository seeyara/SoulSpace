'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase, prefixedTable } from '@/lib/supabase';
import { format, subDays } from 'date-fns';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  userId: string;
}

export default function StreakModal({ isOpen, onClose, userId }: StreakModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [dates, setDates] = useState<Array<{ date: string; hasEntry: boolean; displayDate: string; dayName: string }>>([]);

  // Get dates for calendar
  useEffect(() => {
    const today = new Date();
    const datesArray = Array.from({ length: 5 }, (_, i) => {
      const date = subDays(today, 2 - i);
      return {
        date: format(date, 'yyyy-MM-dd'),
        hasEntry: false,
        displayDate: format(date, 'd'),
        dayName: format(date, 'EEE')
      };
    });
    setDates(datesArray);

    // Fetch entries for these dates
    const fetchEntries = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from(prefixedTable('chats'))
          .select('date')
          .eq('user_id', userId)
          .in('date', datesArray.map(d => d.date));

        if (error) {
          console.error('Error fetching entries:', error);
          return;
        }

        if (data) {
          const entryDates = new Set(data.map(entry => entry.date));
          setDates(datesArray.map(d => ({
            ...d,
            hasEntry: entryDates.has(d.date)
          })));
        }
      } catch (error) {
        console.error('Error fetching entries:', error);
      }
    };

    fetchEntries();
  }, [userId]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('User ID is missing');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update the user with email
      const { error: updateError } = await supabase
        .from(prefixedTable('users'))
        .update({ email })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      setIsSignedUp(true);
      // Wait a moment before closing
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto"
          >
            <motion.svg
              className="w-10 h-10 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          </motion.div>
          
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-semibold text-gray-900"
          >
            ✨ You're a Star! ✨
          </motion.h3>

          {/* Calendar Section */}
          <div className="mb-8">
            <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
              {/* Day names */}
              {dates.map((d) => (
                <div key={`day-${d.date}`} className="text-center">
                  <span className="text-xs text-gray-500 font-medium">
                    {d.dayName}
                  </span>
                </div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-5 gap-2 max-w-xs mx-auto mt-1"
            >
              {dates.map((d, index) => {
                const isToday = d.date === format(new Date(), 'yyyy-MM-dd');
                return (
                  <motion.div
                    key={d.date}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center ${
                      isToday ? 'bg-primary/10' : 'bg-gray-50'
                    } relative`}
                    animate={isToday && d.hasEntry ? {
                      scale: [1, 1.1, 1],
                      transition: { duration: 0.5, delay: 0.5 + index * 0.1 }
                    } : {}}
                  >
                    {d.hasEntry ? (
                      <motion.div
                        initial={isToday ? { scale: 0 } : { scale: 1 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: isToday ? 0.8 : 0, duration: 0.3 }}
                        className="w-full h-full rounded-xl bg-primary flex items-center justify-center"
                      >
                        <motion.div className="flex flex-col items-center">
                          <span className="text-sm font-medium text-white mb-1">
                            {d.displayDate}
                          </span>
                          <motion.svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: isToday ? 1 : 0, duration: 0.5 }}
                          >
                            <motion.path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </motion.svg>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {d.displayDate}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {!isSignedUp ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-gray-600 mb-6">
                Want to save your streak so you never miss your next chat with Cuddle™?</p>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full p-3 rounded-xl border-2 border-primary/20 focus:border-primary outline-none transition-colors"
                  />
                  {error && (
                    <p className="text-red-500 text-sm mt-2">{error}</p>
                  )}
                </div>
                <div className="flex gap-4 justify-center items-center">
                <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Skip
                  </button>
                   <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                  >
                    {isLoading ? 'Saving...' : 'Keep My Streak ✨'}
                  </button>
                 
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="text-green-600 font-medium text-lg">
                Amazing! We'll send you gentle reminders! ✨
              </p>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onClose}
                className="mt-4 px-6 py-2 rounded-xl font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                See you tomorrow! 🌙
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
} 