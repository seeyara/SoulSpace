'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BaseModal from './BaseModal';

interface GuidedJournalingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  cuddleName?: string;
}

export const GuidedJournalingModal = memo(function GuidedJournalingModal({
  isOpen,
  onClose,
  onAccept,
  cuddleName = 'Your companion'
}: GuidedJournalingModalProps) {
  const handleAccept = () => {
    onAccept();
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 mb-4">
          <svg
            className="h-6 w-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Guided Journaling Mode
        </h3>

        {/* Disclaimer */}
        <div className="text-sm text-gray-600 mb-6 space-y-3 text-left">
          <p>
            <strong>Important:</strong> Guided Journaling is experimental and uses GPT to guide reflection.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex">
              <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-amber-700">
                <p className="font-medium">Medical Disclaimer</p>
                <p className="text-sm">
                  This is not medical advice. For medical concerns, please seek professional help.
                </p>
              </div>
            </div>
          </div>

          <p>
            In guided mode, {cuddleName} will have interactive conversations to help you reflect and explore your thoughts through AI-powered prompts.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors duration-200"
          >
            Cancel
          </button>
          
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-200"
          >
            Okay, got it
          </button>
        </div>
      </div>
    </BaseModal>
  );
});