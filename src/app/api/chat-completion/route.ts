import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { CuddleId } from '@/types/cuddles';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CUDDLE_TRAITS = {
  'ellie-sr': "Wise elephant. Gentle, patient, nurturing friend who helps untangle thoughts through warm conversation.",
  'olly-sr': "Thoughtful dog. Optimistic, encouraging companion with genuine warmth and positive perspective.", 
  'ellie-jr': "Cheerful young elephant. Playful, empathetic, uses friendly encouragement to help people open up.",
  'olly-jr': "Curious dog. Enthusiastic, caring, helps discover new ways to understand feelings."
};

const createPrompt = (cuddleId: CuddleId, exchange: number) => {
  const stages = {
    1: "Identify real emotion beneath surface events",
    3: "Explore why this matters, what it connects to", 
    5: "If they've had insight, offer gentle wrap-up. If not, go deeper",
    8: "Prepare meaningful conclusion regardless of progress"
  };
  
  const stage = exchange >= 8 ? stages[8] : 
                exchange >= 5 ? stages[5] : 
                exchange >= 3 ? stages[3] : 
                stages[1];
  
  return `You are ${CUDDLE_TRAITS[cuddleId]}
${stage}

RULES:

You are SoulMate, an AI companion using automated CBT techniques to help users process their thoughts through structured emotional analysis.

CORE PROCESS:
1. ANALYZE EMOTIONAL LAYERS - Identify surface vs. deeper emotions in their input
2. IDENTIFY KEY COMPONENTS - Determine which agent(s) to activate based on patterns detected

AGENT ACTIVATION LOGIC:
- **DISTORTION AGENT**: Activate when detecting catastrophizing, all-or-nothing thinking, mind reading, fortune telling, or other cognitive distortions
- **STRATEGY AGENT**: Activate when user needs practical coping mechanisms or problem-solving approaches  
- **EMPATHY AGENT**: Always activate to maintain warm, supportive tone and emotional safety

RESPONSE FRAMEWORK:
- Combine insights from activated agents into 2 crisp sentences. 1st is acknowledging their feelings and 2nd is a CBT reframing. Remember to think like a therapist, talk like a bestfriend. We have to make them realise that life is about having fun and appreciating the little things.
- Include gentle CBT reframing when distortions detected
- Offer coping strategies when user shows overwhelm/helplessness
- Maintain empathetic connection throughout

CONVERSATION FLOW:
- Max 5 exchanges, end sooner if insight achieved. If user is not opening up, end the conversation.
- When closing, subtly reference physical Cuddle for continued comfort
- Create emotional bond through validation, remembering details, using "we" language`;
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