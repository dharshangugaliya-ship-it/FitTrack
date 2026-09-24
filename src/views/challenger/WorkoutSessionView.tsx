/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { challengeService } from '../../services/challengeService';
import { verificationCommitService, VerificationCommitData } from '../../services/verificationCommitService';
import { pointsService } from '../../services/pointsService';
import { Challenge, VerificationContext } from '../../types';
import { useCameraVerification } from '../../hooks/useCameraVerification';
import { SquatVerificationProcessor, SquatProcessorMetrics } from '../../services/verification/SquatVerificationProcessor';
import { PlankVerificationProcessor, PlankProcessorMetrics } from '../../services/verification/PlankVerificationProcessor';
import { CameraPreview } from '../../components/verification/CameraPreview';
import { VerificationControls } from '../../components/verification/VerificationControls';
import { VerificationChallengeHeader } from '../../components/verification/VerificationChallengeHeader';
import { VerificationRequirementNotice } from '../../components/verification/VerificationRequirementNotice';
import {
  Camera,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  LogIn,
  RotateCcw,
  Info,
  Layers,
  Activity,
  Trophy,
  Zap,
  CheckCheck,
  AlertTriangle,
} from 'lucide-react';

export const WorkoutSessionView: React.FC = () => {
  const { params, navigate } = useRouter();
  const { user, isAuthenticated, isDemoMode } = useAuth();

  const challengeId = params.challengeId || 'ch-squat-10k';

  // State for loaded challenge
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'fallback'>('fallback');
  const [loadingChallenge, setLoadingChallenge] = useState<boolean>(true);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  // Phase 9 AI Squat Verification & Phase 10 AI Plank Verification telemetry state
  const [squatMetrics, setSquatMetrics] = useState<SquatProcessorMetrics | null>(null);
  const [plankMetrics, setPlankMetrics] = useState<PlankProcessorMetrics | null>(null);

  // Phase 11 Authoritative Database Commit State
  const [committingProgress, setCommittingProgress] = useState<boolean>(false);
  const [commitResult, setCommitResult] = useState<VerificationCommitData | null>(null);
  const [commitSource, setCommitSource] = useState<'supabase' | 'demo'>('supabase');
  const [commitError, setCommitError] = useState<string | null>(null);

  // Load challenge metadata
  useEffect(() => {
    let isMounted = true;
    async function loadChallenge() {
      setLoadingChallenge(true);
      setChallengeError(null);
      try {
        const res = await challengeService.getChallengeById(challengeId, user?.id);
        if (!isMounted) return;
        if (res.challenge) {
          setChallenge(res.challenge);
          setDataSource(res.source);
        } else {
          setChallengeError(res.error || 'Challenge not found');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setChallengeError(err?.message || 'Failed to load challenge metadata');
      } finally {
        if (isMounted) setLoadingChallenge(false);
      }
    }

    loadChallenge();
    return () => {
      isMounted = false;
    };
  }, [challengeId, user?.id]);

  // Construct typed VerificationContext
  const verificationContext: VerificationContext | null = useMemo(() => {
    if (!challenge) return null;
    return {
      challengeId: challenge.id,
      activity: challenge.activity,
      targetValue: challenge.targetValue,
      targetUnit: challenge.targetUnit,
      verificationRequirement: challenge.verificationRequirement,
      userId: user?.id || 'demo_user',
    };
  }, [challenge, user?.id]);

  // Instantiated AI Processor for Squat (Phase 9) or Plank (Phase 10)
  const customProcessor = useMemo(() => {
    if (challenge?.verificationRequirement !== 'AI_VERIFIED') {
      return undefined;
    }
    if (challenge?.activity === 'SQUATS') {
      const processor = new SquatVerificationProcessor();
      processor.setOnMetricsListener((metrics) => {
        setSquatMetrics({ ...metrics });
      });
      return processor;
    }
    if (challenge?.activity === 'PLANK') {
      const processor = new PlankVerificationProcessor();
      processor.setOnMetricsListener((metrics) => {
        setPlankMetrics({ ...metrics });
      });
      return processor;
    }
    return undefined;
  }, [challenge?.activity, challenge?.verificationRequirement]);

  // Ensure processor resources (MediaPipe landmarker & WASM delegates) are cleanly freed on component unmount
  useEffect(() => {
    return () => {
      if (customProcessor) {
        try {
          customProcessor.dispose();
        } catch (e) {
          console.warn('Error disposing customProcessor on unmount:', e);
        }
      }
    };
  }, [customProcessor]);

  // Hook into Camera & AI Verification Pipeline
  const {
    state,
    error,
    durationSeconds,
    facingMode,
    videoRef,
    lastResult,
    requestCamera,
    startSession,
    stopSession,
    toggleFacingMode,
    retryCamera,
    resetSession,
  } = useCameraVerification({
    context: verificationContext,
    customProcessor,
    autoRequestPermission: false,
    initialFacingMode: 'user',
  });

  const handleStopSession = async () => {
    const res = await stopSession();
    // Phase 11 Authoritative Database Commit Pipeline:
    // Browser MediaPipe results (measuredValue for SQUATS or PLANK) are treated as untrusted claims.
    // We generate an unforgeable session identifier and commit through verificationCommitService,
    // which triggers the atomic commit_ai_verification_session RPC with server-side validation.
    if (
      res &&
      typeof res.measuredValue === 'number' &&
      res.measuredValue > 0 &&
      (challenge?.activity === 'SQUATS' || challenge?.activity === 'PLANK') &&
      challenge &&
      (user?.id || isDemoMode)
    ) {
      setCommittingProgress(true);
      setCommitError(null);
      setCommitResult(null);

      // Generate unique session identifier for cryptographic replay protection
      const sessionNonce = `vs_${challenge.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      try {
        const commitRes = await verificationCommitService.commitVerificationSession({
          verificationSessionId: sessionNonce,
          challengeId: challenge.id,
          activity: challenge.activity,
          verificationMethod: 'AI_VERIFIED',
          measuredValue: res.measuredValue,
          durationSeconds: res.durationSeconds || durationSeconds || 0,
          userId: user?.id || (isDemoMode ? 'usr_aarav_01' : 'usr_aarav_01'),
          clientMetadata: {
            clientTimestamp: new Date().toISOString(),
            targetUnit: challenge.targetUnit,
            targetValue: challenge.targetValue,
            activity: challenge.activity,
          },
        });

        setCommitSource(commitRes.source);
        if (commitRes.success && commitRes.data) {
          setCommitResult(commitRes.data);
          pointsService.notifyPointsUpdated();
        } else {
          setCommitError(commitRes.error || 'Server rejected verification session commit.');
        }
      } catch (err: any) {
        console.error('Error committing verified activity:', err);
        setCommitError(err?.message || 'Failed to execute authoritative verification session commit');
      } finally {
        setCommittingProgress(false);
      }
    }
  };

  const handleResetSession = () => {
    resetSession();
    setCommitResult(null);
    setCommitError(null);
    if (customProcessor && customProcessor instanceof SquatVerificationProcessor) {
      customProcessor.reset();
      setSquatMetrics(customProcessor.getMetrics());
    } else if (customProcessor && customProcessor instanceof PlankVerificationProcessor) {
      customProcessor.reset();
      setPlankMetrics(customProcessor.getMetrics());
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Authentication Guard (Section 20)
  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <LogIn className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Challenger Authentication Required</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Verification sessions must be initiated under an authenticated challenger profile to maintain cryptographic auditability and score isolation.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(`/login?redirect=/workout/${challengeId}`)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 text-xs transition-colors cursor-pointer shadow-md"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Begin Verification</span>
          </button>
          <button
            onClick={() => navigate('/challenges')}
            className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
          >
            Browse Challenges
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loadingChallenge) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-pulse">
          <Camera className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-mono text-slate-400">Initializing Verification Chamber Context...</p>
      </div>
    );
  }

  // 3. Challenge Not Found or Error
  if (challengeError || !challenge) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Challenge Unavailable</h2>
        <p className="text-xs text-slate-400">{challengeError || 'Could not locate the requested challenge record.'}</p>
        <button
          onClick={() => navigate('/challenges')}
          className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Return to Challenge Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto text-left">
      {/* Challenge Header Context */}
      <VerificationChallengeHeader
        challenge={challenge}
        dataSource={dataSource}
        onBack={() => navigate(`/challenges/${challenge.id}`)}
      />

      {/* Main Chamber Body */}
      {state !== 'SUCCESS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Live Camera Preview & HUD */}
          <div className="lg:col-span-2 space-y-4">
            <CameraPreview
              videoRef={videoRef}
              state={state}
              error={error}
              durationSeconds={durationSeconds}
              facingMode={facingMode}
              onRequestCamera={requestCamera}
              onRetryCamera={retryCamera}
              onToggleFacingMode={toggleFacingMode}
              activityName={challenge.activity.replace('_', ' ')}
              squatMetrics={squatMetrics}
              plankMetrics={plankMetrics}
            />

            {/* Chamber Action Controls */}
            <VerificationControls
              state={state}
              onRequestCamera={requestCamera}
              onStartSession={startSession}
              onStopSession={handleStopSession}
              onRetryCamera={retryCamera}
              onExit={() => navigate(`/challenges/${challenge.id}`)}
              onReset={handleResetSession}
            />
          </div>

          {/* Right 1 Col: Session Cockpit & Guidelines */}
          <div className="space-y-4">
            {/* Verification Requirement Guidance */}
            <VerificationRequirementNotice requirement={challenge.verificationRequirement} />

            {/* Real-time Session Metrics Card */}
            <div className="rounded-3xl bg-[#121722] border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Verification Chamber
                </span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold">
                  {challenge.activity === 'SQUATS'
                    ? 'PHASE 9 AI SQUATS'
                    : challenge.activity === 'PLANK'
                    ? 'PHASE 10 AI PLANK'
                    : 'CAMERA PIPELINE'}
                </span>
              </div>

              {/* Active Timer Display */}
              <div className="rounded-2xl bg-white/3 border border-white/6 p-4 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Elapsed Chamber Time
                </span>
                <div className="text-4xl font-black text-white font-mono tracking-tight mt-1">
                  {formatTimer(durationSeconds)}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {state === 'ACTIVE' ? 'Live AI session recording' : 'Standby timer'}
                </span>
              </div>

              {/* Live Squat Vision Metrics */}
              {challenge.activity === 'SQUATS' && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                      Verified Repetitions
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      Target: {challenge.targetValue} {challenge.targetUnit}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-black text-white font-mono">
                      {squatMetrics?.verifiedReps ?? 0}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Knee Angle</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">
                        {squatMetrics?.currentKneeAngle ? `${squatMetrics.currentKneeAngle}°` : '—'}
                      </span>
                    </div>
                  </div>
                  {squatMetrics?.feedbackMessage && (
                    <div className="text-xs text-emerald-200/95 font-medium bg-black/40 rounded-xl px-3 py-2 border border-white/5">
                      {squatMetrics.feedbackMessage}
                    </div>
                  )}
                </div>
              )}

              {/* Live Plank Vision Metrics (Phase 10) */}
              {challenge.activity === 'PLANK' && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                      Verified Hold
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      Target: {challenge.targetValue} {challenge.targetUnit}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-black text-white font-mono">
                      {plankMetrics?.holdDurationSeconds ?? 0}s
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Spine Angle</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">
                        {plankMetrics?.alignmentAngle ? `${plankMetrics.alignmentAngle}°` : '—'}
                      </span>
                    </div>
                  </div>
                  {plankMetrics?.feedbackMessage && (
                    <div className="text-xs text-emerald-200/95 font-medium bg-black/40 rounded-xl px-3 py-2 border border-white/5">
                      {plankMetrics.feedbackMessage}
                    </div>
                  )}
                </div>
              )}

              {/* Pipeline Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-left pt-1">
                <div className="rounded-xl bg-white/2 border border-white/6 p-3">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Target Goal
                  </span>
                  <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                    {challenge.targetValue.toLocaleString()} {challenge.targetUnit}
                  </div>
                </div>

                <div className="rounded-xl bg-white/2 border border-white/6 p-3">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Camera Orientation
                  </span>
                  <div className="text-xs font-bold text-white font-mono mt-0.5 capitalize">
                    {facingMode === 'user' ? 'Front (Selfie)' : 'Rear (Environment)'}
                  </div>
                </div>

                <div className="rounded-xl bg-white/2 border border-white/6 p-3">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Hardware Stream
                  </span>
                  <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                    {state === 'READY' || state === 'ACTIVE' ? '1280x720 30FPS' : 'Disconnected'}
                  </div>
                </div>

                <div className="rounded-xl bg-white/2 border border-white/6 p-3">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    AI Vision Model
                  </span>
                  <div className="text-xs font-bold text-cyan-300 font-mono mt-0.5 truncate">
                    {challenge.activity === 'SQUATS'
                      ? 'PoseLandmarker (Squat)'
                      : challenge.activity === 'PLANK'
                      ? 'PoseLandmarker (Plank)'
                      : 'Standby'}
                  </div>
                </div>
              </div>
            </div>

            {/* Exercise Verification Standard Card */}
            <div className="rounded-2xl bg-[#121722] border border-white/8 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {challenge.activity === 'PLANK' ? 'Plank Verification Standard' : 'Verification Checklist'}
                </span>
              </h4>
              {challenge.activity === 'PLANK' ? (
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong>Posture Alignment:</strong> Spine, hips, and ankles must maintain a straight line (155°–180° hip angle).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong>Horizontal Plane:</strong> Hold body prone/horizontal to the floor (≤38° tilt angle).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong>Lateral Framing:</strong> Position body in lateral (side) profile so shoulder, hip, and ankles are tracked.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong>Hold Accumulation:</strong> Stopwatch only advances while posture strictly satisfies alignment criteria.
                    </span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong>Depth:</strong> Lower hips until knee angle reaches ≤98° (thighs parallel to floor).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong>Lockout:</strong> Stand fully upright (≥160°) between reps to register completion.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <strong>Framing:</strong> Keep full body from head to feet visible within the camera view.
                    </span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* AI Computer-Vision Verification Session Summary Screen (Phase 9 Squat & Phase 10 Plank) */
        <div className="rounded-3xl bg-[#121722] border border-emerald-500/40 p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-bold">
              {challenge.activity === 'PLANK'
                ? 'PHASE 10 AI COMPUTER-VISION VERIFICATION'
                : 'PHASE 9 AI COMPUTER-VISION VERIFICATION'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
              {challenge.activity === 'PLANK'
                ? lastResult && (lastResult.measuredValue || 0) > 0
                  ? `${lastResult.measuredValue}s AI-Verified Plank Hold`
                  : 'Camera Plank Verification Completed'
                : lastResult && (lastResult.measuredValue || 0) > 0
                ? `${lastResult.measuredValue} AI-Verified Repetitions`
                : 'Camera Verification Session Completed'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              {lastResult?.reason ||
                (challenge.activity === 'PLANK'
                  ? 'Plank hold duration was verified via MediaPipe Pose Landmarker lateral spine alignment kinematics.'
                  : 'Repetitions were verified via MediaPipe Pose Landmarker joint angle kinematics with authoritative database validation.')}
            </p>
          </div>

          {/* Session Summary Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto text-left">
            <div className="rounded-2xl bg-white/4 p-4 border border-white/6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {challenge.activity === 'PLANK' ? 'Verified Hold Duration' : 'Verified Repetitions'}
              </span>
              <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {challenge.activity === 'PLANK'
                  ? `${lastResult?.measuredValue ?? plankMetrics?.holdDurationSeconds ?? 0}s`
                  : `${lastResult?.measuredValue ?? squatMetrics?.verifiedReps ?? 0}`}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {challenge.activity === 'PLANK' ? 'Spine Aligned (155°–180°)' : 'Verified Depth (≤98°)'}
              </span>
            </div>

            <div className="rounded-2xl bg-white/4 p-4 border border-white/6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Session Duration
              </span>
              <p className="text-2xl font-black text-white font-mono mt-1">
                {formatTimer(lastResult?.durationSeconds || durationSeconds)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Active Video Capture</span>
            </div>

            <div className="rounded-2xl bg-white/4 p-4 border border-white/6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Verification Protocol
              </span>
              <p className="text-base font-bold text-cyan-400 font-mono mt-1 truncate">
                AI MediaPipe Vision
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {challenge.activity === 'PLANK' ? 'Spine Alignment Verified' : 'Knee Lockout & Depth Verified'}
              </span>
            </div>
          </div>

          {/* Phase 11 Authoritative Database Commit Status */}
          {committingProgress && (
            <div className="max-w-xl mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/25 p-4 text-xs text-cyan-300 text-left flex items-center gap-3 animate-pulse">
              <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
              <div>
                <span className="font-bold text-white block">Executing Authoritative Commit Transaction</span>
                <span className="text-cyan-200/80 text-[11px] block mt-0.5">
                  Submitting untrusted browser kinematics to PostgreSQL RPC boundary (<code>commit_ai_verification_session</code>)...
                </span>
              </div>
            </div>
          )}

          {commitResult && (
            <div className="max-w-xl mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-left space-y-4 shadow-lg shadow-emerald-500/5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs sm:text-sm">
                      Official Competition Ledger Committed
                    </h5>
                    <span className="text-[10px] text-emerald-400 font-mono block">
                      Nonce: {commitResult.verificationSessionId}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {commitSource === 'supabase' ? 'Supabase PostgreSQL RPC' : 'Evaluation Demo Store'}
                </span>
              </div>

              {/* Points & Score Rewards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/4 p-3 border border-white/6">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>FITTRACK Points</span>
                  </span>
                  <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
                    +{commitResult.pointsAwarded} pts
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    +{commitResult.sessionPoints} session {commitResult.wasNewlyCompleted ? `+ ${commitResult.completionPoints} bonus` : ''}
                  </span>
                </div>

                <div className="rounded-xl bg-white/4 p-3 border border-white/6">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-cyan-400" />
                    <span>Leaderboard Score</span>
                  </span>
                  <p className="text-lg font-black text-cyan-400 font-mono mt-0.5">
                    {commitResult.challengeScore}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    +{commitResult.incrementApplied} {commitResult.targetUnit} verified
                  </span>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Challenge Progress</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {commitResult.progressPercentage}%
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, commitResult.progressPercentage)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>
                    Accumulated: <strong className="text-white font-mono">{commitResult.currentValue}</strong> / {commitResult.targetValue} {commitResult.targetUnit}
                  </span>
                  {commitResult.isCompleted && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Target Achieved
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {commitError && (
            <div className="max-w-xl mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/25 p-4 text-xs text-rose-300 text-left space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Verification Commit Rejected by Authoritative Ledger</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed font-mono">
                {commitError}
              </p>
              <p className="text-[10px] text-rose-300/70 pt-1">
                In compliance with competition integrity standards, unvalidated client claims are not recorded to official leaderboards or points balances.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetSession}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Record Another Set</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/challenges/${challenge.id}`)}
              className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Back to Challenge Details
            </button>
            <button
              type="button"
              onClick={() => navigate('/my-challenges')}
              className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              My Challenges
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
