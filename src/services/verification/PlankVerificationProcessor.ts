/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  VerificationContext,
  VerificationFrameResult,
  VerificationProcessor,
  VerificationResult,
} from '../../types';
import { DEFAULT_PLANK_CONFIG, PlankConfig } from '../../lib/verification/plankConfig';
import { Point2D } from '../../lib/verification/squatGeometry';
import { assessPoseQuality, PoseQualityAssessment } from '../../lib/verification/poseQuality';
import { PlankState, PlankStateMachine, PlankStateSnapshot } from '../../lib/verification/plankStateMachine';

export interface PlankProcessorMetrics {
  holdDurationSeconds: number;
  accumulatedHoldMs: number;
  targetDurationSeconds: number;
  state: PlankState;
  alignmentAngle: number;
  bodyTiltAngle: number;
  isProne: boolean;
  formStatus: 'OPTIMAL' | 'ACCEPTABLE' | 'WARNING' | 'INVALID' | 'CALIBRATING';
  feedbackMessage: string;
  progressPercentage: number;
  isTargetReached: boolean;
  preferredSide: string;
  calibrationProgress: number;
  gracePeriodRemainingMs: number;
  inferenceFps: number;
  modelReady: boolean;
  poseQuality: string;
  visibilityScore: number;
}

/**
 * Real AI Computer-Vision Verification Processor for Plank (Phase 10).
 *
 * Implements the browser-side verification processor contract.
 * Reuses Google MediaPipe PoseLandmarker in VIDEO running mode with GPU
 * acceleration and CPU fallback. Evaluates lateral body alignment and
 * accumulates validated hold duration deterministically.
 */
export class PlankVerificationProcessor implements VerificationProcessor {
  public name = 'AI Plank Computer-Vision Processor (Phase 10)';

  private config: PlankConfig;
  private landmarker: PoseLandmarker | null = null;
  private stateMachine: PlankStateMachine;
  private context: VerificationContext | null = null;

  // Inference session tracking
  private startTime: number = 0;
  private lastInferenceTime: number = 0;
  private frameCount: number = 0;
  private inferenceCount: number = 0;
  private lastFpsCalculationTime: number = 0;
  private currentFps: number = 0;

  // Model readiness state
  private isModelLoading: boolean = false;
  private modelReady: boolean = false;
  private modelLoadError: string | null = null;

  // Target duration in seconds
  private targetSeconds: number = 30;

  // Real-time telemetry subscriber
  private onMetricsListener: ((metrics: PlankProcessorMetrics) => void) | null = null;

  private latestMetrics: PlankProcessorMetrics = {
    holdDurationSeconds: 0,
    accumulatedHoldMs: 0,
    targetDurationSeconds: 30,
    state: 'NOT_STARTED',
    alignmentAngle: 180,
    bodyTiltAngle: 0,
    isProne: false,
    formStatus: 'CALIBRATING',
    feedbackMessage: 'Initializing AI pose vision model...',
    progressPercentage: 0,
    isTargetReached: false,
    preferredSide: 'none',
    calibrationProgress: 0,
    gracePeriodRemainingMs: 0,
    inferenceFps: 0,
    modelReady: false,
    poseQuality: 'GOOD',
    visibilityScore: 0,
  };

  constructor(customConfig?: Partial<PlankConfig>) {
    this.config = { ...DEFAULT_PLANK_CONFIG, ...customConfig };
    this.stateMachine = new PlankStateMachine(30, this.config);
  }

  public setOnMetricsListener(listener: (metrics: PlankProcessorMetrics) => void): void {
    this.onMetricsListener = listener;
    // Notify immediately with current state
    listener(this.getMetrics());
  }

  public getMetrics(): PlankProcessorMetrics {
    return { ...this.latestMetrics };
  }

