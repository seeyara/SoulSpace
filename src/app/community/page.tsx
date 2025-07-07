'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Heart, MessageCircle, X } from 'lucide-react';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CommunityAccessModal from '@/components/CommunityAccessModal';

type Reply = {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
  likes: number;
  is_liked: boolean;
};

type Question = {
  id: string;
  question: string;
  created_at: string;
  tags: string[];
  replies: Reply[];
  reply_count: number;
};

export default function Community() {
  // Group related state
  const [userId, setUserId] = useState<string>('');
  const [isInvitePending, setIsInvitePending] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Questions and replies state
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [newReply, setNewReply] = useState('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // Initialize user and access state
  useEffect(() => {
    const storedUserId = localStorage.getItem('soul_journal_user_id');
    const invitePending = localStorage.getItem('soul_community_invite_pending') === 'true';
    
    if (storedUserId) {
      setUserId(storedUserId);
    }
    
    setIsInvitePending(invitePending);
    
    if (!invitePending) {
      setShowAccessModal(true);
    }
  }, []);

  // Fetch questions when tag changes
  useEffect(() => {
    fetchQuestions();
  }, [activeTag]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/community/questions');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReplies = async (questionId: string) => {
    try {
      const response = await fetch(`/api/community/replies?questionId=${questionId}`, {
        headers: {
          'x-user-id': userId || ''
        }
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      return data;
    } catch (error) {
      console.error('Error fetching replies:', error);
      return [];
    }
  };

  const handleQuestionClick = async (question: Question) => {
    const replies = await fetchReplies(question.id);
    setSelectedQuestion({
      ...question,
      replies
    });
  };

  const handleLikeReply = async (replyId: string) => {
    if (!userId || !selectedQuestion) return;

    try {
      const response = await fetch('/api/community/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ replyId, userId })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Update replies in the selected question
      if (selectedQuestion) {
        const updatedReplies = selectedQuestion.replies.map(reply =>
          reply.id === replyId
            ? { ...reply, likes: data.likes, is_liked: data.is_liked }
            : reply
        );

        setSelectedQuestion({
          ...selectedQuestion,
          replies: updatedReplies
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !selectedQuestion) return;

    if (!userId) {
      router.push('/account');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/community/replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: selectedQuestion.id,
          content: newReply.trim(),
          userId
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setNewReply('');
      
      // Refresh replies and questions
      const replies = await fetchReplies(selectedQuestion.id);
      setSelectedQuestion({
        ...selectedQuestion,
        replies
      });
      fetchQuestions();
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allTags = Array.from(
    new Set(questions.flatMap(q => q.tags))
  );

  // Render loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Locked Overlay */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
        <LockClosedIcon className="w-16 h-16 text-white mb-4" />
        {isInvitePending ? (
          <>
            <h2 className="text-2xl font-semibold text-white mb-2">Your invite is on its way! ✨</h2>
            <p className="text-gray-200 text-center max-w-sm px-4 mb-6">
              You&apos;ll soon get access to the exclusive Whispr Community
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-white mb-2">Get Exclusive Access</h2>
            <p className="text-gray-200 text-center max-w-sm px-4 mb-6">
              The community feature is currently exclusive. Get access now!
            </p>
            <button
              onClick={() => setShowAccessModal(true)}
              className="bg-white text-primary px-8 py-3 rounded-full font-medium hover:bg-white/90 transition-colors"
            >
              Unlock Access ✨
            </button>
          </>
        )}
      </div>

      <CommunityAccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        userId={userId}
      />

      {/* Header */}
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-sm z-40 p-4 border-b border-primary/10">
        <div className="max-w-3xl mx-auto">
          <Image
            src="/assets/Logo.png"
            alt="Soul Logo"
            width={100}
            height={32}
            priority
            className="h-8 w-auto cursor-pointer"
            onClick={() => router.push('/')}
          />
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-20 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Community Reflections ✨
          </h1>
          <p className="text-gray-500">
            Join the conversation and share your thoughts
          </p>
        </motion.div>

        {/* Tags */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide"
        >
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                activeTag === tag
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </motion.div>

        {/* Questions List */}
        <AnimatePresence>
          {questions.map((question, index) => (
            (!activeTag || question.tags.includes(activeTag)) && (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleQuestionClick(question)}
                className="bg-white rounded-lg p-4 mb-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {question.question}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center text-gray-500">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    {question.reply_count} replies
                  </div>
                  <div className="flex gap-2">
                    {question.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>

        {/* Replies Modal */}
        <AnimatePresence>
          {selectedQuestion && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedQuestion(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg bg-white rounded-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <h2 className="text-xl font-medium text-gray-900 pr-8">
                      {selectedQuestion.question}
                    </h2>
                    <button
                      onClick={() => setSelectedQuestion(null)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {selectedQuestion.tags.map(tag => (
                      <span key={tag} className="text-sm text-primary/60">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Replies List */}
                <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                  {selectedQuestion.replies.map(reply => (
                    <div key={reply.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">
                          {reply.user_name}
                        </span>
                        <button
                          onClick={() => handleLikeReply(reply.id)}
                          className={`flex items-center gap-1 ${
                            reply.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${reply.is_liked ? 'fill-current' : ''}`} />
                          <span className="text-sm">{reply.likes}</span>
                        </button>
                      </div>
                      <p className="text-gray-700">{reply.content}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                <div className="p-6 border-t border-gray-200">
                  <form onSubmit={handleSubmitReply} className="space-y-2">
                    <textarea
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder="Share your thoughts..."
                      rows={3}
                      className="w-full p-4 rounded-xl border-2 border-primary/20 focus:border-primary outline-none resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!newReply.trim() || isSubmitting}
                        className="bg-primary text-white px-6 py-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                      >
                        {isSubmitting ? 'Sending...' : 'Reply'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
} 