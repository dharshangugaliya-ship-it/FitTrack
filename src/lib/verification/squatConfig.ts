/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized Configuration for Squat AI Verification.
 *
 * All engineering thresholds, temporal constraints, and hysteresis parameters
 * are defined and documented here. Never scatter magic numbers throughout
 * inference or state machine code.
 */
export interface SquatConfig {
  /**
   * Landmark Visibility Threshold (0.0 - 1.0).
   * Minimum confidence/visibility score reported by MediaPipe for hips, knees, and ankles.
   * If increased: Rejects more partial occlusions, requires clearer lighting/view.
   * If decreased: Allows noisier/partially occluded points but risks jitter-induced reps.
   */
  landmarkVisibilityThreshold: number;

  /**
   * Minimum Standing Knee Angle (degrees).
   * Baseline angle when challenger is in full lockout / standing position (typically 160° - 180°).
   * If increased: Requires more rigid standing lockout.
   * If decreased: Allows softer knees at the top of the rep.
   */
  standingKneeAngleMin: number;

  /**
   * Descending Knee Angle Threshold (degrees).
   * Angle below which the state machine transitions from STANDING -> DESCENDING (typically ~150° - 155°).
   * Hysteresis: Distinct from standingReturnThreshold to avoid jitter oscillation.
   */
  descendingAngleThreshold: number;

  /**
   * Bottom / Full Squat Depth Angle Threshold (degrees).
   * Angle required to reach valid parallel or below-parallel squat depth (typically <= 95° - 100°).
   * If increased (e.g. 110°): Allows shallower quarter/half squats (less strict).
   * If decreased (e.g. 85°): Requires deep ass-to-grass squats (stricter).
   */
  bottomAngleThreshold: number;

  /**
   * Ascending Knee Angle Threshold (degrees).
   * Angle above which movement transitions from BOTTOM -> ASCENDING (typically >= 105°).
   */
  ascendingAngleThreshold: number;

  /**
   * Standing Return / Lockout Threshold (degrees).
   * Angle required to complete the movement cycle and credit the repetition (typically >= 160°).
   * Must be higher than ascendingAngleThreshold to prevent premature rep triggers.
   */
  standingReturnThreshold: number;

  /**
   * Minimum Repetition Duration (milliseconds).
   * Prevents impossible micro-burst rep counting from noise or rapid body twitches.
   * Biomechanically, a controlled human squat takes at least 700ms - 1000ms.
   * If increased: Rejects ultra-fast bouncing/rebounding squats.
   * If decreased: Accommodates competitive crossfit-speed squats.
   */
  minRepDurationMs: number;

  /**
   * Maximum Repetition Duration (milliseconds).
   * Timeout window for a single repetition cycle. If a user rests in the hole or gets stuck for > 8 seconds,
   * the rep is aborted / reset without crediting.
   */
  maxRepDurationMs: number;

  /**
   * Minimum Bottom Duration (milliseconds).
   * Minimum time required at or near depth (inflection point). Prevents single-frame noise spikes from triggering bottom.
   */
  minBottomDurationMs: number;

  /**
   * Calibration Duration (frames or milliseconds).
   * Duration required in stable standing posture before active tracking commences.
   */
  calibrationDurationMs: number;

  /**
   * Calibration Stability Tolerance (degrees standard deviation / delta).
   * Maximum angle variance tolerated during calibration.
   */
  calibrationAngleToleranceDeg: number;

  /**
   * Inference Frame Cadence Interval (milliseconds).
   * Throttles MediaPipe execution (e.g. 60ms - 80ms ~ 12-16 FPS).
   * Saves battery, prevents CPU thrashing and frame drops on mid-range laptops and mobile devices.
   */
  inferenceIntervalMs: number;

  /**
   * Temporal Exponential Moving Average (EMA) Smoothing Factor (alpha, 0.0 - 1.0).
   * Smoothes knee angle across consecutive frames: smoothed = alpha * new + (1 - alpha) * prev.
   * Higher alpha = faster response, less smoothing.
   * Lower alpha = smoother trajectory, slight phase lag.
   */
  smoothingAlpha: number;

  /**
   * Maximum Plausible Angle Delta per Frame (degrees).
   * Outlier rejection: Knee angles cannot physically jump > 45° in 60 milliseconds.
   */
  maxPlausibleAngleDeltaDeg: number;

  /**
   * Model Assets CDN URL.
   * Deterministic, official Google MediaPipe task vision wasm fileset and model bundle.
   */
  wasmFilesetUrl: string;
  modelAssetUrl: string;
}

export const DEFAULT_SQUAT_CONFIG: Readonly<SquatConfig> = Object.freeze({
  landmarkVisibilityThreshold: 0.60,
  standingKneeAngleMin: 160,
  descendingAngleThreshold: 152,
  bottomAngleThreshold: 98,
  ascendingAngleThreshold: 110,
  standingReturnThreshold: 160,
  minRepDurationMs: 800,
  maxRepDurationMs: 8000,
  minBottomDurationMs: 80,
  calibrationDurationMs: 1500,
  calibrationAngleToleranceDeg: 12,
  inferenceIntervalMs: 65, // ~15 FPS
  smoothingAlpha: 0.45,
  maxPlausibleAngleDeltaDeg: 40,
  wasmFilesetUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  modelAssetUrl: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
});
