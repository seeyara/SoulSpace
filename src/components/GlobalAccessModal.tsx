"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import BaseModal from '@/components/BaseModal';
import { upsertUser } from '@/lib/utils/journalDb';
import { storage } from '@/lib/storage';
import { accessControl } from '@/lib/accessControl';

export default function GlobalAccessModal() {
  // ...existing code...
  // Track if user manually closed the modal
  const [manuallyClosed, setManuallyClosed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check access status using the access control system
    const accessStatus = accessControl.checkAccess();
    
    if (!accessStatus.hasAccess) {
      setIsOpen(true);
      
      // Pre-fill email if available
      if (accessStatus.email) {
        setEmail(accessStatus.email);
      }
    } else {
      setIsOpen(false);
    }
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    // Always create a new user row with temp_session_id, email, created_at, and name
    const tempSessionId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    storage.setSessionId(tempSessionId);
    const name = 'Username';
    try { 
      const { data: newUser, error: createError, isExistingUser } = await upsertUser({ tempSessionId, email, name });
      setIsLoading(false);
      if (createError) {
        console.error('Error creating user in GlobalAccessModal:', createError);
        setError('Error creating account. Please try again.');
        return;
      }
      if (newUser && newUser.id) {
        storage.setSessionId(tempSessionId)
        storage.setEmail(email);
        
        // If user already exists, skip code step and go directly to success
        if (isExistingUser) {
          accessControl.grantAccess(email);
          setStep('success');
        } else {
          setStep('code');
        }
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Unexpected error in handleEmailSubmit:', err);
      setError('Unexpected error. Please try again.');
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (code.trim().toUpperCase() === 'JOURNAL21') {
      try {
        // Grant access with email
        accessControl.grantAccess(email);
        
        // Upsert user in database
        await upsertUser({ email });
        
        setStep('success');
        setManuallyClosed(false);
      } catch (error) {
        console.error('Error in code submission:', error);
        setError('An error occurred. Please try again.');
      }
    } else {
      setError('Invalid code. Please check your email and try again.');
    }
    
    setIsLoading(false);
  };

  // Auto-close success modal after 10 seconds unless manually closed
  useEffect(() => {
    if (step === 'success' && isOpen && !manuallyClosed) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [step, isOpen, manuallyClosed]);

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={() => { setIsOpen(false); setManuallyClosed(true); }} maxWidth="max-w-md">
      <div className="text-center space-y-6">
        {step !== 'success' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto"
          >
            <LockClosedIcon className="w-10 h-10 text-primary" />
          </motion.div>
        )}
        {step === 'email' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Get Exclusive Access</h3>
            <p className="text-gray-400 text-sm mb-6">
              Enter your email to get the access code
            </p>

            <ul className="text-left text-gray-700 mb-6 space-y-2 text-base max-w-xs mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                Join the 21-Day Journaling Challenge 📝</li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
               Clear your mind, reduce anxiety and improve focus 🧠
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
               Finish all 21 Days - and Get a Free Cuddles 🏆
              </li>
            </ul>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full p-3 rounded-xl border-2 border-primary/20 focus:border-primary outline-none transition-colors"
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="bg-primary text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors w-full"
              >
                {isLoading ? 'Checking...' : 'Continue ✨'}
              </button>
            </form>
          </motion.div>
        )}
        {step === 'code' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Enter Access Code</h3>
            <p className="text-gray-600 mb-6">Check your email for the code</p>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Access code"
                  required
                  className="w-full p-3 rounded-xl border-2 border-primary/20 focus:border-primary outline-none transition-colors"
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
              <button
                type="submit"
                className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors w-full"
              >
                Unlock
              </button>
            </form>
          </motion.div>
        )}
        {step === 'success' && (
        
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-16 h-16 mb-4 rounded-full bg-primary/100 flex items-center justify-center">
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="text-2xl font-bold text-primary/700 mb-2">Welcome to Whispr by Soul</h3>
              <p className="text-primary/700 mb-2">You now have access to a calm space that is just yours 🫶🏼</p>
              
              <p className="text-primary/800 font-semibold mb-6">Let's get started 🚀</p>
              
              <button
                onClick={() => { setIsOpen(false); setManuallyClosed(true); }}
                className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors w-full"
              >
                Start Journaling
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </BaseModal>
  );
}
