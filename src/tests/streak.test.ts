/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { streakService } from '../services/streakService';
import { verificationCommitService } from '../services/verificationCommitService';

// Mock localStorage in Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: store.size,
  } as Storage;
}

// Mock window event listener in Node environment
if (typeof globalThis.window === 'undefined') {
  const eventListeners: Record<string, Function[]> = {};
  (globalThis as any).window = {
    addEventListener: (event: string, cb: Function) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(cb);
    },
    removeEventListener: (event: string, cb: Function) => {
      if (!eventListeners[event]) return;
      eventListeners[event] = eventListeners[event].filter((f) => f !== cb);
    },
    dispatchEvent: (evt: any) => {
      const type = evt?.type;
      if (type && eventListeners[type]) {
        eventListeners[type].forEach((cb) => cb(evt));
      }
      return true;
    },
  };
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params?: { detail?: any }) {
      this.type = type;
      this.detail = params?.detail;
    }
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('======================================================');
  console.log('FITTRACK STREAK SYNCHRONIZATION TEST SUITE');
  console.log('======================================================');

  // Test 1: Aarav baseline streak initialization
  const aaravStreak = streakService.getStreak('usr_aarav_01');
  assert(aaravStreak.currentStreak === 7, 'Aarav initial baseline streak is 7 days');
  assert(aaravStreak.longestStreak === 19, 'Aarav initial longest streak is 19 days');
  assert(aaravStreak.hasActiveStreak === true, 'Aarav has active streak flag set to true');

  // Test 2: Normalized ID aliases share the same streak
  const aliasStreak = streakService.getStreak('demo-usr_aarav_01');
  assert(aliasStreak.currentStreak === 7, 'demo-usr_aarav_01 shares the normalized streak');

  // Test 3: New user starts with 0 streak
  const newUserId = `usr_test_${Date.now()}`;
  const newUserStreak = streakService.getStreak(newUserId);
  assert(newUserStreak.currentStreak === 0, 'New user starts with 0 streak');
  assert(newUserStreak.hasActiveStreak === false, 'New user has hasActiveStreak = false');

  // Test 4: Recording workout today increments Aarav streak to 8
  let streakEventDispatched: boolean = false;
  let receivedStreakInEvent: number = 0;
  window.addEventListener('fittrack_streak_updated', (e: any) => {
    streakEventDispatched = true;
    receivedStreakInEvent = e?.detail?.currentStreak;
  });

  const updatedAarav = await streakService.recordActivity('usr_aarav_01');
  assert(updatedAarav.currentStreak === 8, 'Recording workout today increments Aarav streak from 7 to 8');
  assert(updatedAarav.hasActiveStreak === true, 'Active streak status maintained');
  assert(Boolean(streakEventDispatched), 'fittrack_streak_updated event dispatched');
  assert(receivedStreakInEvent === 8, 'Event payload contains updated streak of 8');

  // Test 5: Same-day workout idempotency (multiple sessions on same day do not inflate streak)
  const repeatToday = await streakService.recordActivity('usr_aarav_01');
  assert(repeatToday.currentStreak === 8, 'Subsequent activity on the same day maintains streak at 8 (idempotent)');

  // Test 6: Longest streak updates when current streak exceeds historical high
  streakService.boostStreak('usr_aarav_01', 25);
  const boosted = streakService.getStreak('usr_aarav_01');
  assert(boosted.currentStreak === 25, 'Boosted streak sets current streak to 25');
  assert(boosted.longestStreak >= 25, 'Longest streak automatically increases to match new high (>=25)');

  // Test 7: Verification commit automatically records activity and maintains streak
  const commitSessionId = `test_streak_commit_${Date.now()}`;
  const commitRes = await verificationCommitService.commitVerificationSession({
    verificationSessionId: commitSessionId,
    challengeId: 'ch-squat-10k',
    activity: 'SQUATS',
    verificationMethod: 'AI_VERIFIED',
    measuredValue: 30,
    durationSeconds: 60,
    userId: 'usr_aarav_01',
  });

  assert(commitRes.success === true, 'Verification session commit succeeds');
  const postCommitStreak = streakService.getStreak('usr_aarav_01');
  assert(postCommitStreak.currentStreak >= 25, 'Streak is preserved and active after verification commit');

  console.log('------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('------------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
