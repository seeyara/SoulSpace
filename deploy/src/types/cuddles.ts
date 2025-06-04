export type CuddleId = 'ellie-sr' | 'olly-sr' | 'ellie-jr' | 'olly-jr';

export interface Cuddle {
  name: string;
  intro: string;
  prompts: string[];
}

export interface CuddleData {
  cuddles: {
    [key in CuddleId]: Cuddle;
  };
} 