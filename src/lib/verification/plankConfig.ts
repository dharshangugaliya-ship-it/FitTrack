/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized Configuration for Plank AI Verification (Phase 10).
 *
 * All biomechanical thresholds, temporal constraints, hysteresis bands,
 * and MediaPipe CDN asset endpoints are documented and centralized here.
 */
export interface PlankConfig {
  /**
   * Landmark Visibility Threshold (0.0 - 1.0).
   * Minimum confidence score for shoulders, hips, knees, and ankles.
   * Planks are typically filmed in lateral (side) profile where one side is dominant.
   */
  landmarkVisibilityThreshold: number;

  /**
   * Ideal Straight Body Alignment Angle (degrees).
   * Perfect collinear posture from shoulder through hip to ankle is 180°.
   */
  idealAlignmentAngle: number;

  /**
   * Minimum Allowed Alignment Angle During Active Hold (degrees).
   * Below this threshold, posture degrades into excessive hip sag or hip pike.
   * Hysteresis: Looser than strictEnterAlignmentAngleMin to prevent boundary chatter.
   */
  minHoldAlignmentAngle: number;

  /**
   * Maximum Allowed Alignment Angle During Active Hold (degrees).
   * Math.acos() yields [0°, 180°], so perfect collinear alignment is 180.0°.
   */
  maxHoldAlignmentAngle: number;

  /**
   * Strict Entry Alignment Angle Minimum (degrees).
   * Challenger must establish rigid alignment within [165°, 180°] to initiate hold timing.
   */
  strictEnterAlignmentAngleMin: number;

  /**
   * Strict Entry Alignment Angle Maximum (degrees).
   * Capped at 180.0° matching the vector geometry mathematical domain.
   */
  strictEnterAlignmentAngleMax: number;

  /**
   * Maximum Body Tilt From Horizontal (degrees).
   * In a true prone plank, the angle between the shoulder-to-ankle axis and the horizontal
   * ground plane is typically 5° to 30°. If tilt exceeds this threshold (e.g. > 38°),
   * the person is standing, seated, or kneeling rather than holding a horizontal plank.
   */
  maxBodyTiltAngle: number;

  /**
   * Hip Sag vs Pike Deviation Margin (degrees).
   * Angular deviation from linear threshold used to differentiate sagging vs piking.
   */
  hipDeviationTolerance: number;

  /**
   * Calibration Duration (milliseconds).
   * Duration of stable prone posture required before active plank timing unlocks.
   */
  calibrationDurationMs: number;

  /**
   * Calibration Maximum Angular Variance (degrees).
   * Maximum spread across calibration samples to verify stability.
   */
  calibrationStabilityDegrees: number;

  /**
   * Form Warning Grace Period (milliseconds).
   * Transient recovery window allowing brief landmark noise or minor posture dips
   * without immediately canceling the session. Accumulation pauses during warning.
   */
  gracePeriodMs: number;

  /**
   * Minimum Hold Interval to Accumulate (milliseconds).
   * Blocks micro-burst false positives (< 250ms).
   */
  minHoldIntervalMs: number;

  /**
   * Inference Cadence Throttle (milliseconds).
   * Throttles MediaPipe calls to ~15 FPS to conserve device battery and thermal headroom.
   */
  inferenceIntervalMs: number;

  /**
   * Exponential Moving Average (EMA) Smoothing Alpha.
   * Balances responsiveness with landmark jitter suppression.
   */
  smoothingAlpha: number;

  /**
   * Maximum Allowed Timestamp Delta (milliseconds).
   * Guards against timer inflation if the browser tab is backgrounded or frames are dropped.
   */
  maxFrameTimestampDeltaMs: number;

  /**
   * Supported Challenge Target Units for Plank (Time-Based).
   */
  supportedTargetUnits: readonly string[];

  /**
   * CDN URLs for MediaPipe WebAssembly tasks and model binary.
   */
  wasmFilesetUrl: string;
  modelAssetUrl: string;
}

export const DEFAULT_PLANK_CONFIG: PlankConfig = {
  landmarkVisibilityThreshold: 0.55,
  idealAlignmentAngle: 180.0,
  minHoldAlignmentAngle: 155.0,
  maxHoldAlignmentAngle: 180.0,
  strictEnterAlignmentAngleMin: 165.0,
  strictEnterAlignmentAngleMax: 180.0,
  maxBodyTiltAngle: 38.0,
  hipDeviationTolerance: 15.0,
  calibrationDurationMs: 1200,
  calibrationStabilityDegrees: 12.0,
  gracePeriodMs: 1000,
  minHoldIntervalMs: 250,
  inferenceIntervalMs: 65,
  smoothingAlpha: 0.40,
  maxFrameTimestampDeltaMs: 500,
  supportedTargetUnits: ['seconds', 'sec', 's', 'minutes', 'mins', 'min'],
  wasmFilesetUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  modelAssetUrl:
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
};
