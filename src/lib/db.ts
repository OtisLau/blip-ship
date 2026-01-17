import { promises as fs } from 'fs';
import path from 'path';
import { SiteConfig, AnalyticsEvent, Suggestion } from './types';
import { ProblemAnalysis } from './problemFinder';

const DATA_DIR = path.join(process.cwd(), 'data');

// Config
export async function getConfig(mode: 'live' | 'preview'): Promise<SiteConfig> {
  const filePath = path.join(DATA_DIR, `config-${mode}.json`);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function saveConfig(mode: 'live' | 'preview', config: SiteConfig): Promise<void> {
  const filePath = path.join(DATA_DIR, `config-${mode}.json`);
  await fs.writeFile(filePath, JSON.stringify(config, null, 2));
}

// Events
export async function getEvents(): Promise<AnalyticsEvent[]> {
  const filePath = path.join(DATA_DIR, 'events.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    if (!data.trim()) return [];
    return JSON.parse(data);
  } catch {
    // Return empty array if file doesn't exist or is invalid
    return [];
  }
}

export async function saveEvents(events: AnalyticsEvent[]): Promise<void> {
  const filePath = path.join(DATA_DIR, 'events.json');
  await fs.writeFile(filePath, JSON.stringify(events, null, 2));
}

export async function appendEvents(newEvents: AnalyticsEvent[]): Promise<void> {
  const existing = await getEvents();
  const combined = [...existing, ...newEvents];
  // Keep last 10000 events to avoid file growing too large
  const trimmed = combined.slice(-10000);
  await saveEvents(trimmed);
}

// Suggestions
export async function getSuggestions(): Promise<Suggestion[]> {
  const filePath = path.join(DATA_DIR, 'suggestions.json');
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

export async function saveSuggestions(suggestions: Suggestion[]): Promise<void> {
  const filePath = path.join(DATA_DIR, 'suggestions.json');
  await fs.writeFile(filePath, JSON.stringify(suggestions, null, 2));
}

export async function addSuggestion(suggestion: Suggestion): Promise<void> {
  const existing = await getSuggestions();
  existing.unshift(suggestion);
  await saveSuggestions(existing);
}

export async function updateSuggestion(
  id: string,
  update: Partial<Suggestion>
): Promise<Suggestion | null> {
  const suggestions = await getSuggestions();
  const index = suggestions.findIndex((s) => s.id === id);
  if (index === -1) return null;

  suggestions[index] = { ...suggestions[index], ...update };
  await saveSuggestions(suggestions);
  return suggestions[index];
}

// Problems
export async function getProblems(): Promise<ProblemAnalysis[]> {
  const filePath = path.join(DATA_DIR, 'problems.json');
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return empty array if file doesn't exist
    return [];
  }
}

export async function saveProblems(problems: ProblemAnalysis[]): Promise<void> {
  const filePath = path.join(DATA_DIR, 'problems.json');
  await fs.writeFile(filePath, JSON.stringify(problems, null, 2));
}

export async function addProblemAnalysis(analysis: ProblemAnalysis): Promise<void> {
  const existing = await getProblems();
  existing.unshift(analysis); // Add newest first
  // Keep last 50 analyses to avoid file growing too large
  const trimmed = existing.slice(0, 50);
  await saveProblems(trimmed);
}

export async function getLatestProblems(): Promise<ProblemAnalysis | null> {
  const problems = await getProblems();
  return problems.length > 0 ? problems[0] : null;
}
