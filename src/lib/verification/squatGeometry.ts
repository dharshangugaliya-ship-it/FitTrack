/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Standard MediaPipe Pose Landmark index constants.
 */
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export interface Point2D {
  x: number;
  y: number;
  visibility?: number;
}

export interface LandmarkValidation {
  isValid: boolean;
  leftVisible: boolean;
  rightVisible: boolean;
  preferredSide: 'left' | 'right' | 'both' | 'none';
  reason?: string;
}

/**
 * Calculate the interior angle (in degrees) between three 2D points ABC,
 * with point B as the vertex.
 *
 * Vector BA = A - B
 * Vector BC = C - B
 * angle = acos( (BA · BC) / (|BA| * |BC|) ) * (180 / π)
 *
 * Handles zero-length vectors, colinear points, NaN, and Infinity safely.
 */
export function calculateJointAngle(a: Point2D, b: Point2D, c: Point2D): number {
  if (!a || !b || !c) return 0;

  const vBAx = a.x - b.x;
  const vBAy = a.y - b.y;
  const vBCx = c.x - b.x;
  const vBCy = c.y - b.y;

  const magBA = Math.sqrt(vBAx * vBAx + vBAy * vBAy);
  const magBC = Math.sqrt(vBCx * vBCx + vBCy * vBCy);

  // Guard against zero-length vectors or identical overlapping joints
  if (magBA < 1e-6 || magBC < 1e-6) {
    return 0;
  }

  // Dot product
  const dot = vBAx * vBCx + vBAy * vBCy;

  // Clamp cosine value to [-1, 1] to prevent NaN from floating point inaccuracies
  let cosTheta = dot / (magBA * magBC);
  if (cosTheta > 1.0) cosTheta = 1.0;
  if (cosTheta < -1.0) cosTheta = -1.0;

  const angleRad = Math.acos(cosTheta);
  const angleDeg = (angleRad * 180) / Math.PI;

  if (isNaN(angleDeg) || !isFinite(angleDeg)) {
    return 0;
  }

  return angleDeg;
}

/**
 * Validates visibility and plausibility of squat landmarks on left and right sides.
 */
export function validateSquatLandmarks(
  landmarks: Point2D[],
  visibilityThreshold: number = 0.6
): LandmarkValidation {
  if (!landmarks || landmarks.length < 33) {
    return {
      isValid: false,
      leftVisible: false,
      rightVisible: false,
      preferredSide: 'none',
      reason: 'Pose landmarks incomplete or not detected.',
    };
  }

  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  const isPointVisible = (pt?: Point2D) =>
    Boolean(pt && (pt.visibility === undefined || pt.visibility >= visibilityThreshold));

  const leftVisible =
    isPointVisible(leftHip) && isPointVisible(leftKnee) && isPointVisible(leftAnkle);
  const rightVisible =
    isPointVisible(rightHip) && isPointVisible(rightKnee) && isPointVisible(rightAnkle);

  if (leftVisible && rightVisible) {
    return {
      isValid: true,
      leftVisible: true,
      rightVisible: true,
      preferredSide: 'both',
    };
  }

  if (leftVisible) {
    return {
      isValid: true,
      leftVisible: true,
      rightVisible: false,
      preferredSide: 'left',
      reason: 'Right side partially occluded; using left side view.',
    };
  }

  if (rightVisible) {
    return {
      isValid: true,
      leftVisible: false,
      rightVisible: true,
      preferredSide: 'right',
      reason: 'Left side partially occluded; using right side view.',
    };
  }

  return {
    isValid: false,
    leftVisible: false,
    rightVisible: false,
    preferredSide: 'none',
    reason: 'Lower body joints (hips, knees, ankles) are not clearly visible.',
  };
}

/**
 * Computes the unified squat knee angle for the current frame,
 * combining or selecting the best visible side with outlier protection.
 */
export function calculateSquatKneeAngle(
  landmarks: Point2D[],
  validation: LandmarkValidation
): { angle: number; leftAngle: number; rightAngle: number } {
  if (!validation.isValid) {
    return { angle: 0, leftAngle: 0, rightAngle: 0 };
  }

  let leftAngle = 0;
  let rightAngle = 0;

  if (validation.leftVisible) {
    leftAngle = calculateJointAngle(
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS.LEFT_KNEE],
      landmarks[POSE_LANDMARKS.LEFT_ANKLE]
    );
  }

  if (validation.rightVisible) {
    rightAngle = calculateJointAngle(
      landmarks[POSE_LANDMARKS.RIGHT_HIP],
      landmarks[POSE_LANDMARKS.RIGHT_KNEE],
      landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
    );
  }

  let finalAngle = 0;
  if (validation.preferredSide === 'both') {
    // Average both angles if both are plausible
    finalAngle = (leftAngle + rightAngle) / 2;
  } else if (validation.preferredSide === 'left') {
    finalAngle = leftAngle;
  } else if (validation.preferredSide === 'right') {
    finalAngle = rightAngle;
  }

  return {
    angle: Math.round(finalAngle * 10) / 10,
    leftAngle: Math.round(leftAngle * 10) / 10,
    rightAngle: Math.round(rightAngle * 10) / 10,
  };
}
