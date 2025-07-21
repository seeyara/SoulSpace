import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';

export function calculateStreak(entries: Array<{ date: string; cuddleId?: string }>): number {
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
}

export function getDaysInMonth(currentMonth: Date) {
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  return eachDayOfInterval({ start, end });
}

export function getCuddleImage(id: string) {
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
}

export function getCuddleName(id: string) {
  return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
} 