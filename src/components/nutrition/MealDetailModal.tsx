import React from 'react';
import { MealItem } from '../../types/nutrition';
import { X, Clock, Flame, Dumbbell, Sparkles, Check, ChefHat, RefreshCw } from 'lucide-react';

interface MealDetailModalProps {
  meal: MealItem;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  onClose: () => void;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  meal,
  isCompleted,
  onToggleComplete,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#121722] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-left">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-400">
                <Clock className="w-3 h-3" />
                {meal.scheduleTime}
              </span>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                {meal.mealType.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">{meal.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{meal.portionInfo}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nutritional Breakdown Cards */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-white/4 border border-white/6 p-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Calories</span>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{meal.calories}</div>
            <span className="text-[9px] text-slate-500">kcal</span>
          </div>
          <div className="rounded-xl bg-white/4 border border-white/6 p-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Protein</span>
            <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{meal.proteinGrams}g</div>
            <span className="text-[9px] text-slate-500">Bioavailable</span>
          </div>
          <div className="rounded-xl bg-white/4 border border-white/6 p-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Carbs</span>
            <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{meal.carbsGrams}g</div>
            <span className="text-[9px] text-slate-500">Glycogen</span>
          </div>
          <div className="rounded-xl bg-white/4 border border-white/6 p-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Fats</span>
            <div className="text-lg font-black text-rose-400 font-mono mt-0.5">{meal.fatGrams}g</div>
            <span className="text-[9px] text-slate-500">Healthy lipid</span>
          </div>
        </div>

        {/* Ingredients & Portions */}
        <div className="space-y-2">
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
            <ChefHat className="w-4 h-4 text-emerald-400" />
            <span>Ingredients & Portions</span>
          </h3>
          <ul className="divide-y divide-white/6 rounded-2xl bg-black/40 border border-white/6 p-3 text-xs text-slate-300">
            {meal.ingredients.map((ing, i) => (
              <li key={i} className="py-1.5 flex items-center justify-between">
                <span>{ing}</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">✓ Included</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Preparation Instructions */}
        {meal.preparationInstructions && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Chef & Nutritionist Instructions</span>
            </h3>
            <div className="rounded-2xl bg-white/4 border border-white/6 p-3.5 text-xs text-slate-300 leading-relaxed">
              {meal.preparationInstructions}
            </div>
          </div>
        )}

        {/* Alternatives / Substitutions */}
        {meal.alternatives && meal.alternatives.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Allowed Alternatives & Substitutions</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {meal.alternatives.map((alt, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs text-indigo-300 font-medium"
                >
                  ⇄ {alt}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Toggle Complete Button */}
        {onToggleComplete && (
          <div className="pt-2 border-t border-white/8">
            <button
              onClick={() => {
                onToggleComplete();
                onClose();
              }}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isCompleted
                  ? 'bg-white/10 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isCompleted ? 'Mark Meal as Incomplete' : 'Mark Meal as Completed (✓)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
