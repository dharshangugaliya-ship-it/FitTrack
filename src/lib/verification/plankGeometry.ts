/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point2D, POSE_LANDMARKS } from './squatGeometry';
import { PlankConfig } from './plankConfig';

export interface PlankLandmarkValidation {
  isValid: boolean;
  leftVisible: boolean;
  rightVisible: boolean;
  preferredSide: 'left' | 'right' | 'both' | 'none';
  reason?: string;
}

export type PlankFormCategory = 'ALIGNED' | 'SAG' | 'PIKE' | 'NOT_PRONE' | 'OCCLUDED';

export interface PlankPoseMetrics {
  isValidPose: boolean;
  alignmentAngle: number;         // Interior angle at hip (180° = straight)
  deviationFromIdeal: number;     // |180 - alignmentAngle|
  bodyTiltAngle: number;          // Degrees from horizontal (prone validation)
  isProne: boolean;               // Whether body is horizontal
  formCategory: PlankFormCategory;
  formFeedbackMessage: string;
  preferredSide: 'left' | 'right' | 'both' | 'none';
  hipSignedOffset: number;        // Positive = sagging down, Negative = piking up
}

/**
 * Validate landmark availability and lateral profile visibility for plank pose.
 */
export function validatePlankLandmarks(
  landmarks: Point2D[] | null | undefined,
  visibilityThreshold: number = 0.55
): PlankLandmarkValidation {
  if (!landmarks || landmarks.length < 33) {
    return {
      isValid: false,
      leftVisible: false,
      rightVisible: false,
      preferredSide: 'none',
      reason: 'Pose landmarks incomplete or not detected.',
    };
  }

  const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const lKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

  const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const rKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  const lVisScore =
    ((lShoulder?.visibility ?? 0) +
      (lHip?.visibility ?? 0) +
      (lKnee?.visibility ?? 0) +
      (lAnkle?.visibility ?? 0)) /
    4;

  const rVisScore =
    ((rShoulder?.visibility ?? 0) +
      (rHip?.visibility ?? 0) +
      (rKnee?.visibility ?? 0) +
      (rAnkle?.visibility ?? 0)) /
    4;

  const leftVisible = lVisScore >= visibilityThreshold;
  const rightVisible = rVisScore >= visibilityThreshold;

  if (leftVisible && rightVisible) {
    return { isValid: true, leftVisible, rightVisible, preferredSide: 'both' };
  }
  if (leftVisible) {
    return { isValid: true, leftVisible, rightVisible, preferredSide: 'left' };
  }
  if (rightVisible) {
    return { isValid: true, leftVisible, rightVisible, preferredSide: 'right' };
  }

  return {
    isValid: false,
    leftVisible,
    rightVisible,
    preferredSide: 'none',
    reason: 'Full side profile (shoulder, hip, knee, ankle) not sufficiently visible.',
  };
}

/**
 * Calculate interior angle at the vertex (hip) between shoulder and ankle.
 *
 * Vector BA = Shoulder - Hip
 * Vector BC = Ankle - Hip
 * θ = acos((BA · BC) / (|BA| * |BC|)) * (180 / π)
 */
export function calculateAlignmentAngle(
  shoulder: Point2D,
  hip: Point2D,
  ankle: Point2D
): number {
  if (!shoulder || !hip || !ankle) return 0;

  const vBAx = shoulder.x - hip.x;
  const vBAy = shoulder.y - hip.y;
  const vBCx = ankle.x - hip.x;
  const vBCy = ankle.y - hip.y;

  const magBA = Math.sqrt(vBAx * vBAx + vBAy * vBAy);
  const magBC = Math.sqrt(vBCx * vBCx + vBCy * vBCy);

  if (magBA < 1e-6 || magBC < 1e-6) {
    return 0;
  }

  const dot = vBAx * vBCx + vBAy * vBCy;
  let cosTheta = dot / (magBA * magBC);

  // Clamp numerical precision errors for Math.acos domain [-1.0, 1.0]
  if (cosTheta > 1.0) cosTheta = 1.0;
  if (cosTheta < -1.0) cosTheta = -1.0;

  const angleDeg = (Math.acos(cosTheta) * 180.0) / Math.PI;

  if (isNaN(angleDeg) || !isFinite(angleDeg)) {
    return 0;
  }

  return Math.round(angleDeg * 10) / 10;
}

/**
 * Calculates orientation tilt of the shoulder-to-ankle axis relative to horizontal.
 * In a true plank, this tilt should be low (e.g. 5° - 35°).
 * If the user is standing or sitting upright, tilt will be 60° - 90°.
 */
