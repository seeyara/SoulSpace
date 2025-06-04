'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  onStartJournaling: () => void;
  selectedCuddle?: string;
}

export default function ChatHistoryModal({ 
  isOpen, 
  onClose, 
  date, 
  messages, 
  onStartJournaling,
  selectedCuddle = 'ellie-sr'
}: ChatHistoryModalProps) {
  const router = useRouter();
  
  if (!isOpen) return null;

  const cuddleName = selectedCuddle
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Image
                src="/assets/Logo.png"
                alt="Soul Logo"
                width={80}
                height={24}
                className="h-6 w-auto cursor-pointer"
                onClick={() => router.push('/')}
              />
              <h2 className="text-lg sm:text-xl font-semibold text-primary tracking-[0.02em]">
                {format(new Date(date), 'MMMM d, yyyy')} 📝
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-primary/10 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex flex-col max-w-[85%]">
                      <div
                        className={`rounded-2xl p-3 sm:p-4 whitespace-pre-wrap ${
                          message.role === 'user'
                            ? 'bg-primary text-white'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {message.content}
                      </div>
                      {message.role === 'assistant' && 
                       (index === messages.length - 1 || 
                        messages[index + 1]?.role === 'user') && (
                        <span className="text-xs text-primary/60 mt-1 ml-2 tracking-[0.02em]">
                          {cuddleName} 💭
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-6 text-lg">No entry for this date yet 🌱</p>
                <button
                  onClick={onStartJournaling}
                  className="bg-primary text-white px-6 py-3 rounded-full text-base font-medium hover:bg-primary/90 transition-colors"
                >
                  Start Journaling
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 