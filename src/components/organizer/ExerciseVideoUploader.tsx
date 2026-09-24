/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Video,
  X,
  RefreshCw,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  Plus,
  Trash2,
  Film,
  Info,
} from 'lucide-react';
import { ActivityType } from '../../types';
import { demoVideoService, ExerciseFormGuideline } from '../../services/demoVideoService';
import { AIAvatarCanvas } from '../exercise-demo/AIAvatarCanvas';

interface ExerciseVideoUploaderProps {
  activity: ActivityType;
  videoUrl?: string;
  videoType?: 'CUSTOM' | 'AI_GENERATED';
  formInstructions?: string[];
  onChangeVideo: (videoUrl: string | undefined, videoType: 'CUSTOM' | 'AI_GENERATED') => void;
  onChangeInstructions?: (instructions: string[]) => void;
}

export const ExerciseVideoUploader: React.FC<ExerciseVideoUploaderProps> = ({
  activity,
  videoUrl,
  videoType = 'AI_GENERATED',
  formInstructions,
  onChangeVideo,
  onChangeInstructions,
}) => {
  const guideline: ExerciseFormGuideline = demoVideoService.getExerciseGuideline(activity);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ fileName?: string; fileSizeMb?: number } | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');
  const [newInstructionText, setNewInstructionText] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'VIDEO' | 'AI_AVATAR'>(videoUrl ? 'VIDEO' : 'AI_AVATAR');

  // Resolve preview video URL
  useEffect(() => {
    let isMounted = true;
    async function resolve() {
      if (videoUrl) {
        const res = await demoVideoService.resolveVideoUrl(videoUrl, activity);
        if (isMounted) setResolvedPreviewUrl(res);
      } else {
        if (isMounted) setResolvedPreviewUrl(guideline.defaultVideoUrl);
      }
    }
    resolve();
    return () => {
      isMounted = false;
    };
  }, [videoUrl, activity, guideline.defaultVideoUrl]);

  // Handle File Upload (IndexedDB local vault storage)
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a valid video file (MP4, WebM, or MOV).');
      return;
    }

    // Limit to 100MB for fast client performance
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('Video file size exceeds 100MB. Please choose a smaller demonstration clip.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const record = await demoVideoService.storeUploadedVideoFile(file);
      setFileDetails({ fileName: record.fileName, fileSizeMb: record.fileSizeMb });
      setResolvedPreviewUrl(record.objectUrl);
      onChangeVideo(record.storageKey, 'CUSTOM');
      setPreviewMode('VIDEO');
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload video file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleRemoveVideo = async () => {
    if (videoUrl?.startsWith('idb_vid_')) {
      await demoVideoService.deleteUploadedVideo(videoUrl);
    }
    setFileDetails(null);
    onChangeVideo(undefined, 'AI_GENERATED');
    setResolvedPreviewUrl(guideline.defaultVideoUrl);
  };

  const handleTriggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Custom Form Instructions Management
  const currentInstructions = formInstructions && formInstructions.length > 0 ? formInstructions : guideline.formPoints;

  const handleAddInstruction = () => {
    if (!newInstructionText.trim() || !onChangeInstructions) return;
    const updated = [...currentInstructions, newInstructionText.trim()];
    onChangeInstructions(updated);
    setNewInstructionText('');
  };

  const handleRemoveInstruction = (index: number) => {
    if (!onChangeInstructions) return;
    const updated = currentInstructions.filter((_, i) => i !== index);
    onChangeInstructions(updated);
  };

  const isCustomVideo = Boolean(videoUrl && videoType === 'CUSTOM');

  return (
    <div className="rounded-2xl bg-white/2 border border-white/6 p-6 space-y-6 text-left">
      {/* Header Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/6 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Exercise Demonstration Video
            </span>
          </div>
          <h3 className="text-base font-bold text-white">
            Participant Form Guide & Exercise Video
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Every athlete joining this challenge will be able to click &quot;Watch Demo&quot; to review this video before launching verification.
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {isCustomVideo ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-mono font-bold text-indigo-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              Organizer Custom Video
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-bold text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              Default AI Demonstration
            </span>
          )}
        </div>
      </div>

      {/* Main Upload / Mode Selection Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Upload Dropzone & Controls */}
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
            className="hidden"
          />

          {!isCustomVideo ? (
            <div
              onClick={handleTriggerFileSelect}
              className="border-2 border-dashed border-white/15 hover:border-indigo-500/60 rounded-2xl p-6 text-center space-y-3 cursor-pointer transition-all bg-white/2 hover:bg-indigo-500/5 group"
            >
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  Click or drag video file to upload demonstration
                </p>
                <p className="text-[11px] text-slate-400">
                  Supports MP4, WebM, MOV (Max 100MB). 1080p recommended.
                </p>
              </div>
              <button
                type="button"
                disabled={isUploading}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                {isUploading ? 'Processing Video...' : 'Select Video File'}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/30 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                      {fileDetails?.fileName || 'Custom Exercise Demo Clip'}
                    </h4>
                    <p className="text-[10px] text-indigo-300/80 font-mono">
                      {fileDetails?.fileSizeMb ? `${fileDetails.fileSizeMb} MB • ` : ''}Ready for publishing
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleTriggerFileSelect}
                    className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title="Replace with another video file"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Replace</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="flex items-center gap-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer"
                    title="Remove custom video and revert to default AI demo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Fallback Notice */}
          <div className="rounded-xl bg-white/2 border border-white/5 p-3 flex items-start gap-2.5 text-slate-400 text-xs">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              If no custom video is provided, FITTRACK automatically equips your challenge with the standardized <strong>{guideline.exerciseName}</strong> demonstration model with interactive biomechanical range cues.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Video Preview Player */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Participant Preview
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewMode('VIDEO')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                  previewMode === 'VIDEO'
                    ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 bg-white/5'
                }`}
              >
                Video Preview
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('AI_AVATAR')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                  previewMode === 'AI_AVATAR'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 bg-white/5'
                }`}
              >
                AI Model
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl bg-black border border-white/10 overflow-hidden aspect-video flex items-center justify-center">
            {previewMode === 'VIDEO' ? (
              <video
                src={resolvedPreviewUrl}
                poster={guideline.posterUrl}
                controls
                className="w-full h-full object-contain"
                playsInline
                muted
                preload="metadata"
              />
            ) : (
              <AIAvatarCanvas activity={activity} viewAngle="SIDE" />
            )}
          </div>
        </div>
      </div>

      {/* Form Instructions Checklist Customizer */}
      {onChangeInstructions && (
        <div className="border-t border-white/6 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Key Posture Points for Athletes
              </h4>
              <p className="text-[11px] text-slate-400">
                Displayed directly beneath the demo video for participants.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {currentInstructions.map((pt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#0B0E14] border border-white/6 px-3 py-2 text-xs text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span>{pt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveInstruction(idx)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                  title="Remove checkpoint"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Checkpoint Input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newInstructionText}
              onChange={(e) => setNewInstructionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddInstruction();
                }
              }}
              placeholder="Add key posture instruction (e.g., 'Keep knees tracking over toes')..."
              className="flex-1 rounded-xl bg-[#0B0E14] border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddInstruction}
              className="flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Point</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
