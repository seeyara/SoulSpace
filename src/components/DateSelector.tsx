'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format, addDays, subDays } from 'date-fns';

interface DateSelectorProps {
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

interface JournalEntry {
  date: string;
  hasEntry: boolean;
}

export default function DateSelector({ onDateSelect, selectedDate }: DateSelectorProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        // Generate 7 dates centered around startDate
        const dates = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(startDate, i - 3);
          return format(date, 'yyyy-MM-dd');
        });

        const { data: chatEntries, error } = await supabase
          .from('chats')
          .select('date')
          .in('date', dates);

        if (error) {
          console.error('Error fetching entries:', error);
          return;
        }

        const entryMap = new Set(chatEntries?.map(entry => entry.date) || []);
        const entriesWithFlags = dates.map(date => ({
          date,
          hasEntry: entryMap.has(date)
        }));

        setEntries(entriesWithFlags);
      } catch (error) {
        console.error('Error in fetchEntries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [startDate]);

  const handlePrevious = () => {
    setStartDate(prev => subDays(prev, 7));
  };

  const handleNext = () => {
    setStartDate(prev => addDays(prev, 7));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center px-2 sm:px-4">
      <button 
        className="p-2 rounded-full hover:bg-primary/10 transition-colors"
        onClick={handlePrevious}
      >
        <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
      </button>

      <div className="flex space-x-2 sm:space-x-4 px-2 sm:px-4">
        {entries.map((entry) => {
          const date = new Date(entry.date);
          const isSelected = selectedDate === entry.date;
          const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          
          return (
            <motion.button
              key={entry.date}
              onClick={() => onDateSelect(entry.date)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center transition-colors
                ${isSelected 
                  ? 'bg-primary text-white' 
                  : entry.hasEntry 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-primary/5 text-primary/50'}
                ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              <span className="text-xl sm:text-2xl font-semibold">
                {format(date, 'd')}
              </span>
              <span className="text-xs sm:text-sm">
                {format(date, 'MMM')}
              </span>
            </motion.button>
          );
        })}
      </div>

      <button 
        className="p-2 rounded-full hover:bg-primary/10 transition-colors"
        onClick={handleNext}
      >
        <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
      </button>
    </div>
  );
} 