/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_SQUAT_CONFIG, SquatConfig } from './squatConfig';
import { LandmarkValidation } from './squatGeometry';
import { PoseQualityAssessment } from './poseQuality';

export type SquatPhase =
  | 'NOT_STARTED'
  | 'CALIBRATING'
  | 'CALIBRATION_FAILED'
  | 'STANDING'
  | 'DESCENDING'
  | 'BOTTOM'
  | 'ASCENDING';

export interface SquatRepRecord {
  repNumber: number;
  durationMs: number;
  minKneeAngle: number;
  timestamp: number;
  quality: string;
}

export interface SquatMachineState {
  phase: SquatPhase;
  verifiedReps: number;
  currentKneeAngle: number;
  smoothedKneeAngle: number;
  lowestAngleInCurrentRep: number;
  repStartTime: number;
  bottomStartTime: number;
  calibrationProgress: number; // 0.0 - 1.0
  lastRepRecord: SquatRepRecord | null;
  feedbackMessage: string;
  partialRepNotice: string | null;
}

/**
 * Deterministic Squat State Machine.
 *
 * Implements strict cycle:
 * STANDING -> DESCENDING -> BOTTOM -> ASCENDING -> STANDING
 *
 * Guarantees:
 * 1. Zero reps awarded for incomplete descents or partial ascents.
 * 2. Complete hysteresis separation between descending and standing lockout thresholds.
 * 3. Temporal minimum & maximum rep duration bounds.
 * 4. Standing calibration requirement before rep 1.
 * 5. Safe outlier rejection and temporal exponential moving average (EMA) smoothing.
 */
export class SquatStateMachine {
  private config: SquatConfig;

  private phase: SquatPhase = 'NOT_STARTED';
  private verifiedReps: number = 0;
  private currentKneeAngle: number = 0;
  private smoothedKneeAngle: number = 0;
  private lowestAngleInCurrentRep: number = 180;

  // Calibration state
  private calibrationStartTime: number = 0;
  private calibrationSamples: number[] = [];

  // Rep cycle tracking
  private repStartTime: number = 0;
  private bottomStartTime: number = 0;
  private lastRepEndTime: number = 0;
  private lastRepRecord: SquatRepRecord | null = null;
  private feedbackMessage: string = 'Position yourself in full-body view to begin.';
  private partialRepNotice: string | null = null;

  constructor(customConfig?: Partial<SquatConfig>) {
    this.config = { ...DEFAULT_SQUAT_CONFIG, ...(customConfig || {}) };
  }

  public reset(): void {
    this.phase = 'NOT_STARTED';
    this.verifiedReps = 0;
    this.currentKneeAngle = 0;
    this.smoothedKneeAngle = 0;
    this.lowestAngleInCurrentRep = 180;
    this.calibrationStartTime = 0;
    this.calibrationSamples = [];
    this.repStartTime = 0;
    this.bottomStartTime = 0;
    this.lastRepEndTime = 0;
    this.lastRepRecord = null;
    this.feedbackMessage = 'Chamber ready. Calibrating standing posture...';
    this.partialRepNotice = null;
  }

  public getState(): SquatMachineState {
    const calProgress =
      this.phase === 'CALIBRATING' && this.calibrationStartTime > 0
        ? Math.min(1.0, (Date.now() - this.calibrationStartTime) / this.config.calibrationDurationMs)
        : this.phase === 'NOT_STARTED'
        ? 0
        : 1.0;

    return {
      phase: this.phase,
      verifiedReps: this.verifiedReps,
      currentKneeAngle: Math.round(this.currentKneeAngle),
      smoothedKneeAngle: Math.round(this.smoothedKneeAngle),
      lowestAngleInCurrentRep: Math.round(this.lowestAngleInCurrentRep),
      repStartTime: this.repStartTime,
      bottomStartTime: this.bottomStartTime,
      calibrationProgress: Math.round(calProgress * 100) / 100,
      lastRepRecord: this.lastRepRecord,
      feedbackMessage: this.feedbackMessage,
      partialRepNotice: this.partialRepNotice,
    };
  }

