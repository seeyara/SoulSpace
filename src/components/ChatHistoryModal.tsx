'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-xl transition-all">
            <Dialog.Title 
              as="h3" 
              className="text-lg font-medium leading-6 text-gray-900 mb-2"
            >
              Chat with {cuddleName}
            </Dialog.Title>
            <div className="text-sm text-gray-500 mb-4">
              {format(new Date(date), 'MMMM d, yyyy')}
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
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
} 