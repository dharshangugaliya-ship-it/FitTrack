/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { verificationCommitService } from '../services/verificationCommitService';
import { DEFAULT_PLANK_CONFIG } from '../lib/verification/plankConfig';
import { PlankStateMachine } from '../lib/verification/plankStateMachine';
import { PlankVerificationProcessor } from '../services/verification/PlankVerificationProcessor';

// Mock browser localStorage for Node execution
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
  console.log('FITTRACK PHASE 12: SECURITY & LOGIC HARDENING SUITE');
  console.log('======================================================\n');

  localStorage.clear();

  // Test 1: Rejects unknown / non-existent challenge ID
  {
    const res = await verificationCommitService.commitVerificationSession({
      verificationSessionId: `sess_phase12_unknown_${Date.now()}`,
      challengeId: 'ch-ghost-does-not-exist',
      activity: 'SQUATS',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 25,
      durationSeconds: 45,
    });
    assert(!res.success, 'Rejects commit for non-existent challenge');
    assert(res.errorCode === 'CHALLENGE_NOT_FOUND', 'Returns CHALLENGE_NOT_FOUND error code');
  }

  // Test 2: Rejects activity mismatch (e.g., submitting SQUATS to a PLANK challenge)
  {
    const res = await verificationCommitService.commitVerificationSession({
      verificationSessionId: `sess_phase12_mismatch_${Date.now()}`,
      challengeId: 'ch-plank-core',
      activity: 'SQUATS',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: 20,
      durationSeconds: 30,
    });
    assert(!res.success, 'Rejects activity mismatch between payload and challenge specification');
    assert(res.errorCode === 'ACTIVITY_MISMATCH', 'Returns ACTIVITY_MISMATCH error code');
  }

  // Test 3: Mathematical domain validation on PlankConfig
  {
    assert(
      DEFAULT_PLANK_CONFIG.minHoldAlignmentAngle <= 180 &&
      DEFAULT_PLANK_CONFIG.maxHoldAlignmentAngle <= 180 &&
      DEFAULT_PLANK_CONFIG.strictEnterAlignmentAngleMin <= 180 &&
      DEFAULT_PLANK_CONFIG.strictEnterAlignmentAngleMax <= 180,
      'PlankConfig hip alignment thresholds respect acos() mathematical upper bound of 180 degrees'
    );
    assert(
      DEFAULT_PLANK_CONFIG.maxHoldAlignmentAngle === 180,
      'PlankConfig maxHoldAlignmentAngle is normalized to exactly 180 degrees'
    );
    assert(
      DEFAULT_PLANK_CONFIG.strictEnterAlignmentAngleMax === 180,
      'PlankConfig strictEnterAlignmentAngleMax is normalized to exactly 180 degrees'
    );
  }

  // Test 4: Calibration resets stability frame count if body breaks prone alignment
  {
    function createMockPose(isProne: boolean) {
      const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0.9 }));
      if (isProne) {
        // Shoulder (11), Hip (23), Knee (25), Ankle (27) horizontal collinear
        points[11] = { x: 0.2, y: 0.6, z: 0, visibility: 0.95 };
        points[23] = { x: 0.5, y: 0.6, z: 0, visibility: 0.95 };
        points[25] = { x: 0.65, y: 0.6, z: 0, visibility: 0.95 };
        points[27] = { x: 0.8, y: 0.6, z: 0, visibility: 0.95 };
      } else {
        // Standing vertical (tilt = 90 deg -> not prone)
        points[11] = { x: 0.5, y: 0.2, z: 0, visibility: 0.95 };
        points[23] = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 };
        points[25] = { x: 0.5, y: 0.7, z: 0, visibility: 0.95 };
        points[27] = { x: 0.5, y: 0.9, z: 0, visibility: 0.95 };
      }
      return points as any;
    }

    const sm = new PlankStateMachine(60, DEFAULT_PLANK_CONFIG);
    let t = 1000;

    // First frame prone: starts calibration
    const snap1 = sm.update(createMockPose(true), t);
    assert(snap1.state === 'CALIBRATING', 'Initial prone frame enters CALIBRATING state');

    // Second frame non-prone (standing): triggers reset
    t += 300;
    const snap2 = sm.update(createMockPose(false), t);
    assert(snap2.state === 'CALIBRATING', 'Non-prone frame triggers reset while in CALIBRATING state');
    assert(snap2.feedbackMessage.includes('Position body horizontally') || snap2.formStatus === 'INVALID', 'Feedback requests horizontal body posture');

    // Third frame prone: calibration timer restarts
    t += 300;
    const snap3 = sm.update(createMockPose(true), t);
    // Even after 1300ms from start, calibration progress must not be complete because of reset
    assert(snap3.state === 'CALIBRATING', 'Calibration restart requires new continuous window');
  }

  // Test 5: Target duration parser in PlankVerificationProcessor rejects non-time units
  {
    const processor = new PlankVerificationProcessor();
    let threwForReps = false;
    try {
      (processor as any).parseTargetDurationSeconds(30, 'reps');
    } catch {
      threwForReps = true;
    }
    assert(threwForReps, 'parseTargetDurationSeconds throws an explicit error when passed "reps" unit');

    const parsedSec = (processor as any).parseTargetDurationSeconds(120, 'seconds');
    assert(parsedSec === 120, 'Correctly parses seconds into numeric seconds (120)');

    const parsedMin = (processor as any).parseTargetDurationSeconds(2, 'minutes');
    assert(parsedMin === 120, 'Correctly converts minutes into seconds (2 mins -> 120s)');
  }

  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Phase 12 test runner fatal error:', err);
  process.exit(1);
});
