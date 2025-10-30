'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { CuddleId } from '@/types/api';

interface JournalNavBarProps {
  cuddleId: CuddleId;
  cuddleName: string;
  cuddleImage: string;
  userName: string;
  selectedDate: string;
  onBack?: () => void;
  className?: string;
}

export const JournalNavBar = memo(function JournalNavBar({
  cuddleName,
  cuddleImage,
  userName,
  selectedDate,
  onBack,
  className = ''
}: JournalNavBarProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch {
      return dateString;
    }
  };

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left section - Back button and date */}
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-200"
                aria-label="Go back"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Journal
              </h1>
              <p className="text-sm text-gray-500">
                {formatDate(selectedDate)}
              </p>
            </div>
          </div>

          {/* Center section - Mode messaging */}
          <div className="flex-1 flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium text-gray-600"
            >
              Guided journaling with {cuddleName}
            </motion.div>
          </div>

          {/* Right section - User info and cuddle */}
          <div className="flex items-center space-x-3">
            {/* User name */}
            <span className="text-sm font-medium text-gray-700">
              {userName}
            </span>

            {/* Cuddle avatar */}
            <div className="relative">
              <div className={`
                w-8 h-8 rounded-full overflow-hidden bg-purple-100 ring-2 ring-purple-500 transition-all duration-200
              `}>
                <Image
                  src={cuddleImage}
                  alt={cuddleName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Mode indicator dot */}
              <div className={`
                absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-purple-500
              `} />
            </div>
          </div>
        </div>

        {/* Mode description */}
        <div className="mt-3 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-full"
          >
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs font-medium text-gray-600">
              {`Interactive journaling with ${cuddleName}`}
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
});

// Simplified version for mobile
export const MobileJournalNavBar = memo(function MobileJournalNavBar({
  cuddleName,
  cuddleImage,
  userName,
  onBack,
  className = ''
}: JournalNavBarProps) {
  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-4 py-3">
        {/* Top row - Back, Title, User */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Go back"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Journal</h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">{userName}</span>
            <div className="w-7 h-7 rounded-full overflow-hidden bg-purple-100">
              <Image
                src={cuddleImage}
                alt={cuddleName}
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Bottom row - Guided messaging */}
        <div className="flex justify-center">
          <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium text-gray-600">
            Guided journaling with {cuddleName}
          </div>
        </div>
      </div>
    </div>
  );
});