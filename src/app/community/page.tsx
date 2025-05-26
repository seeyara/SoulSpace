'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const questions = [
  {
    id: 1,
    question: "What's your favorite way to start your morning routine?",
    likes: 24,
    replies: 8,
    tags: ['routine', 'morning']
  },
  {
    id: 2,
    question: "How do you find peace in busy moments?",
    likes: 32,
    replies: 12,
    tags: ['mindfulness', 'peace']
  },
  {
    id: 3,
    question: "What's a small win you're celebrating today?",
    likes: 45,
    replies: 15,
    tags: ['gratitude', 'celebration']
  },
  {
    id: 4,
    question: "How do you practice self-care during challenging times?",
    likes: 56,
    replies: 23,
    tags: ['self-care', 'wellness']
  }
];

export default function Community() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const router = useRouter();

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

      <div className="max-w-xl mx-auto px-4 pt-20">
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
                className="bg-white rounded-2xl p-6 border-2 border-primary/10 hover:border-primary/20 transition-colors"
              >
                <h2 className="text-xl font-medium text-gray-900 mb-4">
                  {question.question}
                </h2>
                
                <div className="flex items-center justify-end gap-4">
                  <button className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">{question.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors">
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">{question.replies}</span>
                  </button>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
} 