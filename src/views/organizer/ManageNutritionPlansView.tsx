import React, { useState } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useNutrition } from '../../hooks/useNutrition';
import { nutritionService } from '../../services/nutritionService';
import { NutritionPlan, PlanStatus } from '../../types/nutrition';
import {
  Utensils,
  Plus,
  Copy,
  Trash2,
  Eye,
  Edit,
  ArrowRight,
  Sparkles,
  Users,
  Flame,
  CheckCircle2,
  FileCheck2,
  Clock,
  Layers,
} from 'lucide-react';

export const ManageNutritionPlansView: React.FC = () => {
  const { navigate } = useRouter();
  const { plans, refresh } = useNutrition();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'TEMPLATES'>('ALL');
  const [previewPlan, setPreviewPlan] = useState<NutritionPlan | null>(null);

  // Categorize
  const displayedPlans = plans.filter((p) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PUBLISHED') return p.status === 'PUBLISHED' && !p.isTemplate;
    if (activeTab === 'DRAFT') return p.status === 'DRAFT';
    if (activeTab === 'TEMPLATES') return p.isTemplate;
    return true;
  });

  const totalFollowers = plans.reduce((acc, p) => acc + (p.activeFollowersCount || 0), 0);
  const publishedCount = plans.filter((p) => p.status === 'PUBLISHED').length;
  const draftCount = plans.filter((p) => p.status === 'DRAFT').length;

  const handleDuplicate = (id: string) => {
    const copy = nutritionService.duplicatePlan(id, 'Organizer');
    if (copy) {
      refresh();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this nutrition plan?')) {
      nutritionService.deletePlan(id);
      refresh();
    }
  };

  const handleTogglePublish = (id: string) => {
    nutritionService.togglePublishStatus(id);
    refresh();
  };

  return (
    <div className="space-y-8 pb-16 text-left max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Organizer Operations Center
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              Nutrition Ecosystem
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Nutrition Plan Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Create, customize, duplicate, and publish targeted athlete dietary protocols. FITTRACK provides the platform, you provide the nutrition program.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/organizer')}
            className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            Overview
          </button>
          <button
            onClick={() => navigate('/organizer/nutrition/create')}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Nutrition Plan</span>
          </button>
        </div>
      </div>

      {/* Organizer Nutrition KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#121722] border border-white/8 p-5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Total Plans
          </span>
          <div className="text-2xl font-black text-white font-mono">{plans.length}</div>
          <p className="text-[11px] text-slate-500">Templates & Custom Plans</p>
        </div>

        <div className="rounded-2xl bg-[#121722] border border-white/8 p-5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
            Published & Live
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{publishedCount}</div>
          <p className="text-[11px] text-slate-500">Accessible by participants</p>
        </div>

        <div className="rounded-2xl bg-[#121722] border border-white/8 p-5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
            Draft Plans
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono">{draftCount}</div>
          <p className="text-[11px] text-slate-500">In preparation</p>
        </div>

        <div className="rounded-2xl bg-[#121722] border border-white/8 p-5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
            Active Followers
          </span>
          <div className="text-2xl font-black text-cyan-400 font-mono">{totalFollowers.toLocaleString()}</div>
          <p className="text-[11px] text-slate-500">Athletes adhering daily</p>
        </div>
      </div>

      {/* Tabs & Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl bg-black/40 border border-white/8 p-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({plans.length})
            </button>
            <button
              onClick={() => setActiveTab('PUBLISHED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PUBLISHED'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setActiveTab('DRAFT')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'DRAFT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Drafts ({draftCount})
            </button>
            <button
              onClick={() => setActiveTab('TEMPLATES')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'TEMPLATES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pre-built Templates (10)
            </button>
          </div>

          <span className="text-xs text-slate-400">
            Showing {displayedPlans.length} plans
          </span>
        </div>

        {/* Plans Table */}
        <div className="overflow-hidden rounded-2xl bg-[#121722] border border-white/8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/8 bg-white/3 text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Plan Name & Goal</th>
                  <th className="py-3.5 px-4">Diet & Intensity</th>
                  <th className="py-3.5 px-4">Daily Calories / Macros</th>
                  <th className="py-3.5 px-4">Meals</th>
                  <th className="py-3.5 px-4">Followers</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {displayedPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={plan.bannerUrl}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white line-clamp-1">{plan.title}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="text-emerald-400 font-semibold">
                              {plan.goal.replace('_', ' ')}
                            </span>
                            {plan.isTemplate && (
                              <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.2 rounded-sm">
                                Template
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-slate-300 font-medium">
                        {plan.dietType.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-white">
                        {plan.targetCalories} kcal
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        P:{plan.targetProtein}g • C:{plan.targetCarbs}g • F:{plan.targetFat}g
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-300">
                      {plan.meals.length} meals
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono font-bold text-cyan-400">
                      {(plan.activeFollowersCount || 0).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-bold font-mono ${
                          plan.status === 'PUBLISHED'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-400 border-white/10'
                        }`}
                      >
                        {plan.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Preview */}
                        <button
                          onClick={() => setPreviewPlan(plan)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Preview Plan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Duplicate */}
                        <button
                          onClick={() => handleDuplicate(plan.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Duplicate Plan"
                        >
                          <Copy className="w-3.5 h-3.5 text-indigo-400" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => navigate(`/organizer/nutrition/edit/${plan.id}`)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Plan"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        {/* Toggle Publish */}
                        <button
                          onClick={() => handleTogglePublish(plan.id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                            plan.status === 'PUBLISHED'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                          }`}
                        >
                          {plan.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                        </button>

                        {/* Delete (if not base template) */}
                        {!plan.isTemplate && (
                          <button
                            onClick={() => handleDelete(plan.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#121722] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
              <div>
                <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold font-mono uppercase">
                  {previewPlan.goal.replace('_', ' ')} • {previewPlan.dietType}
                </span>
                <h2 className="text-2xl font-black text-white mt-1">{previewPlan.title}</h2>
                <p className="text-xs text-slate-400 mt-1">{previewPlan.description}</p>
              </div>
              <button
                onClick={() => setPreviewPlan(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Macros */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl bg-white/4 border border-white/6 p-2.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Calories</span>
                <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                  {previewPlan.targetCalories} kcal
                </div>
              </div>
              <div className="rounded-xl bg-white/4 border border-white/6 p-2.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Protein</span>
                <div className="text-base font-black text-cyan-400 font-mono mt-0.5">
                  {previewPlan.targetProtein}g
                </div>
              </div>
              <div className="rounded-xl bg-white/4 border border-white/6 p-2.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Carbs</span>
                <div className="text-base font-black text-amber-400 font-mono mt-0.5">
                  {previewPlan.targetCarbs}g
                </div>
              </div>
              <div className="rounded-xl bg-white/4 border border-white/6 p-2.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Fats</span>
                <div className="text-base font-black text-rose-400 font-mono mt-0.5">
                  {previewPlan.targetFat}g
                </div>
              </div>
            </div>

            {/* Meals */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Meals Schedule ({previewPlan.meals.length})
              </h3>
              <div className="space-y-2">
                {previewPlan.meals.map((m, idx) => (
                  <div
                    key={m.id}
                    className="rounded-xl bg-white/3 border border-white/6 p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono text-[10px] text-slate-400">
                        #{idx + 1} • {m.scheduleTime} • {m.mealType}
                      </div>
                      <div className="font-bold text-white text-sm">{m.name}</div>
                      <div className="text-[11px] text-slate-400">{m.portionInfo}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-emerald-400">
                      {m.calories} kcal
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/8 flex justify-end">
              <button
                onClick={() => setPreviewPlan(null)}
                className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
