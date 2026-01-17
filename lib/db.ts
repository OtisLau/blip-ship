/**
 * Database utilities for JSON file persistence
 * Hackathon-friendly storage as specified in blip-ship architecture
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { AnalyticsEvent } from '../types/events';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

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
