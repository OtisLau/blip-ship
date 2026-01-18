import Anthropic from '@anthropic-ai/sdk';

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Model selection - Sonnet 4.5 for reliable code generation
const SONNET_MODEL = 'claude-sonnet-4-20250514';

/**
 * Call Claude Sonnet 4.5 for code generation
 */
export async function callClaude(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: SONNET_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textBlock = message.content.find(block => block.type === 'text');
  return textBlock ? textBlock.text : '';
}

/**
 * Call Claude and parse JSON response
 */
export async function callClaudeJSON<T>(prompt: string): Promise<T> {
  const text = await callClaude(prompt);

  // Handle potential markdown code blocks
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text];
  const jsonStr = jsonMatch[1] || text;

  return JSON.parse(jsonStr.trim()) as T;
}
