import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { organizerService } from '../services/organizerService';
import {
  ChallengeFormData,
  ChallengeFormErrors,
  ChallengeType,
  ActivityType,
  VerificationStatus,
  ChallengeVisibility,
  ChallengeDifficulty,
  Challenge,
} from '../types';

// Whitelist of valid measurement units compatible with progress and leaderboard calculation
export const SUPPORTED_TARGET_UNITS = ['reps', 'km', 'meters', 'seconds', 'minutes', 'days', 'sessions', 'calories'] as const;

// Default initial state for a new challenge
export const DEFAULT_FORM_DATA: ChallengeFormData = {
  title: '',
  description: '',
  type: 'GOAL_BASED',
  activity: 'SQUATS',
  targetValue: 1000,
  targetUnit: 'reps',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  verificationRequirement: 'AI_VERIFIED',
  visibility: 'PUBLIC',
  difficulty: 'Intermediate',
  pointsReward: 150,
  bannerUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
};

// Activity preset configurations for intuitive auto-pairing
export const ACTIVITY_PRESETS: Record<
  ActivityType,
  {
    defaultUnit: string;
    defaultTarget: number;
    recommendedVerification: VerificationStatus;
    defaultBanner: string;
  }
> = {
  SQUATS: {
    defaultUnit: 'reps',
    defaultTarget: 5000,
    recommendedVerification: 'AI_VERIFIED',
    defaultBanner: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=80',
  },
  PUSH_UPS: {
    defaultUnit: 'reps',
    defaultTarget: 2500,
    recommendedVerification: 'AI_VERIFIED',
    defaultBanner: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800&auto=format&fit=crop&q=80',
  },
  PLANK: {
    defaultUnit: 'seconds',
    defaultTarget: 3600,
    recommendedVerification: 'AI_VERIFIED',
    defaultBanner: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=800&auto=format&fit=crop&q=80',
  },
  RUNNING: {
    defaultUnit: 'km',
    defaultTarget: 100,
    recommendedVerification: 'DEVICE_VERIFIED',
    defaultBanner: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80',
  },
  WALKING: {
    defaultUnit: 'km',
    defaultTarget: 150,
    recommendedVerification: 'DEVICE_VERIFIED',
    defaultBanner: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop&q=80',
  },
  CYCLING: {
    defaultUnit: 'km',
    defaultTarget: 250,
    recommendedVerification: 'DEVICE_VERIFIED',
    defaultBanner: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
  },
  SKIPPING: {
    defaultUnit: 'reps',
    defaultTarget: 10000,
    recommendedVerification: 'AI_VERIFIED',
    defaultBanner: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
  },
  SWIMMING: {
    defaultUnit: 'meters',
    defaultTarget: 15000,
    recommendedVerification: 'ORGANIZER_APPROVED',
    defaultBanner: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80',
  },
  YOGA: {
    defaultUnit: 'minutes',
    defaultTarget: 1200,
    recommendedVerification: 'ORGANIZER_APPROVED',
    defaultBanner: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
  },
};

