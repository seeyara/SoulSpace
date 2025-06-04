'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

const navItems = [
  { name: 'Home', icon: '/assets/Home.svg', path: '/' },
  { name: 'Journal', icon: '/assets/Journal.svg', path: '/journal' },
  { name: 'Account', icon: '/assets/Account.svg', path: '/account' },
  { name: 'Community', icon: '/assets/Community.svg', path: '/community' }
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 border-t border-primary/10 z-50">
      <div className="max-w-xl mx-auto px-2">
        <div className="flex justify-between items-center h-18">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className={`flex items-center justify-center w-12 h-12 rounded-xl transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-500 hover:text-primary/80'
                }`}
              >
                <div className={`p-2 rounded-xl ${isActive ? 'bg-primary/10' : 'hover:bg-primary/5'}`}>
                  <Image
                    src={item.icon}
                    alt={item.name}
                    width={24}
                    height={24}
                    className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 