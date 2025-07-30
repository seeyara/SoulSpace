'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { supabase, prefixedTable } from '@/lib/supabase';

interface CommunityAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function CommunityAccessModal({ isOpen, onClose, userId }: CommunityAccessModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignedUp, setIsSignedUp] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('User ID is missing');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Update the user with email only
      const { error: updateError } = await supabase
        .from(prefixedTable('users'))
        .update({ email })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Store email status locally
      localStorage.setItem('soul_community_invite_pending', 'true');
      
      setIsSignedUp(true);
      // Wait a moment before closing
      setTimeout(() => {
        window.location.reload(); // Reload to update pending state
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto"
          >
            <LockClosedIcon className="w-10 h-10 text-primary" />
          </motion.div>
          
          {!isSignedUp ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Get Exclusive Access
              </h3>
              <p className="text-gray-600 mb-6">
                Unlock Community feature by providing your email id
              </p>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full p-3 rounded-xl border-2 border-primary/20 focus:border-primary outline-none transition-colors"
                  />
                  {error && (
                    <p className="text-red-500 text-sm mt-2">{error}</p>
                  )}
                </div>
                <div className="flex gap-4 justify-center items-center">
                  <button
                    onClick={onClose}
                    type="button"
                    className="px-6 py-3 rounded-xl font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                  >
                    {isLoading ? 'Processing...' : 'Get Access ✨'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Your invite is on its way! ✨
              </h3>
              <p className="text-green-600 mb-6">
                You'll soon get access to the exclusive Whispr Community
              </p>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={onClose}
                className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Got it!
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
} 