/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VerificationSessionState,
  CameraVerificationError,
  CameraVerificationErrorCode,
  VerificationContext,
  VerificationResult,
  VerificationProcessor,
  VerificationFrameResult,
} from '../types';
import { Phase8StandbyProcessor } from '../components/verification/VerificationProcessorInterface';

export interface UseCameraVerificationOptions {
  context?: VerificationContext | null;
  customProcessor?: VerificationProcessor;
  autoRequestPermission?: boolean;
  initialFacingMode?: 'user' | 'environment';
}

export interface UseCameraVerificationReturn {
  // State
  state: VerificationSessionState;
  error: CameraVerificationError | null;
  isSupported: boolean;
  isPermissionGranted: boolean;
  isCameraActive: boolean;
  isSessionActive: boolean;
  durationSeconds: number;
  facingMode: 'user' | 'environment';
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  lastResult: VerificationResult | null;
  latestFrameResult: VerificationFrameResult | null;
  processor: VerificationProcessor;

  // Actions
  requestCamera: () => Promise<boolean>;
  startSession: () => Promise<boolean>;
  stopSession: () => Promise<VerificationResult | null>;
  toggleFacingMode: () => Promise<void>;
  retryCamera: () => Promise<boolean>;
  resetSession: () => void;
  stopCamera: () => void;
}

