'use client';

import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import BaseModal from './BaseModal';
import { storage } from '@/lib/storage';

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
  const [step, setStep] = useState<'privacy' | 'cuddle' | 'gender' | 'lifeStage' | 'done'>('privacy');
  const [profile, setProfile] = useState<UserProfile>({
    cuddleOwnership: '',
    gender: '',
    lifeStage: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyProfileState = useCallback((incoming?: Partial<UserProfile> & { lifestage?: string; life_stage?: string }) => {
    if (!incoming) {
      setStep('privacy');
      setProfile({ cuddleOwnership: '', gender: '', lifeStage: '' });
      return;
    }

    const nextProfile: UserProfile = {
      cuddleOwnership: incoming.cuddleOwnership ?? '',
      gender: incoming.gender ?? '',
      lifeStage: incoming.lifeStage ?? incoming.lifestage ?? incoming.life_stage ?? '',
    };

    setProfile(nextProfile);

    if (nextProfile.cuddleOwnership && nextProfile.gender && nextProfile.lifeStage) {
      setStep('done');
    } else if (nextProfile.cuddleOwnership && nextProfile.gender) {
      setStep('lifeStage');
    } else if (nextProfile.cuddleOwnership) {
      setStep('gender');
    } else {
      setStep('privacy');
    }
  }, []);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }

    const hydrateProfile = async () => {
      const storedProfile = localStorage.getItem('user_profile');
      if (storedProfile) {
        try {
          const parsed = JSON.parse(storedProfile) as Partial<UserProfile> & { lifestage?: string; life_stage?: string };
          applyProfileState(parsed);
        } catch (error) {
          console.error('Failed to parse stored profile:', error);
          applyProfileState();
        }
      } else {
        applyProfileState();
      }

      const storedUserId = localStorage.getItem('soul_journal_user_id');
      const storedSessionId = localStorage.getItem('soul_journal_session_id');
      const storedEmail = storage.getEmail();

      if (!storedUserId && !storedEmail && !storedSessionId) {
        return;
      }

      const params = new URLSearchParams();
      if (storedUserId) {
        params.set('userId', storedUserId);
      }
      if (storedSessionId) {
        params.set('tempSessionId', storedSessionId);
      }
      if (storedEmail) {
        params.set('email', storedEmail);
      }

      try {
        const response = await fetch(`/api/users/profile?${params.toString()}`);
        if (!response.ok) {
          return;
        }

        type RemoteProfile = Partial<UserProfile> & { life_stage?: string; lifestage?: string };
        const { profile: remoteProfile } = await response.json() as { profile?: RemoteProfile | null };
        if (remoteProfile) {
          const normalized: UserProfile = {
            cuddleOwnership: remoteProfile.cuddleOwnership ?? '',
            gender: remoteProfile.gender ?? '',
            lifeStage: remoteProfile.lifeStage ?? remoteProfile.lifestage ?? remoteProfile.life_stage ?? '',
          };
          localStorage.setItem('user_profile', JSON.stringify(normalized));
          applyProfileState(normalized);
        }
      } catch (error) {
        console.error('Failed to fetch profile from database:', error);
      }
    };

    hydrateProfile();
  }, [isOpen, applyProfileState]);

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isProfileComplete = profile.cuddleOwnership && profile.gender && profile.lifeStage;

  const handleBack = () => {
    switch (step) {
      case 'cuddle':
        setStep('privacy');
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
      const tempSessionId = localStorage.getItem('soul_journal_session_id');
      const email = storage.getEmail();

      if (userId || email || tempSessionId) {
        const payload: Record<string, unknown> = { profile };
        if (userId) {
          payload.userId = userId;
        }
        if (email) {
          payload.email = email;
        }
        if (tempSessionId) {
          payload.tempSessionId = tempSessionId;
        }

        const response = await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          console.error('Failed to save profile to database');
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('soul:profile-updated'));
      }
      setTimeout(() => { onClose(); }, 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="text-center space-y-6">
        {/* Back button - only show if not on first step */}
        {step !== 'privacy' && (
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Stepper */}
        <div className="flex justify-center gap-2 mb-2">
          {["privacy", "cuddle", "gender", "lifeStage", "done"].map((s) => (
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
            <p className="text-xs text-primary/60 mt-2">Before we continue, please help us with a few details so we can personalise your experience</p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <button onClick={() => setStep('cuddle')} className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors w-full">Continue</button>
            </motion.div>
          </>
        )}

        {step === 'cuddle' && (
          <>
            <h3 className="text-2xl font-semibold text-gray-900">Do you have a Cuddle  yet? 🧸</h3>
            <div className="flex flex-col gap-3 mt-4">
              <button onClick={() => { handleProfileChange('cuddleOwnership', 'have'); setStep('gender'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.cuddleOwnership === 'have' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Yes, I have one!</button>
              <button onClick={() => { handleProfileChange('cuddleOwnership', 'not-yet'); setStep('gender'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.cuddleOwnership === 'not-yet' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>No, not yet</button>
              <button onClick={() => { handleProfileChange('cuddleOwnership', 'gifted'); setStep('gender'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.cuddleOwnership === 'gifted' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>I gifted it to someone</button>
            </div>
            <p className="text-xs text-primary/60 mt-2">(Whichever you pick, you're welcome here!)</p>
            <button onClick={handleBack} className="flex items-center justify-center gap-2 text-primary/70 border-2 border-primary/20 px-6 py-2 rounded-xl font-medium hover:bg-primary/5 transition-colors w-full mt-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </>
        )}

        {step === 'gender' && (
          <>
            <h3 className="text-2xl font-semibold text-gray-900">How do you vibe? 🌈</h3>
            <p className="text-gray-600 text-base">If you're comfortable sharing, how do you identify? </p>
            <div className="flex flex-col gap-3 mt-4">
              <button onClick={() => { handleProfileChange('gender', 'woman'); setStep('lifeStage'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.gender === 'woman' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Woman</button>
              <button onClick={() => { handleProfileChange('gender', 'man'); setStep('lifeStage'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.gender === 'man' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Man</button>
              <button onClick={() => { handleProfileChange('gender', 'non-binary'); setStep('lifeStage'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.gender === 'non-binary' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Non-binary</button>
              <button onClick={() => { handleProfileChange('gender', 'prefer-not-to-say'); setStep('lifeStage'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.gender === 'prefer-not-to-say' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Prefer not to say</button>
            </div>
            <p className="text-xs text-primary/60 mt-2">(We ask so we can make Whispr feel more like <span className='italic'>you</span>.)</p>
            <button onClick={handleBack} className="flex items-center justify-center gap-2 text-primary/70 border-2 border-primary/20 px-6 py-2 rounded-xl font-medium hover:bg-primary/5 transition-colors w-full mt-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
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
              <button onClick={() => { handleProfileChange('lifeStage', 'college'); setStep('done'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.lifeStage === 'college' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>College</button>
              <button onClick={() => { handleProfileChange('lifeStage', 'career'); setStep('done'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.lifeStage === 'career' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Working/Career</button>
              <button onClick={() => { handleProfileChange('lifeStage', 'other'); setStep('done'); }} className={`w-full px-6 py-3 rounded-2xl font-medium border-2 ${profile.lifeStage === 'other' ? 'bg-primary text-white border-primary' : 'border-primary/20 text-primary'} hover:bg-primary/10 transition-colors`}>Other</button>
            </div>
            <p className="text-xs text-primary/60 mt-2">(We ask so we can make Whispr feel more like <span className='italic'>you</span>.)</p>
            <button onClick={handleBack} className="flex items-center justify-center gap-2 text-primary/70 border-2 border-primary/20 px-6 py-2 rounded-xl font-medium hover:bg-primary/5 transition-colors w-full mt-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </>
        )}
        {step === 'done' && (
          <>
            <h3 className="text-2xl font-semibold text-gray-900">All set! 🌻</h3>
            <p className="text-gray-600 text-base">Thanks for sharing a bit about yourself.<br />
            Did you know - to personalise your experience you can actually name your Cuddle on your profile page.</p>
            <div className="flex gap-3 mt-4">
              <button onClick={handleBack} className="flex items-center gap-2 text-primary/70 border-2 border-primary/20 px-6 py-3 rounded-xl font-medium hover:bg-primary/5 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
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
    </BaseModal>
  );
}