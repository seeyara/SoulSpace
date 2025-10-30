import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { CuddleId } from '@/types/api';
import { serverConfig } from '@/lib/config';
import { buildWhisprPrompt, type WhisprUserProfile } from '@/lib/utils/buildWhisprPrompt';
import { withRedisRateLimit } from '@/lib/withRedisRateLimit';
import { withErrorHandler } from '@/lib/errors';
import { ChatCompletionRequestSchema, validateRequestBody, type ChatMessage } from '@/lib/validation';
import { getFarewellMessage } from '@/lib/utils/journalCompletion';
import { fetchUserProfile } from '@/lib/utils/journalDb';

const openai = new OpenAI({
  apiKey: serverConfig.openai.apiKey,
});

export const POST = withRedisRateLimit({
  keyPrefix: 'guided',
  limit: 10, // 10 requests per minute per user
  window: 60,
  getKey: (req) => {
    // Use userId from body if available, else fallback to IP
    try {
      const body = req.body ? req.body : null;
      if (body) {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        if (parsed) {
          if (parsed.userId) return parsed.userId;
          if (parsed.tempSessionId) return parsed.tempSessionId;
        }
      }
    } catch {}
    return req.headers.get('x-user-id') || 'anonymous';
  },
})(withErrorHandler(async (request: Request) => {
  const body = await request.json();
  const validatedData = validateRequestBody(ChatCompletionRequestSchema)(body);
  const { message, cuddleId, messageHistory, forceEnd, userId, tempSessionId } = validatedData;

  const exchangeCount = Math.floor((messageHistory.length - 2) / 2) + 1; // Subtract 2 for intro and first prompt

  // Log incoming request details
  console.log('=== OPENAI REQUEST LOG ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Cuddle ID:', cuddleId);
  console.log('Exchange Count:', exchangeCount);
  console.log('User Message:', message);
  console.log('Message History Length:', messageHistory.length);
  console.log('Force End:', forceEnd);

  // Load user profile from database for personalised prompts
  let userProfile: WhisprUserProfile | undefined;
  if (userId || tempSessionId) {
    try {
      const { data, error } = await fetchUserProfile({ userId, tempSessionId });
      if (error) {
        if ((error as { code?: string }).code !== 'PGRST116') {
          console.error('Failed to load user for prompt personalisation:', error);
        }
      } else if (data) {
        const {
          cuddle_ownership,
          gender,
          life_stage,
          cuddle_name,
          cuddle_id,
          age,
          city,
          mood,
        } = data as Record<string, unknown>;

        userProfile = {
          cuddleOwnership: typeof cuddle_ownership === 'string' && cuddle_ownership.trim()
            ? cuddle_ownership
            : undefined,
          gender: typeof gender === 'string' && gender.trim() ? gender : undefined,
          lifeStage: typeof life_stage === 'string' && life_stage.trim() ? life_stage : undefined,
          cuddleName: typeof cuddle_name === 'string' && cuddle_name.trim() ? cuddle_name : undefined,
          cuddleId: typeof cuddle_id === 'string' && cuddle_id.trim() ? cuddle_id : undefined,
          age: typeof age === 'number' ? age : undefined,
          city: typeof city === 'string' && city.trim() ? city : undefined,
          mood: typeof mood === 'string' && mood.trim() ? mood : undefined,
        };
        console.log('User Profile (db):', userProfile);
      }
    } catch (error) {
      console.error('Unexpected error loading user profile:', error);
    }
  }

  // Handle forced end only (removed max exchanges limit)
  if (forceEnd) {
    const farewellResponse = getFarewellMessage(cuddleId as CuddleId, 'force');

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
    const farewellResponse = getFarewellMessage(cuddleId as CuddleId);

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
  const systemPrompt = buildWhisprPrompt(userProfile);

  const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messageHistory.map((m: ChatMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
      role: m.role,
      content: m.content
    })),
    { role: 'user', content: message! }
  ];

  // Log the complete request being sent to OpenAI
  console.log('=== OPENAI API REQUEST ===');
  if (openAiMessages[0] && openAiMessages[0].content) {
    console.log('System Prompt Length:', openAiMessages[0].content.length);
    console.log('System Prompt:', openAiMessages[0].content);
  } else {
    console.log('System Prompt missing or has no content');
  }
  console.log('Total Messages:', openAiMessages.length);
  console.log('Message History (last 3):', messageHistory.slice(-3));
  console.log('Temperature:', 0.5);
  console.log('Max Tokens:', 200);

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openAiMessages,
      temperature: 0.5,
      max_tokens: 200
    });
  } catch (error) {
    console.error('=== OPENAI API ERROR ===');
    console.error('Error Type:', error);
    throw error;
  }

  const aiResponse = completion.choices[0]?.message?.content || 'Thank you for sharing this, it means so much to me 🫶🏼. Im always here for you';

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
})); 