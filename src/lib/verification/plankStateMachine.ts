/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_PLANK_CONFIG, PlankConfig } from './plankConfig';
import { evaluatePlankPosture, PlankPoseMetrics } from './plankGeometry';
import { Point2D } from './squatGeometry';
import { assessPoseQuality, PoseQualityAssessment } from './poseQuality';

export type PlankState =
  | 'NOT_STARTED'
  | 'CALIBRATING'
  | 'CALIBRATION_FAILED'
  | 'READY'
  | 'HOLDING'
  | 'FORM_WARNING'
  | 'FORM_LOST'
  | 'COMPLETED';

export interface PlankStateSnapshot {
  state: PlankState;
  accumulatedHoldMs: number;
  accumulatedHoldSeconds: number;
  targetSeconds: number;
  progressPercentage: number;
  isTargetReached: boolean;
  rawAlignmentAngle: number;
  smoothedAlignmentAngle: number;
  bodyTiltAngle: number;
  isProne: boolean;
  formStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'WARNING' | 'INVALID' | 'CALIBRATING';
  feedbackMessage: string;
  calibrationProgress: number; // 0.0 - 1.0
  gracePeriodRemainingMs: number;
  preferredSide: string;
}

/**
 * Pure, deterministic state machine for Plank hold verification (Phase 10).
 */
export class PlankStateMachine {
  private config: PlankConfig;
  private state: PlankState = 'NOT_STARTED';

  // Biomechanical telemetry
  private rawAlignmentAngle: number = 180;
  private smoothedAlignmentAngle: number = 180;
  private bodyTiltAngle: number = 0;
  private isProne: boolean = false;
  private feedbackMessage: string = 'Position lateral side to camera in horizontal plank';
  private preferredSide: string = 'none';

  // Target and hold timing
  private targetSeconds: number = 30;
  private accumulatedHoldMs: number = 0;
  private isTargetReached: boolean = false;

  // Timestamps
  private lastTimestampMs: number = 0;
  private calibrationStartTime: number = 0;
  private calibrationSamples: number[] = [];
  private graceStartTime: number = 0;
  private holdSegmentStartTime: number = 0;

  constructor(targetSeconds: number = 30, customConfig?: Partial<PlankConfig>) {
    this.targetSeconds = Math.max(1, targetSeconds);
    this.config = { ...DEFAULT_PLANK_CONFIG, ...customConfig };
  }

