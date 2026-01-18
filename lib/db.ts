/**
 * Database utilities for JSON file persistence
 * Hackathon-friendly storage as specified in blip-ship architecture
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { AnalyticsEvent } from '../types/events';
import type { SiteConfig, UIIssue } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const ISSUES_FILE = path.join(DATA_DIR, 'ui-issues.json');

/**
 * Ensure the data directory exists
 */
async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/**
 * Read all events from the events.json file
 */
export async function readEvents(): Promise<AnalyticsEvent[]> {
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Write events to the events.json file
 */
export async function writeEvents(events: AnalyticsEvent[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
}

/**
 * Append new events to the existing events file
 */
export async function appendEvents(newEvents: AnalyticsEvent[]): Promise<void> {
  const existingEvents = await readEvents();
  await writeEvents([...existingEvents, ...newEvents]);
}

/**
 * Get events for a specific session
 */
export async function getSessionEvents(sessionId: string): Promise<AnalyticsEvent[]> {
  const events = await readEvents();
  return events.filter(e => e.sessionId === sessionId);
}

/**
 * Get all events for a specific CTA
 */
export async function getCTAEvents(ctaId: string): Promise<AnalyticsEvent[]> {
  const events = await readEvents();
  return events.filter(e => e.ctaId === ctaId);
}

/**
 * Get events within a time range
 */
export async function getEventsInRange(
  startTime: number,
  endTime: number
): Promise<AnalyticsEvent[]> {
  const events = await readEvents();
  return events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
}

/**
 * Get events by type
 */
export async function getEventsByType(type: string): Promise<AnalyticsEvent[]> {
  const events = await readEvents();
  return events.filter(e => e.type === type);
}

/**
 * Get unique session IDs
 */
export async function getUniqueSessions(): Promise<string[]> {
  const events = await readEvents();
  const sessionIds = new Set(events.map(e => e.sessionId));
  return Array.from(sessionIds);
}

/**
 * Clear all events (useful for testing)
 */
export async function clearEvents(): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(EVENTS_FILE, '[]');
}

/**
 * Get site configuration for a given mode
 */
export async function getConfig(mode: 'live' | 'preview'): Promise<SiteConfig> {
  // Validate mode to prevent path traversal
  if (mode !== 'live' && mode !== 'preview') {
    throw new Error('Invalid config mode. Must be "live" or "preview".');
  }

  const filePath = path.join(DATA_DIR, `config-${mode}.json`);

  // Verify the resolved path is within DATA_DIR to prevent path traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedDataDir = path.resolve(DATA_DIR);
  if (!resolvedPath.startsWith(resolvedDataDir)) {
    throw new Error('Path traversal detected');
  }

  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Save site configuration for a given mode
 */
export async function saveConfig(mode: 'live' | 'preview', config: SiteConfig): Promise<void> {
  // Validate mode to prevent path traversal
  if (mode !== 'live' && mode !== 'preview') {
    throw new Error('Invalid config mode. Must be "live" or "preview".');
  }

  const filePath = path.join(DATA_DIR, `config-${mode}.json`);

  // Verify the resolved path is within DATA_DIR to prevent path traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedDataDir = path.resolve(DATA_DIR);
  if (!resolvedPath.startsWith(resolvedDataDir)) {
    throw new Error('Path traversal detected');
  }

  await fs.writeFile(filePath, JSON.stringify(config, null, 2));
}

// ============ UI Issues Storage ============

/**
 * Read all UI issues from storage
 */
export async function readUIIssues(): Promise<UIIssue[]> {
  try {
    const data = await fs.readFile(ISSUES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Write UI issues to storage
 */
export async function writeUIIssues(issues: UIIssue[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(ISSUES_FILE, JSON.stringify(issues, null, 2));
}

/**
 * Add or update a UI issue
 */
export async function upsertUIIssue(issue: UIIssue): Promise<void> {
  const issues = await readUIIssues();
  const existingIndex = issues.findIndex(i => i.id === issue.id);

  if (existingIndex >= 0) {
    issues[existingIndex] = issue;
  } else {
    issues.push(issue);
  }

  await writeUIIssues(issues);
}

/**
 * Get a single UI issue by ID
 */
export async function getUIIssue(id: string): Promise<UIIssue | null> {
  const issues = await readUIIssues();
  return issues.find(i => i.id === id) || null;
}

/**
 * Update issue status
 */
export async function updateIssueStatus(
  id: string,
  status: UIIssue['status'],
  metadata?: Partial<UIIssue>
): Promise<UIIssue | null> {
  const issues = await readUIIssues();
  const issue = issues.find(i => i.id === id);

  if (!issue) return null;

  issue.status = status;
  if (metadata) {
    Object.assign(issue, metadata);
  }

  await writeUIIssues(issues);
  return issue;
}

/**
 * Get issues by status
 */
export async function getIssuesByStatus(status: UIIssue['status']): Promise<UIIssue[]> {
  const issues = await readUIIssues();
  return issues.filter(i => i.status === status);
}

/**
 * Clear old/resolved issues (cleanup)
 */
export async function clearResolvedIssues(olderThanDays: number = 30): Promise<number> {
  const issues = await readUIIssues();
  const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

  const filtered = issues.filter(i =>
    i.status !== 'approved' && i.status !== 'ignored' ||
    (i.approvedAt && i.approvedAt > cutoff) ||
    (i.ignoredAt && i.ignoredAt > cutoff)
  );

  const removed = issues.length - filtered.length;
  await writeUIIssues(filtered);
  return removed;
}