  /**
   * Initialize MediaPipe PoseLandmarker and bind verification context.
   */
  async initialize(context: VerificationContext): Promise<void> {
    this.context = context;
    this.startTime = Date.now();
    this.lastFpsCalculationTime = performance.now();
    this.frameCount = 0;
    this.inferenceCount = 0;

    // Determine target duration in seconds from challenge context
    try {
      this.targetSeconds = this.parseTargetDurationSeconds(context.targetValue, context.targetUnit);
      this.stateMachine = new PlankStateMachine(this.targetSeconds, this.config);
    } catch (unitErr: any) {
      const msg = unitErr?.message || 'Invalid challenge target configuration';
      this.modelReady = false;
      this.updateLatestMetrics({
        modelReady: false,
        feedbackMessage: msg,
      });
      throw unitErr;
    }

    this.updateLatestMetrics({
      targetDurationSeconds: this.targetSeconds,
      feedbackMessage: 'Loading MediaPipe Pose Landmarker...',
    });

    if (this.landmarker) {
      this.modelReady = true;
      this.updateLatestMetrics({
        modelReady: true,
        feedbackMessage: 'AI Model ready. Position body in side view.',
      });
      return;
    }

    if (this.isModelLoading) {
      return;
    }

    this.isModelLoading = true;
    try {
      console.log('Phase 10: Initializing MediaPipe PoseLandmarker for Plank...');
      const visionFileset = await FilesetResolver.forVisionTasks(this.config.wasmFilesetUrl);

      // Attempt GPU delegate with graceful fallback to CPU
      try {
        this.landmarker = await PoseLandmarker.createFromOptions(visionFileset, {
          baseOptions: {
            modelAssetPath: this.config.modelAssetUrl,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false,
        });
        console.log('Phase 10: PoseLandmarker initialized with GPU delegate.');
      } catch (gpuErr) {
        console.warn('GPU delegate failed for Plank, falling back to CPU:', gpuErr);
        this.landmarker = await PoseLandmarker.createFromOptions(visionFileset, {
          baseOptions: {
            modelAssetPath: this.config.modelAssetUrl,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputSegmentationMasks: false,
        });
        console.log('Phase 10: PoseLandmarker initialized with CPU delegate.');
      }

      this.modelReady = true;
      this.isModelLoading = false;
      this.updateLatestMetrics({
        modelReady: true,
        feedbackMessage: 'AI Vision active. Position body sideways in plank position.',
      });
    } catch (err: any) {
      this.isModelLoading = false;
      this.modelLoadError = err?.message || 'Failed to initialize MediaPipe PoseLandmarker';
      console.error('Phase 10: MediaPipe PoseLandmarker initialization error:', err);
      this.updateLatestMetrics({
        modelReady: false,
        feedbackMessage: 'Failed to load AI model. Please check network connection.',
      });
      throw err;
    }
  }

  /**
   * Process a single video frame from the camera stream.
   */
  async processFrame(
    videoElement: HTMLVideoElement,
    timestampMs: number
  ): Promise<VerificationFrameResult> {
    this.frameCount += 1;

    // Calculate rolling FPS
    const now = performance.now();
    if (now - this.lastFpsCalculationTime >= 1000) {
      this.currentFps = Math.round(
        (this.inferenceCount * 1000) / (now - this.lastFpsCalculationTime)
      );
      this.inferenceCount = 0;
      this.lastFpsCalculationTime = now;
    }

    if (!this.landmarker || !this.modelReady) {
      return {
        detected: false,
        feedbackMessage: this.modelLoadError
          ? 'AI model unavailable'
          : 'Loading pose detection model...',
      };
    }

    // Throttle inference cadence to preserve CPU/GPU headroom
    if (timestampMs - this.lastInferenceTime < this.config.inferenceIntervalMs) {
      return {
        detected: this.latestMetrics.state !== 'NOT_STARTED',
        feedbackMessage: this.latestMetrics.feedbackMessage,
      };
    }

    this.lastInferenceTime = timestampMs;
    this.inferenceCount += 1;

    try {
      // Execute MediaPipe detection
      const poseResult = this.landmarker.detectForVideo(videoElement, timestampMs);

      if (!poseResult.landmarks || poseResult.landmarks.length === 0) {
        const snapshot = this.stateMachine.update(null, timestampMs);
        this.syncMetricsFromSnapshot(snapshot, 'NO_POSE', 0);
        return {
          detected: false,
          feedbackMessage: snapshot.feedbackMessage,
        };
      }

      // Extract 33 normalized landmarks
      const rawLandmarks = poseResult.landmarks[0];
      const landmarks: Point2D[] = rawLandmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        visibility: lm.visibility !== undefined ? lm.visibility : 0.8,
      }));

      // Evaluate pose quality and framing
      const poseAssessment: PoseQualityAssessment = assessPoseQuality(
        landmarks,
        this.config.landmarkVisibilityThreshold
      );

      // Advance plank finite state machine
      const snapshot: PlankStateSnapshot = this.stateMachine.update(landmarks, timestampMs);

      this.syncMetricsFromSnapshot(
        snapshot,
        poseAssessment.level,
        poseAssessment.visibilityScore
      );

      return {
        detected: true,
        landmarksCount: landmarks.length,
        poseConfidence: poseAssessment.visibilityScore,
        feedbackMessage: snapshot.feedbackMessage,
        metrics: {
          holdSeconds: snapshot.accumulatedHoldSeconds,
          alignmentAngle: snapshot.smoothedAlignmentAngle,
          bodyTiltAngle: snapshot.bodyTiltAngle,
          isProne: snapshot.isProne ? 1 : 0,
        },
      };
    } catch (err: any) {
      console.warn('Phase 10: Plank frame processing error:', err);
      return {
        detected: false,
        feedbackMessage: 'Frame processing error — maintaining session',
      };
    }
  }

  /**
   * Finalize the verification session and produce typed VerificationResult.
   */
  async finalize(): Promise<VerificationResult> {
    const elapsedSeconds =
      this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const finalState = this.stateMachine.getSnapshot();

    // 1. Verify activity compatibility
    if (this.context?.activity && this.context.activity !== 'PLANK') {
      return {
        verified: false,
        status: 'FAILED',
        activity: this.context.activity,
        challengeId: this.context.challengeId,
        verificationMethod: 'AI_VERIFIED',
        measuredValue: 0,
        targetValue: this.context.targetValue,
        targetUnit: this.context.targetUnit,
        durationSeconds: elapsedSeconds,
        reason: 'Plank AI verification cannot certify non-plank activity.',
        startedAt: new Date(this.startTime).toISOString(),
        completedAt: new Date().toISOString(),
      };
    }

    // 2. Verify target unit compatibility (time-based)
    const rawUnit = (this.context?.targetUnit || '').toLowerCase().trim();
    const isUnitSupported = this.config.supportedTargetUnits.some(
      (u) => rawUnit === u || rawUnit.startsWith(u)
    );

    if (!isUnitSupported) {
      return {
        verified: false,
        status: 'FAILED',
        activity: 'PLANK',
        challengeId: this.context?.challengeId || '',
        verificationMethod: 'AI_VERIFIED',
        measuredValue: finalState.accumulatedHoldSeconds,
        targetValue: this.context?.targetValue,
        targetUnit: this.context?.targetUnit,
        durationSeconds: elapsedSeconds,
        reason: `Unsupported target unit "${this.context?.targetUnit}". Plank verification requires time duration units (seconds or minutes).`,
        startedAt: new Date(this.startTime).toISOString(),
        completedAt: new Date().toISOString(),
      };
    }

    // 3. Evaluate target achievement
    const targetSeconds = this.targetSeconds;
    const holdSeconds = finalState.accumulatedHoldSeconds;
    const isTargetMet = holdSeconds >= targetSeconds;

    let reason = '';
    let status: 'COMPLETED' | 'FAILED' = isTargetMet ? 'COMPLETED' : 'FAILED';

    if (isTargetMet) {
      reason = `Challenge target of ${targetSeconds}s verified hold successfully achieved (${holdSeconds}s certified).`;
    } else if (holdSeconds === 0) {
      reason = 'No valid horizontal plank holds were certified during this session.';
    } else {
      reason = `Accumulated ${holdSeconds}s of verified plank hold, but target was ${targetSeconds}s.`;
    }

    return {
      verified: isTargetMet,
      status,
      activity: 'PLANK',
      challengeId: this.context?.challengeId || '',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: holdSeconds,
      targetValue: this.context?.targetValue,
      targetUnit: this.context?.targetUnit || 'seconds',
      durationSeconds: elapsedSeconds,
      startedAt: new Date(this.startTime).toISOString(),
      completedAt: new Date().toISOString(),
      reason,
    };
  }

  /**
   * Reset state for another session.
   */
  public reset(): void {
    this.stateMachine.reset();
    this.startTime = Date.now();
    this.lastInferenceTime = 0;
    this.frameCount = 0;
    this.inferenceCount = 0;
    this.updateLatestMetrics({
      holdDurationSeconds: 0,
      accumulatedHoldMs: 0,
      state: 'NOT_STARTED',
      alignmentAngle: 180,
      bodyTiltAngle: 0,
      isProne: false,
      formStatus: 'CALIBRATING',
      feedbackMessage: 'Chamber reset. Step into side view to calibrate plank.',
      progressPercentage: 0,
      isTargetReached: false,
      calibrationProgress: 0,
      gracePeriodRemainingMs: 0,
    });
  }

  /**
   * Dispose MediaPipe WASM and GPU resources cleanly.
   */
  public dispose(): void {
    if (this.landmarker) {
      try {
        console.log('Phase 10: Disposing MediaPipe PoseLandmarker for Plank...');
        this.landmarker.close();
      } catch (err) {
        console.warn('Phase 10: Error closing PoseLandmarker:', err);
      }
      this.landmarker = null;
    }
    this.modelReady = false;
    this.isModelLoading = false;
    this.updateLatestMetrics({
      modelReady: false,
      feedbackMessage: 'Vision session closed.',
    });
  }

  /**
   * Parse target unit string into total seconds.
   * Strictly validates that targetUnit is an allowed plank time unit ('seconds', 'sec', 's', 'minutes', 'mins', 'min').
   * Rejects incompatible units (e.g. 'reps', 'km', 'days') with a clear descriptive error.
   */
  private parseTargetDurationSeconds(targetValue?: number, targetUnit?: string): number {
    const rawUnit = (targetUnit || '').toLowerCase().trim();
    if (!this.config.supportedTargetUnits.includes(rawUnit)) {
      throw new Error(
        `UNSUPPORTED_UNIT: Challenge target unit "${targetUnit || 'undefined'}" is not supported for PLANK AI verification. Expected duration in: ${this.config.supportedTargetUnits.join(', ')}`
      );
    }
    const val = Number(targetValue);
    if (isNaN(val) || val <= 0) {
      throw new Error(`INVALID_TARGET_VALUE: Target duration must be a positive number, received: ${targetValue}`);
    }

    if (rawUnit.startsWith('min')) {
      return Math.round(val * 60);
    }
    return Math.round(val);
  }

  private syncMetricsFromSnapshot(
    snapshot: PlankStateSnapshot,
    poseQuality: string,
    visibilityScore: number
  ): void {
    this.updateLatestMetrics({
      holdDurationSeconds: snapshot.accumulatedHoldSeconds,
      accumulatedHoldMs: snapshot.accumulatedHoldMs,
      targetDurationSeconds: snapshot.targetSeconds,
      state: snapshot.state,
      alignmentAngle: snapshot.smoothedAlignmentAngle,
      bodyTiltAngle: snapshot.bodyTiltAngle,
      isProne: snapshot.isProne,
      formStatus: snapshot.formStatus,
      feedbackMessage: snapshot.feedbackMessage,
      progressPercentage: snapshot.progressPercentage,
      isTargetReached: snapshot.isTargetReached,
      preferredSide: snapshot.preferredSide,
      calibrationProgress: snapshot.calibrationProgress,
      gracePeriodRemainingMs: snapshot.gracePeriodRemainingMs,
      inferenceFps: this.currentFps,
      modelReady: this.modelReady,
      poseQuality,
      visibilityScore,
    });
  }

  private updateLatestMetrics(partial: Partial<PlankProcessorMetrics>): void {
    this.latestMetrics = { ...this.latestMetrics, ...partial };
    if (this.onMetricsListener) {
      this.onMetricsListener(this.getMetrics());
    }
  }
}
