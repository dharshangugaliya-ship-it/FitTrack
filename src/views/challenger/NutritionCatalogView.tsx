import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useNutrition } from '../../hooks/useNutrition';
import { NutritionPlanCard } from '../../components/nutrition/NutritionPlanCard';
import { MealDetailModal } from '../../components/nutrition/MealDetailModal';
import { NutritionPlan, FitnessGoal, DietType, MealItem } from '../../types/nutrition';
import {
  Utensils,
  Compass,
  Search,
  Filter,
  Flame,
  Dumbbell,
  Sparkles,
  ArrowLeft,
  Check,
} from 'lucide-react';

export const NutritionCatalogView: React.FC = () => {
  const { navigate } = useRouter();
  const { plans, activePlanId, followPlan } = useNutrition();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | 'ALL'>('ALL');
  const [selectedDiet, setSelectedDiet] = useState<DietType | 'ALL'>('ALL');
  const [inspectingPlan, setInspectingPlan] = useState<NutritionPlan | null>(null);
  const [inspectingMeal, setInspectingMeal] = useState<MealItem | null>(null);

  // Filter plans
  const filteredPlans = plans.filter((plan) => {
    if (plan.status === 'DRAFT') return false; // participants only see published/templates
    if (selectedGoal !== 'ALL' && plan.goal !== selectedGoal) return false;
    if (selectedDiet !== 'ALL' && plan.dietType !== selectedDiet) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = plan.title.toLowerCase().includes(q);
      const matchDesc = plan.description.toLowerCase().includes(q);
      const matchMeals = plan.meals.some((m) =>
        m.name.toLowerCase().includes(q) || m.foods.some((f) => f.toLowerCase().includes(q))
      );
      if (!matchTitle && !matchDesc && !matchMeals) return false;
    }
    return true;
  });

  const goals: { id: FitnessGoal | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All Goals' },
    { id: 'LEAN_BULK', label: 'Lean Bulk' },
    { id: 'CUTTING', label: 'Cutting & Shred' },
    { id: 'MUSCLE_GAIN', label: 'Muscle Gain' },
    { id: 'ENDURANCE', label: 'Endurance' },
    { id: 'RECOVERY', label: 'Recovery' },
    { id: 'MAINTENANCE', label: 'Maintenance' },
  ];

  const diets: { id: DietType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All Diets' },
    { id: 'VEGETARIAN', label: 'Vegetarian' },
    { id: 'NON_VEGETARIAN', label: 'Non-Vegetarian' },
  ];

  return (
    <div className="space-y-8 pb-16 text-left max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/nutrition')}
              className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Nutrition Hub</span>
            </button>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Plan Catalog
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Discover Nutrition Plans
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Choose from science-backed nutrition programs engineered for athletes, bodybuilders, and fitness enthusiasts. Follow a plan to activate daily meal adherence tracking.
          </p>
        </div>

        <button
          onClick={() => navigate('/nutrition')}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-xs font-bold text-emerald-400 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>My Daily Meal Tracker</span>
        </button>
      </div>

      {/* Filters & Search Rail */}
      <div className="space-y-4 rounded-3xl bg-[#121722] border border-white/8 p-5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by plan name, food items, ingredients (e.g. paneer, oats, salmon, chicken)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500/50"
            />
          </div>

          {/* Diet selector buttons */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {diets.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDiet(d.id)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedDiet === d.id
                    ? 'bg-white/12 text-white border border-white/20'
                    : 'bg-white/4 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Goal selector pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-white/6">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mr-1 shrink-0">
            Goal:
          </span>
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGoal(g.id)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                selectedGoal === g.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/3 text-slate-400 hover:bg-white/6 hover:text-white'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{filteredPlans.length}</strong> nutrition programs
          </span>
          <span>10 Pre-built FITTRACK Templates Available</span>
        </div>

        {filteredPlans.length === 0 ? (
          <div className="rounded-3xl bg-[#121722] border border-white/8 p-12 text-center space-y-3">
            <Utensils className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No nutrition plans match your filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search keywords, goal filter, or dietary preference.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGoal('ALL');
                setSelectedDiet('ALL');
              }}
              className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <NutritionPlanCard
                key={plan.id}
                plan={plan}
                isActive={plan.id === activePlanId}
                onSelectPlan={(p) => {
                  followPlan(p.id);
                  navigate('/nutrition');
                }}
                onViewDetails={(p) => setInspectingPlan(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Plan Preview Modal */}
      {inspectingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl rounded-3xl bg-[#121722] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase font-mono">
                    {inspectingPlan.dietType.replace('_', ' ')}
                  </span>
                  <span className="text-xs uppercase font-bold text-slate-400">
                    {inspectingPlan.goal.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white">{inspectingPlan.title}</h2>
                <p className="text-xs text-slate-400 mt-1">{inspectingPlan.description}</p>
              </div>

              <button
                onClick={() => setInspectingPlan(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Daily Macros Targets */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-white/4 border border-white/6 p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Energy</span>
                <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                  {inspectingPlan.targetCalories}
                </div>
                <span className="text-[9px] text-slate-500">kcal target</span>
              </div>
              <div className="rounded-xl bg-white/4 border border-white/6 p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Protein</span>
                <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">
                  {inspectingPlan.targetProtein}g
                </div>
                <span className="text-[9px] text-slate-500">macro budget</span>
              </div>
              <div className="rounded-xl bg-white/4 border border-white/6 p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Carbs</span>
                <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                  {inspectingPlan.targetCarbs}g
                </div>
                <span className="text-[9px] text-slate-500">glycogen fuel</span>
              </div>
              <div className="rounded-xl bg-white/4 border border-white/6 p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fats</span>
                <div className="text-lg font-black text-rose-400 font-mono mt-0.5">
                  {inspectingPlan.targetFat}g
                </div>
                <span className="text-[9px] text-slate-500">essential lipids</span>
              </div>
            </div>

            {/* Meals List */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Scheduled Meals ({inspectingPlan.meals.length})
              </h3>

              <div className="space-y-2.5">
                {inspectingPlan.meals.map((meal, index) => (
                  <div
                    key={meal.id}
                    onClick={() => setInspectingMeal(meal)}
                    className="rounded-xl bg-white/3 hover:bg-white/6 border border-white/6 p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[10px] text-slate-400">
                          #{index + 1} • {meal.scheduleTime}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">
                          {meal.mealType.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{meal.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{meal.portionInfo}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-white">{meal.calories} kcal</div>
                      <div className="text-[10px] text-cyan-400 font-mono">{meal.proteinGrams}g protein</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/8 flex items-center justify-between gap-4">
              <button
                onClick={() => setInspectingPlan(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Close Preview
              </button>

              <button
                onClick={() => {
                  followPlan(inspectingPlan.id);
                  setInspectingPlan(null);
                  navigate('/nutrition');
                }}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Follow This Nutrition Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nested Inspect Individual Meal Modal */}
      {inspectingMeal && (
        <MealDetailModal
          meal={inspectingMeal}
          onClose={() => setInspectingMeal(null)}
        />
      )}
    </div>
  );
};