export function useCameraVerification(
  options: UseCameraVerificationOptions = {}
): UseCameraVerificationReturn {
  const {
    context = null,
    customProcessor,
    autoRequestPermission = false,
    initialFacingMode = 'user',
  } = options;

  // State machine
  const [state, setState] = useState<VerificationSessionState>('IDLE');
  const [error, setError] = useState<CameraVerificationError | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [lastResult, setLastResult] = useState<VerificationResult | null>(null);
  const [latestFrameResult, setLatestFrameResult] = useState<VerificationFrameResult | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const processorRef = useRef<VerificationProcessor>(customProcessor || new Phase8StandbyProcessor());
  const isActionInProgressRef = useRef<boolean>(false);

  // Synchronize processor if prop changes
  useEffect(() => {
    if (customProcessor) {
      processorRef.current = customProcessor;
    }
  }, [customProcessor]);

  // Helper: map technical DOMException to user-friendly CameraVerificationError
  const mapMediaError = useCallback((err: any): CameraVerificationError => {
    const errorName = err?.name || '';
    const message = err?.message || 'Unknown camera error';

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return {
        code: 'PERMISSION_DENIED',
        message: 'Camera permission was denied.',
        details: 'Please enable camera access in your browser or site settings and click Retry.',
        recoverable: true,
      };
    }

    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return {
        code: 'NO_CAMERA',
        message: 'No video capture device detected.',
        details: 'Connect a webcam or use a device with an integrated camera.',
        recoverable: true,
      };
    }

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return {
        code: 'CAMERA_IN_USE',
        message: 'Camera is currently in use by another application or tab.',
        details: 'Please close any other apps (e.g. Zoom, Meet) utilizing your camera and try again.',
        recoverable: true,
      };
    }

    if (errorName === 'OverconstrainedError') {
      return {
        code: 'STREAM_INITIALIZATION_FAILED',
        message: 'The requested camera video constraints could not be satisfied.',
        details: 'Falling back to standard camera resolution.',
        recoverable: true,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'Failed to access camera video stream.',
      details: message,
      recoverable: true,
    };
  }, []);

  // Centralized Resource Cleanup: stop all active media stream tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping video track:', e);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Stop timer helper
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Step 1: Check platform and browser capability
  useEffect(() => {
    const hasMediaDevices =
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    // Insecure contexts (HTTP instead of HTTPS, except localhost) block getUserMedia
    const isSecure =
      typeof window !== 'undefined'
        ? window.isSecureContext || window.location.hostname === 'localhost'
        : true;

    if (!hasMediaDevices || !isSecure) {
      setIsSupported(false);
      setState('UNSUPPORTED');
      setError({
        code: 'UNSUPPORTED_BROWSER',
        message: 'Web camera video capture is not supported in this environment.',
        details: !isSecure
          ? 'Camera access requires a secure HTTPS connection.'
          : 'Your browser does not expose the MediaDevices API.',
        recoverable: false,
      });
      return;
    }

    setIsSupported(true);

    // Proactive permission status query (supported in modern Chrome / Chromium)
    if (navigator.permissions && (navigator.permissions as any).query) {
      try {
        (navigator.permissions as any)
          .query({ name: 'camera' as any })
          .then((permStatus: any) => {
            if (permStatus.state === 'granted') {
              setIsPermissionGranted(true);
            } else if (permStatus.state === 'denied') {
              setIsPermissionGranted(false);
              setState('DENIED');
              setError({
                code: 'PERMISSION_DENIED',
                message: 'Camera permission is blocked.',
                details: 'Enable camera access in your browser site permissions to verify exercises.',
                recoverable: true,
              });
            }
          })
          .catch(() => {
            // Non-critical: some browsers don't support camera name in permissions query
          });
      } catch {
        // Ignore
      }
    }
  }, []);

  // Initialize camera stream
  const initializeCameraStream = useCallback(
    async (targetFacingMode: 'user' | 'environment'): Promise<MediaStream | null> => {
      stopStream();

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: targetFacingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      };

      try {
        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr: any) {
          // If overconstrained or failed, retry with basic video fallback
          if (initialErr?.name === 'OverconstrainedError' || initialErr?.name === 'ConstraintNotSatisfiedError') {
            console.warn('Overconstrained camera, falling back to unconstrained video');
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw initialErr;
          }
        }

        streamRef.current = mediaStream;
        setIsPermissionGranted(true);

        // Attach stream to video DOM element
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((playErr) => {
              console.warn('Auto-play was blocked or interrupted:', playErr);
            });
          };
        }

        return mediaStream;
      } catch (err: any) {
        const mappedErr = mapMediaError(err);
        setError(mappedErr);
        if (mappedErr.code === 'PERMISSION_DENIED') {
          setState('DENIED');
        } else {
          setState('ERROR');
        }
        return null;
      }
    },
    [stopStream, mapMediaError]
  );

  // Request camera access
  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (isActionInProgressRef.current) return false;
    if (!isSupported) return false;

    isActionInProgressRef.current = true;
    setState('REQUESTING_PERMISSION');
    setError(null);

    try {
      const stream = await initializeCameraStream(facingMode);
      if (stream) {
        setState('READY');
        return true;
      }
      return false;
    } finally {
      isActionInProgressRef.current = false;
    }
  }, [isSupported, facingMode, initializeCameraStream]);

  // Start verification session
  const startSession = useCallback(async (): Promise<boolean> => {
    if (isActionInProgressRef.current) return false;
    if (state === 'ACTIVE' || state === 'STARTING') return false;

    isActionInProgressRef.current = true;
    setState('STARTING');
    setError(null);
    setLastResult(null);

    try {
      // If camera stream is not active yet, initialize it first
      let currentStream = streamRef.current;
      if (!currentStream || !currentStream.active) {
        currentStream = await initializeCameraStream(facingMode);
        if (!currentStream) {
          return false;
        }
      }

      // Initialize processor if provided
      if (context) {
        await processorRef.current.initialize(context);
      }

      // Reset and begin session timer
      setDurationSeconds(0);
      stopTimer();
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);

      setState('ACTIVE');
      return true;
    } catch (err: any) {
      console.error('Failed to start verification session:', err);
      setError({
        code: 'SESSION_START_FAILED',
        message: 'Could not start verification session.',
        details: err?.message || 'Initialization error',
        recoverable: true,
      });
      setState('ERROR');
      return false;
    } finally {
      isActionInProgressRef.current = false;
    }
  }, [state, facingMode, initializeCameraStream, context, stopTimer]);

  // Stop verification session
  const stopSession = useCallback(async (): Promise<VerificationResult | null> => {
    if (isActionInProgressRef.current) return null;
    if (state !== 'ACTIVE' && state !== 'STARTING') return null;

    isActionInProgressRef.current = true;
    setState('STOPPING');
    stopTimer();

    try {
      setState('PROCESSING');

      // Cancel animation frame loop
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }

      // Finalize processor (in Phase 8, this yields PROCESSING_UNAVAILABLE / standby result)
      const result = await processorRef.current.finalize();
      setLastResult(result);

      setState('SUCCESS');
      return result;
    } catch (err: any) {
      console.error('Error stopping verification session:', err);
      setError({
        code: 'SESSION_STOP_FAILED',
        message: 'Failed to complete session processing cleanly.',
        details: err?.message,
        recoverable: true,
      });
      setState('ERROR');
      return null;
    } finally {
      isActionInProgressRef.current = false;
    }
  }, [state, stopTimer]);

  // Toggle front/rear camera
  const toggleFacingMode = useCallback(async () => {
    if (isActionInProgressRef.current) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    if (state === 'READY' || state === 'ACTIVE') {
      isActionInProgressRef.current = true;
      try {
        await initializeCameraStream(nextMode);
      } finally {
        isActionInProgressRef.current = false;
      }
    }
  }, [facingMode, state, initializeCameraStream]);

  // Retry camera
  const retryCamera = useCallback(async (): Promise<boolean> => {
    setError(null);
    return await requestCamera();
  }, [requestCamera]);

  // Reset session to Ready state
  const resetSession = useCallback(() => {
    stopTimer();
    setDurationSeconds(0);
    setLastResult(null);
    setError(null);
    processorRef.current.reset();
    setState(streamRef.current && streamRef.current.active ? 'READY' : 'IDLE');
  }, [stopTimer]);

  // Stop camera completely
  const stopCamera = useCallback(() => {
    stopTimer();
    stopStream();
    processorRef.current.reset();
    setState('IDLE');
  }, [stopTimer, stopStream]);

  // Auto request permission if configured
  useEffect(() => {
    if (autoRequestPermission && isSupported && state === 'IDLE') {
      requestCamera();
    }
  }, [autoRequestPermission, isSupported, state, requestCamera]);

  // Continuous frame processing loop when session is ACTIVE
  useEffect(() => {
    if (state !== 'ACTIVE') {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    const renderLoop = async () => {
      if (!isSubscribed || state !== 'ACTIVE') return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && !video.paused && !video.ended) {
        try {
          const timestamp = performance.now();
          const frameResult = await processorRef.current.processFrame(video, timestamp);
          if (isSubscribed) {
            setLatestFrameResult(frameResult);
          }
        } catch (err) {
          console.warn('Frame processing dropped:', err);
        }
      }

      if (isSubscribed) {
        animFrameIdRef.current = requestAnimationFrame(renderLoop);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isSubscribed = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [state]);

  // MANDATORY: Full cleanup on unmount to prevent camera tracks from remaining active
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      stopTimer();
      stopStream();
      try {
        processorRef.current.dispose();
      } catch (e) {
        console.warn('Error disposing verification processor:', e);
      }
    };
  }, [stopTimer, stopStream]);

  return {
    state,
    error,
    isSupported,
    isPermissionGranted,
    isCameraActive: Boolean(streamRef.current && streamRef.current.active),
    isSessionActive: state === 'ACTIVE',
    durationSeconds,
    facingMode,
    videoRef,
    stream: streamRef.current,
    lastResult,
    latestFrameResult,
    processor: processorRef.current,

    requestCamera,
    startSession,
    stopSession,
    toggleFacingMode,
    retryCamera,
    resetSession,
    stopCamera,
  };
}
