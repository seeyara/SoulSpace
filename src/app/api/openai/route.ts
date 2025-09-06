import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { serverConfig } from '@/lib/config';
import { withErrorHandler } from '@/lib/errors';

const openai = new OpenAI({
  apiKey: serverConfig.openai.apiKey,
});

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { systemPrompt, userMessage, model = 'gpt-4o', maxTokens = 150, temperature = 0.7 } = body;

  if (!systemPrompt || !userMessage) {
    return NextResponse.json(
      { error: 'systemPrompt and userMessage are required' },
      { status: 400 }
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature,
      max_tokens: maxTokens
    });

    const response = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ response });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
});