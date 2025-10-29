import type { CuddleId } from '@/types/api';

const finishFarewells: Record<CuddleId, string> = {
  'ellie-sr': "I sense you're ready to pause and reflect. That's very wise. Hold me close as you let these thoughts settle - I'll be here whenever you need me again. 💜",
  'olly-sr': "Taking time to process is so important. I'm proud of what we've discovered together. Remember, I'm here whenever you want to find more bright spots in your day. 💙",
  'ellie-jr': "Thanks for sharing with me! Keep me close while you think about everything - I'll be ready for our next fun chat whenever you are! ✨",
  'olly-jr': "What wonderful discoveries we've made! Whenever you want to explore more feelings together, just hold me tight. See you soon! 💫",
};

const forcedFarewells: Record<CuddleId, string> = {
  'ellie-sr': "I can feel we've reached a meaningful place in our conversation. Remember, you can always hold me close as you let these thoughts settle. I'll be here whenever you need to untangle your mind again. 💜",
  'olly-sr': "Thank you for sharing your thoughts with me today. Hold onto the positives we've discovered, and remember I'm here whenever you want to find more silver linings together. 💙",
  'ellie-jr': "This has been such a special chat! Keep me close while you think about everything we talked about. I'm always ready for our next playful conversation! ✨",
  'olly-jr': "What an amazing time exploring your feelings together! Snuggle with me whenever you want to discover more about yourself. Until next time! 💫",
};

const defaultForcedFarewell = "I can feel how much we've shared together today. Sometimes the best conversations have natural pauses... You can always snuggle with me and let your thoughts settle. I'll be right here whenever you're ready to talk again. 💙";

export function getFarewellMessage(cuddleId: CuddleId, variant: 'finish' | 'force' = 'finish'): string {
  if (variant === 'force') {
    return forcedFarewells[cuddleId] ?? defaultForcedFarewell;
  }

  return finishFarewells[cuddleId] ?? finishFarewells['ellie-sr'];
}
