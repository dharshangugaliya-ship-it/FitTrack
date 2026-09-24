import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useNutrition } from '../../hooks/useNutrition';
import { MealDetailModal } from '../../components/nutrition/MealDetailModal';
import { MealItem } from '../../types/nutrition';
import {
  Utensils,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Dumbbell,
  Sparkles,
  Info,
  Calendar,
  Compass,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Award,
} from 'lucide-react';

export const ActiveNutritionPlanView: React.FC = () => {
  const { navigate } = useRouter();
  const {
    activePlan,
    adherence,
    weeklyHistory,
    toggleMeal,
    isMealCompletedToday,
  } = useNutrition();

  const [inspectMeal, setInspectMeal] = useState<MealItem | null>(null);

  if (!activePlan) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Utensils className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">No Nutrition Plan Selected</h2>
        <p className="text-xs text-slate-400 max-w-md">
          Explore science-backed nutrition templates crafted for lean bulking, cutting, muscle hypertrophy, and athletic recovery.
        </p>
        <button
          onClick={() => navigate('/nutrition/plans')}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all cursor-pointer"
        >
          Browse Nutrition Plans
        </button>
      </div>
    );
  }

  // Calculate consumed macros from checked meals
  const completedMeals = activePlan.meals.filter((m) => isMealCompletedToday(m.id));
  const consumedCalories = completedMeals.reduce((acc, m) => acc + m.calories, 0);
  const consumedProtein = completedMeals.reduce((acc, m) => acc + m.proteinGrams, 0);
  const consumedCarbs = completedMeals.reduce((acc, m) => acc + m.carbsGrams, 0);
  const consumedFat = completedMeals.reduce((acc, m) => acc + m.fatGrams, 0);

  const completedCount = completedMeals.length;
  const totalMealsCount = activePlan.meals.length;
  const todayPercentage = Math.round((completedCount / totalMealsCount) * 100);

  return (
    <div className="space-y-8 pb-16 text-left max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Nutrition Adherence & Meal Engine
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
              Independent Fitness Module
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">{activePlan.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {activePlan.description}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/nutrition/plans')}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Switch Plan</span>
          </button>
        </div>
      </div>

      {/* Module Independence Explicit Notice */}
      <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/25 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-indigo-200">Architecture Notice: Separate Challenge & Nutrition Systems</h4>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
              Nutrition adherence tracks dietary consistency and does <span className="text-white font-semibold">NOT</span> increase Challenge Score, alter Challenge Leaderboard rank, or replace AI pose verification.
            </p>
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] uppercase font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-md">
          Zero Dependency
        </span>
      </div>

      {/* Primary Nutrition Counter Hero Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* The Exact Nutrition Counter Specified in Prompt */}
        <div className="lg:col-span-1 rounded-3xl bg-[#121722] border border-white/8 p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Today's Schedule
                </span>
                <h3 className="text-lg font-black text-white">Daily Meal Checklist</h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                {todayPercentage}% Adherence
              </span>
            </div>

            {/* List of meals with check indicators */}
            <div className="divide-y divide-white/6 rounded-2xl bg-black/40 border border-white/6 p-3 space-y-2">
              {activePlan.meals.map((meal) => {
                const isCompleted = isMealCompletedToday(meal.id);
                return (
                  <div
                    key={meal.id}
                    onClick={() => toggleMeal(activePlan.id, meal.id)}
                    className="pt-2 first:pt-0 flex items-center justify-between cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                      )}
                      <div>
                        <div
                          className={`text-xs font-bold transition-colors ${
                            isCompleted ? 'text-slate-200 line-through text-slate-400' : 'text-white'
                          }`}
                        >
                          {meal.name}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{meal.scheduleTime}</span>
                      </div>
                    </div>

                    <span
                      className={`font-mono text-sm font-black px-2 py-0.5 rounded-md ${
                        isCompleted
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-slate-600 group-hover:text-slate-400'
                      }`}
                    >
                      {isCompleted ? '✓' : '○'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Adherence Counter Callout */}
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">
              Nutrition Adherence
            </span>
            <div className="text-3xl font-black text-white font-mono">
              {completedCount} / {totalMealsCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Meals Completed Today</p>
          </div>
        </div>

        {/* Nutritional & Macro Target Breakdown */}
        <div className="lg:col-span-2 rounded-3xl bg-[#121722] border border-white/8 p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Energy & Macronutrients
                </span>
                <h3 className="text-lg font-black text-white">Target vs Consumed</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-white font-mono">
                  {consumedCalories.toLocaleString()} / {activePlan.targetCalories.toLocaleString()} kcal
                </span>
                <span className="text-[10px] text-slate-500 block">Daily Caloric Target</span>
              </div>
            </div>

            {/* Calories Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Caloric Intake
                </span>
                <span className="font-mono text-white font-bold">
                  {Math.round((consumedCalories / activePlan.targetCalories) * 100)}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500"
                  style={{ width: `${Math.min(Math.round((consumedCalories / activePlan.targetCalories) * 100), 100)}%` }}
                />
              </div>
            </div>

            {/* 3 Macro Cards */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {/* Protein */}
              <div className="rounded-2xl bg-white/3 border border-white/6 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="uppercase font-bold text-cyan-400">Protein</span>
                  <span className="font-mono font-bold text-white">
                    {consumedProtein}g / {activePlan.targetProtein}g
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${Math.min(Math.round((consumedProtein / activePlan.targetProtein) * 100), 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Hypertrophy & repair</p>
              </div>

              {/* Carbs */}
              <div className="rounded-2xl bg-white/3 border border-white/6 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="uppercase font-bold text-amber-400">Carbs</span>
                  <span className="font-mono font-bold text-white">
                    {consumedCarbs}g / {activePlan.targetCarbs}g
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${Math.min(Math.round((consumedCarbs / activePlan.targetCarbs) * 100), 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Glycogen recharge</p>
              </div>

              {/* Fats */}
              <div className="rounded-2xl bg-white/3 border border-white/6 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="uppercase font-bold text-rose-400">Fats</span>
                  <span className="font-mono font-bold text-white">
                    {consumedFat}g / {activePlan.targetFat}g
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-400 transition-all duration-500"
                    style={{ width: `${Math.min(Math.round((consumedFat / activePlan.targetFat) * 100), 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Hormone balance</p>
              </div>
            </div>
          </div>

          {/* Past 7-Day Adherence Bar */}
          <div className="pt-4 border-t border-white/8 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Past 7 Days Consistency</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {adherence.currentStreakDays} Day Streak 🔥
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center">
              {weeklyHistory.map((item, idx) => (
                <div key={idx} className="rounded-xl bg-white/3 border border-white/6 p-2 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">{item.dayName}</span>
                  <div
                    className={`h-1.5 w-full rounded-full ${
                      item.percentage >= 80
                        ? 'bg-emerald-400'
                        : item.percentage >= 50
                        ? 'bg-amber-400'
                        : 'bg-white/10'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-400 block">
                    {item.completed}/{item.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full Detailed Meals Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Meal Plan Timeline</h2>
            <p className="text-xs text-slate-400">
              Complete meal specifications, ingredients, preparation instructions, and substitutions
            </p>
          </div>
          <span className="text-xs text-slate-400">
            Click any meal to view detailed preparation instructions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activePlan.meals.map((meal) => {
            const isCompleted = isMealCompletedToday(meal.id);

            return (
              <div
                key={meal.id}
                className={`rounded-2xl bg-[#121722] border p-5 space-y-4 transition-all hover:border-white/20 ${
                  isCompleted ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-white/8'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        {meal.scheduleTime}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {meal.mealType.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white">{meal.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{meal.portionInfo}</p>
                  </div>

                  <button
                    onClick={() => toggleMeal(activePlan.id, meal.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isCompleted
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-white/8 text-slate-300 hover:bg-white/12 border border-white/10'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4" />
                        <span>Mark Eaten</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Macro pill summary */}
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] rounded-xl bg-black/40 border border-white/6 p-2">
                  <div>
                    <span className="text-slate-500 block">Calories</span>
                    <span className="font-mono font-bold text-emerald-400">{meal.calories}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Protein</span>
                    <span className="font-mono font-bold text-cyan-400">{meal.proteinGrams}g</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Carbs</span>
                    <span className="font-mono font-bold text-amber-400">{meal.carbsGrams}g</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fats</span>
                    <span className="font-mono font-bold text-rose-400">{meal.fatGrams}g</span>
                  </div>
                </div>

                {/* Food items preview */}
                <div className="flex flex-wrap gap-1.5">
                  {meal.foods.map((food, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-white/5 border border-white/8 px-2 py-0.5 text-[10px] text-slate-300 font-medium"
                    >
                      {food}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/6 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setInspectMeal(meal)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Ingredients & Recipe</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {meal.alternatives && meal.alternatives.length > 0 && (
                    <span className="text-[10px] text-slate-500">
                      {meal.alternatives.length} substitutions available
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspect Meal Modal */}
      {inspectMeal && (
        <MealDetailModal
          meal={inspectMeal}
          isCompleted={isMealCompletedToday(inspectMeal.id)}
          onToggleComplete={() => toggleMeal(activePlan.id, inspectMeal.id)}
          onClose={() => setInspectMeal(null)}
        />
      )}
    </div>
  );
};
