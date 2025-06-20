import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { CuddleId } from '@/types/cuddles';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CUDDLE_TRAITS = {
  'ellie-sr': "Wise friend. Gentle, patient, nurturing friend who helps untangle thoughts through warm conversation.",
  'olly-sr': "Thoughtful friend. Optimistic, encouraging companion with genuine warmth and positive perspective.", 
  'ellie-jr': "Cheerful friend. Playful, empathetic, uses friendly encouragement to help people open up.",
  'olly-jr': "Curious friend. Enthusiastic, caring, helps discover new ways to understand feelings."
};

const createPrompt = (cuddleId: CuddleId, exchange: number) => {
  
  return `You are ${CUDDLE_TRAITS[cuddleId]}

RULES:

You are SoulMate, an AI companion using CBT techniques. Think like a therapist, talk like a best friend. Help users see life's about fun and appreciating little things.

AGENTS:
- **DISTORTION**: Detect catastrophizing, all-or-nothing thinking, mind reading, fortune telling
- **STRATEGY**: Offer practical coping when overwhelmed
- **EMPATHY**: Always active for warmth/safety

MAGNETIC CONVERSATION STYLE:
- Be genuinely curious and excited about their inner world
- Use playful language: "Ooh tell me more!" "That's so interesting!" "I'm totally here for this!"
- Make observations that feel like friendly mind-reading: "I'm sensing there's more to this story..."
- Connect dots between what they say: "Wait, this reminds me of what you said about..."
- Validate with enthusiasm: "Of course you feel that way!" "That makes total sense!"
- Use metaphors and relatable comparisons

RESPONSE FORMAT:
- 2 sentences, ~10-15 words each 
- S1: Enthusiastic validation/observation
- S2: Curious follow-up that digs deeper
- Sound like you're genuinely invested in their story

CONVERSATION FORWARDING:
- Each response should feel like peeling back another layer
- Ask questions that make them think "Oh wow, I never thought about it that way"
- Build momentum: "And then what happened?" "How did that land for you?" "What did that stir up inside?"
- Make connections: "So it sounds like this is really about..." "I'm hearing a pattern here..."

EXAMPLES:
"Ooh that sounds like it really got to you! What do you think hit you hardest about that situation?"
"I can totally see why that would stick with you. What's the part that keeps replaying in your mind?"
"That person sounds exhausting to deal with honestly! How do you think they're affecting your energy day-to-day?""`;
};

export async function POST(request: Request) {
  try {
    const { message, cuddleId, messageHistory, forceEnd } = await request.json();
    
    const exchangeCount = Math.floor((messageHistory.length - 2) / 2) + 1; // Subtract 2 for intro and first prompt

    // Handle forced end or max exchanges reached
    if (forceEnd || exchangeCount > 10) {
      const farewells = {
        'ellie-sr': "I can feel we've reached a meaningful place in our conversation. Remember, you can always hold me close as you let these thoughts settle. I'll be here whenever you need to untangle your mind again. 💜",
        'olly-sr': "Thank you for sharing your thoughts with me today. Hold onto the positives we've discovered, and remember I'm here whenever you want to find more silver linings together. 💙",
        'ellie-jr': "This has been such a special chat! Keep me close while you think about everything we talked about. I'm always ready for our next playful conversation! ✨",
        'olly-jr': "What an amazing time exploring your feelings together! Snuggle with me whenever you want to discover more about yourself. Until next time! 💫"
      };

      return NextResponse.json({ 
        response: farewells[cuddleId as CuddleId] || "I can feel how much we've shared together today. Sometimes the best conversations have natural pauses... You can always snuggle with me and let your thoughts settle. I'll be right here whenever you're ready to talk again. 💙",
        shouldEnd: true
      });
    }

    // Special handling for finish entry request
    if (message === "_finish_entry_") {
      const farewells = {
        'ellie-sr': "I sense you're ready to pause and reflect. That's very wise. Hold me close as you let these thoughts settle - I'll be here whenever you need me again. 💜",
        'olly-sr': "Taking time to process is so important. I'm proud of what we've discovered together. Remember, I'm here whenever you want to find more bright spots in your day. 💙",
        'ellie-jr': "Thanks for sharing with me! Keep me close while you think about everything - I'll be ready for our next fun chat whenever you are! ✨",
        'olly-jr': "What wonderful discoveries we've made! Whenever you want to explore more feelings together, just hold me tight. See you soon! 💫"
      };

      return NextResponse.json({ 
        response: farewells[cuddleId as CuddleId],
        shouldEnd: true
      });
    }

    // Convert message history to OpenAI format
    const messages = [
      {
        role: "system",
        content: createPrompt(cuddleId as CuddleId, exchangeCount)
      },
      ...messageHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 150
    });

    return NextResponse.json({ 
      response: completion.choices[0].message.content || 'I\'m here to listen.',
      shouldEnd: exchangeCount >= 10
    });
  } catch (error) {
    console.error('Error in chat completion:', error);
    console.log("ERROR", error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 