'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { prefixedTable, supabase } from '@/lib/supabase';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const updateDates = async (newStartDate: Date) => {
    try {
      // Generate 5 dates centered around startDate
      const dates = Array.from({ length: 5 }, (_, i) => {
        const date = addDays(newStartDate, i - 2);
        return format(date, 'yyyy-MM-dd');
      });

      const { data: chatEntries, error } = await supabase
        .from(prefixedTable('chats'))
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
      console.error('Error in updateDates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateDates(new Date());
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    
    // If we're near the edges, load more dates
    if (scrollLeft < 100) {
      const newStartDate = subDays(startDate, 5);
      setStartDate(newStartDate);
      updateDates(newStartDate);
    } else if (scrollLeft > scrollWidth - clientWidth - 100) {
      const newStartDate = addDays(startDate, 5);
      setStartDate(newStartDate);
      updateDates(newStartDate);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        onScroll={handleScroll}
        className="flex overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory px-2 sm:px-4 space-x-2 sm:space-x-4 w-full"
      >
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
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex flex-col items-center justify-center transition-colors snap-center
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
    </div>
  );
} 