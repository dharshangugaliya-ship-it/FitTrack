/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  VerificationContext,
  VerificationFrameResult,
  VerificationProcessor,
  VerificationResult,
} from '../../types';

/**
 * Standby processor for Phase 8.
 *
 * In Phase 8, the camera pipeline is fully operational (hardware access,
 * permission lifecycle, video rendering, session state machine, resource cleanup),
 * but computer-vision inference (MediaPipe Pose Landmarker) is deferred to Phase 9.
 *
 * This processor satisfies the VerificationProcessor interface without fabricating
 * synthetic AI rep counts or unauthorized scores.
 */
export class Phase8StandbyProcessor implements VerificationProcessor {
  name = 'Phase 8 Standby Camera Pipeline';
  private context: VerificationContext | null = null;
  private startTime: number = 0;

  async initialize(context: VerificationContext): Promise<void> {
    this.context = context;
    this.startTime = Date.now();
  }

  async processFrame(
    _videoElement: HTMLVideoElement,
    _timestampMs: number
  ): Promise<VerificationFrameResult> {
    // In Phase 8, no frame analysis runs.
    return {
      detected: false,
      feedbackMessage: 'Camera pipeline ready. Awaiting supported pose analysis.',
    };
  }

  async finalize(): Promise<VerificationResult> {
    const elapsedSeconds = this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    return {
      verified: false,
      status: 'PROCESSING_UNAVAILABLE',
      activity: this.context?.activity || 'SQUATS',
      challengeId: this.context?.challengeId || '',
      verificationMethod: this.context?.verificationRequirement || 'AI_VERIFIED',
      durationSeconds: elapsedSeconds,
      targetValue: this.context?.targetValue,
      targetUnit: this.context?.targetUnit,
      reason: 'Camera verification pipeline session finished. Verified pose evaluation active for squats and planks.',
      completedAt: new Date().toISOString(),
    };
  }

  reset(): void {
    this.startTime = 0;
  }

  dispose(): void {
    this.context = null;
    this.startTime = 0;
  }
}
