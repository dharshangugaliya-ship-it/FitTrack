/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pointsService } from './pointsService';
import { MOCK_USER, MOCK_ORGANIZER_USER } from '../data/mockData';

export interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null; // 'YYYY-MM-DD'
  activeDates: string[]; // sorted ascending 'YYYY-MM-DD'
  hasActiveStreak: boolean;
  totalActiveDays: number;
  updatedAt: string;
}

const STORAGE_PREFIX = 'fittrack_user_streak_v2_';

function getFormattedDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return getFormattedDate(date);
}

function normalizeUserId(id?: string): string {
  if (!id) return 'usr_aarav_01';
  if (id.startsWith('demo-')) return id.replace('demo-', '');
  return id;
}

/**
 * Calculates current streak and longest streak from an array of unique active dates.
 * A streak is active if the latest activity was today OR yesterday.
 */
function calculateStreakFromDates(
  dates: string[],
  baselineLongest: number = 0
): { currentStreak: number; longestStreak: number; hasActiveStreak: boolean } {
  if (!dates || dates.length === 0) {
    return { currentStreak: 0, longestStreak: baselineLongest, hasActiveStreak: false };
  }

  const dateSet = new Set(dates);
  const today = getFormattedDate(new Date());
  const yesterday = addDays(today, -1);

  // Determine current streak
  let currentStreak = 0;
  let startAnchor: string | null = null;

  if (dateSet.has(today)) {
    startAnchor = today;
  } else if (dateSet.has(yesterday)) {
    startAnchor = yesterday;
  }

  if (startAnchor) {
    let checkDate = startAnchor;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  }

  // Calculate longest historical run
  const sorted = Array.from(dateSet).sort();
  let maxRun = 0;
  let currentRun = 0;
  let prevDate: string | null = null;

  for (const d of sorted) {
    if (!prevDate) {
      currentRun = 1;
    } else {
      const expectedNext = addDays(prevDate, 1);
      if (d === expectedNext) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }
    prevDate = d;
    if (currentRun > maxRun) {
      maxRun = currentRun;
    }
  }

  const longestStreak = Math.max(baselineLongest, maxRun, currentStreak);
  const hasActiveStreak = currentStreak > 0;

  return { currentStreak, longestStreak, hasActiveStreak };
}

/**
 * Generates an initial seed of consecutive days ending yesterday
 * so that the user starts with the specified baseline streak and
 * their next workout today will increment their streak by 1.
 */
function generateSeedDates(count: number): string[] {
  const dates: string[] = [];
  const today = getFormattedDate(new Date());
  // End yesterday so that working out today increments count to count + 1
  for (let i = 1; i <= count; i++) {
    dates.push(addDays(today, -i));
  }
  return dates.sort();
}

