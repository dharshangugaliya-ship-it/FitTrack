import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { nutritionService, NUTRITION_UPDATED_EVENT } from '../services/nutritionService';
import { NutritionPlan, UserNutritionAdherence, DailyMealLog } from '../types/nutrition';

export function useNutrition() {
  const { user } = useAuth();
  const userId = user?.id || 'usr_fittrack_demo_001';

  const [plans, setPlans] = useState<NutritionPlan[]>(() => nutritionService.getPlans());
  const [activePlanId, setActivePlanId] = useState<string | null>(() => nutritionService.getActivePlanId(userId));
  const [adherence, setAdherence] = useState<UserNutritionAdherence>(() => nutritionService.getUserAdherence(userId));
  const [todayLog, setTodayLog] = useState<DailyMealLog | null>(() => nutritionService.getDailyLog(userId));
  const [weeklyHistory, setWeeklyHistory] = useState(() => nutritionService.getWeeklyHistory(userId));

  const refresh = useCallback(() => {
    const updatedPlans = nutritionService.getPlans();
    const currentActiveId = nutritionService.getActivePlanId(userId);
    const updatedAdherence = nutritionService.getUserAdherence(userId);
    const updatedLog = nutritionService.getDailyLog(userId);
    const updatedHistory = nutritionService.getWeeklyHistory(userId);

    setPlans(updatedPlans);
    setActivePlanId(currentActiveId);
    setAdherence(updatedAdherence);
    setTodayLog(updatedLog);
    setWeeklyHistory(updatedHistory);
  }, [userId]);

  useEffect(() => {
    refresh();

    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener(NUTRITION_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(NUTRITION_UPDATED_EVENT, handleUpdate);
    };
  }, [refresh]);

  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0] || null;

  const followPlan = (planId: string) => {
    nutritionService.followPlan(userId, planId);
    refresh();
  };

  const unfollowPlan = () => {
    nutritionService.unfollowPlan(userId);
    refresh();
  };

  const toggleMeal = (planId: string, mealId: string) => {
    nutritionService.toggleMealCompletion(userId, planId, mealId);
    refresh();
  };

  const isMealCompletedToday = (mealId: string) => {
    if (!todayLog) {
      // Baseline sample: check first two meals if no explicit log has been touched
      const firstTwo = activePlan?.meals.slice(0, 2).map((m) => m.id) || [];
      return firstTwo.includes(mealId);
    }
    return todayLog.completedMealIds.includes(mealId);
  };

  return {
    plans,
    activePlan,
    activePlanId,
    adherence,
    todayLog,
    weeklyHistory,
    followPlan,
    unfollowPlan,
    toggleMeal,
    isMealCompletedToday,
    refresh,
  };
}
