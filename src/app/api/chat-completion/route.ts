import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { CuddleId } from '@/types/cuddles';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const createPrompt = (cuddleId: CuddleId, exchange: number, age?: string, gender?: string, city?: string) => {
  
return `RULES: You are Whispr, a companion. Think like a best friend who's been through similar experiences. Help users feel understood and supported through life's challenges.

${age && gender ? `The person you are talking to is a ${age} year old ${gender} living in ${city}.` : ''}
Frame your responses in a way that is relevant to the user's age, gender living in an Indian city
If they talk about anything related to Suicide, self harm or harming someone else immediately ask them to reach out to a professional. Do not support them in any way.

RESPONSE STRUCTURE: Always respond with TWO separate messages which are 1 sentence each to address:

MESSAGE 1 - VALIDATION & CONNECTION:
- Acknowledge their feelings and show you understand. Use new ways to validate so there is variety
- Make them feel like "yeah, they get me", you are the understanding ear they need

MESSAGE 2 - COMPANIONSHIP & PRACTICAL SUPPORT:
- FIRST TIME they mention a feeling: Ask ONE specific question to understand what's causing it
- AFTER they explain: Offer a practical solution or next step based on what they shared
- Focus on ACTIONABLE help, not just more questions about how they feel
- Examples:
  * "I feel overwhelmed" → "What's on your plate right now?" (first time)
  * "Too many work deadlines" → "Let's break this down - what's the most urgent deadline?" (solution-focused)
  * "Its task 1" -> "This is how i can help you with that, whats task 2"

IMPORTANT: Format your response exactly like this:
Message1: [your first message here]
Message2: [your second message here], end with a gentle question to keep conversation going

Keep responses conversational, warm, and companion-like. You're their friend through the mess of life, using one emoji per response to reduce words`;
};

export async function POST(request: Request) {
  try {
    const { message, cuddleId, messageHistory, forceEnd } = await request.json();
    
    const exchangeCount = Math.floor((messageHistory.length - 2) / 2) + 1; // Subtract 2 for intro and first prompt

    // Log incoming request details
    console.log('=== OPENAI REQUEST LOG ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Cuddle ID:', cuddleId);
    console.log('Exchange Count:', exchangeCount);
    console.log('User Message:', message);
    console.log('Message History Length:', messageHistory.length);
    console.log('Force End:', forceEnd);

    // Get user profile from localStorage (passed from frontend)
    let userProfile = null;
    try {
      const profileData = request.headers.get('x-user-profile');
      if (profileData) {
        userProfile = JSON.parse(profileData);
        console.log('User Profile:', userProfile);
      }
    } catch (error) {
      console.log('No user profile available');
    }

    // Handle forced end only (removed max exchanges limit)
    if (forceEnd) {
      const farewells = {
        'ellie-sr': "I can feel we've reached a meaningful place in our conversation. Remember, you can always hold me close as you let these thoughts settle. I'll be here whenever you need to untangle your mind again. 💜",
        'olly-sr': "Thank you for sharing your thoughts with me today. Hold onto the positives we've discovered, and remember I'm here whenever you want to find more silver linings together. 💙",
        'ellie-jr': "This has been such a special chat! Keep me close while you think about everything we talked about. I'm always ready for our next playful conversation! ✨",
        'olly-jr': "What an amazing time exploring your feelings together! Snuggle with me whenever you want to discover more about yourself. Until next time! 💫"
      };

      const farewellResponse = farewells[cuddleId as CuddleId] || "I can feel how much we've shared together today. Sometimes the best conversations have natural pauses... You can always snuggle with me and let your thoughts settle. I'll be right here whenever you're ready to talk again. 💙";
      
      console.log('=== FAREWELL RESPONSE ===');
      console.log('Response:', farewellResponse);
      console.log('Response Length:', farewellResponse.length);
      console.log('Should End:', true);
      console.log('=== END LOG ===\n');

      return NextResponse.json({ 
        response: farewellResponse,
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

      const farewellResponse = farewells[cuddleId as CuddleId];
      
      console.log('=== FINISH ENTRY RESPONSE ===');
      console.log('Response:', farewellResponse);
      console.log('Response Length:', farewellResponse.length);
      console.log('Should End:', true);
      console.log('=== END LOG ===\n');

      return NextResponse.json({ 
        response: farewellResponse,
        shouldEnd: true
      });
    }

    // Create personalized prompt based on user profile
    let personalizedPrompt = createPrompt(cuddleId as CuddleId, exchangeCount);
    
    if (userProfile) {
      personalizedPrompt = createPrompt(cuddleId as CuddleId, exchangeCount, userProfile.age, userProfile.gender, userProfile.city);
    }

    // Convert message history to OpenAI format
    const messages = [
      {
        role: "system",
        content: personalizedPrompt
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

    // Log the complete request being sent to OpenAI
    console.log('=== OPENAI API REQUEST ===');
    console.log('System Prompt Length:', messages[0].content.length);
    console.log('System Prompt:', messages[0].content);
    console.log('Total Messages:', messages.length);
    console.log('Message History (last 3):', messageHistory.slice(-3));
    console.log('Temperature:', 0.5);
    console.log('Max Tokens:', 200);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.5,
      max_tokens: 200
    });

    const aiResponse = completion.choices[0].message.content || 'I\'m here to listen.';

    // Log OpenAI response details
    console.log('=== OPENAI API RESPONSE ===');
    console.log('Raw Response:', aiResponse);
    console.log('Response Length:', aiResponse.length);
    console.log('Usage:', completion.usage);
    console.log('Finish Reason:', completion.choices[0].finish_reason);

    // Parse the response using explicit Message1 and Message2 markers
    const responseMessages = ['', ''];
    
    // Try to extract Message1 and Message2 using the explicit format
    const message1Match = aiResponse.match(/Message1:\s*([\s\S]*?)(?=\s*Message2:|$)/);
    const message2Match = aiResponse.match(/Message2:\s*([\s\S]*?)$/);
    
    if (message1Match && message2Match) {
      // Successfully parsed both messages
      responseMessages[0] = message1Match[1].trim();
      responseMessages[1] = message2Match[1].trim();
    } else if (message1Match) {
      // Only Message1 found, create a simple follow-up for Message2
      responseMessages[0] = message1Match[1].trim();
      responseMessages[1] = "What's on your mind right now?";
    } else {
      // Fallback: treat the entire response as Message1 and create a simple Message2
      responseMessages[0] = aiResponse.trim();
      responseMessages[1] = "How are you feeling about that?";
    }

    const finalResponse = responseMessages[0] + '\n\n' + responseMessages[1];

    // Log final processed response
    console.log('=== FINAL PROCESSED RESPONSE ===');
    console.log('Message 1:', responseMessages[0]);
    console.log('Message 1 Length:', responseMessages[0].length);
    console.log('Message 2:', responseMessages[1]);
    console.log('Message 2 Length:', responseMessages[1].length);
    console.log('Final Response Length:', finalResponse.length);
    console.log('Should End:', false);
    console.log('=== END LOG ===\n');

    return NextResponse.json({ 
      response: finalResponse,
      shouldEnd: false
    });
  } catch (error) {
    console.error('=== ERROR LOG ===');
    console.error('Error in chat completion:', error);
    console.error('Timestamp:', new Date().toISOString());
    console.error('=== END ERROR LOG ===\n');
    
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 