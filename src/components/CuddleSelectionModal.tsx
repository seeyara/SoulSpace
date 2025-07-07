'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import BaseModal from './BaseModal';
import type { CuddleId } from '@/types/cuddles';

interface CuddleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCuddle: (cuddleId: CuddleId, cuddleName: string) => void;
}

const cuddleOptions = [
  {
    id: 'ellie-sr' as CuddleId,
    name: 'Ellie Sr',
    image: '/assets/Ellie Sr.png',
    description: 'Wise and nurturing companion for deeper reflection',
    personality: 'Gentle, understanding, and supportive'
  },
  {
    id: 'olly-sr' as CuddleId,
    name: 'Olly Sr',
    image: '/assets/Olly Sr.png',
    description: 'Calm and thoughtful friend for meaningful conversations',
    personality: 'Patient, insightful, and encouraging'
  },
  {
    id: 'ellie-jr' as CuddleId,
    name: 'Ellie Jr',
    image: '/assets/Ellie Jr.png',
    description: 'Playful and energetic companion for light-hearted moments',
    personality: 'Cheerful, fun-loving, and uplifting'
  },
  {
    id: 'olly-jr' as CuddleId,
    name: 'Olly Jr',
    image: '/assets/Olly Jr.png',
    description: 'Adventurous and curious friend for exploration',
    personality: 'Enthusiastic, curious, and motivating'
  }
];

