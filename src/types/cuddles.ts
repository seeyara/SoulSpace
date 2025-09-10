import type { CuddleId } from './api';

// Legacy types for compatibility
export interface Cuddle {
  name: string;
}

export interface CuddleData {
  cuddles: {
    [key in CuddleId]: Cuddle;
  };
}

export type CuddlePrompts = {
  [key in CuddleId]: string[];
};

export type CuddleIntro = string; 