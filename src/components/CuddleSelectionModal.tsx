'use client';

import { useState } from 'react';
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

  const handleCuddlePick = (cuddleId: CuddleId) => {
    setSelectedCuddle(cuddleId);
    setCuddleName('');
    setError('');
    setStep('name');
  };

  const handleNameNext = () => {
    if (!cuddleName.trim()) {
      setError('Please give your cuddle a name!');
      return;
    }
    setError('');
    setStep('meet');
  };

  const handleMeetStart = () => {
    onSelectCuddle(selectedCuddle!, cuddleName.trim());
    setSelectedCuddle(null);
    setCuddleName('');
    setError('');
    setStep('pick');
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

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
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
              Don't worry - you can always change your companion later! 💜
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
                <input
                  type="text"
                  value={cuddleName}
                  onChange={e => setCuddleName(e.target.value)}
                  placeholder="e.g. Captain Snuggles, Buddy..."
                  className="w-full max-w-xs p-3 rounded-xl border-2 border-primary/20 focus:border-primary outline-none text-base text-center"
                  maxLength={20}
                  autoFocus
                />
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
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 mx-auto">
                  <Image
                    src={cuddleOptions.find(c => c.id === selectedCuddle)?.image || ''}
                    alt={cuddleOptions.find(c => c.id === selectedCuddle)?.name || ''}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 text-lg mt-2">
                    {cuddleName}
                  </h3>
                  <p className="text-xs text-gray-400 leading-tight mt-1">
                    {cuddleOptions.find(c => c.id === selectedCuddle)?.description}
                  </p>
                </div>
              </div>
              <h2 className="text-xl font-bold text-primary mb-2">
                Meet your new best friend!
              </h2>
              <p className="text-gray-600 text-base mb-4 max-w-xs mx-auto">
                No matter what, {cuddleName} always be here for you, waiting to listen. 💜
              </p>
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleMeetStart}
                  className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors text-lg"
                >
                  Start Journaling
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