export default function CuddleSelectionModal({ isOpen, onClose, onSelectCuddle }: CuddleSelectionModalProps) {
  const [step, setStep] = useState<'pick' | 'name' | 'meet'>('pick');
  const [selectedCuddle, setSelectedCuddle] = useState<CuddleId | null>(null);
  const [cuddleName, setCuddleName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset modal state when opened/closed
  const resetModal = () => {
    setStep('pick');
    setSelectedCuddle(null);
    setCuddleName('');
    setError('');
  };

  // Reset when modal opens
  React.useEffect(() => {
    if (isOpen) {
      resetModal();
    }
  }, [isOpen]);

  const handleCuddlePick = (cuddleId: CuddleId) => {
    setSelectedCuddle(cuddleId);
    setCuddleName('');
    setError('');
    setStep('name');
  };

  const handleNameNext = () => {
    const trimmedName = cuddleName.trim();
    if (!trimmedName) {
      setError('Please give your cuddle a name!');
      return;
    }
    
    // Validate name length
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }
    
    if (trimmedName.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }
    
    // Basic validation - no special characters that might cause issues
    const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!nameRegex.test(trimmedName)) {
      setError('Name can only contain letters, numbers, spaces, hyphens, and underscores');
      return;
    }
    
    setError('');
    setCuddleName(trimmedName); // Ensure we store the trimmed version
    setStep('meet');
  };

  const handleMeetStart = async () => {
    if (isLoading) return; // Prevent multiple clicks
    
    setIsLoading(true);
    try {
      const trimmedName = cuddleName.trim();
      
      // Save to localStorage first
      localStorage.setItem('soul_journal_cuddle_id', selectedCuddle!);
      localStorage.setItem('soul_journal_cuddle_name', trimmedName);
      
      // Save to Supabase
      const storedUserId = localStorage.getItem('soul_journal_user_id');
      if (storedUserId) {
        console.log('Saving to Supabase', storedUserId, selectedCuddle, trimmedName);
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: storedUserId, 
            cuddleId: selectedCuddle, 
            cuddleName: trimmedName 
          }),
        });
        
        if (!response.ok) {
          console.error('Error saving cuddle to Supabase');
        }
      }
      
      // Call the parent handler to update state and navigate
      onSelectCuddle(selectedCuddle!, trimmedName);
      
      // Reset modal state
      setSelectedCuddle(null);
      setCuddleName('');
      setError('');
      setStep('pick');
    } catch (error) {
      console.error('Error in handleMeetStart:', error);
      // Still proceed with the selection even if save fails
      onSelectCuddle(selectedCuddle!, cuddleName.trim());
      setSelectedCuddle(null);
      setCuddleName('');
      setError('');
      setStep('pick');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'name') {
      setSelectedCuddle(null);
      setCuddleName('');
      setError('');
      setStep('pick');
    } else if (step === 'meet') {
      setStep('name');
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-lg">
      <div className="text-center space-y-6">
        {step === 'pick' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Choose Your Cuddle Companion 🧸
              </h2>
              <p className="text-gray-600 text-sm">
                Pick the companion that feels right for your journaling journey
              </p>
            </motion.div>
            <div className="grid grid-cols-2 gap-4">
              {cuddleOptions.map((cuddle, index) => (
                <motion.button
                  key={cuddle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  onClick={() => handleCuddlePick(cuddle.id)}
                  className="group p-4 rounded-2xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-200 text-left"
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Image
                        src={cuddle.image}
                        alt={cuddle.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 text-base mt-2">
                        {cuddle.name}
                      </h3>
                      <p className="text-xs text-gray-400 leading-tight mt-1">
                        {cuddle.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-gray-500"
            >
              Don&apos;t worry - you can always change your companion later! 💜
            </motion.div>
          </>
        )}
        {step === 'name' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10">
                  <Image
                    src={cuddleOptions.find(c => c.id === selectedCuddle)?.image || ''}
                    alt={cuddleOptions.find(c => c.id === selectedCuddle)?.name || ''}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 text-base mt-2">
                    {cuddleOptions.find(c => c.id === selectedCuddle)?.name}
                  </h3>
                  <p className="text-xs text-gray-400 leading-tight mt-1">
                    {cuddleOptions.find(c => c.id === selectedCuddle)?.description}
                  </p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Now give your new companion a special name.
              </p>
              <div className="flex flex-col items-center gap-4">
                <div className="w-full max-w-xs">
                  <input
                    type="text"
                    value={cuddleName}
                    onChange={e => {
                      setCuddleName(e.target.value);
                      // Clear error when user starts typing
                      if (error) setError('');
                    }}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        handleNameNext();
                      }
                    }}
                    placeholder="e.g. Captain Snuggles, Buddy..."
                    className={`w-full p-3 rounded-xl border-2 outline-none text-base text-center transition-colors ${
                      error 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-primary/20 focus:border-primary'
                    }`}
                    maxLength={20}
                    autoFocus
                  />
                  <div className="flex justify-between items-center mt-1 px-1">
                    <span className="text-xs text-gray-400">
                      {cuddleName.length}/20
                    </span>
                    {cuddleName.trim() && (
                      <span className="text-xs text-green-500">
                        ✓ Valid name
                      </span>
                    )}
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                <div className="flex gap-2 justify-center mt-2">
                  <button
                    onClick={handleBack}
                    className="text-primary/70 border-2 border-primary/20 px-4 py-2 rounded-xl font-medium hover:bg-primary/5 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNameNext}
                    className="bg-primary text-white px-6 py-2 rounded-xl font-medium hover:bg-primary/90 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
        {step === 'meet' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 mx-auto shadow-lg">
                  <Image
                    src={cuddleOptions.find(c => c.id === selectedCuddle)?.image || ''}
                    alt={cuddleOptions.find(c => c.id === selectedCuddle)?.name || ''}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 text-xl mt-2">
                    {cuddleName}
                  </h3>
                  <p className="text-sm text-gray-500 leading-tight mt-1">
                    {cuddleOptions.find(c => c.id === selectedCuddle)?.name}
                  </p>
                  <p className="text-xs text-gray-400 leading-tight mt-2">
                    {cuddleOptions.find(c => c.id === selectedCuddle)?.personality}
                  </p>
                </div>
              </div>
              <h2 className="text-xl font-bold text-primary mb-3">
                Meet your new best friend! 🎉
              </h2>
              <p className="text-gray-600 text-base mb-6 max-w-xs mx-auto leading-relaxed">
                No matter what happens, <span className="font-semibold text-primary">{cuddleName}</span> will always be here for you, ready to listen and support you on your journaling journey. 💜
              </p>
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleMeetStart}
                  disabled={isLoading}
                  className={`px-8 py-3 rounded-xl font-medium transition-colors text-lg ${
                    isLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {isLoading ? 'Setting up...' : 'Start Journaling'}
                </button>
                <button
                  onClick={handleBack}
                  className="text-primary/70 border-2 border-primary/20 px-4 py-2 rounded-xl font-medium hover:bg-primary/5 transition-colors text-sm mt-2"
                >
                  ← Back
                </button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </BaseModal>
  );
} 