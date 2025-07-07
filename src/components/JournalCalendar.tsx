import { format, subDays } from 'date-fns';
import { JournalStreak } from '@/lib/supabase';

interface JournalCalendarProps {
  streaks: JournalStreak[];
}

export default function JournalCalendar({ streaks }: JournalCalendarProps) {
  const today = new Date();
  const dates = Array.from({ length: 5 }, (_, i) => {
    const date = subDays(today, 2 - i);
    return format(date, 'yyyy-MM-dd');
  });

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Space</h2>
      <div className="grid grid-cols-5 gap-2">
        {dates.map((date) => {
          const hasEntry = streaks.find(s => s.date === date)?.has_entry;
          const isCurrentDay = date === format(today, 'yyyy-MM-dd');
          
          return (
            <div
              key={date}
              className={`aspect-square rounded-xl flex items-center justify-center ${
                isCurrentDay ? 'bg-primary/10' : 'bg-gray-50'
              }`}
            >
              {hasEntry ? (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              ) : (
                <span className="text-sm text-gray-500">
                  {format(new Date(date), 'd')}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-gray-500 mt-4 text-center">
        Keep your streak going! Journal every day to build a meaningful habit.
      </p>
    </div>
  );
} 