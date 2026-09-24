import React from 'react';
import { NutritionPlan } from '../../types/nutrition';
import { Users, Flame, Dumbbell, ShieldCheck, Check, ArrowRight, Sparkles } from 'lucide-react';

interface NutritionPlanCardProps {
  plan: NutritionPlan;
  isActive?: boolean;
  onSelectPlan: (plan: NutritionPlan) => void;
  onViewDetails?: (plan: NutritionPlan) => void;
}

export const NutritionPlanCard: React.FC<NutritionPlanCardProps> = ({
  plan,
  isActive = false,
  onSelectPlan,
  onViewDetails,
}) => {
  const goalLabelMap: Record<string, string> = {
    MUSCLE_GAIN: 'Muscle Gain',
    CUTTING: 'Cutting',
    LEAN_BULK: 'Lean Bulk',
    ENDURANCE: 'Endurance',
    RECOVERY: 'Recovery',
    MAINTENANCE: 'Maintenance',
  };

  const dietBadgeColor =
    plan.dietType === 'VEGETARIAN'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : plan.dietType === 'NON_VEGETARIAN'
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#121722] border transition-all hover:border-white/20 text-left ${
        isActive ? 'border-emerald-500/50 shadow-xl shadow-emerald-500/10' : 'border-white/8'
      }`}
    >
      {/* Banner with badges */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-800">
        <img
          src={plan.bannerUrl || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop&q=80'}
          alt={plan.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121722] via-[#121722]/40 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${dietBadgeColor}`}>
            {plan.dietType.replace('_', ' ')}
          </span>

          {isActive ? (
            <span className="flex items-center gap-1 rounded-lg bg-emerald-500 text-slate-950 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/30">
              <Check className="w-3.5 h-3.5" />
              Active Plan
            </span>
          ) : plan.isTemplate ? (
            <span className="flex items-center gap-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 text-[10px] font-mono font-bold backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              FITTRACK Template
            </span>
          ) : null}
        </div>

        {/* Bottom Banner Info */}
        <div className="absolute bottom-3 left-4 right-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
            {goalLabelMap[plan.goal] || plan.goal}
          </span>
          <h3 className="text-lg font-black text-white line-clamp-1 mt-1">{plan.title}</h3>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {plan.description}
        </p>

        {/* Macro Targets Bar */}
        <div className="rounded-2xl bg-black/40 border border-white/6 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Daily Energy Target</span>
            <span className="font-mono font-bold text-white flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              {plan.targetCalories.toLocaleString()} kcal
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/6 text-center text-[11px]">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Protein</span>
              <span className="font-mono font-bold text-cyan-400">{plan.targetProtein}g</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Carbs</span>
              <span className="font-mono font-bold text-amber-400">{plan.targetCarbs}g</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Fats</span>
              <span className="font-mono font-bold text-rose-400">{plan.targetFat}g</span>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>{plan.numberOfMeals} Scheduled Meals</span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-500" />
            {(plan.activeFollowersCount || 0).toLocaleString()} athletes
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(plan)}
              className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              Inspect Meals
            </button>
          )}
          <button
            onClick={() => onSelectPlan(plan)}
            disabled={isActive}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
            }`}
          >
            {isActive ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Following</span>
              </>
            ) : (
              <>
                <span>Follow Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
