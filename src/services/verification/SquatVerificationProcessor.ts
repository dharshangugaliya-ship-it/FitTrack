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
import { DEFAULT_SQUAT_CONFIG, SquatConfig } from '../../lib/verification/squatConfig';
import {
  calculateSquatKneeAngle,
  Point2D,
  validateSquatLandmarks,
} from '../../lib/verification/squatGeometry';
import { assessPoseQuality, PoseQualityAssessment } from '../../lib/verification/poseQuality';
import { SquatMachineState, SquatStateMachine } from '../../lib/verification/squatStateMachine';

export interface SquatProcessorMetrics {
  verifiedReps: number;
  phase: string;
  currentKneeAngle: number;
  smoothedKneeAngle: number;
  lowestAngleInCurrentRep: number;
  poseQuality: string;
  framingStatus: string;
  visibilityScore: number;
  feedbackMessage: string;
  partialRepNotice: string | null;
  calibrationProgress: number;
  preferredSide: string;
  inferenceFps: number;
  modelReady: boolean;
}

/**
 * Concrete Computer-Vision Verification Processor for Squats.
 *
 * Plugs directly into Phase 8's VerificationProcessor interface.
 * Coordinates browser-side MediaPipe PoseLandmarker inference,
 * geometric joint angle extraction, pose quality assessment, and
 * the deterministic SquatStateMachine.
 */
export class SquatVerificationProcessor implements VerificationProcessor {
  public name = 'AI Squat Computer-Vision Processor (Phase 9)';

  private config: SquatConfig;
  private landmarker: PoseLandmarker | null = null;
  private stateMachine: SquatStateMachine;
  private context: VerificationContext | null = null;

  // Session metadata
  private startTime: number = 0;
  private lastInferenceTime: number = 0;
  private frameCount: number = 0;
  private inferenceCount: number = 0;
  private lastFpsCalculationTime: number = 0;
  private currentFps: number = 0;
  private isModelLoading: boolean = false;
  private modelLoadError: string | null = null;

  // Real-time metrics cache for UI subscribers
  private latestMetrics: SquatProcessorMetrics;
  private onMetricsListener: ((metrics: SquatProcessorMetrics) => void) | null = null;

  constructor(customConfig?: Partial<SquatConfig>) {
    this.config = { ...DEFAULT_SQUAT_CONFIG, ...(customConfig || {}) };
    this.stateMachine = new SquatStateMachine(this.config);
    this.latestMetrics = this.getInitialMetrics();
  }

  private getInitialMetrics(): SquatProcessorMetrics {
    return {
      verifiedReps: 0,
      phase: 'NOT_STARTED',
      currentKneeAngle: 0,
      smoothedKneeAngle: 0,
      lowestAngleInCurrentRep: 180,
      poseQuality: 'NO_POSE',
      framingStatus: 'NO_PERSON',
      visibilityScore: 0,
      feedbackMessage: 'Initializing AI pose landmarker model...',
      partialRepNotice: null,
      calibrationProgress: 0,
      preferredSide: 'none',
      inferenceFps: 0,
      modelReady: false,
    };
  }

  public getMetrics(): SquatProcessorMetrics {
    return this.latestMetrics;
  }

  public setOnMetricsListener(listener: ((metrics: SquatProcessorMetrics) => void) | null): void {
    this.onMetricsListener = listener;
    if (listener) {
      listener(this.latestMetrics);
    }
  }

