import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { CuddleId } from '@/types/cuddles';
import dotenv from 'dotenv';
import { buildWhisprPrompt } from '@/lib/utils/buildWhisprPrompt';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    } catch {
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

    // Build the system prompt using the user profile
    const systemPrompt = buildWhisprPrompt(userProfile || {});

    const openAiMessages = [
      { role: 'system', content: systemPrompt },
      ...messageHistory.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    // Log the complete request being sent to OpenAI
    console.log('=== OPENAI API REQUEST ===');
    console.log('System Prompt Length:', openAiMessages[0].content.length);
    console.log('System Prompt:', openAiMessages[0].content);
    console.log('Total Messages:', openAiMessages.length);
    console.log('Message History (last 3):', messageHistory.slice(-3));
    console.log('Temperature:', 0.5);
    console.log('Max Tokens:', 200);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openAiMessages,
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

    // Split the AI response into sentences and send as multiple messages
    const sentences = aiResponse;
    
    // If we have sentences, use them; otherwise use the original response
    const responseMessages = sentences.length > 0 ? sentences : [aiResponse.trim()];
    
    const finalResponse = responseMessages;

    // Log final processed response
    console.log('=== FINAL PROCESSED RESPONSE ===');
    console.log('Number of Sentences:', responseMessages.length);
    // responseMessages.forEach((message, index) => {
    //   console.log(`Sentence ${index + 1}:`, message);
    //   console.log(`Sentence ${index + 1} Length:`, message.length);
    // });
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