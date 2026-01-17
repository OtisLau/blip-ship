import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import type {
  ButtonAnalytics,
  ButtonSuggestion,
  GeneratorResponse,
  CritiqueResult,
  GeneratorInput,
  CritiqueInput,
} from '@/types/suggestions';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
});

/**
 * Load the guardrails rules from the markdown file
 */
export async function loadGuardrails(): Promise<string> {
  const guardrailsPath = path.join(
    process.cwd(),
    '.claude/rules/button-guardrails.md'
  );
  return fs.readFile(guardrailsPath, 'utf-8');
}

/**
 * Load the generator agent prompt
 */
async function loadGeneratorPrompt(): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    '.claude/agents/button-suggestion-generator.md'
  );
  const content = await fs.readFile(promptPath, 'utf-8');
  // Remove YAML frontmatter
  return content.replace(/^---[\s\S]*?---\n/, '');
}

/**
 * Load the critic agent prompt
 */
async function loadCriticPrompt(): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    '.claude/agents/button-suggestion-critic.md'
  );
  const content = await fs.readFile(promptPath, 'utf-8');
  // Remove YAML frontmatter
  return content.replace(/^---[\s\S]*?---\n/, '');
}

/**
 * Generate button improvement suggestions using Gemini
 */
export async function generateButtonSuggestions(
  buttons: ButtonAnalytics[]
): Promise<GeneratorResponse> {
  const [guardrails, systemPrompt] = await Promise.all([
    loadGuardrails(),
    loadGeneratorPrompt(),
  ]);

  const input: GeneratorInput = {
    guardrails,
    buttons,
  };

  const prompt = `${systemPrompt}

---

# Current Task

Analyze the following button data and generate improvement suggestions:

\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

Remember: Return ONLY valid JSON. No markdown, no explanation, just the JSON object.`;

  const result = await geminiModel.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse JSON from response (handle potential markdown code blocks)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text];
  const jsonStr = jsonMatch[1] || text;

  try {
    return JSON.parse(jsonStr.trim()) as GeneratorResponse;
  } catch (error) {
    console.error('Failed to parse generator response:', text);
    return {
      suggestions: [],
      errors: ['Failed to parse LLM response as JSON'],
    };
  }
}

/**
 * Critique a button suggestion using Gemini
 */
export async function critiqueButtonSuggestion(
  suggestion: ButtonSuggestion,
  existingButtonStyles: string[]
): Promise<CritiqueResult> {
  const [guardrails, systemPrompt] = await Promise.all([
    loadGuardrails(),
    loadCriticPrompt(),
  ]);

  const input: CritiqueInput = {
    guardrails,
    existingButtonStyles,
    suggestionToReview: suggestion,
  };

  const prompt = `${systemPrompt}

---

# Current Task

Validate the following button suggestion against the guardrails:

\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

Remember: Return ONLY valid JSON. No markdown, no explanation, just the JSON object.`;

  const result = await geminiModel.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse JSON from response (handle potential markdown code blocks)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text];
  const jsonStr = jsonMatch[1] || text;

  try {
    return JSON.parse(jsonStr.trim()) as CritiqueResult;
  } catch (error) {
    console.error('Failed to parse critique response:', text);
    return {
      approved: false,
      violations: ['Failed to parse critique LLM response'],
      feedback: 'Internal error during validation',
      revisedSuggestion: null,
    };
  }
}

/**
 * Run the full suggestion pipeline: generate then critique
 */
export async function generateAndValidateSuggestions(
  buttons: ButtonAnalytics[],
  existingButtonStyles: string[]
): Promise<{
  approved: Array<ButtonSuggestion & { critiqueFeedback: string }>;
  rejected: Array<{
    original: ButtonSuggestion;
    violations: string[];
    feedback: string;
    revised: ButtonSuggestion | null;
  }>;
}> {
  // Step 1: Generate suggestions
  const generatorResponse = await generateButtonSuggestions(buttons);

  if (generatorResponse.errors?.length) {
    console.error('Generator errors:', generatorResponse.errors);
  }

  const approved: Array<ButtonSuggestion & { critiqueFeedback: string }> = [];
  const rejected: Array<{
    original: ButtonSuggestion;
    violations: string[];
    feedback: string;
    revised: ButtonSuggestion | null;
  }> = [];

  // Step 2: Critique each suggestion
  for (const suggestion of generatorResponse.suggestions) {
    const critiqueResult = await critiqueButtonSuggestion(
      suggestion,
      existingButtonStyles
    );

    if (critiqueResult.approved) {
      approved.push({
        ...suggestion,
        critiqueFeedback: critiqueResult.feedback,
      });
    } else {
      // If critique provided a revised suggestion, create a full ButtonSuggestion
      let revisedSuggestion: ButtonSuggestion | null = null;
      if (critiqueResult.revisedSuggestion) {
        revisedSuggestion = {
          ctaId: suggestion.ctaId,
          suggestedText: critiqueResult.revisedSuggestion.suggestedText,
          suggestedStyles: critiqueResult.revisedSuggestion.suggestedStyles,
          reasoning: `${suggestion.reasoning} [Revised by critic: ${critiqueResult.feedback}]`,
          priority: suggestion.priority,
          expectedImpact: suggestion.expectedImpact,
        };
      }

      rejected.push({
        original: suggestion,
        violations: critiqueResult.violations,
        feedback: critiqueResult.feedback,
        revised: revisedSuggestion,
      });
    }
  }

  return { approved, rejected };
}