export function useChallengeCreator(draftId?: string) {
  const { user, profile, isSupabaseConfigured } = useAuth();
  const [formData, setFormData] = useState<ChallengeFormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<ChallengeFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const effectiveOrganizerId = user?.id || 'org_priya_01';

  const organizerName =
    profile?.display_name || user?.user_metadata?.display_name || 'Official Organizer';
  const organizerAvatar =
    profile?.avatar_url || (user?.user_metadata?.avatar_url as string) || '';

  // Load existing draft if draftId is passed
  useEffect(() => {
    if (!draftId) {
      setFormData(DEFAULT_FORM_DATA);
      setHasUnsavedChanges(false);
      return;
    }

    let active = true;
    async function loadDraft() {
      if (!effectiveOrganizerId) return;
      setLoading(true);
      setLoadError(null);

      const res = await organizerService.getChallengeDraftById(draftId!, effectiveOrganizerId);
      if (active) {
        if (res.error || !res.challenge) {
          setLoadError(res.error || 'Unable to locate challenge draft');
        } else {
          const ch = res.challenge;
          setFormData({
            id: ch.id,
            title: ch.title,
            description: ch.description,
            type: ch.type,
            activity: ch.activity,
            targetValue: ch.targetValue,
            targetUnit: ch.targetUnit,
            startDate: ch.startDate ? ch.startDate.split('T')[0] : DEFAULT_FORM_DATA.startDate,
            endDate: ch.endDate ? ch.endDate.split('T')[0] : DEFAULT_FORM_DATA.endDate,
            verificationRequirement: ch.verificationRequirement,
            visibility: ch.visibility || 'PUBLIC',
            difficulty: ch.difficulty,
            pointsReward: ch.pointsReward,
            bannerUrl: ch.bannerUrl || DEFAULT_FORM_DATA.bannerUrl,
            demoVideoUrl: ch.demoVideoUrl,
            demoVideoType: ch.demoVideoType || (ch.demoVideoUrl ? 'CUSTOM' : 'AI_GENERATED'),
            formInstructions: ch.formInstructions,
          });
          setHasUnsavedChanges(false);
        }
        setLoading(false);
      }
    }

    loadDraft();
    return () => {
      active = false;
    };
  }, [draftId, effectiveOrganizerId]);

  // Update form fields
  const updateField = useCallback(
    <K extends keyof ChallengeFormData>(key: K, value: ChallengeFormData[K]) => {
      setFormData((prev) => {
        const next = { ...prev, [key]: value };

        // If activity changes, auto-suggest unit and verification tier
        if (key === 'activity') {
          const preset = ACTIVITY_PRESETS[value as ActivityType];
          if (preset) {
            next.targetUnit = preset.defaultUnit;
            next.targetValue = preset.defaultTarget;
            next.verificationRequirement = preset.recommendedVerification;
            next.bannerUrl = preset.defaultBanner;
          }
        }

        return next;
      });

      setHasUnsavedChanges(true);

      // Clear field error on edit
      setErrors((prev) => {
        if (prev[key as keyof ChallengeFormErrors]) {
          const copy = { ...prev };
          delete copy[key as keyof ChallengeFormErrors];
          return copy;
        }
        return prev;
      });
    },
    []
  );

  // Field Validation Matrix
  const validateForm = useCallback((): boolean => {
    const errs: ChallengeFormErrors = {};

    // Title validation
    if (!formData.title || !formData.title.trim()) {
      errs.title = 'Challenge title is required';
    } else if (formData.title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters';
    } else if (formData.title.trim().length > 120) {
      errs.title = 'Title cannot exceed 120 characters';
    }

    // Description validation
    if (!formData.description || !formData.description.trim()) {
      errs.description = 'Challenge description is required';
    } else if (formData.description.trim().length < 15) {
      errs.description = 'Description must be at least 15 characters to guide athletes';
    }

    // Target value validation
    if (formData.targetValue === undefined || formData.targetValue === null || isNaN(formData.targetValue)) {
      errs.targetValue = 'Target value must be a valid number';
    } else if (formData.targetValue <= 0) {
      errs.targetValue = 'Target value must be greater than zero';
    } else if (formData.targetValue > 100000000) {
      errs.targetValue = 'Target value exceeds realistic competition bounds';
    }

    // Target unit validation
    if (!formData.targetUnit || !formData.targetUnit.trim()) {
      errs.targetUnit = 'Target unit is required (e.g. reps, km, seconds)';
    } else {
      const normalizedUnit = formData.targetUnit.trim().toLowerCase();
      const isKnownUnit = (SUPPORTED_TARGET_UNITS as readonly string[]).includes(normalizedUnit);
      if (!isKnownUnit && normalizedUnit.length > 20) {
        errs.targetUnit = 'Target unit must be a valid measurement unit (e.g. reps, km, seconds, meters, minutes)';
      }
    }

    // Dates validation
    if (!formData.startDate) {
      errs.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      errs.endDate = 'End date is required';
    }
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(formData.endDate).getTime();
      if (isNaN(start) || isNaN(end)) {
        errs.endDate = 'Dates must be valid calendar dates';
      } else if (end < start) {
        errs.endDate = 'End date cannot precede the challenge start date';
      }
    }

    // Points reward validation
    if (formData.pointsReward === undefined || formData.pointsReward === null || isNaN(formData.pointsReward)) {
      errs.pointsReward = 'Completion reward points must be a number';
    } else if (formData.pointsReward < 0) {
      errs.pointsReward = 'Reward points cannot be negative';
    } else if (formData.pointsReward > 5000) {
      errs.pointsReward = 'Points reward cannot exceed 5,000 FITTRACK points';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData]);

  // Save as Draft
  const saveDraft = async (): Promise<{ success: boolean; challengeId: string | null; error: string | null }> => {
    if (saving || publishing) {
      return { success: false, challengeId: null, error: 'Operation already in progress' };
    }

    if (!effectiveOrganizerId) {
      setErrors({ general: 'You must be authenticated as an organizer to save drafts' });
      return { success: false, challengeId: null, error: 'Authentication required' };
    }

    // Minimal validation for draft: title is required
    if (!formData.title || !formData.title.trim()) {
      setErrors({ title: 'A title is required to save a draft' });
      return { success: false, challengeId: null, error: 'Title required' };
    }

    setSaving(true);
    setSaveSuccessMessage(null);

    try {
      const res = await organizerService.saveDraftChallenge(
        formData,
        effectiveOrganizerId,
        organizerName,
        organizerAvatar
      );

      if (res.success && res.challengeId) {
        setFormData((prev) => ({ ...prev, id: res.challengeId! }));
        setHasUnsavedChanges(false);
        setSaveSuccessMessage('Draft saved successfully to organizer studio.');
        setTimeout(() => setSaveSuccessMessage(null), 3500);
        return { success: true, challengeId: res.challengeId, error: null };
      } else {
        setErrors({ general: res.error || 'Failed to save draft' });
        return { success: false, challengeId: null, error: res.error };
      }
    } catch (err: any) {
      const msg = err?.message || 'Unexpected draft saving error';
      setErrors({ general: msg });
      return { success: false, challengeId: null, error: msg };
    } finally {
      setSaving(false);
    }
  };

  // Publish Challenge
  const publish = async (): Promise<{ success: boolean; challengeId: string | null; error: string | null }> => {
    if (saving || publishing) {
      return { success: false, challengeId: null, error: 'Operation already in progress' };
    }

    if (!effectiveOrganizerId) {
      setErrors({ general: 'You must be authenticated as an organizer to publish challenges' });
      return { success: false, challengeId: null, error: 'Authentication required' };
    }

    // Full field validation required before publishing
    const isValid = validateForm();
    if (!isValid) {
      return { success: false, challengeId: null, error: 'Please correct highlighted validation errors' };
    }

    setPublishing(true);

    try {
      // 1. Ensure draft is saved first
      const saveRes = await organizerService.saveDraftChallenge(
        formData,
        effectiveOrganizerId,
        organizerName,
        organizerAvatar
      );

      if (!saveRes.success || !saveRes.challengeId) {
        setErrors({ general: saveRes.error || 'Failed to record challenge before publishing' });
        return { success: false, challengeId: null, error: saveRes.error };
      }

      const currentChallengeId = saveRes.challengeId;

      // 2. Publish the challenge
      const pubRes = await organizerService.publishChallenge(currentChallengeId, effectiveOrganizerId);

      if (pubRes.success) {
        setHasUnsavedChanges(false);
        return { success: true, challengeId: currentChallengeId, error: null };
      } else {
        setErrors({ general: pubRes.error || 'Publishing operation rejected' });
        return { success: false, challengeId: currentChallengeId, error: pubRes.error };
      }
    } catch (err: any) {
      const msg = err?.message || 'Publication failed';
      setErrors({ general: msg });
      return { success: false, challengeId: null, error: msg };
    } finally {
      setPublishing(false);
    }
  };

  return {
    formData,
    errors,
    loading,
    saving,
    publishing,
    saveSuccessMessage,
    loadError,
    hasUnsavedChanges,
    updateField,
    validateForm,
    saveDraft,
    publish,
    setFormData,
  };
}
