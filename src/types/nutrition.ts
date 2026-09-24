export type FitnessGoal =
  | 'MUSCLE_GAIN'
  | 'CUTTING'
  | 'LEAN_BULK'
  | 'ENDURANCE'
  | 'RECOVERY'
  | 'MAINTENANCE';

export type DietType =
  | 'VEGETARIAN'
  | 'NON_VEGETARIAN'
  | 'VEGAN'
  | 'KETO'
  | 'HIGH_PROTEIN';

export type TrainingIntensity =
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'ATHLETE_ELITE';

export type PlanStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type MealType =
  | 'BREAKFAST'
  | 'MORNING_SNACK'
  | 'LUNCH'
  | 'PRE_WORKOUT'
  | 'POST_WORKOUT'
  | 'DINNER'
  | 'EVENING_SNACK';

export interface MealItem {
  id: string;
  name: string;
  mealType: MealType;
  scheduleTime: string; // e.g. "08:00 AM"
  foods: string[];
  ingredients: string[];
  portionInfo: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  preparationInstructions?: string;
  alternatives?: string[];
}

export interface NutritionPlan {
  id: string;
  organizerId?: string;
  organizerName: string;
  organizerAvatar?: string;
  title: string;
  description: string;
  goal: FitnessGoal;
  dietType: DietType;
  intensity: TrainingIntensity;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  numberOfMeals: number;
  meals: MealItem[];
  additionalNotes?: string;
  status: PlanStatus;
  activeFollowersCount: number;
  isTemplate?: boolean;
  bannerUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyMealLog {
  planId: string;
  date: string; // YYYY-MM-DD
  completedMealIds: string[];
  notes?: string;
  updatedAt: string;
}

export interface UserNutritionAdherence {
  activePlanId: string | null;
  currentStreakDays: number;
  totalMealsCompleted: number;
  adherenceRate: number; // percentage 0-100
  todayCompletedMeals: number;
  todayTotalMeals: number;
  lastCompletedDate?: string;
}

export interface NutritionFilter {
  goal?: FitnessGoal | 'ALL';
  dietType?: DietType | 'ALL';
  intensity?: TrainingIntensity | 'ALL';
  searchQuery?: string;
}
