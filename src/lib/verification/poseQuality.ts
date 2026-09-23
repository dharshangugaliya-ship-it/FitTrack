/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point2D, POSE_LANDMARKS } from './squatGeometry';

export type PoseQualityLevel = 'GOOD' | 'FAIR' | 'POOR' | 'NO_POSE';

export interface PoseQualityAssessment {
  level: PoseQualityLevel;
  visibilityScore: number; // 0.0 - 1.0
  framingStatus: 'GOOD' | 'MOVE_CLOSER' | 'MOVE_FARTHER' | 'FULL_BODY_REQUIRED' | 'NO_PERSON';
  userInstruction: string;
}

/**
 * Assesses landmark quality, visibility distribution, and full-body camera framing.
 */
export function assessPoseQuality(
  landmarks: Point2D[] | null | undefined,
  visibilityThreshold: number = 0.6
): PoseQualityAssessment {
  if (!landmarks || landmarks.length < 33) {
    return {
      level: 'NO_POSE',
      visibilityScore: 0,
      framingStatus: 'NO_PERSON',
      userInstruction: 'No person detected. Step into the camera view.',
    };
  }

  // Key landmarks for squat tracking: nose, shoulders, hips, knees, ankles, feet
  const keyIndices = [
    POSE_LANDMARKS.NOSE,
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
    POSE_LANDMARKS.LEFT_KNEE,
    POSE_LANDMARKS.RIGHT_KNEE,
    POSE_LANDMARKS.LEFT_ANKLE,
    POSE_LANDMARKS.RIGHT_ANKLE,
    POSE_LANDMARKS.LEFT_FOOT_INDEX,
    POSE_LANDMARKS.RIGHT_FOOT_INDEX,
  ];

  let totalVis = 0;
  let visibleCount = 0;

  for (const idx of keyIndices) {
    const lm = landmarks[idx];
    const vis = lm?.visibility ?? 0.8; // Default if visibility not reported
    totalVis += vis;
    if (vis >= visibilityThreshold) {
      visibleCount += 1;
    }
  }

  const avgVis = totalVis / keyIndices.length;
  const coverageRatio = visibleCount / keyIndices.length;

  // Check vertical framing (head to toe)
  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const lowestAnkleY = Math.max(leftAnkle?.y ?? 0, rightAnkle?.y ?? 0);
  const highestNoseY = nose?.y ?? 0.5;

  const verticalSpan = lowestAnkleY - highestNoseY;

  // Check if feet/ankles or head are cut off
  const anklesCutOff = lowestAnkleY > 0.98 || (leftAnkle?.visibility ?? 0) < 0.3;
  const headCutOff = highestNoseY < 0.02;

  let framingStatus: PoseQualityAssessment['framingStatus'] = 'GOOD';
  let userInstruction = 'Pose tracking active. Maintain position.';

  if (anklesCutOff || (leftAnkle?.visibility ?? 0) < 0.4 && (rightAnkle?.visibility ?? 0) < 0.4) {
    framingStatus = 'FULL_BODY_REQUIRED';
    userInstruction = 'Full body required: Step back until feet are clearly visible.';
  } else if (verticalSpan > 0.95 || headCutOff) {
    framingStatus = 'MOVE_FARTHER';
    userInstruction = 'Too close to camera. Step back 1–2 feet.';
  } else if (verticalSpan < 0.35) {
    framingStatus = 'MOVE_CLOSER';
    userInstruction = 'Too far from camera. Step forward slightly.';
  }

  let level: PoseQualityLevel = 'POOR';
  if (coverageRatio >= 0.85 && avgVis >= 0.75 && framingStatus === 'GOOD') {
    level = 'GOOD';
  } else if (coverageRatio >= 0.65 && avgVis >= 0.55) {
    level = 'FAIR';
  } else {
    level = 'POOR';
  }

  return {
    level,
    visibilityScore: Math.round(avgVis * 100) / 100,
    framingStatus,
    userInstruction,
  };
}
