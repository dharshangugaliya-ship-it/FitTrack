import React, { useState, useEffect } from 'react';
import { useRouter } from '../../routes/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { nutritionService } from '../../services/nutritionService';
import { INITIAL_NUTRITION_TEMPLATES } from '../../data/nutritionData';
import {
  NutritionPlan,
  MealItem,
  FitnessGoal,
  DietType,
  TrainingIntensity,
  MealType,
  PlanStatus,
} from '../../types/nutrition';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ArrowLeft,
  Check,
  Save,
  Clock,
  Eye,
  Utensils,
  ChefHat,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export const CreateNutritionPlanView: React.FC = () => {
  const { navigate, params, currentPath } = useRouter();
  const { user, profile } = useAuth();

  // Check if editing existing plan
  const isEditing = currentPath.includes('/organizer/nutrition/edit/');
  const editingPlanId = isEditing ? currentPath.split('/organizer/nutrition/edit/')[1] : null;

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState<FitnessGoal>('LEAN_BULK');
  const [dietType, setDietType] = useState<DietType>('VEGETARIAN');
  const [intensity, setIntensity] = useState<TrainingIntensity>('HIGH');
  const [targetCalories, setTargetCalories] = useState(2500);
  const [targetProtein, setTargetProtein] = useState(160);
  const [targetCarbs, setTargetCarbs] = useState(280);
  const [targetFat, setTargetFat] = useState(65);
  const [bannerUrl, setBannerUrl] = useState(
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop&q=80'
  );
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [status, setStatus] = useState<PlanStatus>('PUBLISHED');
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'MEALS' | 'PREVIEW'>('DETAILS');

  // Load existing plan if editing
  useEffect(() => {
    if (editingPlanId) {
      const existing = nutritionService.getPlanById(editingPlanId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description);
        setGoal(existing.goal);
        setDietType(existing.dietType);
        setIntensity(existing.intensity);
        setTargetCalories(existing.targetCalories);
        setTargetProtein(existing.targetProtein);
        setTargetCarbs(existing.targetCarbs);
        setTargetFat(existing.targetFat);
        setBannerUrl(existing.bannerUrl || '');
        setAdditionalNotes(existing.additionalNotes || '');
        setStatus(existing.status);
        setMeals(existing.meals);
        return;
      }
    }

    // Default with 3 empty meals if fresh
    if (meals.length === 0) {
      loadTemplateData('nutr-veg-lean-bulk');
    }
  }, [editingPlanId]);

  // Quick load template
  const loadTemplateData = (templateId: string) => {
    const tmpl = INITIAL_NUTRITION_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setTitle(isEditing ? title : `${tmpl.title} (Custom)`);
      setDescription(tmpl.description);
      setGoal(tmpl.goal);
      setDietType(tmpl.dietType);
      setIntensity(tmpl.intensity);
      setTargetCalories(tmpl.targetCalories);
      setTargetProtein(tmpl.targetProtein);
      setTargetCarbs(tmpl.targetCarbs);
      setTargetFat(tmpl.targetFat);
      setBannerUrl(tmpl.bannerUrl || '');
      setAdditionalNotes(tmpl.additionalNotes || '');
      setMeals(
        tmpl.meals.map((m, idx) => ({
          ...m,
          id: `meal-${Date.now()}-${idx}`,
        }))
      );
    }
  };

  // Meal management
  const addMeal = () => {
    const newMeal: MealItem = {
      id: `meal-${Date.now()}`,
      name: `Meal ${meals.length + 1}`,
      mealType: 'LUNCH',
      scheduleTime: '12:30 PM',
      foods: ['Steamed Rice', 'Protein Source', 'Greens'],
      ingredients: ['150g cooked grains', '100g protein staple', '100g steamed vegetables'],
      portionInfo: '1 balanced container (350g)',
      calories: 500,
      proteinGrams: 35,
      carbsGrams: 60,
      fatGrams: 12,
      preparationInstructions: 'Season with healthy spices and simmer/grill.',
      alternatives: ['Tofu/Paneer/Chicken substitute'],
    };
    setMeals([...meals, newMeal]);
  };

  const removeMeal = (id: string) => {
    setMeals(meals.filter((m) => m.id !== id));
  };

  const moveMeal = (index: number, direction: 'UP' | 'DOWN') => {
    const newMeals = [...meals];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newMeals.length) return;
    const temp = newMeals[index];
    newMeals[index] = newMeals[targetIdx];
    newMeals[targetIdx] = temp;
    setMeals(newMeals);
  };

  const updateMeal = (id: string, updates: Partial<MealItem>) => {
    setMeals(meals.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  // Auto calculate sum of meals for suggestions
  const sumCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const sumProtein = meals.reduce((acc, m) => acc + (m.proteinGrams || 0), 0);
  const sumCarbs = meals.reduce((acc, m) => acc + (m.carbsGrams || 0), 0);
  const sumFat = meals.reduce((acc, m) => acc + (m.fatGrams || 0), 0);

  const applySumToTargets = () => {
    setTargetCalories(sumCalories);
    setTargetProtein(sumProtein);
    setTargetCarbs(sumCarbs);
    setTargetFat(sumFat);
  };

  const handleSave = (publishState: PlanStatus) => {
    if (!title.trim()) {
      alert('Please enter a Plan Name.');
      return;
    }
    if (meals.length === 0) {
      alert('Please configure at least one meal.');
      return;
    }

    const organizerName = profile?.display_name || user?.user_metadata?.display_name || 'Organizer';

    if (isEditing && editingPlanId) {
      nutritionService.updatePlan(editingPlanId, {
        title,
        description,
        goal,
        dietType,
        intensity,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        numberOfMeals: meals.length,
        meals,
        bannerUrl,
        additionalNotes,
        status: publishState,
      });
    } else {
      nutritionService.createPlan({
        organizerId: user?.id,
        organizerName,
        organizerAvatar: profile?.avatar_url || undefined,
        title,
        description,
        goal,
        dietType,
        intensity,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        numberOfMeals: meals.length,
        meals,
        bannerUrl,
        additionalNotes,
        status: publishState,
      });
    }

    navigate('/organizer/nutrition');
  };

  return (
    <div className="space-y-8 pb-16 text-left max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/organizer/nutrition')}
              className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Plans</span>
            </button>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              {isEditing ? 'Edit Plan' : 'Plan Architect'}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {isEditing ? `Edit: ${title || 'Nutrition Plan'}` : 'Create Nutrition Plan'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Design targeted nutritional schedules with macros, ingredients, and alternatives.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleSave('DRAFT')}
            className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => handleSave('PUBLISHED')}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Publish Plan</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/8 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('DETAILS')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'DETAILS'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white bg-white/3'
            }`}
          >
            1. Plan Strategy & Targets
          </button>
          <button
            onClick={() => setActiveTab('MEALS')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'MEALS'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white bg-white/3'
            }`}
          >
            <span>2. Customize Meals ({meals.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PREVIEW')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PREVIEW'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white bg-white/3'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>3. Athlete Preview</span>
          </button>
        </div>

        {/* Quick Load Template Dropdown */}
        <div className="hidden sm:flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] text-slate-400">Load from Template:</span>
          <select
            onChange={(e) => loadTemplateData(e.target.value)}
            className="rounded-lg bg-black/50 border border-white/10 px-2.5 py-1 text-xs text-slate-200 focus:outline-hidden"
            defaultValue=""
          >
            <option value="" disabled>
              Select starting template...
            </option>
            {INITIAL_NUTRITION_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.dietType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: DETAILS & TARGETS */}
      {activeTab === 'DETAILS' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-[#121722] border border-white/8 p-6 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Core Program Parameters</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Plan Name */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Vegetarian Lean Bulk, Athlete Shredding Protocol..."
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Plan Description & Scientific Rationale
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the physiological and dietary mechanism..."
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Fitness Goal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Fitness Goal *
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as FitnessGoal)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="LEAN_BULK">Lean Bulk</option>
                  <option value="CUTTING">Cutting & Fat Loss</option>
                  <option value="MUSCLE_GAIN">Muscle Hypertrophy</option>
                  <option value="ENDURANCE">Endurance Performance</option>
                  <option value="RECOVERY">Tissue Recovery & Rest</option>
                  <option value="MAINTENANCE">Baseline Maintenance</option>
                </select>
              </div>

              {/* Diet Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Diet Type *
                </label>
                <select
                  value={dietType}
                  onChange={(e) => setDietType(e.target.value as DietType)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="VEGETARIAN">Vegetarian (Lacto/Ovo)</option>
                  <option value="NON_VEGETARIAN">Non-Vegetarian</option>
                  <option value="VEGAN">100% Plant-Based Vegan</option>
                  <option value="KETO">Ketogenic</option>
                  <option value="HIGH_PROTEIN">High Protein Specific</option>
                </select>
              </div>

              {/* Training Intensity */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Training Intensity
                </label>
                <select
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value as TrainingIntensity)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="LOW">Low (Active Living)</option>
                  <option value="MODERATE">Moderate (3-4 Days Resistance)</option>
                  <option value="HIGH">High (5-6 Days Progressive Overload)</option>
                  <option value="ATHLETE_ELITE">Athlete / Elite Competitor</option>
                </select>
              </div>

              {/* Banner Image URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Banner Image URL
                </label>
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-xs text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Daily Energy & Macro Targets */}
          <div className="rounded-3xl bg-[#121722] border border-white/8 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Daily Target Nutrition Budget</h3>
                <p className="text-xs text-slate-400">Target totals expected across the full day</p>
              </div>

              <button
                type="button"
                onClick={applySumToTargets}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync with sum of configured meals ({sumCalories} kcal)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-300">Calories (kcal)</label>
                <input
                  type="number"
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(Number(e.target.value))}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-base font-mono font-bold text-emerald-400 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-300">Protein (g)</label>
                <input
                  type="number"
                  value={targetProtein}
                  onChange={(e) => setTargetProtein(Number(e.target.value))}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-base font-mono font-bold text-cyan-400 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-300">Carbohydrates (g)</label>
                <input
                  type="number"
                  value={targetCarbs}
                  onChange={(e) => setTargetCarbs(Number(e.target.value))}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-base font-mono font-bold text-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-300">Fats (g)</label>
                <input
                  type="number"
                  value={targetFat}
                  onChange={(e) => setTargetFat(Number(e.target.value))}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-base font-mono font-bold text-rose-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold uppercase text-slate-300">
                Additional Instructions / Hydration Guidance
              </label>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Drink 3.5L water daily, take digestive enzymes with meal 2..."
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('MEALS')}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Continue to Meals Builder</span>
              <ArrowDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMIZE MEALS */}
      {activeTab === 'MEALS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Daily Meals Schedule ({meals.length})</h2>
              <p className="text-xs text-slate-400">
                Configure timing, food items, ingredients, macro breakdowns, and substitutions.
              </p>
            </div>

            <button
              onClick={addMeal}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Meal</span>
            </button>
          </div>

          {/* Meals list */}
          <div className="space-y-4">
            {meals.map((meal, index) => (
              <div
                key={meal.id}
                className="rounded-3xl bg-[#121722] border border-white/8 p-5 sm:p-6 space-y-4"
              >
                {/* Header rail */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
                      className="font-bold text-base text-white bg-transparent border-b border-white/20 focus:border-indigo-400 focus:outline-hidden px-1"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Schedule time */}
                    <input
                      type="text"
                      value={meal.scheduleTime}
                      onChange={(e) => updateMeal(meal.id, { scheduleTime: e.target.value })}
                      className="rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs font-mono text-slate-200 w-24 text-center focus:outline-hidden"
                      placeholder="08:00 AM"
                    />

                    {/* Meal type */}
                    <select
                      value={meal.mealType}
                      onChange={(e) => updateMeal(meal.id, { mealType: e.target.value as MealType })}
                      className="rounded-lg bg-black/40 border border-white/10 px-2.5 py-1 text-xs text-slate-200 focus:outline-hidden"
                    >
                      <option value="BREAKFAST">Breakfast</option>
                      <option value="MORNING_SNACK">Morning Snack</option>
                      <option value="LUNCH">Lunch</option>
                      <option value="PRE_WORKOUT">Pre-Workout</option>
                      <option value="POST_WORKOUT">Post-Workout</option>
                      <option value="DINNER">Dinner</option>
                      <option value="EVENING_SNACK">Evening Snack</option>
                    </select>

                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                      <button
                        onClick={() => moveMeal(index, 'UP')}
                        disabled={index === 0}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                      <button
                        onClick={() => moveMeal(index, 'DOWN')}
                        disabled={index === meals.length - 1}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                      <button
                        onClick={() => removeMeal(meal.id)}
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete Meal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Meal details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Calories & Macros */}
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Calories</label>
                    <input
                      type="number"
                      value={meal.calories}
                      onChange={(e) => updateMeal(meal.id, { calories: Number(e.target.value) })}
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs font-mono text-emerald-400 font-bold focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Protein (g)</label>
                    <input
                      type="number"
                      value={meal.proteinGrams}
                      onChange={(e) => updateMeal(meal.id, { proteinGrams: Number(e.target.value) })}
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs font-mono text-cyan-400 font-bold focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Carbs (g)</label>
                    <input
                      type="number"
                      value={meal.carbsGrams}
                      onChange={(e) => updateMeal(meal.id, { carbsGrams: Number(e.target.value) })}
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs font-mono text-amber-400 font-bold focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Fats (g)</label>
                    <input
                      type="number"
                      value={meal.fatGrams}
                      onChange={(e) => updateMeal(meal.id, { fatGrams: Number(e.target.value) })}
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs font-mono text-rose-400 font-bold focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Ingredients & Portions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">
                      Portion Serving Info
                    </label>
                    <input
                      type="text"
                      value={meal.portionInfo}
                      onChange={(e) => updateMeal(meal.id, { portionInfo: e.target.value })}
                      placeholder="e.g. 1 bowl (350g), 2 wraps..."
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">
                      Ingredients (comma separated)
                    </label>
                    <input
                      type="text"
                      value={meal.ingredients.join(', ')}
                      onChange={(e) =>
                        updateMeal(meal.id, {
                          ingredients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="e.g. 100g oats, 1 banana, 20g almonds..."
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Instructions & Alternatives */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">
                      Preparation Instructions
                    </label>
                    <input
                      type="text"
                      value={meal.preparationInstructions || ''}
                      onChange={(e) => updateMeal(meal.id, { preparationInstructions: e.target.value })}
                      placeholder="e.g. Cook on medium heat for 6 mins..."
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">
                      Alternatives / Substitutions (comma separated)
                    </label>
                    <input
                      type="text"
                      value={(meal.alternatives || []).join(', ')}
                      onChange={(e) =>
                        updateMeal(meal.id, {
                          alternatives: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="e.g. Tofu instead of paneer, Greek yogurt..."
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/8">
            <button
              onClick={() => setActiveTab('DETAILS')}
              className="rounded-xl bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Back to Details
            </button>
            <button
              onClick={() => setActiveTab('PREVIEW')}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Plan as Athlete</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: PREVIEW */}
      {activeTab === 'PREVIEW' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-[#121722] border border-white/8 p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-2.5 py-1 text-xs font-bold uppercase font-mono">
                  {goal.replace('_', ' ')} • {dietType}
                </span>
                <h2 className="text-2xl font-black text-white mt-2">{title || 'Untitled Plan'}</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">{description}</p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {targetCalories} kcal
                </div>
                <span className="text-xs text-slate-400">Daily Target Energy</span>
              </div>
            </div>

            {/* Macros bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/4 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Protein</span>
                <div className="text-lg font-black text-cyan-400 font-mono">{targetProtein}g</div>
              </div>
              <div className="rounded-2xl bg-white/4 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Carbs</span>
                <div className="text-lg font-black text-amber-400 font-mono">{targetCarbs}g</div>
              </div>
              <div className="rounded-2xl bg-white/4 p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Fats</span>
                <div className="text-lg font-black text-rose-400 font-mono">{targetFat}g</div>
              </div>
            </div>

            {/* Scheduled meals */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Scheduled Meals ({meals.length})
              </h3>
              <div className="space-y-2">
                {meals.map((m, idx) => (
                  <div
                    key={m.id}
                    className="rounded-xl bg-white/3 border border-white/6 p-3.5 flex items-center justify-between text-xs"
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
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setActiveTab('MEALS')}
              className="rounded-xl bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Back to Edit Meals
            </button>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleSave('DRAFT')}
                className="rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSave('PUBLISHED')}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Publish Plan to Athletes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
