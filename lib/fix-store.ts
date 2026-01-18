/**
 * Fix Store - In-memory storage with file persistence for POC
 *
 * Stores fix data including:
 * - Suggestions
 * - Minimal fixes
 * - PR info
 * - Status
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Suggestion } from './types';
import type { MinimalFix } from './fix-agent';
import type { PRInfo } from './git-service';

export interface StoredFix {
  id: string;
  suggestion: Suggestion;
  fix: MinimalFix;
  prInfo?: PRInfo;
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  createdAt: number;
  updatedAt: number;
}

const FIXES_FILE = path.join(process.cwd(), 'data', 'fixes.json');

// In-memory cache with timestamp for invalidation
let fixesCache: Map<string, StoredFix> = new Map();
let cacheTimestamp = 0;

/**
 * Initialize the store by loading from file
 * Always reloads if file is newer than cache
 */
async function initStore(): Promise<void> {
  try {
    const stats = await fs.stat(FIXES_FILE);
    const fileModTime = stats.mtimeMs;

    // Reload if file is newer than our cache
    if (fileModTime > cacheTimestamp) {
      const data = await fs.readFile(FIXES_FILE, 'utf-8');
      const fixes: StoredFix[] = JSON.parse(data);
      fixesCache = new Map(fixes.map((f) => [f.id, f]));
      cacheTimestamp = Date.now();
    }
  } catch {
    // File doesn't exist yet, that's ok
    if (fixesCache.size === 0) {
      fixesCache = new Map();
    }
  }
}

/**
 * Persist the store to file
 */
async function persistStore(): Promise<void> {
  const fixes = Array.from(fixesCache.values());
  await fs.writeFile(FIXES_FILE, JSON.stringify(fixes, null, 2));
  cacheTimestamp = Date.now(); // Update cache timestamp after write
}

/**
 * Save a new fix
 */
export async function saveFix(
  suggestion: Suggestion,
  fix: MinimalFix,
  prInfo?: PRInfo
): Promise<StoredFix> {
  await initStore();

  const storedFix: StoredFix = {
    id: suggestion.id,
    suggestion,
    fix,
    prInfo,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  fixesCache.set(storedFix.id, storedFix);
  await persistStore();

  return storedFix;
}

/**
 * Get a fix by ID
 */
export async function getFix(id: string): Promise<StoredFix | undefined> {
  await initStore();
  return fixesCache.get(id);
}

/**
 * Update fix status
 */
export async function updateFixStatus(
  id: string,
  status: StoredFix['status'],
  prInfo?: PRInfo
): Promise<StoredFix | undefined> {
  await initStore();

  const fix = fixesCache.get(id);
  if (!fix) return undefined;

  fix.status = status;
  fix.updatedAt = Date.now();
  if (prInfo) {
    fix.prInfo = prInfo;
  }

  fixesCache.set(id, fix);
  await persistStore();

  return fix;
}

/**
 * Get all fixes
 */
export async function getAllFixes(): Promise<StoredFix[]> {
  await initStore();
  return Array.from(fixesCache.values());
}

/**
 * Get pending fixes
 */
export async function getPendingFixes(): Promise<StoredFix[]> {
  await initStore();
  return Array.from(fixesCache.values()).filter((f) => f.status === 'pending');
}

/**
 * Delete a fix
 */
export async function deleteFix(id: string): Promise<boolean> {
  await initStore();

  const existed = fixesCache.has(id);
  fixesCache.delete(id);

  if (existed) {
    await persistStore();
  }

  return existed;
}

/**
 * Clear all fixes (for testing)
 */
export async function clearFixes(): Promise<void> {
  fixesCache = new Map();
  await persistStore();
}
