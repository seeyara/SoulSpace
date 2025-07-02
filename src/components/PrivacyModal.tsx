'use client';

import { motion } from 'framer-motion';
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  cuddleOwnership: string;
  gender: string;
  lifeStage: string;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  const [step, setStep] = useState<'privacy' | 'welcome' | 'cuddle' | 'gender' | 'lifeStage' | 'done'>('privacy');
  const [profile, setProfile] = useState<UserProfile>({
    cuddleOwnership: '',
    gender: '',
    lifeStage: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isProfileComplete = profile.cuddleOwnership && profile.gender && profile.lifeStage;

  const handleBack = () => {
    switch (step) {
      case 'welcome':
        setStep('privacy');
        break;
      case 'cuddle':
        setStep('welcome');
        break;
      case 'gender':
        setStep('cuddle');
        break;
      case 'lifeStage':
        setStep('gender');
        break;
      case 'done':
        setStep('lifeStage');
        break;
      default:
        break;
    }
  };

  const handleSubmit = async () => {
    if (!isProfileComplete) return;
    setIsSubmitting(true);
    try {
      localStorage.setItem('user_profile', JSON.stringify(profile));
      const userId = localStorage.getItem('soul_journal_user_id');
      if (userId) {
        const response = await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, profile }),
        });
        if (!response.ok) {
          console.error('Failed to save profile to database');
        }
      }
      setTimeout(() => { onClose(); }, 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSubmitting(false);
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
        className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center space-y-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>

          {/* Stepper */}
          <div className="flex justify-center gap-2 mb-2">
            {["privacy", "welcome", "cuddle", "gender", "lifeStage", "done"].map((s, i) => (
              <span key={s} className={`w-2 h-2 rounded-full ${step === s ? 'bg-primary' : 'bg-primary/20'}`}></span>
            ))}
          </div>

          {step === 'privacy' && (
            <>
              {/* Privacy Icon and Content (unchanged) */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto"
              >
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
                <h3 className="text-2xl font-semibold text-gray-900">Welcome to Your Safe Space</h3>
                <div className="text-left space-y-4 text-gray-600">
                  <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3"><span className="text-lg">🔒</span><p className="text-sm font-medium">Your conversations are completely private and secure</p></div>
                      <div className="flex items-center gap-3"><span className="text-lg">👤</span><p className="text-sm font-medium">Journal anonymously and share your thoughts freely</p></div>
                      <div className="flex items-center gap-3"><span className="text-lg">💜</span><p className="text-sm font-medium">Find comfort and support in your Cuddle companion</p></div>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <button onClick={() => setStep('welcome')} className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors w-full">Continue</button>
              </motion.div>
            </>
          )}

          {step === 'welcome' && (
            <>
              <h3 className="text-2xl font-semibold text-gray-900">Hey hey! 👋</h3>
              <p className="text-gray-600 text-base">Welcome to Whispr, your safe space to share, reflect, and just be yourself.<br/>Before we start, can we ask you a couple of questions? No stress — it just helps us make your journaling experience tailored to you :)</p>
              <div className="flex gap-3">
                <button onClick={handleBack} className="flex items-center gap-2 text-primary/70 border-2 border-primary/20 px-6 py-3 rounded-xl font-medium hover:bg-primary/5 transition-colors">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back
                </button>
                <button onClick={() => setStep('cuddle')} className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex-1">Let's go! →</button>
              </div>
            </>
          )}

          {step === 'cuddle' && (
            <>
              <h3 className="text-2xl font-semibold text-gray-900">Do you have a Cuddle buddy yet? 🧸</h3>
              <p className="text-gray-600 text-base">Just checking — have you bought a Cuddle before, or maybe gifted one to someone?</p>
              <div className="flex flex-col gap-3 mt-4">
                <button onClick={() => { handleProfileChange('cuddleOwnership', 'have'); setStep('gender'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.cuddleOwnership === 'have' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Yes, I have one!</button>
                <button onClick={() => { handleProfileChange('cuddleOwnership', 'not-yet'); setStep('gender'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.cuddleOwnership === 'not-yet' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>No, not yet</button>
                <button onClick={() => { handleProfileChange('cuddleOwnership', 'gifted'); setStep('gender'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.cuddleOwnership === 'gifted' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>I gifted it to someone</button>
              </div>
              <p className="text-xs text-primary/60 mt-2">(Whichever you pick, you're welcome here!)</p>
              <button onClick={handleBack} className="flex items-center justify-center gap-2 text-primary/70 border-2 border-primary/20 px-6 py-2 rounded-xl font-medium hover:bg-primary/5 transition-colors w-full mt-4">
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
            </>
          )}

          {step === 'gender' && (
            <>
              <h3 className="text-2xl font-semibold text-gray-900">How do you vibe? 🌈</h3>
              <p className="text-gray-600 text-base">If you're comfy sharing, how do you identify? <span className="text-primary/70">(Totally okay to skip!)</span></p>
              <div className="flex flex-col gap-3 mt-4">
                <button onClick={() => { handleProfileChange('gender', 'woman'); setStep('lifeStage'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.gender === 'woman' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Woman</button>
                <button onClick={() => { handleProfileChange('gender', 'man'); setStep('lifeStage'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.gender === 'man' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Man</button>
                <button onClick={() => { handleProfileChange('gender', 'non-binary'); setStep('lifeStage'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.gender === 'non-binary' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Non-binary</button>
                <button onClick={() => { handleProfileChange('gender', 'prefer-not-to-say'); setStep('lifeStage'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.gender === 'prefer-not-to-say' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Prefer not to say</button>
              </div>
              <p className="text-xs text-primary/60 mt-2">(We ask so we can make Whispr feel more like <span className='italic'>you</span>.)</p>
              <button onClick={handleBack} className="flex items-center justify-center gap-2 text-primary/70 border-2 border-primary/20 px-6 py-2 rounded-xl font-medium hover:bg-primary/5 transition-colors w-full mt-4">
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
            </>
          )}

          {step === 'lifeStage' && (
            <>
              <h3 className="text-2xl font-semibold text-gray-900">Where are you at in life? 🎒</h3>
              <p className="text-gray-600 text-base">Pick the one that feels right — we're all on our own journey!</p>
              <div className="flex flex-col gap-3 mt-4">
                <button onClick={() => { handleProfileChange('lifeStage', 'school'); setStep('done'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.lifeStage === 'school' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>In school</button>
                <button onClick={() => { handleProfileChange('lifeStage', 'college'); setStep('done'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.lifeStage === 'college' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>College student</button>
                <button onClick={() => { handleProfileChange('lifeStage', 'just-started-working'); setStep('done'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.lifeStage === 'just-started-working' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Just started working</button>
                <button onClick={() => { handleProfileChange('lifeStage', 'working-professional'); setStep('done'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.lifeStage === 'working-professional' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Working professional</button>
                <button onClick={() => { handleProfileChange('lifeStage', 'other'); setStep('done'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.lifeStage === 'other' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Other</button>
              </div>
              <p className="text-xs text-primary/60 mt-2">(No wrong answers, promise!)</p>
              <button onClick={handleBack} className="flex items-center justify-center gap-2 text-primary/70 border-2 border-primary/20 px-6 py-2 rounded-xl font-medium hover:bg-primary/5 transition-colors w-full mt-4">
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
            </>
          )}

          {step === 'done' && (
            <>
              <h3 className="text-2xl font-semibold text-gray-900">All set! 🌻</h3>
              <p className="text-gray-600 text-base">Thanks for sharing a bit about yourself.<br/>Your Cuddle is ready to listen whenever you are.</p>
              <p className="text-xs text-primary/60 mt-2">(You can always change these details later in your profile.)</p>
              <div className="flex gap-3 mt-4">
                <button onClick={handleBack} className="flex items-center gap-2 text-primary/70 border-2 border-primary/20 px-6 py-3 rounded-xl font-medium hover:bg-primary/5 transition-colors">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isProfileComplete || isSubmitting}
                  className="bg-primary text-white px-8 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex-1"
                >
                  {isSubmitting ? "Setting up your space... ✨" : "Let's begin journaling →"}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
} 