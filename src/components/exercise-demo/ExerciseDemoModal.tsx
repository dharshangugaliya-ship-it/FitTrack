/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Layers,
  ChevronRight,
  Eye,
  CheckCircle2,
  Info,
  ArrowRight,
  Video,
  Activity as ActivityIcon,
  Rotate3d,
  Gauge,
  Sliders,
} from 'lucide-react';
import { ActivityType, Challenge } from '../../types';
import { demoVideoService, ExerciseFormGuideline } from '../../services/demoVideoService';
import { AIAvatarCanvas, HologramViewMode, HologramColorTheme } from './AIAvatarCanvas';

interface ExerciseDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge?: Challenge | null;
  activity?: ActivityType;
  onLaunchWorkout?: () => void;
}

export const ExerciseDemoModal: React.FC<ExerciseDemoModalProps> = ({
  isOpen,
  onClose,
  challenge,
  activity,
  onLaunchWorkout,
}) => {
  // Always derive the authoritative activity from challenge or fallback
  const currentActivity: ActivityType = challenge?.activity || activity || 'SQUATS';
  const guideline: ExerciseFormGuideline = demoVideoService.getExerciseGuideline(currentActivity);

  // Active Presentation Tab: Defaults to AI_HOLOGRAM as requested
  const [activeTab, setActiveTab] = useState<'AI_HOLOGRAM' | 'VIDEO'>('AI_HOLOGRAM');

  // 3D Human Hologram State
  const [hologramPlaying, setHologramPlaying] = useState<boolean>(true);
  const [hologramSpeed, setHologramSpeed] = useState<number>(1.0);
  const [hologramViewAngle, setHologramViewAngle] = useState<HologramViewMode>('ANGLE');
  const [hologramColorTheme, setHologramColorTheme] = useState<HologramColorTheme>('CYAN');
  const [showAngles, setShowAngles] = useState<boolean>(true);
  const [showGuidelines, setShowGuidelines] = useState<boolean>(true);
  const [showMuscles, setShowMuscles] = useState<boolean>(true);
  const [hologramProgress, setHologramProgress] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  // Live Telemetry from Hologram
  const [livePhase, setLivePhase] = useState<string>('START');
  const [liveAngle, setLiveAngle] = useState<number>(175);
  const [liveProgress, setLiveProgress] = useState<number>(0);

  // Video State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [videoSpeed, setVideoSpeed] = useState<number>(1.0);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [videoErrorNotice, setVideoErrorNotice] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Form Guidelines from challenge custom data or default catalog
  const formInstructions =
    challenge?.formInstructions && challenge.formInstructions.length > 0
      ? challenge.formInstructions
      : guideline.formPoints;

  // Resolve video URL for this respective exercise
  useEffect(() => {
    let isMounted = true;
    async function resolve() {
      setVideoError(false);
      setVideoErrorNotice(null);
      const url = await demoVideoService.resolveVideoUrl(challenge?.demoVideoUrl, currentActivity);
      if (isMounted) {
        setResolvedVideoUrl(url);
      }
    }
    if (isOpen) {
      resolve();
      // Ensure hologram starts playing smoothly with default hologram view
      setActiveTab('AI_HOLOGRAM');
      setHologramPlaying(true);
      setHologramProgress(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, challenge?.id, challenge?.demoVideoUrl, challenge?.activity, currentActivity]);

  // Video event handlers
  const handleVideoPlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
        setIsVideoPlaying(true);
        setVideoError(false);
      } catch (err) {
        console.warn('Playback error, retrying muted:', err);
        try {
          video.muted = true;
          setIsMuted(true);
          await video.play();
          setIsVideoPlaying(true);
          setVideoError(false);
        } catch (mutedErr) {
          console.error('Video play rejected:', mutedErr);
          setIsVideoPlaying(false);
        }
      }
    } else {
      video.pause();
      setIsVideoPlaying(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoSpeedChange = (speed: number) => {
    setVideoSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleFullscreenToggle = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleVideoError = () => {
    console.warn('Video failed to load or decode for URL:', resolvedVideoUrl);
    setVideoError(true);
    setVideoErrorNotice('The remote video source could not be played. You can retry or use the 3D Hologram Simulator.');
    // Note: Do NOT forcefully switch tabs to AI_HOLOGRAM so the user stays on the Video tab and can retry or see options
  };

  // Hologram Scrubbing Handlers
  const handleHologramScrubStart = () => {
    setIsScrubbing(true);
    setHologramPlaying(false);
  };

  const handleHologramScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setHologramProgress(val);
  };

  const handleHologramScrubEnd = () => {
    setIsScrubbing(false);
  };

  const handleHologramResume = () => {
    setHologramProgress(null);
    setHologramPlaying(true);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (activeTab === 'VIDEO') {
          handleVideoPlayPause();
        } else {
          setHologramPlaying((prev) => !prev);
          if (hologramProgress !== null) setHologramProgress(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, isVideoPlaying, hologramPlaying, hologramProgress]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl bg-[#0a0d14] border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between gap-4 bg-[#0d121c]/90 backdrop-blur-md shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                AI Hologram Exercise Demonstration
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • {guideline.category}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{challenge?.title ? `${challenge.title} — ` : ''}</span>
              <span className="text-cyan-300">{guideline.exerciseName}</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Demonstration"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs: AI Hologram (Default) vs Full Video Demo */}
        <div className="px-6 pt-3 pb-2.5 border-b border-white/8 flex items-center justify-between flex-wrap gap-3 bg-[#080b11] shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('AI_HOLOGRAM')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
                activeTab === 'AI_HOLOGRAM'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/8 border border-white/10'
              }`}
            >
              <Rotate3d className="w-4 h-4" />
              <span>3D Human Hologram (AI Model)</span>
              <span className="rounded-md bg-slate-950/25 px-1.5 py-0.5 text-[9px] uppercase font-mono font-bold">
                60 FPS
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('VIDEO');
                setVideoError(false);
                setVideoErrorNotice(null);
                setTimeout(() => {
                  if (videoRef.current) {
                    videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {
                      // Autoplay restrictions are normal before user interaction
                      setIsVideoPlaying(false);
                    });
                  }
                }, 100);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'VIDEO'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/8 border border-white/10'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Video Playback</span>
              {challenge?.demoVideoUrl && challenge.demoVideoType === 'CUSTOM' && (
                <span className="rounded-md bg-slate-950/30 px-1.5 py-0.5 text-[9px] uppercase font-mono font-bold">
                  Custom
                </span>
              )}
            </button>
          </div>

          {/* Hologram Controls Bar (when in Hologram Mode) */}
          {activeTab === 'AI_HOLOGRAM' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Color Theme Selector */}
              <div className="flex items-center rounded-lg bg-black/60 border border-white/10 p-0.5">
                {(['CYAN', 'EMERALD', 'AMBER'] as HologramColorTheme[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setHologramColorTheme(theme)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                      hologramColorTheme === theme
                        ? theme === 'CYAN'
                          ? 'bg-cyan-500 text-slate-950'
                          : theme === 'EMERALD'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>

              {/* Overlays Toggle */}
              <button
                type="button"
                onClick={() => setShowAngles((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                  showAngles
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-black/50 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="Toggle Joint Angles HUD"
              >
                Angles {showAngles ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => setShowMuscles((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                  showMuscles
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-black/50 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="Toggle Volumetric Muscle Tension Glow"
              >
                Muscles {showMuscles ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Center Body: Media Player & Form Instructions */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          {videoErrorNotice && (
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3.5 flex items-center justify-between gap-3 text-cyan-300 text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>{videoErrorNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setVideoErrorNotice(null)}
                className="text-cyan-400 hover:text-white text-[11px] font-bold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main Media Player Chamber */}
          <div
            ref={playerContainerRef}
            className="relative rounded-2xl bg-black overflow-hidden border border-cyan-500/25 shadow-2xl group min-h-[380px] sm:min-h-[460px] flex flex-col justify-between"
          >
            {activeTab === 'AI_HOLOGRAM' ? (
              <div className="relative w-full h-full flex-1 flex flex-col">
                <AIAvatarCanvas
                  activity={currentActivity}
                  isPlaying={hologramPlaying}
                  playbackSpeed={hologramSpeed}
                  showAngles={showAngles}
                  showGuidelines={showGuidelines}
                  showMuscles={showMuscles}
                  viewAngle={hologramViewAngle}
                  colorTheme={hologramColorTheme}
                  manualProgress={hologramProgress}
                  onPhaseUpdate={(phase, angle, prog) => {
                    setLivePhase(phase);
                    setLiveAngle(angle);
                    setLiveProgress(prog);
                  }}
                />

                {/* Hologram Bottom Interactive Scrubbing & Control Dock */}
                <div className="p-3 bg-[#080b12] border-t border-cyan-500/20 flex flex-col gap-2">
                  {/* Phase Scrubbing Timeline Slider */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (hologramProgress !== null) {
                          handleHologramResume();
                        } else {
                          setHologramPlaying((prev) => !prev);
                        }
                      }}
                      className="rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 p-2 text-cyan-300 transition-colors cursor-pointer"
                      title={hologramPlaying && hologramProgress === null ? 'Pause Hologram' : 'Play Hologram'}
                    >
                      {hologramPlaying && hologramProgress === null ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </button>

                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-cyan-400 font-bold">
                          {livePhase}
                        </span>
                        <span className="text-slate-400">
                          {Math.round((hologramProgress ?? liveProgress) * 100)}% of Movement Cycle
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={hologramProgress ?? liveProgress}
                        onMouseDown={handleHologramScrubStart}
                        onTouchStart={handleHologramScrubStart}
                        onChange={handleHologramScrub}
                        onMouseUp={handleHologramScrubEnd}
                        onTouchEnd={handleHologramScrubEnd}
                        className="w-full h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    {/* Speed Selector */}
                    <div className="flex items-center rounded-lg bg-white/10 p-0.5 text-[10px] font-mono">
                      {[0.25, 0.5, 1.0, 1.5].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => setHologramSpeed(spd)}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            hologramSpeed === spd
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'text-slate-300 hover:text-white'
                          }`}
                          title={`Play at ${spd}x speed`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    {/* Fullscreen Button */}
                    <button
                      onClick={handleFullscreenToggle}
                      className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white transition-colors cursor-pointer"
                      title="Fullscreen Hologram"
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Full Video Playback Tab */
              <div className="relative w-full h-full flex-1 flex flex-col justify-center bg-black min-h-[380px]">
                {videoError ? (
                  <div className="relative w-full h-full flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#06090e] z-20">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-black text-white mb-2 tracking-wide">
                      Video Stream Offline or Unreachable
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                      {videoErrorNotice || 'The remote video demonstration cannot be streamed under current network conditions. You can retry loading or switch directly to the 60 FPS 3D Human Hologram simulator.'}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setVideoError(false);
                          setVideoErrorNotice(null);
                          if (videoRef.current) {
                            videoRef.current.load();
                            videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => setIsVideoPlaying(false));
                          }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Retry Video Stream</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('AI_HOLOGRAM')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95"
                      >
                        <Rotate3d className="w-4 h-4" />
                        <span>Switch to 3D Hologram (60 FPS)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      key={resolvedVideoUrl}
                      src={resolvedVideoUrl}
                      poster={guideline.posterUrl}
                      className="w-full h-full object-contain cursor-pointer max-h-[460px]"
                      onClick={handleVideoPlayPause}
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                      onPlaying={() => setIsVideoPlaying(true)}
                      onTimeUpdate={handleVideoTimeUpdate}
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      onEnded={() => setIsVideoPlaying(false)}
                      onError={handleVideoError}
                      playsInline
                      muted={isMuted}
                      loop
                      preload="auto"
                    />

                    {/* Big Center Play Overlay Button when paused */}
                    {!isVideoPlaying && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVideoPlayPause();
                        }}
                        className="absolute inset-0 m-auto w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs z-20 group"
                        aria-label="Play Exercise Demonstration Video"
                      >
                        <Play className="w-9 h-9 sm:w-10 sm:h-10 fill-current ml-1 transition-transform group-hover:scale-110" />
                      </button>
                    )}

                    {/* Exercise Label Watermark */}
                    <div className="absolute top-4 left-4 z-10 pointer-events-none">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 font-mono">
                          {guideline.exerciseName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          • HD Master Video
                        </span>
                      </div>
                    </div>

                    {/* Video HUD Controls Bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-4 transition-opacity space-y-2 opacity-95 group-hover:opacity-100 z-10">
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        step="0.1"
                        value={currentTime}
                        onChange={handleVideoSeek}
                        className="w-full h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        aria-label="Seek Video"
                      />

                      <div className="flex items-center justify-between gap-3 text-white">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoPlayPause();
                            }}
                            className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white transition-all cursor-pointer active:scale-95"
                            title={isVideoPlaying ? 'Pause Video' : 'Play Video'}
                            aria-label={isVideoPlaying ? 'Pause Video' : 'Play Video'}
                          >
                            {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMute();
                            }}
                            className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white transition-all cursor-pointer active:scale-95"
                            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                          >
                            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
                          </button>

                          <span className="text-xs font-mono text-slate-300">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg bg-white/10 p-0.5 text-[11px] font-mono">
                            {[0.5, 0.75, 1.0].map((spd) => (
                              <button
                                key={spd}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVideoSpeedChange(spd);
                                }}
                                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                  videoSpeed === spd ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                                }`}
                              >
                                {spd}x
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFullscreenToggle();
                            }}
                            className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white transition-all cursor-pointer active:scale-95"
                            title="Fullscreen"
                            aria-label="Toggle Fullscreen"
                          >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Key Form Checkpoints & Movement Phases Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Key Form Points */}
            <div className="rounded-2xl bg-white/3 border border-white/6 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Required Posture & Execution Checkpoints
                </h3>
              </div>
              <ul className="space-y-2.5">
                {formInstructions.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                    <span className="w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Movement Range & Biomechanical Targets */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/3 border border-white/6 p-5 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <ActivityIcon className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Computer Vision Certification Standard
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl bg-black/40 border border-white/5 p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Target Range
                    </span>
                    <span className="text-xs font-bold font-mono text-cyan-400 mt-0.5 block">
                      {guideline.biomechanicalMetrics.targetAngleRange}
                    </span>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/5 p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Ideal Cadence
                    </span>
                    <span className="text-xs font-bold font-mono text-white mt-0.5 block">
                      {guideline.biomechanicalMetrics.optimalCadence || 'Rhythmic'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Common Mistakes Warning */}
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 space-y-2">
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Common Form Violations (Disqualifies Reps)
                </span>
                <ul className="space-y-1">
                  {guideline.commonMistakes.slice(0, 3).map((mistake, idx) => (
                    <li key={idx} className="text-xs text-rose-200/90 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-rose-400" />
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Learning Boundary Notification */}
          <div className="rounded-2xl bg-black/40 border border-white/8 p-4 flex items-center justify-between gap-4 flex-wrap text-slate-400 text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-white font-bold block">
                  Interactive Holographic Reference Tool
                </span>
                <span className="text-slate-400 text-[11px]">
                  Viewing this 3D hologram simulator does not access your camera or initiate verification. Rotate 360°, inspect posture angles, and study form as long as needed.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer Bar */}
        <div className="px-6 py-4 border-t border-white/8 flex items-center justify-between gap-3 flex-wrap bg-[#0d121c]/90 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Close & Return to Session
          </button>

          {onLaunchWorkout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLaunchWorkout();
              }}
              className="flex items-center gap-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-6 py-2.5 text-xs font-black tracking-wide transition-all shadow-lg shadow-cyan-400/25 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Ready? Launch Workout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
