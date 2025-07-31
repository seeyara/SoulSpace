'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import BaseModal from './BaseModal';

interface JournalSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToAccount?: () => void;
  cuddleName?: string;
  entryDate?: string;
}

export const JournalSuccessModal = memo(function JournalSuccessModal({
  isOpen,
  onClose,
  onGoToAccount,
  cuddleName = 'Your companion',
  entryDate
}: JournalSuccessModalProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'today';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return 'today';
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="text-center">
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring", 
            duration: 0.6, 
            bounce: 0.4 
          }}
          className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6"
        >
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-semibold text-gray-900 mb-3"
        >
          Journal Entry Saved! 🎉
        </motion.h3>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-6 space-y-3"
        >
          <p>
            Your thoughts have been safely saved for {formatDate(entryDate)}.
          </p>
          
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <p className="text-sm text-primary">
              <strong>{cuddleName}</strong> is proud of you for taking time to reflect and practice gratitude. 
              Keep up the great work! 💜
            </p>
          </div>

          <p className="text-sm">
            Come back tomorrow to continue your journaling journey.
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col space-y-3"
        >
          {onGoToAccount && (
            <button
              onClick={() => {
                onGoToAccount();
                onClose();
              }}
              className="w-full px-4 py-3 text-sm font-medium text-white bg-primary border border-transparent rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors duration-200"
            >
              View My Progress
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-200"
          >
            Close
          </button>
        </motion.div>

        {/* Streak info (optional) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 pt-4 border-t border-gray-100"
        >
          <p className="text-xs text-gray-500">
            Keep your journaling streak alive by coming back tomorrow! 🔥
          </p>
        </motion.div>
      </div>
    </BaseModal>
  );
});