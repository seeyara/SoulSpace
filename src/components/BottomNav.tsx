'use client';

import { usePathname, useRouter } from 'next/navigation';
import Account from '@/assets/Account';
import CommunityIcon from '@/assets/CommunityIcon';
import HomeIcon from '@/assets/HomeIcon';
import JournalIcon from '@/assets/JournalIcon';
import { event as gaEvent } from '@/lib/utils/gtag';

const navItems = [
  { name: 'Home', Icon: HomeIcon, path: '/' },
  { name: 'Journal', Icon: JournalIcon, path: '/journal' },
  { name: 'Account', Icon: Account, path: '/account' },
  { name: 'Community', Icon: CommunityIcon, path: '/community' }
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Web Navigation */}
      <nav className="hidden md:block bg-white border-t border-primary/10">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex justify-center items-center h-14 gap-8">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    gaEvent({
                      action: 'nav_click',
                      category: 'navigation',
                      label: item.name,
                      value: item.path,
                    });
                    router.push(item.path);
                  }}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                    isActive ? 'text-primary' : 'text-gray-500 hover:text-primary/80'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-primary/10' : 'hover:bg-primary/5'}`}>
                    <item.Icon
                      className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t border-primary/10">
        <div className="max-w-xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    gaEvent({
                      action: 'nav_click',
                      category: 'navigation',
                      label: item.name,
                      value: item.path,
                    });
                    router.push(item.path);
                  }}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                    isActive ? 'text-primary' : 'text-gray-500 hover:text-primary/80'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-primary/10' : 'hover:bg-primary/5'}`}>
                    <item.Icon
                      className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Safe Area Padding for Mobile Devices */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white" />
    </div>
  );
} 