  /**
   * Initializes MediaPipe PoseLandmarker runtime and configures context.
   */
  public async initialize(context: VerificationContext): Promise<void> {
    this.context = context;
    this.startTime = Date.now();
    this.stateMachine.reset();
    this.lastInferenceTime = 0;
    this.frameCount = 0;
    this.inferenceCount = 0;
    this.modelLoadError = null;

    // Verify activity compatibility
    if (context.activity !== 'SQUATS') {
      console.warn(`SquatVerificationProcessor initialized with incompatible activity: ${context.activity}`);
    }

    if (this.landmarker) {
      // Model already loaded and ready
      this.latestMetrics = {
        ...this.getInitialMetrics(),
        modelReady: true,
        feedbackMessage: 'Chamber ready. Position yourself in full-body view to calibrate.',
      };
      this.onMetricsListener?.(this.latestMetrics);
      return;
    }

    this.isModelLoading = true;
    try {
      // 1. Resolve MediaPipe Wasm fileset
      const visionFileset = await FilesetResolver.forVisionTasks(this.config.wasmFilesetUrl);

      // 2. Instantiate PoseLandmarker for video mode with GPU delegate, fallback to CPU
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
      } catch (gpuErr) {
        console.warn('PoseLandmarker GPU delegate failed or unsupported, falling back to CPU:', gpuErr);
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
      }

      this.isModelLoading = false;
      this.latestMetrics = {
        ...this.getInitialMetrics(),
        modelReady: true,
        feedbackMessage: 'AI Pose Landmarker loaded. Stand in full view to calibrate.',
      };
      this.onMetricsListener?.(this.latestMetrics);
    } catch (err: any) {
      console.error('Failed to load MediaPipe PoseLandmarker:', err);
      this.isModelLoading = false;
      this.modelLoadError = err?.message || 'Model initialization error';
      this.latestMetrics = {
        ...this.getInitialMetrics(),
        modelReady: false,
        feedbackMessage: 'Failed to load AI model. Check network connection or retry.',
      };
      this.onMetricsListener?.(this.latestMetrics);
      throw new Error(`MediaPipe model load failure: ${this.modelLoadError}`);
    }
  }

  /**
   * Processes a single incoming video frame.
   * Enforces inference throttling cadence (~15 FPS) and runs detection.
   */
  public async processFrame(
    videoElement: HTMLVideoElement,
    timestampMs: number
  ): Promise<VerificationFrameResult> {
    this.frameCount += 1;

    // Check model readiness
    if (!this.landmarker) {
      return {
        detected: false,
        feedbackMessage: this.modelLoadError
          ? `Model error: ${this.modelLoadError}`
          : 'Loading AI Pose Landmarker...',
      };
    }

    // Inference Throttling: Skip frame if within cadence window
    if (timestampMs - this.lastInferenceTime < this.config.inferenceIntervalMs) {
      return {
        detected: this.latestMetrics.poseQuality !== 'NO_POSE',
        feedbackMessage: this.latestMetrics.feedbackMessage,
        metrics: {
          verifiedReps: this.latestMetrics.verifiedReps,
          kneeAngle: this.latestMetrics.currentKneeAngle,
        },
      };
    }

    this.lastInferenceTime = timestampMs;
    this.inferenceCount += 1;

    // Calculate inference FPS
    if (timestampMs - this.lastFpsCalculationTime >= 1000) {
      this.currentFps = this.inferenceCount;
      this.inferenceCount = 0;
      this.lastFpsCalculationTime = timestampMs;
    }

    try {
      // Execute MediaPipe detection on the video frame
      // In video mode, timestamps MUST be monotonically increasing
      const result = this.landmarker.detectForVideo(videoElement, timestampMs);

      if (!result || !result.landmarks || result.landmarks.length === 0) {
        const qualityAssessment = assessPoseQuality(null, this.config.landmarkVisibilityThreshold);
        this.updateLatestMetrics(this.stateMachine.getState(), qualityAssessment, 'none', 0, 0);

        return {
          detected: false,
          feedbackMessage: qualityAssessment.userInstruction,
        };
      }

      // Convert NormalizedLandmark[] to Point2D[]
      const rawLandmarks = result.landmarks[0];
      const landmarks: Point2D[] = rawLandmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        visibility: lm.visibility,
      }));

      // 1. Evaluate landmark quality and visibility
      const validation = validateSquatLandmarks(landmarks, this.config.landmarkVisibilityThreshold);

      // 2. Assess full-body pose framing and quality
      const quality = assessPoseQuality(landmarks, this.config.landmarkVisibilityThreshold);

      // 3. Compute joint angles (hip -> knee -> ankle)
      const angleResult = calculateSquatKneeAngle(landmarks, validation);

      // 4. Update the deterministic Squat State Machine
      const machineState = this.stateMachine.update(angleResult.angle, validation, quality, timestampMs);

      // 5. Update cached metrics for UI
      this.updateLatestMetrics(
        machineState,
        quality,
        validation.preferredSide,
        angleResult.leftAngle,
        angleResult.rightAngle
      );

      return {
        detected: true,
        landmarksCount: landmarks.length,
        poseConfidence: quality.visibilityScore,
        feedbackMessage: machineState.feedbackMessage,
        metrics: {
          verifiedReps: machineState.verifiedReps,
          kneeAngle: machineState.currentKneeAngle,
          smoothedAngle: machineState.smoothedKneeAngle,
          lowestAngle: machineState.lowestAngleInCurrentRep,
        },
      };
    } catch (err: any) {
      console.error('Error during pose detection processFrame:', err);
      return {
        detected: false,
        feedbackMessage: 'Transient inference frame dropped.',
      };
    }
  }

  private updateLatestMetrics(
    machineState: SquatMachineState,
    quality: PoseQualityAssessment,
    preferredSide: string,
    _leftAngle: number,
    _rightAngle: number
  ): void {
    this.latestMetrics = {
      verifiedReps: machineState.verifiedReps,
      phase: machineState.phase,
      currentKneeAngle: machineState.currentKneeAngle,
      smoothedKneeAngle: machineState.smoothedKneeAngle,
      lowestAngleInCurrentRep: machineState.lowestAngleInCurrentRep,
      poseQuality: quality.level,
      framingStatus: quality.framingStatus,
      visibilityScore: quality.visibilityScore,
      feedbackMessage: machineState.partialRepNotice || machineState.feedbackMessage,
      partialRepNotice: machineState.partialRepNotice,
      calibrationProgress: machineState.calibrationProgress,
      preferredSide,
      inferenceFps: this.currentFps,
      modelReady: Boolean(this.landmarker),
    };
    this.onMetricsListener?.(this.latestMetrics);
  }

  /**
   * Finalizes the verification session and returns an authoritative VerificationResult.
   */
  public async finalize(): Promise<VerificationResult> {
    const elapsedSeconds =
      this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const finalState = this.stateMachine.getState();
    const targetValue = this.context?.targetValue ?? 0;
    const targetUnit = this.context?.targetUnit ?? 'reps';
    const isTargetMet = finalState.verifiedReps >= targetValue;

    // Check activity compatibility
    if (this.context?.activity !== 'SQUATS') {
      return {
        verified: false,
        status: 'FAILED',
        activity: this.context?.activity || 'SQUATS',
        challengeId: this.context?.challengeId || '',
        verificationMethod: this.context?.verificationRequirement || 'AI_VERIFIED',
        measuredValue: finalState.verifiedReps,
        targetValue,
        targetUnit,
        durationSeconds: elapsedSeconds,
        reason: `Squat AI verification cannot certify ${this.context?.activity || 'non-squat'} activity.`,
        completedAt: new Date().toISOString(),
      };
    }

    // Check target unit compatibility
    if (targetUnit.toLowerCase() !== 'reps' && targetUnit.toLowerCase() !== 'squats') {
      return {
        verified: false,
        status: 'FAILED',
        activity: 'SQUATS',
        challengeId: this.context?.challengeId || '',
        verificationMethod: 'AI_VERIFIED',
        measuredValue: finalState.verifiedReps,
        targetValue,
        targetUnit,
        durationSeconds: elapsedSeconds,
        reason: `Incompatible target unit (${targetUnit}). Squat processor evaluates repetitions.`,
        completedAt: new Date().toISOString(),
      };
    }

    let status: VerificationResult['status'] = 'COMPLETED';
    let reason = '';

    if (finalState.verifiedReps === 0) {
      status = 'FAILED';
      reason = 'No valid squat repetitions were completed with certified form.';
    } else if (!isTargetMet) {
      status = 'FAILED';
      reason = `Session completed with ${finalState.verifiedReps} verified reps (challenge target: ${targetValue} ${targetUnit}).`;
    } else {
      status = 'COMPLETED';
      reason = `Challenge target of ${targetValue} ${targetUnit} successfully reached with ${finalState.verifiedReps} AI-verified squats!`;
    }

    return {
      verified: isTargetMet,
      status,
      activity: 'SQUATS',
      challengeId: this.context?.challengeId || '',
      verificationMethod: 'AI_VERIFIED',
      measuredValue: finalState.verifiedReps,
      targetValue,
      targetUnit,
      durationSeconds: elapsedSeconds,
      startedAt: new Date(this.startTime).toISOString(),
      completedAt: new Date().toISOString(),
      reason,
    };
  }

  public reset(): void {
    this.stateMachine.reset();
    this.startTime = Date.now();
    this.frameCount = 0;
    this.inferenceCount = 0;
    this.latestMetrics = this.getInitialMetrics();
    if (this.landmarker) {
      this.latestMetrics.modelReady = true;
      this.latestMetrics.feedbackMessage = 'Chamber reset. Stand upright to calibrate.';
    }
    this.onMetricsListener?.(this.latestMetrics);
  }

  public dispose(): void {
    this.stateMachine.reset();
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (err) {
        console.warn('Error closing MediaPipe PoseLandmarker:', err);
      }
      this.landmarker = null;
    }
    this.onMetricsListener = null;
    this.context = null;
    this.startTime = 0;
  }
}
