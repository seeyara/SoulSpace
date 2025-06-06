'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format, isToday, isFuture, isPast } from 'date-fns';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';

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
  cuddleName?: string;
}

export default function ChatHistoryModal({ 
  isOpen, 
  onClose, 
  date, 
  messages, 
  onStartJournaling,
  selectedCuddle = '',
  cuddleName = ''
}: ChatHistoryModalProps) {
  const router = useRouter();
  
  if (!isOpen) return null;

  const getCuddleImage = (id: string) => {
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
  };

  const getEmptyStateMessage = () => {
    const dateObj = new Date(date);
    if (isFuture(dateObj)) {
      return {
        title: "This day hasn't arrived yet! 🌱",
        message: "Come back on this day to share your thoughts with me.",
      };
    } else if (isToday(dateObj)) {
      return {
        title: "Let's start today's entry! ✨",
        message: "I'm here to listen and chat with you about your day.",
      };
    } else {
      return {
        title: "No entry for this day 📝",
        message: "Would you like to reflect on this day with me?",
      };
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-xl transition-all relative">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 relative flex-shrink-0">
                <Image
                  src={getCuddleImage(selectedCuddle)}
                  alt={cuddleName}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div>
                <Dialog.Title 
                  as="h3" 
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Chat with {cuddleName}
                </Dialog.Title>
                <div className="text-sm text-gray-500">
                  {format(new Date(date), 'MMMM d, yyyy')}
                </div>
              </div>
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
                <div className="text-center py-8">
                  <h4 className="text-xl font-medium text-primary mb-2">
                    {getEmptyStateMessage().title}
                  </h4>
                  <p className="text-gray-500 mb-6">
                    {getEmptyStateMessage().message}
                  </p>
                  {!isFuture(new Date(date)) && (
                    <button
                      onClick={onStartJournaling}
                      className="bg-primary text-white px-6 py-3 rounded-full text-base font-medium hover:bg-primary/90 transition-colors"
                    >
                      {isToday(new Date(date)) ? "Start Today's Entry" : "Add Entry for This Day"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
} 