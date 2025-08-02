'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface TypingIndicatorProps {
  cuddleImage: string;
  cuddleName: string;
  displayName: string;
}

export default function TypingIndicator({ cuddleImage, cuddleName, displayName }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex justify-start gap-3"
    >
      <div className="flex-shrink-0 w-10 flex justify-center items-start">
        <Image
          src={cuddleImage}
          alt={cuddleName}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full"
        />
      </div>
      <div className="flex flex-col max-w-[85%] items-start">
        <div className="p-4 rounded-2xl bg-primary/10 text-primary">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <span className="text-sm text-primary/60 mt-1 ml-2 tracking-[0.02em]">
          {displayName} is typing...
        </span>
      </div>
    </motion.div>
  );
}