export type CuddleId = 'ellie-sr' | 'olly-sr' | 'ellie-jr' | 'olly-jr';

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