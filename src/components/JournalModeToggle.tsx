'use client';

import React, { memo } from 'react';
import styles from './JournalModeToggle.module.css';
import { motion } from 'framer-motion';

export type JournalMode = 'flat' | 'guided';

interface JournalModeToggleProps {
  mode: JournalMode;
  onModeChange: (mode: JournalMode) => void;
  disabled?: boolean;
  className?: string;
}

export const JournalModeToggle = memo(function JournalModeToggle({
  mode,
  onModeChange,
  disabled = false,
  className = ''
}: JournalModeToggleProps) {
  const isGuided = mode === 'guided';

  const handleToggle = () => {
    if (!disabled) {
      onModeChange(isGuided ? 'flat' : 'guided');
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <span className="text-sm font-medium text-gray-700">
        Guided Journaling
      </span>
      
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 focus:ring-offset-2
          ${isGuided ? 'bg-purple-600' : 'bg-gray-200'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        role="switch"
        aria-checked={isGuided}
        aria-label={`Switch to ${isGuided ? 'flat journal' : 'guided journaling'} mode`}
      >
        <motion.span
          layout
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-all duration-200 ease-in-out
            ${isGuided ? 'translate-x-6' : 'translate-x-1'}
          `}
          initial={false}
          animate={{ x: isGuided ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>

      {/* Mode labels */}
      <div className="text-xs text-gray-500">
        {isGuided ? 'ON' : 'OFF'}
      </div>
    </div>
  );
});

// Alternative radio button style toggle
export const JournalModeRadioToggle = memo(function JournalModeRadioToggle({
  mode,
  onModeChange,
  disabled = false,
  className = ''
}: JournalModeToggleProps) {
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <span className="text-sm font-medium text-gray-700">
        Guided Journaling
      </span>
      <label className={styles.container} style={{cursor: disabled ? 'not-allowed' : 'pointer'}}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={mode === 'guided'}
          onChange={() => onModeChange(mode === 'guided' ? 'flat' : 'guided')}
          disabled={disabled}
          aria-label={`Switch to ${mode === 'guided' ? 'flat journal' : 'guided journaling'} mode`}
        />
        <span className={styles.switch}>
          <span className={styles.slider} />
        </span>
      </label>
    </div>
  );
});