export const streakService = {
  /**
   * Broadcast streak update across the application
   */
  notifyStreakUpdated(streakData?: StreakData): void {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(
        new CustomEvent('fittrack_streak_updated', {
          detail: streakData || null,
        })
      );
    } catch (e) {
      console.warn('Failed to dispatch streak update event:', e);
    }
  },

  /**
   * Synchronously retrieves current streak data for a given user.
   */
  getStreak(userId?: string): StreakData {
    const normId = normalizeUserId(userId);
    const storageKey = `${STORAGE_PREFIX}${normId}`;

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as StreakData;
          // Re-evaluate against today's date
          const calc = calculateStreakFromDates(parsed.activeDates, parsed.longestStreak);
          const updated: StreakData = {
            ...parsed,
            currentStreak: calc.currentStreak,
            longestStreak: calc.longestStreak,
            hasActiveStreak: calc.hasActiveStreak,
            totalActiveDays: parsed.activeDates.length,
          };
          return updated;
        }
      } catch (err) {
        console.warn('Error reading streak from localStorage:', err);
      }
    }

    // Default Seed state for standard personas
    let initialStreak = 0;
    let baselineLongest = 0;
    let seedDates: string[] = [];

    if (normId === 'usr_aarav_01') {
      initialStreak = MOCK_USER.currentStreak || 7;
      baselineLongest = MOCK_USER.longestStreak || 19;
      seedDates = generateSeedDates(initialStreak);
    } else if (normId === 'org_priya_01') {
      initialStreak = MOCK_ORGANIZER_USER.currentStreak || 14;
      baselineLongest = MOCK_ORGANIZER_USER.longestStreak || 45;
      seedDates = generateSeedDates(initialStreak);
    }

    const today = getFormattedDate(new Date());
    const yesterday = addDays(today, -1);
    const lastActivityDate = seedDates.length > 0 ? yesterday : null;

    const initialData: StreakData = {
      userId: normId,
      currentStreak: initialStreak,
      longestStreak: baselineLongest,
      lastActivityDate,
      activeDates: seedDates,
      hasActiveStreak: initialStreak > 0,
      totalActiveDays: seedDates.length,
      updatedAt: new Date().toISOString(),
    };

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(initialData));
      } catch (e) {
        console.warn('Failed saving initial streak seed:', e);
      }
    }

    return initialData;
  },

  /**
   * Records a workout or physical activity completed today (or at a given date).
   * Atomically updates streak, longest streak, stores to localStorage,
   * broadcasts events, and triggers streak bonus rules if applicable.
   */
  async recordActivity(
    userId?: string,
    activityDate?: string
  ): Promise<StreakData> {
    const normId = normalizeUserId(userId);
    const storageKey = `${STORAGE_PREFIX}${normId}`;
    const dateToRecord = activityDate || getFormattedDate(new Date());

    const currentData = this.getStreak(normId);
    const dateSet = new Set(currentData.activeDates);

    const isNewDay = !dateSet.has(dateToRecord);
    dateSet.add(dateToRecord);

    const sortedDates = Array.from(dateSet).sort();
    const baselineLongest = currentData.longestStreak || (normId === 'usr_aarav_01' ? 19 : 0);
    const calc = calculateStreakFromDates(sortedDates, baselineLongest);

    const updatedData: StreakData = {
      userId: normId,
      currentStreak: calc.currentStreak,
      longestStreak: calc.longestStreak,
      lastActivityDate: dateToRecord,
      activeDates: sortedDates,
      hasActiveStreak: calc.hasActiveStreak,
      totalActiveDays: sortedDates.length,
      updatedAt: new Date().toISOString(),
    };

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedData));
      } catch (err) {
        console.warn('Failed saving updated streak data:', err);
      }
    }

    // Check if 7-Day Streak milestone rule applies
    if (updatedData.currentStreak >= 7) {
      try {
        await pointsService.record7DayStreakPointEvent(normId, `streak_${updatedData.currentStreak}`);
      } catch (e) {
        console.warn('Note evaluating streak point event:', e);
      }
    }

    // Broadcast streak update across listeners
    this.notifyStreakUpdated(updatedData);
    pointsService.notifyPointsUpdated();

    return updatedData;
  },

  /**
   * Sets or boosts a streak to a target count (e.g. for testing reward rules).
   */
  boostStreak(userId: string | undefined, targetDays: number): StreakData {
    const normId = normalizeUserId(userId);
    const storageKey = `${STORAGE_PREFIX}${normId}`;
    const today = getFormattedDate(new Date());
    const seed = targetDays > 1 ? generateSeedDates(targetDays - 1) : [];
    if (targetDays >= 1) {
      seed.push(today);
    }
    const sorted = Array.from(new Set(seed)).sort();

    const baselineLongest = Math.max(targetDays, normId === 'usr_aarav_01' ? 19 : 0);
    const calc = calculateStreakFromDates(sorted, baselineLongest);

    const updated: StreakData = {
      userId: normId,
      currentStreak: calc.currentStreak,
      longestStreak: calc.longestStreak,
      lastActivityDate: today,
      activeDates: sorted,
      hasActiveStreak: true,
      totalActiveDays: sorted.length,
      updatedAt: new Date().toISOString(),
    };

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed saving boosted streak:', e);
      }
    }

    this.notifyStreakUpdated(updated);
    pointsService.notifyPointsUpdated();

    return updated;
  },
};