export function calculateBodyTiltAngle(shoulder: Point2D, ankle: Point2D): number {
  if (!shoulder || !ankle) return 90;

  const dx = Math.abs(ankle.x - shoulder.x);
  const dy = Math.abs(ankle.y - shoulder.y);

  if (dx < 1e-6) {
    return 90.0; // Perfectly vertical
  }

  const tiltRad = Math.atan(dy / dx);
  const tiltDeg = (tiltRad * 180.0) / Math.PI;

  return Math.round(tiltDeg * 10) / 10;
}

/**
 * Calculates normalized signed distance of hip from shoulder-ankle axis.
 * Positive = Hip sagging downwards toward the floor.
 * Negative = Hip piking upwards toward the ceiling.
 */
export function calculateHipSagOffset(
  shoulder: Point2D,
  hip: Point2D,
  ankle: Point2D
): number {
  const dx = ankle.x - shoulder.x;
  const dy = ankle.y - shoulder.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 1e-6) return 0;

  // Cross product in 2D gives signed area
  // y points down in web canvas coordinates
  const orientationFactor = ankle.x >= shoulder.x ? 1.0 : -1.0;
  const cross = dx * (hip.y - shoulder.y) - dy * (hip.x - shoulder.x);
  const signedDist = (orientationFactor * cross) / len;

  return signedDist;
}

/**
 * Evaluates comprehensive plank biomechanics from raw 2D landmarks.
 */
export function evaluatePlankPosture(
  landmarks: Point2D[],
  config: PlankConfig
): PlankPoseMetrics {
  const validation = validatePlankLandmarks(landmarks, config.landmarkVisibilityThreshold);

  if (!validation.isValid || validation.preferredSide === 'none') {
    return {
      isValidPose: false,
      alignmentAngle: 0,
      deviationFromIdeal: 0,
      bodyTiltAngle: 90,
      isProne: false,
      formCategory: 'OCCLUDED',
      formFeedbackMessage: validation.reason || 'Step into lateral view for plank tracking',
      preferredSide: 'none',
      hipSignedOffset: 0,
    };
  }

  // Extract key lateral joint coordinates
  let shoulder: Point2D;
  let hip: Point2D;
  let ankle: Point2D;

  if (validation.preferredSide === 'left') {
    shoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    hip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    ankle = landmarks[POSE_LANDMARKS.LEFT_ANKLE] || landmarks[POSE_LANDMARKS.LEFT_KNEE];
  } else if (validation.preferredSide === 'right') {
    shoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    hip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    ankle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE] || landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  } else {
    // Both sides visible: average coordinates
    const ls = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rs = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const la = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const ra = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    shoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, visibility: ((ls.visibility || 0) + (rs.visibility || 0)) / 2 };
    hip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2, visibility: ((lh.visibility || 0) + (rh.visibility || 0)) / 2 };
    ankle = { x: (la.x + ra.x) / 2, y: (la.y + ra.y) / 2, visibility: ((la.visibility || 0) + (ra.visibility || 0)) / 2 };
  }

  const alignmentAngle = calculateAlignmentAngle(shoulder, hip, ankle);
  const bodyTiltAngle = calculateBodyTiltAngle(shoulder, ankle);
  const hipSignedOffset = calculateHipSagOffset(shoulder, hip, ankle);
  const deviation = Math.abs(config.idealAlignmentAngle - alignmentAngle);

  // 1. Prone orientation validation: Challenger must be horizontal
  if (bodyTiltAngle > config.maxBodyTiltAngle) {
    return {
      isValidPose: true,
      alignmentAngle,
      deviationFromIdeal: deviation,
      bodyTiltAngle,
      isProne: false,
      formCategory: 'NOT_PRONE',
      formFeedbackMessage: 'Assume horizontal plank position on the floor',
      preferredSide: validation.preferredSide,
      hipSignedOffset,
    };
  }

  // 2. Alignment & Sag/Pike categorization
  let formCategory: PlankFormCategory = 'ALIGNED';
  let formFeedbackMessage = 'Good plank alignment — hold steady';

  // Check hip sag vs hip pike when deviation exceeds tolerance
  if (alignmentAngle < config.minHoldAlignmentAngle) {
    if (hipSignedOffset > 0.02) {
      formCategory = 'SAG';
      formFeedbackMessage = 'Raise hips slightly — avoid lower back arch';
    } else {
      formCategory = 'PIKE';
      formFeedbackMessage = 'Lower hips slightly — keep spine neutral';
    }
  } else if (alignmentAngle > config.maxHoldAlignmentAngle) {
    formCategory = 'SAG';
    formFeedbackMessage = 'Engage core — hips dropping below line';
  }

  return {
    isValidPose: true,
    alignmentAngle,
    deviationFromIdeal: deviation,
    bodyTiltAngle,
    isProne: true,
    formCategory,
    formFeedbackMessage,
    preferredSide: validation.preferredSide,
    hipSignedOffset,
  };
}