  /**
   * Update state machine with incoming frame telemetry.
   */
  public update(
    landmarks: Point2D[] | null | undefined,
    timestampMs: number
  ): PlankStateSnapshot {
    // Monotonic timestamp validation
    if (this.lastTimestampMs === 0) {
      this.lastTimestampMs = timestampMs;
    }

    const dt = Math.max(0, timestampMs - this.lastTimestampMs);
    // Guard against time inflation from suspended tabs
    const boundedDt = Math.min(dt, this.config.maxFrameTimestampDeltaMs);

    // 1. Evaluate landmark quality and framing
    const poseQuality: PoseQualityAssessment = assessPoseQuality(
      landmarks,
      this.config.landmarkVisibilityThreshold
    );

    if (poseQuality.level === 'NO_POSE' || !landmarks) {
      this.handlePoseLoss(timestampMs);
      this.lastTimestampMs = timestampMs;
      return this.getSnapshot();
    }

    // 2. Compute lateral plank biomechanics
    const metrics: PlankPoseMetrics = evaluatePlankPosture(landmarks, this.config);
    this.preferredSide = metrics.preferredSide;

    if (!metrics.isValidPose) {
      this.handlePoseLoss(timestampMs, metrics.formFeedbackMessage);
      this.lastTimestampMs = timestampMs;
      return this.getSnapshot();
    }

    // 3. Smooth alignment angle (EMA)
    this.rawAlignmentAngle = metrics.alignmentAngle;
    this.bodyTiltAngle = metrics.bodyTiltAngle;
    this.isProne = metrics.isProne;

    if (this.smoothedAlignmentAngle === 180) {
      this.smoothedAlignmentAngle = this.rawAlignmentAngle;
    } else {
      this.smoothedAlignmentAngle =
        this.config.smoothingAlpha * this.rawAlignmentAngle +
        (1 - this.config.smoothingAlpha) * this.smoothedAlignmentAngle;
      this.smoothedAlignmentAngle = Math.round(this.smoothedAlignmentAngle * 10) / 10;
    }

    // 4. Drive finite state machine transitions
    switch (this.state) {
      case 'NOT_STARTED': {
        this.state = 'CALIBRATING';
        this.calibrationStartTime = timestampMs;
        this.calibrationSamples = [this.smoothedAlignmentAngle];
        this.feedbackMessage = 'Hold steady in plank position for calibration...';
        break;
      }

      case 'CALIBRATING': {
        this.handleCalibration(timestampMs, metrics);
        break;
      }

      case 'CALIBRATION_FAILED': {
        // Automatically re-attempt calibration once user assumes prone position
        if (this.isProne && Math.abs(180 - this.smoothedAlignmentAngle) < 30) {
          this.state = 'CALIBRATING';
          this.calibrationStartTime = timestampMs;
          this.calibrationSamples = [this.smoothedAlignmentAngle];
          this.feedbackMessage = 'Calibrating plank posture...';
        } else {
          this.feedbackMessage = 'Calibration failed. Assume horizontal plank position.';
        }
        break;
      }

      case 'READY': {
        // Check strict entry thresholds to unlock active hold
        const isStrictlyAligned =
          this.smoothedAlignmentAngle >= this.config.strictEnterAlignmentAngleMin &&
          this.smoothedAlignmentAngle <= this.config.strictEnterAlignmentAngleMax;

        if (this.isProne && isStrictlyAligned) {
          this.state = 'HOLDING';
          this.holdSegmentStartTime = timestampMs;
          this.feedbackMessage = 'Plank hold active — maintain alignment!';
        } else if (!this.isProne) {
          this.feedbackMessage = 'Lower body into horizontal plank position';
        } else {
          this.feedbackMessage = metrics.formFeedbackMessage;
        }
        break;
      }

      case 'HOLDING': {
        // Accumulate valid hold time
        this.accumulatedHoldMs += boundedDt;

        // Check if target reached
        if (this.accumulatedHoldMs >= this.targetSeconds * 1000) {
          this.state = 'COMPLETED';
          this.isTargetReached = true;
          this.feedbackMessage = `Target of ${this.targetSeconds}s achieved! Excellent core resilience.`;
          break;
        }

        // Validate continuous hold form
        const isWithinHoldTolerance =
          this.smoothedAlignmentAngle >= this.config.minHoldAlignmentAngle &&
          this.smoothedAlignmentAngle <= this.config.maxHoldAlignmentAngle;

        if (!this.isProne || !isWithinHoldTolerance) {
          // Enter grace period
          this.state = 'FORM_WARNING';
          this.graceStartTime = timestampMs;
          this.feedbackMessage = `Form warning: ${metrics.formFeedbackMessage}`;
        } else {
          this.feedbackMessage = 'Hold steady — core engaged';
        }
        break;
      }

      case 'FORM_WARNING': {
        // Timer paused during form warning
        const elapsedGrace = timestampMs - this.graceStartTime;
        const graceRemaining = Math.max(0, this.config.gracePeriodMs - elapsedGrace);

        const isRecovered =
          this.isProne &&
          this.smoothedAlignmentAngle >= this.config.strictEnterAlignmentAngleMin - 4 &&
          this.smoothedAlignmentAngle <= Math.min(180.0, this.config.strictEnterAlignmentAngleMax);

        if (isRecovered) {
          // Recovered within grace period
          this.state = 'HOLDING';
          this.feedbackMessage = 'Alignment restored — hold resumed!';
        } else if (elapsedGrace >= this.config.gracePeriodMs) {
          // Grace expired
          this.state = 'FORM_LOST';
          this.feedbackMessage = `Form lost: ${metrics.formFeedbackMessage}. Re-align to resume.`;
        } else {
          this.feedbackMessage = `${metrics.formFeedbackMessage} (${(graceRemaining / 1000).toFixed(1)}s to recover)`;
        }
        break;
      }

      case 'FORM_LOST': {
        // Challenger must re-establish strict alignment to resume
        const isStrictlyAligned =
          this.smoothedAlignmentAngle >= this.config.strictEnterAlignmentAngleMin &&
          this.smoothedAlignmentAngle <= this.config.strictEnterAlignmentAngleMax;

        if (this.isProne && isStrictlyAligned) {
          this.state = 'HOLDING';
          this.holdSegmentStartTime = timestampMs;
          this.feedbackMessage = 'Hold resumed — stay solid!';
        } else if (!this.isProne) {
          this.feedbackMessage = 'Body not horizontal. Get into prone plank.';
        } else {
          this.feedbackMessage = metrics.formFeedbackMessage;
        }
        break;
      }

      case 'COMPLETED': {
        this.feedbackMessage = 'Target reached! AI verification completed.';
        break;
      }
    }

    this.lastTimestampMs = timestampMs;
    return this.getSnapshot();
  }