  /**
   * Processes a single frame's raw knee angle and pose assessment.
   * Pure and deterministic. Can be unit-tested without video hardware.
   */
  public update(
    rawAngle: number,
    validation: LandmarkValidation,
    quality: PoseQualityAssessment,
    timestampMs: number = Date.now()
  ): SquatMachineState {
    // 1. Guard against poor pose or missing landmarks
    if (!validation.isValid || quality.level === 'NO_POSE') {
      this.feedbackMessage = quality.userInstruction;
      return this.getState();
    }

    // 2. Outlier rejection: Discard physiologically impossible jumps per frame
    if (this.smoothedKneeAngle > 0) {
      const delta = Math.abs(rawAngle - this.smoothedKneeAngle);
      if (delta > this.config.maxPlausibleAngleDeltaDeg) {
        // Reject sudden noise spike
        return this.getState();
      }
    }

    // 3. Temporal EMA Smoothing
    if (this.smoothedKneeAngle === 0) {
      this.smoothedKneeAngle = rawAngle;
    } else {
      this.smoothedKneeAngle =
        this.config.smoothingAlpha * rawAngle +
        (1 - this.config.smoothingAlpha) * this.smoothedKneeAngle;
    }
    this.currentKneeAngle = rawAngle;
    const angle = this.smoothedKneeAngle;

    // 4. State Machine Transition Logic
    switch (this.phase) {
      case 'NOT_STARTED':
      case 'CALIBRATING':
        this.handleCalibration(angle, quality, timestampMs);
        break;

      case 'CALIBRATION_FAILED':
        // Check if user has resumed stable standing posture to retry calibration
        if (angle >= this.config.standingKneeAngleMin && quality.level !== 'POOR') {
          this.phase = 'CALIBRATING';
          this.calibrationStartTime = timestampMs;
          this.calibrationSamples = [angle];
          this.feedbackMessage = 'Recalibrating standing posture. Hold still...';
        }
        break;

      case 'STANDING':
        this.partialRepNotice = null;
        // Check transition to DESCENDING: knees flex past descending threshold
        if (angle < this.config.descendingAngleThreshold) {
          // Check debounce cooldown since last rep completion
          if (timestampMs - this.lastRepEndTime >= 300) {
            this.phase = 'DESCENDING';
            this.repStartTime = timestampMs;
            this.lowestAngleInCurrentRep = angle;
            this.feedbackMessage = 'Descending. Squat down to parallel depth.';
          }
        } else {
          this.feedbackMessage = 'Ready. Begin downward squat.';
        }
        break;

      case 'DESCENDING':
        if (angle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = angle;
        }

        // Check if depth reached
        if (angle <= this.config.bottomAngleThreshold) {
          this.phase = 'BOTTOM';
          this.bottomStartTime = timestampMs;
          this.feedbackMessage = 'Depth reached! Drive back up.';
        } else if (angle > this.config.standingKneeAngleMin - 5) {
          // User reversed without reaching bottom (Quarter/incomplete squat)
          this.phase = 'STANDING';
          this.partialRepNotice = 'Incomplete squat — depth was not reached.';
          this.feedbackMessage = 'Incomplete rep: Squat deeper to achieve parallel.';
        } else {
          // Check rep timeout
          if (timestampMs - this.repStartTime > this.config.maxRepDurationMs) {
            this.phase = 'STANDING';
            this.partialRepNotice = 'Rep timed out (movement too slow or paused).';
            this.feedbackMessage = 'Rep timed out. Return to standing.';
          }
        }
        break;

      case 'BOTTOM':
        if (angle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = angle;
        }

        // Transition to ASCENDING once knees begin extending past ascending threshold
        if (angle > this.config.ascendingAngleThreshold) {
          // Verify minimal inflection time at bottom
          if (timestampMs - this.bottomStartTime >= this.config.minBottomDurationMs) {
            this.phase = 'ASCENDING';
            this.feedbackMessage = 'Ascending. Stand all the way up to lockout.';
          }
        }
        break;

      case 'ASCENDING':
        // Check transition to STANDING (Full cycle complete!)
        if (angle >= this.config.standingReturnThreshold) {
          const duration = timestampMs - this.repStartTime;

          // Validate minimum duration
          if (duration >= this.config.minRepDurationMs && duration <= this.config.maxRepDurationMs) {
            this.verifiedReps += 1;
            this.lastRepEndTime = timestampMs;
            this.lastRepRecord = {
              repNumber: this.verifiedReps,
              durationMs: duration,
              minKneeAngle: Math.round(this.lowestAngleInCurrentRep),
              timestamp: timestampMs,
              quality: quality.level,
            };
            this.feedbackMessage = `Rep ${this.verifiedReps} Verified! (${Math.round(this.lowestAngleInCurrentRep)}° depth)`;
          } else {
            this.partialRepNotice = 'Rep too fast / bouncing. Maintain controlled tempo.';
            this.feedbackMessage = 'Movement too fast. Control descent and ascent.';
          }

          this.phase = 'STANDING';
        } else if (angle < this.config.ascendingAngleThreshold - 10) {
          // User reversed direction back downwards mid-ascent
          this.phase = 'DESCENDING';
          this.feedbackMessage = 'Descending again. Push all the way up to standing.';
        } else {
          // Check rep timeout
          if (timestampMs - this.repStartTime > this.config.maxRepDurationMs) {
            this.phase = 'STANDING';
            this.partialRepNotice = 'Rep aborted — took too long to complete.';
            this.feedbackMessage = 'Rep timed out. Return to standing posture.';
          }
        }
        break;
    }

    return this.getState();
  }

  /**
   * Manages standing posture calibration.
   */
  private handleCalibration(angle: number, quality: PoseQualityAssessment, timestampMs: number): void {
    if (this.phase === 'NOT_STARTED') {
      this.phase = 'CALIBRATING';
      this.calibrationStartTime = timestampMs;
      this.calibrationSamples = [angle];
      this.feedbackMessage = 'Calibrating standing posture. Stand upright...';
      return;
    }

    // Check if user is standing upright
    if (angle < this.config.standingKneeAngleMin - 15) {
      this.feedbackMessage = 'Stand upright with straight legs to calibrate.';
      this.calibrationStartTime = timestampMs; // Reset timer
      this.calibrationSamples = [];
      return;
    }

    this.calibrationSamples.push(angle);

    const elapsed = timestampMs - this.calibrationStartTime;
    if (elapsed >= this.config.calibrationDurationMs) {
      // Check stability of calibration samples
      const minSample = Math.min(...this.calibrationSamples);
      const maxSample = Math.max(...this.calibrationSamples);

      if (maxSample - minSample <= this.config.calibrationAngleToleranceDeg) {
        this.phase = 'STANDING';
        this.feedbackMessage = 'Calibration complete! Begin squats.';
      } else {
        this.phase = 'CALIBRATION_FAILED';
        this.feedbackMessage = 'Calibration unstable. Hold still in standing position.';
      }
    } else {
      const remainingSecs = Math.ceil((this.config.calibrationDurationMs - elapsed) / 1000);
      this.feedbackMessage = `Calibrating standing posture (${remainingSecs}s)... Stand still.`;
    }
  }
}
