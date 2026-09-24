/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { ActivityType } from '../../types';
import {
  Rotate3d,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export type HologramViewMode = 'SIDE' | 'FRONT' | 'ANGLE' | 'ORBIT';
export type HologramColorTheme = 'CYAN' | 'EMERALD' | 'AMBER';

export interface AIAvatarCanvasProps {
  activity: ActivityType;
  isPlaying?: boolean;
  playbackSpeed?: number;
  showAngles?: boolean;
  showGuidelines?: boolean;
  showMuscles?: boolean;
  viewAngle?: HologramViewMode;
  colorTheme?: HologramColorTheme;
  manualProgress?: number | null; // 0 to 1 for scrubbable timeline
  onPhaseUpdate?: (phase: string, angle: number, progress: number) => void;
  className?: string;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
  alpha: number;
}

interface HumanSkeleton3D {
  head: Point3D;
  neck: Point3D;
  chest: Point3D;
  lumbar: Point3D;
  pelvis: Point3D;
  leftShoulder: Point3D;
  rightShoulder: Point3D;
  leftElbow: Point3D;
  rightElbow: Point3D;
  leftWrist: Point3D;
  rightWrist: Point3D;
  leftHip: Point3D;
  rightHip: Point3D;
  leftKnee: Point3D;
  rightKnee: Point3D;
  leftAnkle: Point3D;
  rightAnkle: Point3D;
  leftToe: Point3D;
  rightToe: Point3D;
}

interface HologramParticle {
  x: number;
  y: number;
  z: number;
  vy: number;
  alpha: number;
  size: number;
}

export const AIAvatarCanvas: React.FC<AIAvatarCanvasProps> = ({
  activity,
  isPlaying = true,
  playbackSpeed = 1.0,
  showAngles = true,
  showGuidelines = true,
  showMuscles = true,
  viewAngle = 'ANGLE',
  colorTheme = 'CYAN',
  manualProgress = null,
  onPhaseUpdate,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const accumulatedTimeRef = useRef<number>(0);

  // Dynamic user-driven 3D orbit rotation state
  const [yawAngle, setYawAngle] = useState<number>(() => {
    switch (viewAngle) {
      case 'FRONT': return 0;
      case 'SIDE': return Math.PI / 2;
      case 'ANGLE': return Math.PI / 5;
      case 'ORBIT': return 0;
      default: return Math.PI / 5;
    }
  });

  const [isOrbiting, setIsOrbiting] = useState<boolean>(viewAngle === 'ORBIT');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartAngleRef = useRef<number>(0);

  // Live telemetry
  const [currentPhase, setCurrentPhase] = useState<string>('START');
  const [currentAngle, setCurrentAngle] = useState<number>(175);
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  // Update yaw when viewAngle prop changes
  useEffect(() => {
    if (viewAngle === 'ORBIT') {
      setIsOrbiting(true);
    } else {
      setIsOrbiting(false);
      if (viewAngle === 'FRONT') setYawAngle(0);
      else if (viewAngle === 'SIDE') setYawAngle(Math.PI / 2);
      else if (viewAngle === 'ANGLE') setYawAngle(Math.PI / 5);
    }
  }, [viewAngle]);

  // Mouse / Touch drag to rotate in 3D
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setIsOrbiting(false);
    dragStartXRef.current = e.clientX;
    dragStartAngleRef.current = yawAngle;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartXRef.current;
    const newAngle = dragStartAngleRef.current + (deltaX * 0.012);
    setYawAngle(newAngle);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if not captured
    }
  };

  // Ambient particles
  const particlesRef = useRef<HologramParticle[]>([]);
  useEffect(() => {
    const list: HologramParticle[] = [];
    for (let i = 0; i < 40; i++) {
      list.push({
        x: (Math.random() - 0.5) * 260,
        y: (Math.random() - 0.5) * 260,
        z: (Math.random() - 0.5) * 160,
        vy: 0.3 + Math.random() * 0.7,
        alpha: 0.2 + Math.random() * 0.6,
        size: 1 + Math.random() * 2,
      });
    }
    particlesRef.current = list;
  }, []);

  // Main 60fps render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDestroyed = false;

    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = rect.width || 600;
      const h = rect.height || 420;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let scanlineY = 0;

    const render = (now: number) => {
      if (isDestroyed) return;

      const deltaMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (isPlaying && manualProgress === null) {
        accumulatedTimeRef.current += (deltaMs * 0.001) * playbackSpeed;
      }

      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 600;
      const height = rect.height || 420;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep cyber dark background
      ctx.fillStyle = '#06080F';
      ctx.fillRect(0, 0, width, height);

      // Background Holographic Grid & Emitter Rings
      drawHolographicEmitter(ctx, width, height, colorTheme);

      // Draw floating holographic particles
      drawParticles(ctx, width, height, particlesRef.current, yawAngle, colorTheme);

      // Determine exercise movement progress (0 to 1)
      let progress = 0;
      const cyclePeriod = getCyclePeriod(activity);

      if (manualProgress !== null) {
        progress = Math.max(0, Math.min(1, manualProgress));
      } else {
        progress = (accumulatedTimeRef.current % cyclePeriod) / cyclePeriod;
      }

      // Auto orbit update if enabled
      let currentYaw = yawAngle;
      if (isOrbiting) {
        currentYaw += 0.008 * playbackSpeed;
        setYawAngle(currentYaw);
      }

      // Compute Respective 3D Skeleton Kinematics for THIS EXACT ACTIVITY
      const { skeleton, phaseName, keyJointAngle, depthAchieved } = calculate3DSkeleton(
        activity,
        progress
      );

      // Emit Phase update
      setCurrentPhase(phaseName);
      setCurrentAngle(keyJointAngle);
      setCurrentProgress(progress);
      onPhaseUpdate?.(phaseName, keyJointAngle, progress);

      // 3D Projection parameters
      const originX = width * 0.5;
      const originY = height * 0.52;
      const focalLength = 550;

      // Project all 3D joints to 2D screen coordinates
      const projected = projectSkeleton(skeleton, currentYaw, originX, originY, focalLength);

      // If Cycling: draw holographic bike geometry
      if (activity === 'CYCLING') {
        drawHolographicBike(ctx, projected, currentYaw, originX, originY, focalLength, colorTheme, progress);
      }

      // If Skipping: draw sweeping 3D jump rope
      if (activity === 'SKIPPING') {
        drawHolographicJumpRope(ctx, projected, currentYaw, originX, originY, focalLength, colorTheme, progress);
      }

      // Draw Volumetric Holographic Body
      drawHologramBody(
        ctx,
        projected,
        colorTheme,
        showMuscles,
        depthAchieved,
        activity,
        progress
      );

      // Draw Biomechanical Angle Overlays & Form Guidelines
      if (showAngles || showGuidelines) {
        drawBiomechanicalHUD(
          ctx,
          projected,
          activity,
          keyJointAngle,
          phaseName,
          depthAchieved,
          showAngles,
          showGuidelines,
          colorTheme,
          width,
          height,
          progress
        );
      }

      // Draw Sweeping Hologram Scanline Laser
      scanlineY = (scanlineY + 2.5 * playbackSpeed) % height;
      drawScanlineLaser(ctx, width, height, scanlineY, colorTheme);

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isDestroyed = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [
    activity,
    isPlaying,
    playbackSpeed,
    showAngles,
    showGuidelines,
    showMuscles,
    colorTheme,
    manualProgress,
    yawAngle,
    isOrbiting,
    onPhaseUpdate,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[380px] sm:min-h-[460px] flex items-center justify-center bg-[#06080F] rounded-2xl overflow-hidden border border-cyan-500/20 shadow-2xl select-none cursor-grab active:cursor-grabbing ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title="Drag left/right to rotate the 3D Hologram freely"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Left: Hologram Status & Perspective Info */}
      <div className="absolute top-3.5 left-3.5 flex items-center gap-2 pointer-events-none flex-wrap">
        <div className="flex items-center gap-2 rounded-xl bg-black/80 border border-cyan-500/30 px-3 py-1.5 backdrop-blur-md shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
            {activity.replace('_', ' ')} · 3D Hologram
          </span>
        </div>

        <div className="rounded-xl bg-black/70 border border-white/10 px-2.5 py-1.5 backdrop-blur-md flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
          <Rotate3d className="w-3 h-3 text-cyan-400" />
          <span>{Math.round(((yawAngle * 180) / Math.PI) % 360)}° Orbit</span>
        </div>
      </div>

      {/* Top Right: Hologram Perspective Quick Actions */}
      <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10">
        <button
          type="button"
          onClick={() => {
            setIsOrbiting((prev) => !prev);
          }}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
            isOrbiting
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
              : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
          }`}
          title="Toggle continuous 360° orbital rotation"
        >
          {isOrbiting ? 'Auto-Orbit: ON' : 'Auto-Orbit'}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsOrbiting(false);
            setYawAngle(0);
          }}
          className="px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Frontal view"
        >
          Front
        </button>

        <button
          type="button"
          onClick={() => {
            setIsOrbiting(false);
            setYawAngle(Math.PI / 5);
          }}
          className="px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="3/4 Perspective Angle"
        >
          Angle
        </button>

        <button
          type="button"
          onClick={() => {
            setIsOrbiting(false);
            setYawAngle(Math.PI / 2);
          }}
          className="px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Lateral Profile"
        >
          Profile
        </button>
      </div>

      {/* Bottom Floating Telemetry HUD */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-2">
        <div className="rounded-xl bg-black/85 border border-cyan-500/30 px-3.5 py-2 backdrop-blur-md shadow-xl flex items-center gap-3">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
              {activity.replace('_', ' ')} Phase
            </span>
            <span className="text-xs font-mono font-black text-cyan-300">
              {currentPhase}
            </span>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
              {getActivityMetricLabel(activity)}
            </span>
            <span className="text-xs font-mono font-black text-white">
              {formatActivityMetricValue(activity, currentAngle)}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-black/85 border border-emerald-500/30 px-3.5 py-2 backdrop-blur-md shadow-xl text-right">
          <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-wider flex items-center justify-end gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            AI Verification Target
          </span>
          <span className="text-xs font-mono font-black text-slate-200">
            {getActivityTargetSummary(activity)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const HumanHologramCanvas = AIAvatarCanvas;

function getActivityMetricLabel(activity: ActivityType): string {
  switch (activity) {
    case 'SQUATS': return 'Knee Flexion';
    case 'PUSH_UPS': return 'Elbow Angle';
    case 'PLANK': return 'Spine Collinearity';
    case 'RUNNING': return 'Step Cadence';
    case 'WALKING': return 'Stride Cadence';
    case 'CYCLING': return 'Pedal Cadence';
    case 'SKIPPING': return 'Rope Frequency';
    case 'SWIMMING': return 'High-Elbow Angle';
    case 'YOGA': return 'Spine Alignment';
    default: return 'Primary Angle';
  }
}

function formatActivityMetricValue(activity: ActivityType, val: number): string {
  switch (activity) {
    case 'RUNNING':
    case 'WALKING':
      return `${val} SPM`;
    case 'CYCLING':
      return `${val} RPM`;
    case 'SKIPPING':
      return `${val} BPM`;
    default:
      return `${val}°`;
  }
}

function getActivityTargetSummary(activity: ActivityType): string {
  switch (activity) {
    case 'SQUATS': return 'Hip Depth ≤ 85° (Parallel)';
    case 'PUSH_UPS': return 'Elbow Flexion ≤ 90°';
    case 'PLANK': return 'Horizontal Axis ≤ 12° Deviation';
    case 'RUNNING': return '165–180 SPM & Midfoot Strike';
    case 'WALKING': return 'Heel-to-Toe Roll & Upright Spine';
    case 'CYCLING': return '85–95 RPM & 25°–35° Knee Angle';
    case 'SKIPPING': return '120+ BPM & 2–5cm Clearance';
    case 'SWIMMING': return 'High-Elbow Catch & 35° Body Roll';
    case 'YOGA': return 'Continuous Spine Elongation';
    default: return 'Standard Verified Form';
  }
}

// ============================================================================
// 3D KINEMATICS & ANATOMICAL SKELETON ENGINE FOR ALL 9 ACTIVITIES
// ============================================================================

function getCyclePeriod(activity: ActivityType): number {
  switch (activity) {
    case 'SQUATS': return 2.6;
    case 'PUSH_UPS': return 2.2;
    case 'PLANK': return 4.0;
    case 'RUNNING': return 0.85;
    case 'WALKING': return 1.25;
    case 'CYCLING': return 1.1;
    case 'SKIPPING': return 0.7;
    case 'SWIMMING': return 2.2;
    case 'YOGA': return 6.0;
    default: return 2.4;
  }
}

function calculate3DSkeleton(
  activity: ActivityType,
  progress: number
): {
  skeleton: HumanSkeleton3D;
  phaseName: string;
  keyJointAngle: number;
  depthAchieved: boolean;
} {
  switch (activity) {
    case 'SQUATS':
      return calculateSquatKinematics(progress);
    case 'PUSH_UPS':
      return calculatePushUpKinematics(progress);
    case 'PLANK':
      return calculatePlankKinematics(progress);
    case 'RUNNING':
      return calculateRunningKinematics(progress);
    case 'WALKING':
      return calculateWalkingKinematics(progress);
    case 'CYCLING':
      return calculateCyclingKinematics(progress);
    case 'SKIPPING':
      return calculateSkippingKinematics(progress);
    case 'SWIMMING':
      return calculateSwimmingKinematics(progress);
    case 'YOGA':
      return calculateYogaKinematics(progress);
    default:
      return calculateSquatKinematics(progress);
  }
}

// 1. SQUAT 3D KINEMATICS
function calculateSquatKinematics(progress: number) {
  const depthFactor = (1 - Math.cos(progress * Math.PI * 2)) * 0.5;

  let phaseName = 'PREPARATION & STANCE';
  if (progress > 0.08 && progress < 0.45) {
    phaseName = 'ECCENTRIC DESCENT';
  } else if (progress >= 0.45 && progress <= 0.55) {
    phaseName = 'PARALLEL DEPTH (PASS)';
  } else if (progress > 0.55 && progress < 0.92) {
    phaseName = 'CONCENTRIC ASCENT';
  } else if (progress >= 0.92) {
    phaseName = 'LOCKOUT & RESET';
  }

  const kneeAngle = Math.round(175 - depthFactor * 93);
  const depthAchieved = kneeAngle <= 88;

  const footSpacing = 42;
  const leftAnkle: Point3D = { x: -footSpacing, y: 125, z: 0 };
  const rightAnkle: Point3D = { x: footSpacing, y: 125, z: 0 };
  const leftToe: Point3D = { x: -footSpacing - 8, y: 125, z: 22 };
  const rightToe: Point3D = { x: footSpacing + 8, y: 125, z: 22 };

  const pelvisY = 0 + depthFactor * 68;
  const pelvisZ = -10 - depthFactor * 42;
  const pelvis: Point3D = { x: 0, y: pelvisY, z: pelvisZ };

  const kneeY = 62 + depthFactor * 10;
  const kneeZ = 12 + depthFactor * 22;
  const kneeX = footSpacing + depthFactor * 6;
  const leftKnee: Point3D = { x: -kneeX, y: kneeY, z: kneeZ };
  const rightKnee: Point3D = { x: kneeX, y: kneeY, z: kneeZ };

  const leftHip: Point3D = { x: -22, y: pelvisY, z: pelvisZ };
  const rightHip: Point3D = { x: 22, y: pelvisY, z: pelvisZ };

  const lumbar: Point3D = { x: 0, y: pelvisY - 32, z: pelvisZ + depthFactor * 12 };
  const chest: Point3D = { x: 0, y: pelvisY - 72, z: pelvisZ + depthFactor * 28 };
  const neck: Point3D = { x: 0, y: pelvisY - 96, z: pelvisZ + depthFactor * 32 };
  const head: Point3D = { x: 0, y: pelvisY - 122, z: pelvisZ + depthFactor * 35 };

  const shoulderY = pelvisY - 72;
  const shoulderZ = pelvisZ + depthFactor * 28;
  const leftShoulder: Point3D = { x: -36, y: shoulderY, z: shoulderZ };
  const rightShoulder: Point3D = { x: 36, y: shoulderY, z: shoulderZ };

  const armRaise = depthFactor * 38;
  const leftElbow: Point3D = { x: -38, y: shoulderY + 8 - armRaise * 0.4, z: shoulderZ + 42 + armRaise };
  const rightElbow: Point3D = { x: 38, y: shoulderY + 8 - armRaise * 0.4, z: shoulderZ + 42 + armRaise };

  const leftWrist: Point3D = { x: -34, y: shoulderY + 5 - armRaise * 0.5, z: shoulderZ + 84 + armRaise * 1.2 };
  const rightWrist: Point3D = { x: 34, y: shoulderY + 5 - armRaise * 0.5, z: shoulderZ + 84 + armRaise * 1.2 };

  return {
    skeleton: {
      head, neck, chest, lumbar, pelvis,
      leftShoulder, rightShoulder,
      leftElbow, rightElbow,
      leftWrist, rightWrist,
      leftHip, rightHip,
      leftKnee, rightKnee,
      leftAnkle, rightAnkle,
      leftToe, rightToe,
    },
    phaseName,
    keyJointAngle: kneeAngle,
    depthAchieved,
  };
}

// 2. PUSH-UP 3D KINEMATICS
function calculatePushUpKinematics(progress: number) {
  const depthFactor = (1 - Math.cos(progress * Math.PI * 2)) * 0.5;
  const groundY = 85;

  const leftWrist: Point3D = { x: -44, y: groundY, z: 50 };
  const rightWrist: Point3D = { x: 44, y: groundY, z: 50 };
  const leftAnkle: Point3D = { x: -14, y: groundY - 6, z: -160 };
  const rightAnkle: Point3D = { x: 14, y: groundY - 6, z: -160 };
  const leftToe: Point3D = { x: -14, y: groundY, z: -165 };
  const rightToe: Point3D = { x: 14, y: groundY, z: -165 };

  const elbowAngle = Math.round(175 - depthFactor * 86);
  const depthAchieved = elbowAngle <= 92;

  const topShoulderY = groundY - 72;
  const bottomShoulderY = groundY - 20;
  const currentShoulderY = topShoulderY + depthFactor * (bottomShoulderY - topShoulderY);

  const leftShoulder: Point3D = { x: -36, y: currentShoulderY, z: 50 };
  const rightShoulder: Point3D = { x: 36, y: currentShoulderY, z: 50 };

  const leftElbow: Point3D = { x: -58, y: currentShoulderY + 8, z: 20 };
  const rightElbow: Point3D = { x: 58, y: currentShoulderY + 8, z: 20 };

  const chest: Point3D = { x: 0, y: currentShoulderY, z: 45 };
  const neck: Point3D = { x: 0, y: currentShoulderY - 4, z: 65 };
  const head: Point3D = { x: 0, y: currentShoulderY - 6, z: 85 };

  const lumbar: Point3D = { x: 0, y: currentShoulderY + 6, z: -5 };
  const pelvis: Point3D = { x: 0, y: currentShoulderY + 12, z: -45 };
  const leftHip: Point3D = { x: -18, y: currentShoulderY + 12, z: -45 };
  const rightHip: Point3D = { x: 18, y: currentShoulderY + 12, z: -45 };

  const leftKnee: Point3D = { x: -16, y: currentShoulderY + 22, z: -105 };
  const rightKnee: Point3D = { x: 16, y: currentShoulderY + 22, z: -105 };

  let phaseName = 'TOP PLANK LOCKOUT';
  if (progress > 0.08 && progress < 0.45) phaseName = 'ECCENTRIC LOWERING';
  else if (progress >= 0.45 && progress <= 0.55) phaseName = 'CHEST DEPTH (90° CHECK)';
  else if (progress > 0.55 && progress < 0.92) phaseName = 'CONCENTRIC PRESS';

  return {
    skeleton: {
      head, neck, chest, lumbar, pelvis,
      leftShoulder, rightShoulder,
      leftElbow, rightElbow,
      leftWrist, rightWrist,
      leftHip, rightHip,
      leftKnee, rightKnee,
      leftAnkle, rightAnkle,
      leftToe, rightToe,
    },
    phaseName,
    keyJointAngle: elbowAngle,
    depthAchieved,
  };
}

// 3. PLANK 3D KINEMATICS
function calculatePlankKinematics(progress: number) {
  const breath = Math.sin(progress * Math.PI * 4) * 2;
  const groundY = 85;

  const leftElbow: Point3D = { x: -26, y: groundY, z: 65 };
  const rightElbow: Point3D = { x: 26, y: groundY, z: 65 };
  const leftWrist: Point3D = { x: -14, y: groundY, z: 95 };
  const rightWrist: Point3D = { x: 14, y: groundY, z: 95 };

  const leftAnkle: Point3D = { x: -14, y: groundY - 6, z: -160 };
  const rightAnkle: Point3D = { x: 14, y: groundY - 6, z: -160 };
  const leftToe: Point3D = { x: -14, y: groundY, z: -165 };
  const rightToe: Point3D = { x: 14, y: groundY, z: -165 };

  const shoulderY = groundY - 38 + breath * 0.5;
  const leftShoulder: Point3D = { x: -32, y: shoulderY, z: 60 };
  const rightShoulder: Point3D = { x: 32, y: shoulderY, z: 60 };

  const chest: Point3D = { x: 0, y: shoulderY, z: 55 };
  const neck: Point3D = { x: 0, y: shoulderY - 5, z: 75 };
  const head: Point3D = { x: 0, y: shoulderY - 8, z: 95 };

  const lumbar: Point3D = { x: 0, y: shoulderY - 2 + breath, z: 0 };
  const pelvis: Point3D = { x: 0, y: shoulderY - 3 + breath * 0.8, z: -40 };
  const leftHip: Point3D = { x: -18, y: shoulderY - 3, z: -40 };
  const rightHip: Point3D = { x: 18, y: shoulderY - 3, z: -40 };

  const leftKnee: Point3D = { x: -16, y: groundY - 18, z: -100 };
  const rightKnee: Point3D = { x: 16, y: groundY - 18, z: -100 };

  return {
    skeleton: {
      head, neck, chest, lumbar, pelvis,
      leftShoulder, rightShoulder,
      leftElbow, rightElbow,
      leftWrist, rightWrist,
      leftHip, rightHip,
      leftKnee, rightKnee,
      leftAnkle, rightAnkle,
      leftToe, rightToe,
    },
    phaseName: 'ISOMETRIC CORE HOLD',
    keyJointAngle: 178,
    depthAchieved: true,
  };
}

// 4. RUNNING 3D KINEMATICS (Cadence gait cycle with high knee drive & arm swing)
function calculateRunningKinematics(progress: number) {
  const theta = progress * Math.PI * 2;
  const bounce = Math.abs(Math.sin(theta)) * 14;

  const pelvisY = 0 - bounce;
  const pelvisZ = 0;
  const pelvis: Point3D = { x: 0, y: pelvisY, z: pelvisZ };

  // Athletic forward lean
  const lumbar: Point3D = { x: 0, y: pelvisY - 32, z: 8 };
  const chest: Point3D = { x: 0, y: pelvisY - 70, z: 18 };
  const neck: Point3D = { x: 0, y: pelvisY - 94, z: 24 };
  const head: Point3D = { x: 0, y: pelvisY - 120, z: 30 };

  const leftHip: Point3D = { x: -18, y: pelvisY, z: pelvisZ };
  const rightHip: Point3D = { x: 18, y: pelvisY, z: pelvisZ };

  // Alternating leg drive (180° phase offset)
  const leftCycle = Math.sin(theta);
  const rightCycle = Math.sin(theta + Math.PI);

  // Left leg: drives forward when cycle > 0, extends back when cycle < 0
  const leftKneeY = leftCycle > 0 ? 55 - leftCycle * 32 : 72 + Math.abs(leftCycle) * 8;
  const leftKneeZ = leftCycle * 44;
  const leftKnee: Point3D = { x: -20, y: leftKneeY, z: leftKneeZ };

  const leftAnkleY = leftCycle > 0 ? 100 - leftCycle * 25 : 125;
  const leftAnkleZ = leftCycle * 48 - (leftCycle < 0 ? 15 : 0);
  const leftAnkle: Point3D = { x: -20, y: leftAnkleY, z: leftAnkleZ };
  const leftToe: Point3D = { x: -20, y: leftAnkleY + 4, z: leftAnkleZ + 18 };

  // Right leg
  const rightKneeY = rightCycle > 0 ? 55 - rightCycle * 32 : 72 + Math.abs(rightCycle) * 8;
  const rightKneeZ = rightCycle * 44;
  const rightKnee: Point3D = { x: 20, y: rightKneeY, z: rightKneeZ };

  const rightAnkleY = rightCycle > 0 ? 100 - rightCycle * 25 : 125;
  const rightAnkleZ = rightCycle * 48 - (rightCycle < 0 ? 15 : 0);
  const rightAnkle: Point3D = { x: 20, y: rightAnkleY, z: rightAnkleZ };
  const rightToe: Point3D = { x: 20, y: rightAnkleY + 4, z: rightAnkleZ + 18 };

  // Shoulders & Reciprocal Arm Drive (Opposite to legs)
  const leftShoulder: Point3D = { x: -35, y: pelvisY - 70, z: 18 };
  const rightShoulder: Point3D = { x: 35, y: pelvisY - 70, z: 18 };

  // Arms bend 90° and pump front-to-back
  const leftArmPump = rightCycle; // Pumps forward with right leg
  const rightArmPump = leftCycle; // Pumps forward with left leg

  const leftElbow: Point3D = { x: -38, y: pelvisY - 45, z: 18 - leftArmPump * 28 };
  const rightElbow: Point3D = { x: 38, y: pelvisY - 45, z: 18 - rightArmPump * 28 };

  const leftWrist: Point3D = { x: -32, y: pelvisY - 42 - leftArmPump * 15, z: 18 + leftArmPump * 42 };
  const rightWrist: Point3D = { x: 32, y: pelvisY - 42 - rightArmPump * 15, z: 18 + rightArmPump * 42 };

  let phaseName = 'RIGHT FOOT STRIKE';
  if (leftCycle > 0.6) phaseName = 'LEFT KNEE DRIVE (APEX)';
  else if (rightCycle > 0.6) phaseName = 'RIGHT KNEE DRIVE (APEX)';
  else if (leftCycle < -0.5) phaseName = 'LEFT HIP EXTENSION PUSH-OFF';

  return {
    skeleton: {
      head, neck, chest, lumbar, pelvis,
      leftShoulder, rightShoulder,
      leftElbow, rightElbow,
      leftWrist, rightWrist,
      leftHip, rightHip,
      leftKnee, rightKnee,
      leftAnkle, rightAnkle,
      leftToe, rightToe,
    },
    phaseName,
    keyJointAngle: 174, // Cadence 174 SPM
    depthAchieved: true,
  };
}

// 5. WALKING 3D KINEMATICS (Heel strike, smooth roll, upright posture)
function calculateWalkingKinematics(progress: number) {
  const theta = progress * Math.PI * 2;
  const bounce = Math.abs(Math.sin(theta)) * 6;

  const pelvisY = 0 - bounce;
  const pelvis: Point3D = { x: 0, y: pelvisY, z: 0 };
  const lumbar: Point3D = { x: 0, y: pelvisY - 32, z: 2 };
  const chest: Point3D = { x: 0, y: pelvisY - 72, z: 5 };
  const neck: Point3D = { x: 0, y: pelvisY - 96, z: 6 };
  const head: Point3D = { x: 0, y: pelvisY - 122, z: 7 };

  const leftHip: Point3D = { x: -18, y: pelvisY, z: 0 };
  const rightHip: Point3D = { x: 18, y: pelvisY, z: 0 };

  const leftStride = Math.sin(theta);
  const rightStride = Math.sin(theta + Math.PI);

  // Left Leg: Heel strike forward, plant, push off back
  const leftKneeY = leftStride > 0 ? 68 - leftStride * 10 : 70;
  const leftKneeZ = leftStride * 28;
  const leftKnee: Point3D = { x: -18, y: leftKneeY, z: leftKneeZ };

  const leftAnkleY = 125 - Math.max(0, leftStride) * 8;
  const leftAnkleZ = leftStride * 38;
  const leftAnkle: Point3D = { x: -18, y: leftAnkleY, z: leftAnkleZ };
  const leftToe: Point3D = { x: -18, y: leftAnkleY + 2, z: leftAnkleZ + 18 };

  // Right Leg
  const rightKneeY = rightStride > 0 ? 68 - rightStride * 10 : 70;
  const rightKneeZ = rightStride * 28;
  const rightKnee: Point3D = { x: 18, y: rightKneeY, z: rightKneeZ };

  const rightAnkleY = 125 - Math.max(0, rightStride) * 8;
  const rightAnkleZ = rightStride * 38;
  const rightAnkle: Point3D = { x: 18, y: rightAnkleY, z: rightAnkleZ };
  const rightToe: Point3D = { x: 18, y: rightAnkleY + 2, z: rightAnkleZ + 18 };

  // Arms swing gently in opposition
  const leftShoulder: Point3D = { x: -35, y: pelvisY - 72, z: 5 };
  const rightShoulder: Point3D = { x: 35, y: pelvisY - 72, z: 5 };

  const leftElbow: Point3D = { x: -38, y: pelvisY - 35, z: 5 - rightStride * 16 };
  const rightElbow: Point3D = { x: 38, y: pelvisY - 35, z: 5 - leftStride * 16 };

  const leftWrist: Point3D = { x: -36, y: pelvisY + 5, z: 5 + rightStride * 25 };
  const rightWrist: Point3D = { x: 36, y: pelvisY + 5, z: 5 + leftStride * 25 };

  let phaseName = 'STRIDE TRANSITION';
  if (leftStride > 0.7) phaseName = 'LEFT HEEL STRIKE';
  else if (rightStride > 0.7) phaseName = 'RIGHT HEEL STRIKE';

  return {
    skeleton: {
      head, neck, chest, lumbar, pelvis,
      leftShoulder, rightShoulder,
      leftElbow, rightElbow,
      leftWrist, rightWrist,
      leftHip, rightHip,
      leftKnee, rightKnee,
      leftAnkle, rightAnkle,
      leftToe, rightToe,
    },
    phaseName,
    keyJointAngle: 115, // Cadence 115 SPM
    depthAchieved: true,
  };
}

// 6. CYCLING 3D KINEMATICS (True circular 360° pedaling with forward cockpit lean)
function calculateCyclingKinematics(progress: number) {
  const theta = progress * Math.PI * 2;

  // Seated saddle position
  const pelvis: Point3D = { x: 0, y: -12, z: -15 };
  const leftHip: Point3D = { x: -18, y: -12, z: -15 };
  const rightHip: Point3D = { x: 18, y: -12, z: -15 };

  // Forward aerodynamic bike lean
  const lumbar: Point3D = { x: 0, y: -38, z: 5 };
  const chest: Point3D = { x: 0, y: -62, z: 28 };
  const neck: Point3D = { x: 0, y: -82, z: 42 };
  const head: Point3D = { x: 0, y: -100, z: 58 };

  // Hands placed forward on handlebars
  const leftShoulder: Point3D = { x: -34, y: -62, z: 28 };
  const rightShoulder: Point3D = { x: 34, y: -62, z: 28 };

  const leftElbow: Point3D = { x: -36, y: -45, z: 48 };
  const rightElbow: Point3D = { x: 36, y: -45, z: 48 };

  const leftWrist: Point3D = { x: -28, y: -32, z: 70 };
  const rightWrist: Point3D = { x: 28, y: -32, z: 70 };

  // Circular Pedaling Crankset kinematics (Center at (0, 72, 8), radius 26px)
  const crankRadius = 26;
  const crankCenterY = 72;
  const crankCenterZ = 8;

  // Left pedal
  const leftAngle = theta;
  const leftAnkleY = crankCenterY + Math.sin(leftAngle) * crankRadius;
  const leftAnkleZ = crankCenterZ + Math.cos(leftAngle) * crankRadius;
  const leftAnkle: Point3D = { x: -25, y: leftAnkleY, z: leftAnkleZ };
  const leftToe: Point3D = { x: -25, y: leftAnkleY + 4, z: leftAnkleZ + 16 };

  // Right pedal (180° opposite)
  const rightAngle = theta + Math.PI;
  const rightAnkleY = crankCenterY + Math.sin(rightAngle) * crankRadius;
  const rightAnkleZ = crankCenterZ + Math.cos(rightAngle) * crankRadius;
  const rightAnkle: Point3D = { x: 25, y: rightAnkleY, z: rightAnkleZ };
  const rightToe: Point3D = { x: 25, y: rightAnkleY + 4, z: rightAnkleZ + 16 };

  // Knees track above pedals
  const leftKneeY = -12 + (leftAnkleY - (-12)) * 0.48;
  const leftKneeZ = -15 + (leftAnkleZ - (-15)) * 0.55 + 18;
  const leftKnee: Point3D = { x: -22, y: leftKneeY, z: leftKneeZ };

  const rightKneeY = -12 + (rightAnkleY - (-12)) * 0.48;
  const rightKneeZ = -15 + (rightAnkleZ - (-15)) * 0.55 + 18;
  const rightKnee: Point3D = { x: 22, y: rightKneeY, z: rightKneeZ };

  // Live knee extension check (optimal 25°-35° at bottom extension)
  const extensionCheck = Math.round(28 + Math.abs(Math.sin(theta)) * 44);

  let phaseName = 'POWER DRIVE (12 TO 5 O\'CLOCK)';
  if (Math.sin(theta) > 0.8) phaseName = 'BOTTOM EXTENSION (6 O\'CLOCK)';
  else if (Math.sin(theta) < -0.8) phaseName = 'TOP CADENCE RECOVERY';

  return {
    skeleton: {
      head, neck, chest, lumbar, pelvis,
      leftShoulder, rightShoulder,
      leftElbow, rightElbow,
      leftWrist, rightWrist,
      leftHip, rightHip,
      leftKnee, rightKnee,
      leftAnkle, rightAnkle,
      leftToe, rightToe,
    },
    phaseName,
    keyJointAngle: 88, // 88 RPM cadence
    depthAchieved: true,
  };
}

// 7. SKIPPING / JUMP ROPE 3D KINEMATICS (Vertical bounding, wrist circles, jump rope)
function calculateSkippingKinematics(progress: number) {
  const theta = progress * Math.PI * 2;
  const jumpBounce = Math.max(0, Math.sin(theta)) * 24;

  const pelvisY = 0 - jumpBounce;
  const pelvis: Point3D = { x: 0, y: pelvisY, z: 0 };
  const lumbar: Point3D = { x: 0, y: pelvisY - 32, z: 0 };
  const chest: Point3D = { x: 0, y: pelvisY - 72, z: 0 };
  const neck: Point3D = { x: 0, y: pelvisY - 96, z: 0 };
  const head: Point3D = { x: 0, y: pelvisY - 122, z: 0 };

  const leftHip: Point3D = { x: -16, y: pelvisY, z: 0 };
  const rightHip: Point3D = { x: 16, y: pelvisY, z: 0 };

  // Pinned close stance jumping together
  const kneeY = pelvisY + 68;
  const leftKnee: Point3D = { x: -16, y: kneeY, z: 4 };
  const rightKnee: Point3D = { x: 16, y: kneeY, z: 4 };

  const ankleY = pelvisY + 125;
  const leftAnkle: Point3D = { x: -15, y: ankleY, z: 0 };
  const rightAnkle: Point3D = { x: 15, y: ankleY, z: 0 };
  const leftToe: Point3D = { x: -15, y: ankleY + 2, z: 18 };
  const rightToe: Point3D = { x: 15, y: ankleY + 2, z: 18 };

  // Arms: Elbows pinned close to ribs
  const leftShoulder: Point3D = { x: -34, y: pelvisY - 72, z: 0 };
  const rightShoulder: Point3D = { x: 34, y: pelvisY - 72, z: 0 };

  const leftElbow: Point3D = { x: -36, y: pelvisY - 32, z: 2 };
  const rightElbow: Point3D = { x: 36, y: pelvisY - 32, z: 2 };

  // Wrists rotating in tight circular revolutions
  const wristR = 8;
  const leftWrist: Point3D = {
    x: -38 + Math.sin(theta) * 2,
    y: pelvisY - 14 + Math.cos(theta) * wristR,
    z: 22 + Math.sin(theta) * wristR,
  };
  const rightWrist: Point3D = {
    x: 38 - Math.sin(theta) * 2,
    y: pelvisY - 14 + Math.cos(theta) * wristR,
    z: 22 + Math.sin(theta) * wristR,
  };

  let phaseName = 'WRIST REVOLUTION & BOUNCE';
  if (jumpBounce > 16) phaseName = 'ROPE PASSAGE CLEARANCE (PASS)';
  else if (jumpBounce < 3) phaseName = 'BALL-OF-FOOT REBOUND';

  return {
    skeleton: {
      head, neck, chest, lumbar, pelvis,
      leftShoulder, rightShoulder,
      leftElbow, rightElbow,
      leftWrist, rightWrist,
      leftHip, rightHip,
      leftKnee, rightKnee,
      leftAnkle, rightAnkle,
      leftToe, rightToe,
    },
    phaseName,
    keyJointAngle: 142, // 142 BPM jump rate
    depthAchieved: jumpBounce > 12,
  };
}

// 8. SWIMMING 3D KINEMATICS (Horizontal streamline, alternating high-elbow stroke, flutter kick)
function calculateSwimmingKinematics(progress: number) {
  const theta = progress * Math.PI * 2;
  const roll = Math.sin(theta) * 16; // Longitudinal body roll

  const groundY = 35;
  const pelvis: Point3D = { x: 0, y: groundY + roll * 0.2, z: -20 };
  const lumbar: Point3D = { x: 0, y: groundY + roll * 0.4, z: 12 };
  const chest: Point3D = { x: 0, y: groundY + roll * 0.5, z: 45 };
  const neck: Point3D = { x: 0, y: groundY - 2, z: 72 };
  const head: Point3D = { x: 0, y: groundY - 5, z: 92 };

  const leftHip: Point3D = { x: -18, y: groundY + roll * 0.3, z: -20 };
  const rightHip: Point3D = { x: 18, y: groundY - roll * 0.3, z: -20 };

  // Flutter kick in water
  const kickL = Math.sin(theta * 3) * 14;
  const kickR = Math.sin(theta * 3 + Math.PI) * 14;

  const leftKnee: Point3D = { x: -16, y: groundY + kickL * 0.4, z: -80 };
  const rightKnee: Point3D = { x: 16, y: groundY + kickR * 0.4, z: -80 };

  const leftAnkle: Point3D = { x: -16, y: groundY + kickL, z: -140 };
  const rightAnkle: Point3D = { x: 16, y: groundY + kickR, z: -140 };
  const leftToe: Point3D = { x: -16, y: groundY + kickL + 2, z: -155 };
  const rightToe: Point3D = { x: 16, y: groundY + kickR + 2, z: -155 };

  // Alternating High-Elbow Freestyle Stroke
  const leftShoulder: Point3D = { x: -34, y: groundY + roll, z: 45 };
  const rightShoulder: Point3D = { x: 34, y: groundY - roll, z: 45 };

  // Left arm cycle: high elbow recovery -> entry -> underwater pull
  const leftStroke = theta;
  const leftElbow: Point3D = {
    x: -36,
    y: groundY - 32 * Math.max(0, Math.sin(leftStroke)),
    z: 45 + Math.cos(leftStroke) * 45,
  };
  const leftWrist: Point3D = {
    x: -30,
    y: groundY + 12 - 20 * Math.sin(leftStroke),
    z: 45 + Math.cos(leftStroke) * 75,
  };

  // Right arm opposite
  const rightStroke = theta + Math.PI;
  const rightElbow: Point3D = {
    x: 36,
    y: groundY - 32 * Math.max(0, Math.sin(rightStroke)),
    z: 45 + Math.cos(rightStroke) * 45,
  };
  const rightWrist: Point3D = {
    x: 30,
    y: groundY + 12 - 20 * Math.sin(rightStroke),
    z: 45 + Math.cos(rightStroke) * 75,
  };

  let phaseName = 'STREAMLINE PROPULSION';
  if (Math.sin(leftStroke) > 0.6) phaseName = 'LEFT HIGH-ELBOW CATCH';
  else if (Math.sin(rightStroke) > 0.6) phaseName = 'RIGHT HIGH-ELBOW CATCH';

  return {
    skeleton: {
      head, neck, chest, lumbar, pelvis,
      leftShoulder, rightShoulder,
      leftElbow, rightElbow,
      leftWrist, rightWrist,
      leftHip, rightHip,
      leftKnee, rightKnee,
      leftAnkle, rightAnkle,
      leftToe, rightToe,
    },
    phaseName,
    keyJointAngle: 105, // 105° high-elbow angle
    depthAchieved: true,
  };
}

// 9. YOGA / SURYA NAMASKAR 3D KINEMATICS (Harmonic multi-phase asana flow)
function calculateYogaKinematics(progress: number) {
  // 4 Asana flow phases
  const p = progress;
  let phaseName = '1. PRANAMASANA (MOUNTAIN)';

  const footSpacing = 24;
  const leftAnkle: Point3D = { x: -footSpacing, y: 125, z: 0 };
  const rightAnkle: Point3D = { x: footSpacing, y: 125, z: 0 };
  const leftToe: Point3D = { x: -footSpacing, y: 125, z: 20 };
  const rightToe: Point3D = { x: footSpacing, y: 125, z: 20 };

  const leftKnee: Point3D = { x: -footSpacing, y: 70, z: 0 };
  const rightKnee: Point3D = { x: footSpacing, y: 70, z: 0 };

  const pelvis: Point3D = { x: 0, y: 10, z: 0 };
  const leftHip: Point3D = { x: -18, y: 10, z: 0 };
  const rightHip: Point3D = { x: 18, y: 10, z: 0 };

  let lumbarZ = 0;
  let chestY = -65;
  let chestZ = 0;
  let headY = -120;
  let headZ = 0;
  let armRaise = 0;
  let foldFactor = 0;

  if (p < 0.25) {
    // 1. Mountain pose with hands at heart
    phaseName = '1. PRANAMASANA (MOUNTAIN POSE)';
    armRaise = 0;
  } else if (p < 0.5) {
    // 2. Upward salute (Hastauttanasana) arch
    phaseName = '2. HASTAUTTANASANA (UPWARD SALUTE)';
    const f = (p - 0.25) / 0.25;
    armRaise = f;
    lumbarZ = -f * 15;
    chestZ = -f * 25;
    headZ = -f * 20;
  } else if (p < 0.75) {
    // 3. Forward fold (Uttanasana)
    phaseName = '3. UTTANASANA (FORWARD FOLD)';
    foldFactor = (p - 0.5) / 0.25;
    chestY = -65 + foldFactor * 135;
    chestZ = foldFactor * 45;
    headY = -120 + foldFactor * 195;
    headZ = foldFactor * 35;
  } else {
    // 4. Return to center & reset
    phaseName = '4. ASHWA SANCHALANASANA (LUNGE FLOW)';
    const r = (p - 0.75) / 0.25;
    chestY = 70 - r * 135;
    headY = 75 - r * 195;
  }

  const lumbar: Point3D = { x: 0, y: -28 + foldFactor * 60, z: lumbarZ };
  const chest: Point3D = { x: 0, y: chestY, z: chestZ };
  const neck: Point3D = { x: 0, y: chestY - 24, z: chestZ };
  const head: Point3D = { x: 0, y: headY, z: headZ };

  const leftShoulder: Point3D = { x: -34, y: chestY, z: chestZ };
  const rightShoulder: Point3D = { x: 34, y: chestY, z: chestZ };

  // Arms: Heart prayer vs Overhead arch vs Ground reach
  let leftWrist: Point3D;
  let rightWrist: Point3D;
  let leftElbow: Point3D;
  let rightElbow: Point3D;

  if (p < 0.25) {
    // Hands together at heart
    leftElbow = { x: -30, y: chestY + 15, z: 12 };
    rightElbow = { x: 30, y: chestY + 15, z: 12 };
    leftWrist = { x: -6, y: chestY + 8, z: 22 };
    rightWrist = { x: 6, y: chestY + 8, z: 22 };
  } else if (p < 0.5) {
    // Arms overhead in arc
    leftElbow = { x: -28, y: chestY - 45 * armRaise, z: chestZ };
    rightElbow = { x: 28, y: chestY - 45 * armRaise, z: chestZ };
    leftWrist = { x: -14, y: chestY - 85 * armRaise, z: chestZ };
    rightWrist = { x: 14, y: chestY - 85 * armRaise, z: chestZ };
  } else {
    // Reaching down toward toes
    leftElbow = { x: -25, y: chestY + 30, z: chestZ };
    rightElbow = { x: 25, y: chestY + 30, z: chestZ };
    leftWrist = { x: -15, y: 120, z: 15 };
    rightWrist = { x: 15, y: 120, z: 15 };
  }

  return {
    skeleton: {
      head, neck, chest, lumbar, pelvis,
      leftShoulder, rightShoulder,
      leftElbow, rightElbow,
      leftWrist, rightWrist,
      leftHip, rightHip,
      leftKnee, rightKnee,
      leftAnkle, rightAnkle,
      leftToe, rightToe,
    },
    phaseName,
    keyJointAngle: 180, // Spine alignment
    depthAchieved: true,
  };
}

// ============================================================================
// 3D PROJECTION ENGINE
// ============================================================================

function projectSkeleton(
  skeleton: HumanSkeleton3D,
  yaw: number,
  originX: number,
  originY: number,
  focalLength: number
): Record<keyof HumanSkeleton3D, ProjectedPoint> {
  const result = {} as Record<keyof HumanSkeleton3D, ProjectedPoint>;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  for (const key in skeleton) {
    const pt = skeleton[key as keyof HumanSkeleton3D];

    const rotX = pt.x * cosY - pt.z * sinY;
    const rotZ = pt.x * sinY + pt.z * cosY;
    const rotY = pt.y;

    const distance = focalLength + rotZ;
    const scale = focalLength / Math.max(10, distance);
    const alpha = Math.max(0.4, Math.min(1.0, 0.75 + (rotZ / 400)));

    result[key as keyof HumanSkeleton3D] = {
      x: originX + rotX * scale,
      y: originY + rotY * scale,
      z: rotZ,
      scale,
      alpha,
    };
  }

  return result;
}

// Project single 3D point
function project3DPoint(
  pt: Point3D,
  yaw: number,
  originX: number,
  originY: number,
  focalLength: number
): ProjectedPoint {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const rotX = pt.x * cosY - pt.z * sinY;
  const rotZ = pt.x * sinY + pt.z * cosY;
  const rotY = pt.y;
  const scale = focalLength / Math.max(10, focalLength + rotZ);
  return {
    x: originX + rotX * scale,
    y: originY + rotY * scale,
    z: rotZ,
    scale,
    alpha: 0.9,
  };
}

// ============================================================================
// HOLOGRAPHIC ACCESSORIES & GEAR RENDERERS
// ============================================================================

// Holographic Bicycle for Cycling Challenges
function drawHolographicBike(
  ctx: CanvasRenderingContext2D,
  p: Record<keyof HumanSkeleton3D, ProjectedPoint>,
  yaw: number,
  originX: number,
  originY: number,
  focalLength: number,
  theme: HologramColorTheme,
  progress: number
) {
  const colors = getThemeColors(theme);
  ctx.save();

  // Saddle, Bottom Bracket, Handlebars, Wheels in 3D
  const bb = project3DPoint({ x: 0, y: 72, z: 8 }, yaw, originX, originY, focalLength);
  const saddle = project3DPoint({ x: 0, y: -6, z: -15 }, yaw, originX, originY, focalLength);
  const stem = project3DPoint({ x: 0, y: -30, z: 65 }, yaw, originX, originY, focalLength);
  const frontHub = project3DPoint({ x: 0, y: 72, z: 95 }, yaw, originX, originY, focalLength);
  const rearHub = project3DPoint({ x: 0, y: 72, z: -85 }, yaw, originX, originY, focalLength);

  ctx.strokeStyle = colors.primaryGlow;
  ctx.lineWidth = 1.6;

  // Frame Diamond Geometry
  ctx.beginPath();
  ctx.moveTo(saddle.x, saddle.y);
  ctx.lineTo(bb.x, bb.y);
  ctx.lineTo(rearHub.x, rearHub.y);
  ctx.lineTo(saddle.x, saddle.y);
  ctx.lineTo(stem.x, stem.y);
  ctx.lineTo(bb.x, bb.y);
  ctx.stroke();

  // Fork to front wheel
  ctx.beginPath();
  ctx.moveTo(stem.x, stem.y);
  ctx.lineTo(frontHub.x, frontHub.y);
  ctx.stroke();

  // Handlebars
  const barL = project3DPoint({ x: -28, y: -32, z: 70 }, yaw, originX, originY, focalLength);
  const barR = project3DPoint({ x: 28, y: -32, z: 70 }, yaw, originX, originY, focalLength);
  ctx.beginPath();
  ctx.moveTo(barL.x, barL.y);
  ctx.lineTo(stem.x, stem.y);
  ctx.lineTo(barR.x, barR.y);
  ctx.stroke();

  // Rotating Crankset Ring
  const crankR = 24 * bb.scale;
  ctx.beginPath();
  ctx.arc(bb.x, bb.y, crankR, 0, Math.PI * 2);
  ctx.strokeStyle = colors.highlight;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Wheels
  const wheelR = 38 * frontHub.scale;
  ctx.beginPath();
  ctx.arc(frontHub.x, frontHub.y, wheelR, 0, Math.PI * 2);
  ctx.arc(rearHub.x, rearHub.y, wheelR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// Holographic Jump Rope for Skipping Challenges
function drawHolographicJumpRope(
  ctx: CanvasRenderingContext2D,
  p: Record<keyof HumanSkeleton3D, ProjectedPoint>,
  yaw: number,
  originX: number,
  originY: number,
  focalLength: number,
  theme: HologramColorTheme,
  progress: number
) {
  const colors = getThemeColors(theme);
  const theta = progress * Math.PI * 2;

  ctx.save();
  // 3D Elliptical Arc of Jump Rope
  ctx.beginPath();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = colors.highlight;

  const ropePoints: Point3D[] = [];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI; // 0 to PI between hands
    // Position along arc
    const x = -38 + (76 * (i / segments));
    const arcHeight = Math.sin(t) * 160;
    const y = -14 + Math.cos(theta) * arcHeight;
    const z = 22 + Math.sin(theta) * arcHeight;
    ropePoints.push({ x, y, z });
  }

  for (let i = 0; i < ropePoints.length; i++) {
    const proj = project3DPoint(ropePoints[i], yaw, originX, originY, focalLength);
    if (i === 0) ctx.moveTo(proj.x, proj.y);
    else ctx.lineTo(proj.x, proj.y);
  }
  ctx.stroke();

  ctx.restore();
}

// ============================================================================
// HOLOGRAPHIC GRAPHICS & VISUAL FX RENDERERS
// ============================================================================

function getThemeColors(theme: HologramColorTheme) {
  switch (theme) {
    case 'EMERALD':
      return {
        primary: '#10b981',
        primaryGlow: 'rgba(16, 185, 129, 0.6)',
        secondary: '#059669',
        secondaryGlow: 'rgba(5, 150, 105, 0.3)',
        highlight: '#34d399',
        coreWhite: '#ffffff',
      };
    case 'AMBER':
      return {
        primary: '#f59e0b',
        primaryGlow: 'rgba(245, 158, 11, 0.6)',
        secondary: '#d97706',
        secondaryGlow: 'rgba(217, 119, 6, 0.3)',
        highlight: '#fbbf24',
        coreWhite: '#ffffff',
      };
    case 'CYAN':
    default:
      return {
        primary: '#00f0ff',
        primaryGlow: 'rgba(0, 240, 255, 0.6)',
        secondary: '#0ea5e9',
        secondaryGlow: 'rgba(14, 165, 233, 0.3)',
        highlight: '#38bdf8',
        coreWhite: '#ffffff',
      };
  }
}

// Draw circular holographic emitter platform at feet
function drawHolographicEmitter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: HologramColorTheme
) {
  const colors = getThemeColors(theme);
  const cx = width * 0.5;
  const cy = height * 0.52 + 130;
  const rx = 180;
  const ry = 42;

  ctx.save();
  ctx.lineWidth = 1.2;

  ctx.strokeStyle = colors.secondaryGlow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = colors.primaryGlow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.7, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = colors.highlight;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.4, ry * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const px = cx + Math.cos(a) * rx;
    const py = cy + Math.sin(a) * ry;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  const beamGrad = ctx.createLinearGradient(0, cy - 260, 0, cy);
  beamGrad.addColorStop(0, 'rgba(0, 240, 255, 0.0)');
  beamGrad.addColorStop(1, colors.secondaryGlow);
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.8, cy);
  ctx.lineTo(cx - rx * 0.4, cy - 260);
  ctx.lineTo(cx + rx * 0.4, cy - 260);
  ctx.lineTo(cx + rx * 0.8, cy);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Draw floating ambient holographic dust particles
function drawParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  particles: HologramParticle[],
  yaw: number,
  theme: HologramColorTheme
) {
  const colors = getThemeColors(theme);
  const cx = width * 0.5;
  const cy = height * 0.52;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  ctx.save();
  for (const p of particles) {
    p.y -= p.vy;
    if (p.y < -160) {
      p.y = 140;
      p.x = (Math.random() - 0.5) * 240;
    }

    const rx = p.x * cosY - p.z * sinY;
    const rz = p.x * sinY + p.z * cosY;
    const scale = 550 / (550 + rz);

    const sx = cx + rx * scale;
    const sy = cy + p.y * scale;

    ctx.fillStyle = colors.primary;
    ctx.globalAlpha = p.alpha * Math.max(0.2, scale);
    ctx.beginPath();
    ctx.arc(sx, sy, p.size * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Draw sweeping vertical laser scanline
function drawScanlineLaser(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scanlineY: number,
  theme: HologramColorTheme
) {
  const colors = getThemeColors(theme);

  ctx.save();
  const grad = ctx.createLinearGradient(0, scanlineY - 20, 0, scanlineY + 4);
  grad.addColorStop(0, 'rgba(0, 240, 255, 0.0)');
  grad.addColorStop(0.8, colors.secondaryGlow);
  grad.addColorStop(1, colors.primaryGlow);

  ctx.fillStyle = grad;
  ctx.fillRect(0, scanlineY - 20, width, 24);

  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, scanlineY);
  ctx.lineTo(width, scanlineY);
  ctx.stroke();

  ctx.restore();
}

// Draw volumetric anatomical limbs and glowing exoskeleton mesh
function drawHologramBody(
  ctx: CanvasRenderingContext2D,
  p: Record<keyof HumanSkeleton3D, ProjectedPoint>,
  theme: HologramColorTheme,
  showMuscles: boolean,
  depthAchieved: boolean,
  activity: ActivityType,
  progress: number
) {
  const colors = getThemeColors(theme);

  ctx.save();

  const drawVolumetricLimb = (
    p1: ProjectedPoint,
    p2: ProjectedPoint,
    radius1: number,
    radius2: number,
    muscleTension = false
  ) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len);
    const ny = (dx / len);

    const r1 = radius1 * p1.scale;
    const r2 = radius2 * p2.scale;

    ctx.beginPath();
    ctx.moveTo(p1.x + nx * r1, p1.y + ny * r1);
    ctx.lineTo(p2.x + nx * r2, p2.y + ny * r2);
    ctx.lineTo(p2.x - nx * r2, p2.y - ny * r2);
    ctx.lineTo(p1.x - nx * r1, p1.y - ny * r1);
    ctx.closePath();

    if (showMuscles && muscleTension) {
      ctx.fillStyle = depthAchieved ? 'rgba(52, 211, 153, 0.35)' : 'rgba(245, 158, 11, 0.3)';
      ctx.fill();
    } else {
      ctx.fillStyle = colors.secondaryGlow;
      ctx.fill();
    }

    ctx.strokeStyle = muscleTension ? (depthAchieved ? '#34d399' : '#f59e0b') : colors.primary;
    ctx.lineWidth = 1.2 * Math.min(p1.scale, p2.scale);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = colors.coreWhite;
    ctx.lineWidth = 1.0 * p1.scale;
    ctx.stroke();
  };

  const isSquatEccentric = activity === 'SQUATS' && progress > 0.2 && progress < 0.8;
  const isPushUpTension = activity === 'PUSH_UPS' && progress > 0.25 && progress < 0.75;
  const isPlankCore = activity === 'PLANK';
  const isLegDrive = (activity === 'RUNNING' || activity === 'CYCLING') && progress > 0.1;

  // 1. Legs
  drawVolumetricLimb(p.leftHip, p.leftKnee, 12, 9, isSquatEccentric || isLegDrive);
  drawVolumetricLimb(p.rightHip, p.rightKnee, 12, 9, isSquatEccentric || isLegDrive);
  drawVolumetricLimb(p.leftKnee, p.leftAnkle, 9, 6, isSquatEccentric || isLegDrive);
  drawVolumetricLimb(p.rightKnee, p.rightAnkle, 9, 6, isSquatEccentric || isLegDrive);

  // Feet
  drawVolumetricLimb(p.leftAnkle, p.leftToe, 6, 4);
  drawVolumetricLimb(p.rightAnkle, p.rightToe, 6, 4);

  // 2. Torso & Pelvis Girdle
  drawVolumetricLimb(p.leftHip, p.rightHip, 10, 10);
  drawVolumetricLimb(p.pelvis, p.lumbar, 14, 16, isPlankCore);
  drawVolumetricLimb(p.lumbar, p.chest, 16, 18, isPlankCore);
  drawVolumetricLimb(p.chest, p.neck, 12, 10);

  // Shoulder girdle
  drawVolumetricLimb(p.leftShoulder, p.chest, 11, 14, isPushUpTension);
  drawVolumetricLimb(p.rightShoulder, p.chest, 11, 14, isPushUpTension);

  // 3. Arms
  drawVolumetricLimb(p.leftShoulder, p.leftElbow, 9, 7, isPushUpTension);
  drawVolumetricLimb(p.rightShoulder, p.rightElbow, 9, 7, isPushUpTension);
  drawVolumetricLimb(p.leftElbow, p.leftWrist, 7, 5, isPushUpTension);
  drawVolumetricLimb(p.rightElbow, p.rightWrist, 7, 5, isPushUpTension);

  // 4. Head Hologram with Cyber Visor
  ctx.save();
  const headRadius = 14 * p.head.scale;
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, headRadius, 0, Math.PI * 2);
  ctx.fillStyle = colors.secondaryGlow;
  ctx.fill();
  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(p.head.x, p.head.y - 2 * p.head.scale, headRadius * 0.85, 3 * p.head.scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.coreWhite;
  ctx.fill();
  ctx.restore();

  // 5. Joint Spherical Energy Nodes
  const jointNodes = [
    p.head, p.neck, p.chest, p.lumbar, p.pelvis,
    p.leftShoulder, p.rightShoulder,
    p.leftElbow, p.rightElbow,
    p.leftWrist, p.rightWrist,
    p.leftHip, p.rightHip,
    p.leftKnee, p.rightKnee,
    p.leftAnkle, p.rightAnkle,
  ];

  for (const node of jointNodes) {
    const rad = 4.2 * node.scale;
    ctx.beginPath();
    ctx.arc(node.x, node.y, rad * 1.6, 0, Math.PI * 2);
    ctx.strokeStyle = colors.primaryGlow;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(node.x, node.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = colors.coreWhite;
    ctx.fill();
  }

  ctx.restore();
}

// Draw live Biomechanical angles, joint arcs, and depth lasers
function drawBiomechanicalHUD(
  ctx: CanvasRenderingContext2D,
  p: Record<keyof HumanSkeleton3D, ProjectedPoint>,
  activity: ActivityType,
  angle: number,
  phaseName: string,
  depthAchieved: boolean,
  showAngles: boolean,
  showGuidelines: boolean,
  theme: HologramColorTheme,
  width: number,
  height: number,
  progress: number
) {
  const colors = getThemeColors(theme);
  ctx.save();

  if (activity === 'SQUATS') {
    const knee = p.leftKnee.z > p.rightKnee.z ? p.leftKnee : p.rightKnee;

    if (showAngles) {
      ctx.beginPath();
      ctx.arc(knee.x, knee.y, 24 * knee.scale, 0, Math.PI * 0.7);
      ctx.strokeStyle = depthAchieved ? '#10b981' : colors.primary;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(knee.x + 12, knee.y - 18, 52, 22);
      ctx.strokeStyle = depthAchieved ? '#10b981' : colors.primary;
      ctx.strokeRect(knee.x + 12, knee.y - 18, 52, 22);

      ctx.fillStyle = depthAchieved ? '#34d399' : '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${angle}°`, knee.x + 18, knee.y - 3);
    }

    if (showGuidelines) {
      const targetY = knee.y;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = depthAchieved ? 'rgba(16, 185, 129, 0.7)' : 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width * 0.2, targetY);
      ctx.lineTo(width * 0.8, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = depthAchieved ? '#10b981' : colors.primary;
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        depthAchieved ? '✓ PARALLEL DEPTH VERIFIED (≤ 85°)' : 'TARGET DEPTH PLANE',
        width * 0.22,
        targetY - 6
      );
    }
  } else if (activity === 'PUSH_UPS') {
    const elbow = p.leftElbow.z > p.rightElbow.z ? p.leftElbow : p.rightElbow;
    if (showAngles) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(elbow.x + 10, elbow.y - 14, 52, 20);
      ctx.strokeStyle = depthAchieved ? '#10b981' : colors.primary;
      ctx.strokeRect(elbow.x + 10, elbow.y - 14, 52, 20);

      ctx.fillStyle = depthAchieved ? '#34d399' : '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${angle}°`, elbow.x + 16, elbow.y);
    }
  } else if (activity === 'CYCLING') {
    if (showGuidelines) {
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('OPTIMAL KNEE EXTENSION: 25°–35°', width * 0.2, height * 0.38);
      ctx.fillText('CADENCE: 85–95 RPM', width * 0.2, height * 0.42);
    }
  } else if (activity === 'RUNNING') {
    if (showGuidelines) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('TARGET CADENCE: 170+ SPM', width * 0.2, height * 0.38);
      ctx.fillText('MIDFOOT STRIKE ZONE', width * 0.2, height * 0.42);
    }
  } else if (activity === 'SKIPPING') {
    if (showGuidelines) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('GROUND CLEARANCE: 2–5 CM', width * 0.2, height * 0.38);
      ctx.fillText('WRIST REVOLUTION ISOLATION', width * 0.2, height * 0.42);
    }
  }

  ctx.restore();
}