  /**
   * Handle calibration phase logic.
   * Enforces continuous prone posture and stability across the entire calibration window.
   */
  private handleCalibration(timestampMs: number, metrics: PlankPoseMetrics): void {
    if (!this.isProne) {
      // Reset calibration timer and clear accumulated samples if challenger is not prone
      this.calibrationStartTime = timestampMs;
      this.calibrationSamples = [];
      this.feedbackMessage = 'Position body horizontally on the floor to calibrate';
      return;
    }

    // Also reset if body alignment is severely deformed during calibration
    if (Math.abs(180 - this.smoothedAlignmentAngle) > this.config.hipDeviationTolerance * 2) {
      this.calibrationStartTime = timestampMs;
      this.calibrationSamples = [];
      this.feedbackMessage = 'Align body straight to begin calibration';
      return;
    }

    this.calibrationSamples.push(this.smoothedAlignmentAngle);
    const elapsed = timestampMs - this.calibrationStartTime;

    // Require calibration duration AND at least 5 frames sampled across the window
    if (elapsed >= this.config.calibrationDurationMs && this.calibrationSamples.length >= 5) {
      // Assess stability variance
      const minSample = Math.min(...this.calibrationSamples);
      const maxSample = Math.max(...this.calibrationSamples);
      const variance = maxSample - minSample;

      const isAligned =
        this.smoothedAlignmentAngle >= this.config.minHoldAlignmentAngle &&
        this.smoothedAlignmentAngle <= this.config.maxHoldAlignmentAngle;

      if (variance <= this.config.calibrationStabilityDegrees && isAligned) {
        this.state = 'READY';
        this.feedbackMessage = 'Calibration locked. Ready to hold!';
      } else {
        this.state = 'CALIBRATION_FAILED';
        this.feedbackMessage = 'Calibration unstable. Hold still in plank position.';
      }
    } else {
      const pct = Math.round((elapsed / this.config.calibrationDurationMs) * 100);
      this.feedbackMessage = `Calibrating plank posture... ${Math.min(100, Math.max(0, pct))}%`;
    }
  }

  /**
   * Handle complete pose occlusion or absence.
   */
  private handlePoseLoss(timestampMs: number, reason?: string): void {
    if (this.state === 'HOLDING') {
      this.state = 'FORM_WARNING';
      this.graceStartTime = timestampMs;
      this.feedbackMessage = reason || 'Tracking lost — step back into lateral camera frame';
    } else if (this.state === 'FORM_WARNING') {
      if (timestampMs - this.graceStartTime >= this.config.gracePeriodMs) {
        this.state = 'FORM_LOST';
        this.feedbackMessage = 'Pose tracking lost. Re-enter camera view to resume.';
      }
    } else if (this.state === 'CALIBRATING') {
      this.feedbackMessage = 'Position full body laterally inside camera frame to calibrate.';
    }
  }

  /**
   * Produce an immutable state snapshot for UI components.
   */
  public getSnapshot(): PlankStateSnapshot {
    const holdSecs = Math.floor(this.accumulatedHoldMs / 1000);
    const progressPct = Math.min(
      100,
      Math.round((this.accumulatedHoldMs / (this.targetSeconds * 1000)) * 100)
    );

    let formStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'WARNING' | 'INVALID' | 'CALIBRATING' = 'ACCEPTABLE';
    if (this.state === 'CALIBRATING') {
      formStatus = 'CALIBRATING';
    } else if (this.state === 'HOLDING') {
      const dev = Math.abs(180 - this.smoothedAlignmentAngle);
      formStatus = dev <= 10 ? 'OPTIMAL' : 'ACCEPTABLE';
    } else if (this.state === 'FORM_WARNING') {
      formStatus = 'WARNING';
    } else if (this.state === 'FORM_LOST' || this.state === 'CALIBRATION_FAILED') {
      formStatus = 'INVALID';
    }

    const elapsedCal = this.calibrationStartTime > 0 ? this.lastTimestampMs - this.calibrationStartTime : 0;
    const calProgress = Math.min(1.0, elapsedCal / this.config.calibrationDurationMs);

    const graceRemaining =
      this.state === 'FORM_WARNING'
        ? Math.max(0, this.config.gracePeriodMs - (this.lastTimestampMs - this.graceStartTime))
        : 0;

    return {
      state: this.state,
      accumulatedHoldMs: this.accumulatedHoldMs,
      accumulatedHoldSeconds: holdSecs,
      targetSeconds: this.targetSeconds,
      progressPercentage: progressPct,
      isTargetReached: this.isTargetReached,
      rawAlignmentAngle: this.rawAlignmentAngle,
      smoothedAlignmentAngle: this.smoothedAlignmentAngle,
      bodyTiltAngle: this.bodyTiltAngle,
      isProne: this.isProne,
      formStatus,
      feedbackMessage: this.feedbackMessage,
      calibrationProgress: calProgress,
      gracePeriodRemainingMs: graceRemaining,
      preferredSide: this.preferredSide,
    };
  }

  public reset(): void {
    this.state = 'NOT_STARTED';
    this.accumulatedHoldMs = 0;
    this.isTargetReached = false;
    this.smoothedAlignmentAngle = 180;
    this.calibrationSamples = [];
    this.lastTimestampMs = 0;
    this.calibrationStartTime = 0;
    this.graceStartTime = 0;
    this.feedbackMessage = 'Position lateral side to camera in horizontal plank';
  }
}
