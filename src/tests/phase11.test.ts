/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { verificationCommitService } from '../services/verificationCommitService';

// Simple mock for browser localStorage in Node environment
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
  console.log('\n======================================================');
  console.log('FITTRACK PHASE 11: AUTHORITATIVE SCORING SUITE');
  console.log('======================================================\n');

  localStorage.clear();

  // Test 1: Empty or missing verification session ID rejected
  {
    const res = await verificationCommitService.commitVerificationSession({
      verificationSessionId: '',
      challengeId: 'ch-squat-10k',
      activity: 'SQUATS',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 15,
      durationSeconds: 30,
    });
    assert(!res.success, 'Rejects empty verification session ID');
    assert(res.errorCode === 'INVALID_SESSION_ID', 'Returns INVALID_SESSION_ID code');
  }

  // Test 2: Missing or invalid measured value (zero or negative) rejected
  {
    const res = await verificationCommitService.commitVerificationSession({
      verificationSessionId: 'sess_zero_val_1',
      challengeId: 'ch-squat-10k',
      activity: 'SQUATS',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 0,
      durationSeconds: 30,
    });
    assert(!res.success, 'Rejects zero measured value');
    assert(res.errorCode === 'INVALID_MEASURED_VALUE', 'Returns INVALID_MEASURED_VALUE code');
  }

  // Test 3: Squat session exceeding reasonable single-session limit (>500 reps) rejected
  {
    const res = await verificationCommitService.commitVerificationSession({
      verificationSessionId: 'sess_excess_squats_1',
      challengeId: 'ch-squat-10k',
      activity: 'SQUATS',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 600,
      durationSeconds: 600,
    });
    assert(!res.success, 'Rejects squat reps above anti-corruption threshold (>500)');
    assert(res.errorCode === 'VALUE_OUT_OF_RANGE', 'Returns VALUE_OUT_OF_RANGE code for squats');
  }

  // Test 4: Plank session exceeding reasonable single-session limit (>1800s) rejected
  {
    const res = await verificationCommitService.commitVerificationSession({
      verificationSessionId: 'sess_excess_plank_1',
      challengeId: 'ch-plank-core',
      activity: 'PLANK',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 2000,
      durationSeconds: 2000,
    });
    assert(!res.success, 'Rejects plank duration above anti-corruption threshold (>1800s)');
    assert(res.errorCode === 'VALUE_OUT_OF_RANGE', 'Returns VALUE_OUT_OF_RANGE code for plank');
  }

  // Test 5: Valid Squat session commit succeeds and updates score & points
  {
    const sessionId = `sess_squat_valid_${Date.now()}`;
    const res = await verificationCommitService.commitVerificationSession({
      verificationSessionId: sessionId,
      challengeId: 'ch-squat-10k',
      activity: 'SQUATS',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 20,
      durationSeconds: 45,
    });
    assert(res.success, 'Valid Squat session commit succeeds');
    assert(res.data?.sessionPoints === 20, 'Awards exactly +20 FITTRACK Points for verified workout session');
    assert(res.data?.challengeScore === res.data?.currentValue, 'Challenge score matches verified cumulative volume');
  }

  // Test 6: Cryptographic Replay Protection - duplicate session ID rejected
  {
    const duplicateSessionId = 'sess_replay_test_99';
    const firstCommit = await verificationCommitService.commitVerificationSession({
      verificationSessionId: duplicateSessionId,
      challengeId: 'ch-squat-10k',
      activity: 'SQUATS',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 10,
      durationSeconds: 30,
    });
    assert(firstCommit.success, 'First commit of session succeeds');

    const secondCommit = await verificationCommitService.commitVerificationSession({
      verificationSessionId: duplicateSessionId,
      challengeId: 'ch-squat-10k',
      activity: 'SQUATS',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 10,
      durationSeconds: 30,
    });
    assert(!secondCommit.success, 'Replay attempt with identical session ID is strictly rejected');
    assert(secondCommit.errorCode === 'DUPLICATE_SESSION', 'Returns DUPLICATE_SESSION code on replay attempt');
  }

  // Test 7: Valid Plank session commit succeeds with duration unit
  {
    const plankSessionId = `sess_plank_valid_${Date.now()}`;
    const res = await verificationCommitService.commitVerificationSession({
      verificationSessionId: plankSessionId,
      challengeId: 'ch-plank-core',
      activity: 'PLANK',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 60,
      durationSeconds: 65,
    });
    assert(res.success, 'Valid Plank session commit succeeds');
    assert(res.data?.activity === 'PLANK', 'Certified activity recorded as PLANK');
    assert(res.data?.sessionPoints === 20, 'Awards +20 points for Plank session');
  }

  // Test 8: Challenge Completion bonus points awarded upon crossing target
  {
    const targetCrossingSessionId = `sess_target_cross_${Date.now()}`;
    const res = await verificationCommitService.commitVerificationSession({
      verificationSessionId: targetCrossingSessionId,
      challengeId: 'ch-plank-core',
      activity: 'PLANK',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 400, // Combined with previous 60 reaches target of 420s
      durationSeconds: 410,
    });
    assert(res.success, 'Session crossing target threshold commits cleanly');
    assert(res.data?.isCompleted === true, 'Challenge marked as completed');
    assert(res.data?.wasNewlyCompleted === true, 'Flagged as wasNewlyCompleted');
    assert(res.data?.completionPoints === 150, 'Awards +150 bonus points upon completion matching challenge pointsReward');
    assert(res.data?.pointsAwarded === 170, 'Total points awarded = 20 session + 150 completion = 170');
  }

  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
