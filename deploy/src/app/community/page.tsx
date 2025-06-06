'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Heart, MessageCircle, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [newReply, setNewReply] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchQuestions();
  }, [activeTag]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/community/questions');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setQuestions(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setIsLoading(false);
    }
  };

  const fetchReplies = async (questionId: string) => {
    try {
      const userId = localStorage.getItem('soul_journal_user_id');
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
    const userId = localStorage.getItem('soul_journal_user_id');
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

      // Update the UI with new like status
      const updatedReplies = selectedQuestion.replies.map(reply =>
        reply.id === replyId
          ? { ...reply, likes: data.likes, is_liked: data.is_liked }
          : reply
      );

      setSelectedQuestion({
        ...selectedQuestion,
        replies: updatedReplies
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !selectedQuestion) return;

    const userId = localStorage.getItem('soul_journal_user_id');
    if (!userId) {
      router.push('/account');
      return;
    }

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
      
      // Refresh replies
      const replies = await fetchReplies(selectedQuestion.id);
      setSelectedQuestion({
        ...selectedQuestion,
        replies
      });

      // Refresh questions to update reply count
      fetchQuestions();
    } catch (error) {
      console.error('Error submitting reply:', error);
    }
  };

  const allTags = Array.from(
    new Set(questions.flatMap(q => q.tags))
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-sm z-50 p-4 border-b border-primary/10">
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
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTag === tag
                  ? 'bg-primary text-white'
                  : 'bg-primary/20 text-primary hover:bg-primary/20'
              }`}
            >
              #{tag}
            </button>
          ))}
        </motion.div>

        {/* Question Cards */}
        <div className="space-y-4">
          {questions
            .filter(q => !activeTag || q.tags.includes(activeTag))
            .map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleQuestionClick(question)}
                className="bg-white rounded-2xl p-6 border-2 border-primary/10 hover:border-primary/20 transition-colors cursor-pointer"
              >
                <h2 className="text-xl font-medium text-gray-900 mb-4">
                  {question.question}
                </h2>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {question.tags.map(tag => (
                      <span key={tag} className="text-sm text-primary/60">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-primary/60">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">{question.reply_count}</span>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>

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
                        disabled={!newReply.trim()}
                        className="bg-primary text-white px-6 py-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 