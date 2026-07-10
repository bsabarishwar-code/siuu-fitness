import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, X, Edit2, ChevronDown, ChevronUp, Check, Search } from 'lucide-react';
import { api, type FoodEntry, type MacroEntry, type CustomDietPlan } from '../api/client';
import { NUTRIENTS, CATEGORY_LABELS, getNutrientsByCategory, type Nutrient, type NutrientCategory } from '../data/nutrients';
import { FOODS, searchFoods, calcMacros, type FoodItem } from '../data/foods';
import ProgressBar from '../components/ProgressBar';
import ScoreRing from '../components/ScoreRing';

// ── Static recommended diet plans (from Flutter diet_plan.dart) ───────────────

interface StaticMeal { name: string; foods: string; calories: number; proteinG: number; carbsG: number; fatG: number; }
interface StaticPlan {
  id: string; name: string; goal: string; description: string;
  calories: number; proteinG: number; carbsG: number; fatG: number;
  meals: StaticMeal[];
}

const DIET_PLANS: StaticPlan[] = [
  {
    id: 'muscle_builder', name: 'Muscle Builder', goal: 'BUILD MUSCLE',
    description: 'High-calorie, protein-rich plan to fuel muscle growth and recovery.',
    calories: 3200, proteinG: 190, carbsG: 370, fatG: 85,
    meals: [
      { name: 'Breakfast', calories: 680, proteinG: 45, carbsG: 80, fatG: 20, foods: '4 whole eggs scrambled + 2 egg whites, 100g oats with banana and honey, 1 glass whole milk' },
      { name: 'Mid-Morning', calories: 350, proteinG: 35, carbsG: 25, fatG: 14, foods: '200g Greek yogurt, 1 scoop whey protein, 30g mixed nuts' },
      { name: 'Lunch', calories: 750, proteinG: 50, carbsG: 100, fatG: 14, foods: '200g chicken breast, 200g white rice (cooked), 1 cup mixed vegetables, 1 tbsp olive oil' },
      { name: 'Pre-Workout', calories: 400, proteinG: 15, carbsG: 60, fatG: 16, foods: '2 slices whole wheat bread, 2 tbsp peanut butter, 1 banana' },
      { name: 'Post-Workout', calories: 450, proteinG: 50, carbsG: 55, fatG: 8, foods: '2 scoops whey protein + 500ml milk, 1 large banana' },
      { name: 'Dinner', calories: 570, proteinG: 45, carbsG: 50, fatG: 13, foods: '200g salmon or red meat, 200g sweet potato, large mixed salad, 1 tbsp olive oil' },
    ],
  },
  {
    id: 'fat_shredder', name: 'Fat Shredder', goal: 'LOSE FAT',
    description: 'Moderate deficit with high protein to preserve muscle while burning body fat.',
    calories: 1900, proteinG: 170, carbsG: 150, fatG: 60,
    meals: [
      { name: 'Breakfast', calories: 380, proteinG: 40, carbsG: 32, fatG: 14, foods: '3 whole eggs + 3 egg whites, 1 cup spinach, 1/2 cup oats with berries, black coffee' },
      { name: 'Mid-Morning', calories: 200, proteinG: 25, carbsG: 25, fatG: 2, foods: '1 scoop whey protein + water, 1 apple' },
      { name: 'Lunch', calories: 500, proteinG: 45, carbsG: 50, fatG: 10, foods: '180g chicken breast (grilled), 1 cup brown rice, 2 cups mixed greens with lemon dressing' },
      { name: 'Afternoon Snack', calories: 180, proteinG: 22, carbsG: 12, fatG: 7, foods: '150g low-fat cottage cheese, cucumber sticks, 10 almonds' },
      { name: 'Dinner', calories: 440, proteinG: 42, carbsG: 28, fatG: 10, foods: '200g white fish (tilapia/cod), roasted vegetables (unlimited), 1/2 cup quinoa' },
      { name: 'Evening', calories: 200, proteinG: 20, carbsG: 20, fatG: 2, foods: '200g low-fat Greek yogurt, 1 tsp honey' },
    ],
  },
  {
    id: 'athletic_maintenance', name: 'Athletic Maintenance', goal: 'MAINTAIN',
    description: 'Balanced macros for athletes who want to maintain weight while performing at their best.',
    calories: 2600, proteinG: 155, carbsG: 310, fatG: 72,
    meals: [
      { name: 'Breakfast', calories: 520, proteinG: 35, carbsG: 75, fatG: 14, foods: '3 eggs + 2 whites, 80g oats, 1 banana, 250ml orange juice' },
      { name: 'Mid-Morning', calories: 300, proteinG: 25, carbsG: 35, fatG: 8, foods: '1 scoop protein, 1 fruit, 20g dark chocolate' },
      { name: 'Lunch', calories: 650, proteinG: 45, carbsG: 80, fatG: 15, foods: '180g turkey or chicken, 150g pasta (cooked), tomato sauce, salad with olive oil' },
      { name: 'Pre-Workout', calories: 350, proteinG: 8, carbsG: 65, fatG: 4, foods: '1 banana, 30g oats, 1 tsp honey, coffee' },
      { name: 'Post-Workout', calories: 380, proteinG: 40, carbsG: 35, fatG: 6, foods: '1.5 scoops whey + milk, 1 rice cake' },
      { name: 'Dinner', calories: 400, proteinG: 35, carbsG: 45, fatG: 12, foods: '180g salmon, 150g roasted vegetables, 1 medium sweet potato' },
    ],
  },
  {
    id: 'high_protein', name: 'High Protein Power', goal: 'MAX PROTEIN',
    description: 'Maximise muscle protein synthesis. 2g+ protein per kg bodyweight every day.',
    calories: 2900, proteinG: 230, carbsG: 250, fatG: 80,
    meals: [
      { name: 'Breakfast', calories: 600, proteinG: 65, carbsG: 45, fatG: 18, foods: '5 whole eggs, 200g low-fat Greek yogurt, 1/2 cup oats, 1 scoop casein' },
      { name: 'Morning', calories: 350, proteinG: 55, carbsG: 40, fatG: 5, foods: '2 scoops whey + 300ml skim milk, 1 banana' },
      { name: 'Lunch', calories: 650, proteinG: 60, carbsG: 55, fatG: 8, foods: '250g chicken breast, 150g rice, 100g broccoli, seasoning only' },
      { name: 'Afternoon', calories: 300, proteinG: 30, carbsG: 12, fatG: 10, foods: '200g cottage cheese, 1 tbsp almond butter, celery' },
      { name: 'Dinner', calories: 680, proteinG: 55, carbsG: 55, fatG: 20, foods: '250g lean beef mince, 2 cups mixed vegetables, 1 cup lentils' },
      { name: 'Night', calories: 200, proteinG: 25, carbsG: 8, fatG: 6, foods: '30g casein protein + water, 5 almonds' },
    ],
  },
  {
    id: 'clean_lean', name: 'Clean & Lean', goal: 'BODY RECOMP',
    description: 'Whole foods only. Gradual recomposition — lose fat and gain muscle simultaneously.',
    calories: 2300, proteinG: 155, carbsG: 245, fatG: 68,
    meals: [
      { name: 'Breakfast', calories: 450, proteinG: 28, carbsG: 65, fatG: 10, foods: 'Overnight oats (80g oats, 200g Greek yogurt, berries, chia seeds)' },
      { name: 'Mid-Morning', calories: 200, proteinG: 14, carbsG: 22, fatG: 10, foods: '2 boiled eggs, 1 apple, green tea' },
      { name: 'Lunch', calories: 550, proteinG: 45, carbsG: 50, fatG: 15, foods: '200g tuna (drained), 1 large sweet potato, avocado, mixed greens' },
      { name: 'Snack', calories: 200, proteinG: 7, carbsG: 22, fatG: 14, foods: '30g mixed nuts + seeds, 1 orange' },
      { name: 'Dinner', calories: 580, proteinG: 48, carbsG: 55, fatG: 16, foods: '200g chicken thigh, 1 cup quinoa, roasted Brussels sprouts, olive oil' },
      { name: 'Evening', calories: 200, proteinG: 15, carbsG: 22, fatG: 6, foods: '200g low-fat yogurt, 1 tsp honey, walnuts' },
    ],
  },
];

const MEAL_CATEGORIES = ['Breakfast', 'Mid-Morning', 'Lunch', 'Afternoon', 'Dinner', 'Evening', 'Snack'];
const TABS = ['OVERVIEW', 'FOOD DIARY', 'MACROS', 'MICRO', 'DIET PLAN'] as const;

interface MealForm { _key: number; meal_name: string; foods: string; calories: string; protein_g: string; carbs_g: string; fat_g: string; }

function getActivePlanGoals(activePlanId: string | null, customPlans: CustomDietPlan[]) {
  const defaults = { cal: 2500, p: 150, c: 250, f: 70 };
  if (!activePlanId) return defaults;
  if (activePlanId.startsWith('custom_')) {
    const id = parseInt(activePlanId.replace('custom_', ''));
    const plan = customPlans.find(p => p.id === id);
    if (plan) return { cal: plan.calories, p: plan.protein_g, c: plan.carbs_g, f: plan.fat_g };
  } else {
    const plan = DIET_PLANS.find(p => p.id === activePlanId);
    if (plan) return { cal: plan.calories, p: plan.proteinG, c: plan.carbsG, f: plan.fatG };
  }
  return defaults;
}

export default function NutritionPage({ onRefreshing }: { onRefreshing?: (v: boolean) => void }) {
  const [tab, setTab] = useState(0);
  const [macros, setMacros] = useState<MacroEntry[]>([]);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [nutrients, setNutrients] = useState<Record<string, number>>({});
  const [customDietPlans, setCustomDietPlans] = useState<CustomDietPlan[]>([]);
  const [customPlansLoaded, setCustomPlansLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePlanId, setActivePlanId] = useState<string | null>(() => localStorage.getItem('siuu_active_plan'));
  const [logNutrientTarget, setLogNutrientTarget] = useState<Nutrient | null>(null);
  const [logNutrientAmt, setLogNutrientAmt] = useState('');
  const [logNutrientBusy, setLogNutrientBusy] = useState(false);
  const [dietPlanForm, setDietPlanForm] = useState(false);
  const [editingDietPlan, setEditingDietPlan] = useState<CustomDietPlan | null>(null);
  const [feedback, setFeedback] = useState('');

  // Food search modal
  const [showFoodSearch, setShowFoodSearch] = useState(false);

  // Food diary form
  const [selectedMeal, setSelectedMeal] = useState('Breakfast');
  const [foodName, setFoodName] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [foodGrams, setFoodGrams] = useState('100');
  const [foodSuggestions, setFoodSuggestions] = useState<FoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [foodBusy, setFoodBusy] = useState(false);

  // Macros form
  const [macroLabel, setMacroLabel] = useState('');
  const [macroP, setMacroP] = useState('');
  const [macroC, setMacroC] = useState('');
  const [macroF, setMacroF] = useState('');
  const [macroBusy, setMacroBusy] = useState(false);

  // Micro tab filter
  const [microFilter, setMicroFilter] = useState<NutrientCategory | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    onRefreshing?.(true);
    try {
      const [mRes, fRes, nRes] = await Promise.all([
        api.macrosToday(), api.foodToday(), api.nutrientsToday(),
      ]);
      setMacros(mRes.entries);
      setFoods(fRes.entries);
      const nd: Record<string, number> = {};
      for (const e of nRes.nutrients) nd[e.nutrient_id] = e.total_amount;
      setNutrients(nd);
    } catch (e) { console.error(e); }
    finally { setLoading(false); onRefreshing?.(false); }
  }, [onRefreshing]);

  const loadCustomDietPlans = useCallback(async () => {
    try {
      const res = await api.getCustomDietPlans();
      setCustomDietPlans(res.plans);
      setCustomPlansLoaded(true);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 4 && !customPlansLoaded) loadCustomDietPlans();
  }, [tab, customPlansLoaded, loadCustomDietPlans]);

  const selectPlan = async (planId: string) => {
    setActivePlanId(planId);
    localStorage.setItem('siuu_active_plan', planId);
    try { await api.saveDietPlan(planId); } catch (e) { console.error(e); }
  };

  const clearPlan = async () => {
    setActivePlanId(null);
    localStorage.removeItem('siuu_active_plan');
    try { await api.saveDietPlan(''); } catch (e) { console.error(e); }
  };

  const logFood = async () => {
    if (!foodName.trim()) return;
    setFoodBusy(true);
    try {
      const grams = parseFloat(foodGrams) || 100;
      const m = selectedFood ? calcMacros(selectedFood, grams) : { cal: 0, p: 0, c: 0, f: 0 };
      await api.logFood({
        meal_name: selectedMeal,
        food_name: selectedFood ? `${foodName.trim()} (${grams}g)` : foodName.trim(),
        calories: m.cal,
        protein_g: m.p,
        carbs_g: m.c,
        fat_g: m.f,
      });
      setFoodName(''); setFoodGrams('100'); setSelectedFood(null); setShowSuggestions(false);
      showFeedback('Food logged!');
      load(false);
    } catch (e) { console.error(e); }
    finally { setFoodBusy(false); }
  };

  const logMacro = async () => {
    const p = parseFloat(macroP) || 0, c = parseFloat(macroC) || 0, f = parseFloat(macroF) || 0;
    if (!p && !c && !f) return;
    setMacroBusy(true);
    try {
      await api.logMacro({ protein_g: p, carbs_g: c, fat_g: f, label: macroLabel || undefined });
      setMacroLabel(''); setMacroP(''); setMacroC(''); setMacroF('');
      showFeedback('Macros logged!');
      load(false);
    } catch (e) { console.error(e); }
    finally { setMacroBusy(false); }
  };

  const deleteFood = async (id: number) => {
    try {
      await api.deleteFood(id);
      setFoods(fs => fs.filter(f => f.id !== id));
    } catch (e) { console.error(e); }
  };

  const logNutrient = async () => {
    if (!logNutrientTarget || !logNutrientAmt) return;
    setLogNutrientBusy(true);
    try {
      await api.logNutrient(logNutrientTarget.id, parseFloat(logNutrientAmt));
      setNutrients(prev => ({ ...prev, [logNutrientTarget.id]: (prev[logNutrientTarget.id] || 0) + parseFloat(logNutrientAmt) }));
      setLogNutrientTarget(null); setLogNutrientAmt('');
    } catch (e) { console.error(e); }
    finally { setLogNutrientBusy(false); }
  };

  const deleteDietPlan = async (plan: CustomDietPlan) => {
    if (!window.confirm(`Delete "${plan.name}"?`)) return;
    try {
      await api.deleteCustomDietPlan(plan.id);
      setCustomDietPlans(ps => ps.filter(p => p.id !== plan.id));
      if (activePlanId === `custom_${plan.id}`) clearPlan();
    } catch (e) { console.error(e); }
  };

  // Computed totals
  const totCal = Math.round([...macros, ...foods].reduce((s, e) => s + e.calories, 0));
  const totP   = Math.round([...macros, ...foods].reduce((s, e) => s + e.protein_g, 0));
  const totC   = Math.round([...macros, ...foods].reduce((s, e) => s + e.carbs_g, 0));
  const totF   = Math.round([...macros, ...foods].reduce((s, e) => s + e.fat_g, 0));
  const goals  = getActivePlanGoals(activePlanId, customDietPlans);
  const metCount = NUTRIENTS.filter(n => (nutrients[n.id] || 0) >= n.rda).length;
  const microScore = NUTRIENTS.reduce((s, n) => s + Math.min(1, (nutrients[n.id] || 0) / n.rda), 0) / NUTRIENTS.length;

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-app-red border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab selector */}
      <div className="flex-shrink-0 overflow-x-auto no-scrollbar" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
        <div className="flex px-3 py-2.5 gap-2 min-w-max">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className="flex-shrink-0 px-3 py-1.5 font-barlow font-bold text-xs tracking-[1.5px] transition-all"
              style={{
                background: tab === i ? '#CC0000' : '#141414',
                color: tab === i ? 'white' : '#AAAAAA',
                border: `1px solid ${tab === i ? '#CC0000' : '#2E2E2E'}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className="flex-shrink-0 mx-4 mt-1 p-2 text-center font-barlow font-bold text-xs text-app-success"
          style={{ background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)' }}>
          {feedback}
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

        {/* ── OVERVIEW ── */}
        {tab === 0 && (
          <>
            {/* Active plan banner */}
            {activePlanId && (
              <ActivePlanBanner planId={activePlanId} plans={DIET_PLANS} customPlans={customDietPlans} onClear={clearPlan} />
            )}

            {/* Calorie ring */}
            <div className="p-4" style={{ background: '#1C1C1C' }}>
              <div className="flex items-center gap-5">
                <ScoreRing progress={Math.min(1, totCal / goals.cal)} size={100} label={`${Math.round((totCal / goals.cal) * 100)}%`} sublabel="CAL" />
                <div className="flex-1">
                  <div className="font-barlow text-xs text-app-muted tracking-[2px]">CALORIES TODAY</div>
                  <div className="font-barlow font-black text-3xl text-app-primary leading-none mt-1">{totCal} <span className="text-lg font-bold text-app-muted">kcal</span></div>
                  <div className="font-barlow text-xs text-app-muted mt-1">of {goals.cal} goal</div>
                </div>
              </div>
            </div>

            {/* Macro bars */}
            <div className="p-4 mt-px" style={{ background: '#141414' }}>
              <NSectionHead title="MACROS" />
              <MacroBarRow label="PROTEIN" value={totP} goal={goals.p} unit="g" color="#E53935" />
              <MacroBarRow label="CARBS"   value={totC} goal={goals.c} unit="g" color="#FF9800" />
              <MacroBarRow label="FAT"     value={totF} goal={goals.f} unit="g" color="#9C27B0" />
            </div>

            {/* Micro summary */}
            <div className="p-4 mt-px" style={{ background: '#141414' }}>
              <NSectionHead title={`MICRO NUTRIENTS  ${metCount}/${NUTRIENTS.length} MET`} />
              <div className="flex items-center gap-4 mb-3">
                <ScoreRing progress={microScore} size={72} label={`${Math.round(microScore * 100)}%`} sublabel="MICRO" />
                <div className="flex-1 space-y-2">
                  {(['vitamins', 'minerals', 'essentialFats', 'fiber'] as NutrientCategory[]).map(cat => {
                    const items = getNutrientsByCategory(cat);
                    const met = items.filter(n => (nutrients[n.id] || 0) >= n.rda).length;
                    const catColor = cat === 'vitamins' ? '#2196F3' : cat === 'minerals' ? '#2ECC71' : cat === 'essentialFats' ? '#FF9800' : '#9C27B0';
                    return (
                      <div key={cat}>
                        <div className="flex justify-between mb-0.5">
                          <span className="font-barlow font-bold text-xs" style={{ color: catColor }}>{CATEGORY_LABELS[cat]}</span>
                          <span className="font-barlow text-xs text-app-muted">{met}/{items.length}</span>
                        </div>
                        <ProgressBar value={items.length ? met / items.length : 0} color={catColor} height={4} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => setTab(3)}
                className="w-full py-2 font-barlow font-bold text-xs text-app-secondary tracking-[1.5px]"
                style={{ border: '1px solid #2E2E2E' }}>
                VIEW ALL NUTRIENTS →
              </button>
            </div>
          </>
        )}

        {/* ── FOOD DIARY ── */}
        {tab === 1 && (
          <>
            {/* Daily totals */}
            <div className="p-4" style={{ background: '#1C1C1C' }}>
              <div className="grid grid-cols-4 gap-2">
                <MiniStat label="CALORIES" value={`${totCal}`} unit="kcal" color="#CC0000" />
                <MiniStat label="PROTEIN"  value={`${totP}`}   unit="g"    color="#E53935" />
                <MiniStat label="CARBS"    value={`${totC}`}   unit="g"    color="#FF9800" />
                <MiniStat label="FAT"      value={`${totF}`}   unit="g"    color="#9C27B0" />
              </div>
            </div>

            {/* Meal category selector */}
            <div className="mt-px p-4" style={{ background: '#141414' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div style={{ width: 3, height: 14, background: '#CC0000' }} />
                  <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">LOG FOOD</span>
                </div>
                <button
                  onClick={() => setShowFoodSearch(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 font-barlow font-bold text-xs tracking-[1px]"
                  style={{ background: 'rgba(204,0,0,0.12)', color: '#CC0000', border: '1px solid rgba(204,0,0,0.3)' }}>
                  <Search size={11} /> SEARCH DB
                </button>
              </div>
              <div className="overflow-x-auto no-scrollbar mb-3">
                <div className="flex gap-2 min-w-max">
                  {MEAL_CATEGORIES.map(m => (
                    <button key={m}
                      onClick={() => setSelectedMeal(m)}
                      className="flex-shrink-0 px-3 py-1.5 font-barlow font-bold text-xs tracking-widest transition-all"
                      style={{
                        background: selectedMeal === m ? '#CC0000' : '#1C1C1C',
                        color: selectedMeal === m ? 'white' : '#AAAAAA',
                        border: `1px solid ${selectedMeal === m ? '#CC0000' : '#2E2E2E'}`,
                      }}>
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <FLabel>FOOD NAME *</FLabel>
              <div className="relative">
                <input
                  type="text"
                  value={foodName}
                  onChange={e => {
                    const val = e.target.value;
                    setFoodName(val);
                    if (selectedFood && val !== selectedFood.name) setSelectedFood(null);
                    setFoodSuggestions(searchFoods(val));
                    setShowSuggestions(val.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (foodName.trim()) {
                      setFoodSuggestions(searchFoods(foodName));
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Type to search foods..."
                  className="w-full px-2 py-2 bg-transparent font-barlow font-bold text-base text-app-primary outline-none placeholder:text-app-muted"
                  style={{ border: '1px solid #2E2E2E' }}
                />
                {showSuggestions && foodSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-40 max-h-52 overflow-y-auto no-scrollbar"
                    style={{ background: '#1C1C1C', border: '1px solid #2E2E2E', borderTop: 'none' }}>
                    {foodSuggestions.slice(0, 8).map(food => (
                      <button key={food.id}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setFoodName(food.name);
                          setSelectedFood(food);
                          setFoodGrams(String(food.defaultGrams));
                          setShowSuggestions(false);
                        }}
                        className="w-full px-3 py-2.5 text-left"
                        style={{ borderBottom: '1px solid #141414' }}>
                        <div className="font-barlow font-bold text-sm text-app-primary">{food.name}</div>
                        <div className="font-barlow text-xs mt-0.5" style={{ color: '#888' }}>
                          {food.cal} kcal · P:{food.p}g · C:{food.c}g · F:{food.f}g  (per 100g)
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3">
                <FLabel>AMOUNT (GRAMS)</FLabel>
                <FInput value={foodGrams} onChange={setFoodGrams} type="number" placeholder="100" />
              </div>

              {selectedFood && parseFloat(foodGrams) > 0 && (() => {
                const m = calcMacros(selectedFood, parseFloat(foodGrams));
                return (
                  <div className="mt-2 grid grid-cols-4 gap-1.5 px-2 py-2.5" style={{ background: '#1C1C1C' }}>
                    <div className="text-center">
                      <div className="font-barlow font-black text-base leading-none" style={{ color: '#CC0000' }}>{m.cal}</div>
                      <div className="font-barlow text-xs text-app-muted">KCAL</div>
                    </div>
                    <div className="text-center">
                      <div className="font-barlow font-black text-base leading-none" style={{ color: '#E53935' }}>{m.p}g</div>
                      <div className="font-barlow text-xs text-app-muted">PROTEIN</div>
                    </div>
                    <div className="text-center">
                      <div className="font-barlow font-black text-base leading-none" style={{ color: '#FF9800' }}>{m.c}g</div>
                      <div className="font-barlow text-xs text-app-muted">CARBS</div>
                    </div>
                    <div className="text-center">
                      <div className="font-barlow font-black text-base leading-none" style={{ color: '#9C27B0' }}>{m.f}g</div>
                      <div className="font-barlow text-xs text-app-muted">FAT</div>
                    </div>
                  </div>
                );
              })()}

              <button onClick={logFood} disabled={foodBusy || !foodName.trim()}
                className="mt-3 w-full py-3 font-barlow font-black text-sm tracking-[2px] text-white"
                style={{ background: '#CC0000', opacity: foodBusy || !foodName.trim() ? 0.6 : 1 }}>
                {foodBusy ? '...' : 'LOG FOOD'}
              </button>
            </div>

            {/* Food diary list grouped by meal */}
            {foods.length === 0 ? (
              <div className="py-10 text-center font-barlow text-sm text-app-muted tracking-[2px]">NO FOOD LOGGED TODAY</div>
            ) : (
              MEAL_CATEGORIES.filter(m => foods.some(f => f.meal_name === m)).map(meal => {
                const entries = foods.filter(f => f.meal_name === meal);
                const mealCal = Math.round(entries.reduce((s, e) => s + e.calories, 0));
                return (
                  <div key={meal} className="mt-px" style={{ background: '#141414' }}>
                    <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 3, height: 12, background: '#CC0000' }} />
                        <span className="font-barlow font-bold text-xs text-app-primary tracking-[2px]">{meal.toUpperCase()}</span>
                      </div>
                      <span className="font-barlow text-xs text-app-muted">{mealCal} kcal</span>
                    </div>
                    {entries.map(f => (
                      <div key={f.id} className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1C1C1C' }}>
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="font-barlow font-bold text-sm text-app-primary truncate">{f.food_name}</div>
                          <div className="font-barlow text-xs text-app-muted mt-0.5">
                            {Math.round(f.calories)}kcal
                            {f.protein_g > 0 ? `  ·  P:${Math.round(f.protein_g)}g` : ''}
                            {f.carbs_g > 0 ? `  C:${Math.round(f.carbs_g)}g` : ''}
                            {f.fat_g > 0 ? `  F:${Math.round(f.fat_g)}g` : ''}
                          </div>
                        </div>
                        <button onClick={() => deleteFood(f.id)} className="p-1 flex-shrink-0">
                          <Trash2 size={14} color="#666" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── MACROS ── */}
        {tab === 2 && (
          <>
            {/* Macro circles */}
            <div className="p-4" style={{ background: '#1C1C1C' }}>
              <div className="flex justify-around">
                {[
                  { label: 'PROTEIN', val: totP, goal: goals.p, color: '#E53935' },
                  { label: 'CARBS',   val: totC, goal: goals.c, color: '#FF9800' },
                  { label: 'FAT',     val: totF, goal: goals.f, color: '#9C27B0' },
                ].map(m => (
                  <MacroCircle key={m.label} label={m.label} val={m.val} goal={m.goal} color={m.color} />
                ))}
              </div>
            </div>

            {/* Log meal form */}
            <div className="mt-px p-4" style={{ background: '#141414' }}>
              <NSectionHead title="LOG A MEAL" />
              <FLabel>MEAL NAME (OPTIONAL)</FLabel>
              <FInput value={macroLabel} onChange={setMacroLabel} placeholder="e.g. Post-workout shake" />
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div><FLabel>PROTEIN (g)</FLabel><FInput value={macroP} onChange={setMacroP} type="number" placeholder="50" /></div>
                <div><FLabel>CARBS (g)</FLabel><FInput value={macroC} onChange={setMacroC} type="number" placeholder="100" /></div>
                <div><FLabel>FAT (g)</FLabel><FInput value={macroF} onChange={setMacroF} type="number" placeholder="20" /></div>
              </div>
              {(parseFloat(macroP) || parseFloat(macroC) || parseFloat(macroF)) ? (
                <div className="mt-2 px-3 py-2 flex items-center gap-2" style={{ background: '#1C1C1C' }}>
                  <span className="font-barlow text-xs" style={{ color: '#CC0000' }}>🔥</span>
                  <span className="font-barlow text-xs text-app-secondary">
                    {Math.round((parseFloat(macroP) || 0) * 4 + (parseFloat(macroC) || 0) * 4 + (parseFloat(macroF) || 0) * 9)} CALORIES (auto-calculated)
                  </span>
                </div>
              ) : null}
              <button onClick={logMacro} disabled={macroBusy}
                className="mt-3 w-full py-3 font-barlow font-black text-sm tracking-[2px] text-white"
                style={{ background: '#CC0000', opacity: macroBusy ? 0.6 : 1 }}>
                {macroBusy ? '...' : 'LOG MEAL'}
              </button>
            </div>

            {/* Today's macro entries */}
            {macros.length > 0 && (
              <div className="mt-px" style={{ background: '#141414' }}>
                <div className="px-4 py-2 flex items-center gap-2" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
                  <div style={{ width: 3, height: 12, background: '#CC0000' }} />
                  <span className="font-barlow font-bold text-xs text-app-primary tracking-[2px]">TODAY'S MEALS</span>
                  <span className="font-barlow text-xs text-app-muted ml-auto">{macros.length} LOGGED</span>
                </div>
                {macros.map(m => (
                  <div key={m.id} className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid #1C1C1C' }}>
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(204,0,0,0.1)' }}>
                      <span className="font-barlow font-black text-xs" style={{ color: '#CC0000' }}>M</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-barlow font-bold text-sm text-app-primary">{(m.label || 'Meal').toUpperCase()}</div>
                      <div className="font-barlow text-xs text-app-secondary mt-0.5">
                        P:{Math.round(m.protein_g)}g  C:{Math.round(m.carbs_g)}g  F:{Math.round(m.fat_g)}g  ·  {Math.round(m.calories)} kcal
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {macros.length === 0 && (
              <div className="py-10 text-center font-barlow text-sm text-app-muted tracking-[2px]">NO MEALS LOGGED TODAY</div>
            )}
          </>
        )}

        {/* ── MICRO ── */}
        {tab === 3 && (
          <>
            {/* Category filter */}
            <div className="overflow-x-auto no-scrollbar" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
              <div className="flex px-3 py-2.5 gap-2 min-w-max">
                {([null, 'vitamins', 'minerals', 'essentialFats', 'fiber'] as (NutrientCategory | null)[]).map(cat => {
                  const label = cat === null ? 'ALL' : cat === 'essentialFats' ? 'FATS' : cat.toUpperCase();
                  const active = microFilter === cat;
                  return (
                    <button key={label}
                      onClick={() => setMicroFilter(cat)}
                      className="flex-shrink-0 px-3 py-1.5 font-barlow font-bold text-xs tracking-[1.5px] transition-all"
                      style={{
                        background: active ? '#CC0000' : '#141414',
                        color: active ? 'white' : '#AAAAAA',
                        border: `1px solid ${active ? '#CC0000' : '#2E2E2E'}`,
                      }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nutrient list */}
            {(microFilter ? [microFilter] : ['vitamins', 'minerals', 'essentialFats', 'fiber'] as NutrientCategory[]).map(cat => {
              const items = getNutrientsByCategory(cat);
              const met = items.filter(n => (nutrients[n.id] || 0) >= n.rda).length;
              const catColor = cat === 'vitamins' ? '#2196F3' : cat === 'minerals' ? '#2ECC71' : cat === 'essentialFats' ? '#FF9800' : '#9C27B0';
              return (
                <div key={cat}>
                  <div className="px-4 py-2 flex items-center justify-between"
                    style={{ background: '#0A0A0A', borderBottom: '1px solid #1C1C1C' }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 3, height: 14, background: catColor }} />
                      <span className="font-barlow font-bold text-xs tracking-[2px]" style={{ color: '#AAAAAA' }}>
                        {CATEGORY_LABELS[cat]}
                      </span>
                    </div>
                    <span className="font-barlow text-xs text-app-muted">{met}/{items.length} MET</span>
                  </div>
                  {items.map(n => {
                    const amt = nutrients[n.id] || 0;
                    const prog = Math.min(1, amt / n.rda);
                    const met2 = prog >= 1;
                    return (
                      <button key={n.id}
                        onClick={() => { setLogNutrientTarget(n); setLogNutrientAmt(''); }}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left"
                        style={{ background: '#141414', borderBottom: '1px solid #1C1C1C' }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1.5">
                            <span className="font-barlow font-bold text-sm" style={{ color: met2 ? '#2ECC71' : '#E8E8E8' }}>
                              {n.alias || n.name}
                            </span>
                            <span className="font-barlow text-xs text-app-muted">
                              {amt > 0 ? (amt >= 1 ? Math.round(amt) : amt.toFixed(1)) : '—'}/{n.rda}{n.unit}
                            </span>
                          </div>
                          <ProgressBar value={prog} color={met2 ? '#2ECC71' : catColor} height={5} />
                        </div>
                        {met2 && <Check size={14} color="#2ECC71" className="flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}

        {/* ── DIET PLAN ── */}
        {tab === 4 && (
          <>
            {/* Active plan banner */}
            {activePlanId && (
              <ActivePlanBanner planId={activePlanId} plans={DIET_PLANS} customPlans={customDietPlans} onClear={clearPlan} />
            )}

            {/* Create custom plan button */}
            <div className="p-4" style={{ background: '#141414' }}>
              <button
                onClick={() => { setEditingDietPlan(null); setDietPlanForm(true); }}
                className="w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm tracking-[2px]"
                style={{ border: '2px solid #CC0000', color: '#CC0000', background: 'rgba(204,0,0,0.06)' }}>
                <Plus size={16} /> CREATE MY OWN PLAN
              </button>
            </div>

            {/* Custom plans */}
            {customDietPlans.length > 0 && (
              <div className="mt-px">
                <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 3, height: 14, background: '#1E88E5' }} />
                    <span className="font-barlow font-bold text-xs text-app-primary tracking-[2px]">MY CUSTOM PLANS</span>
                  </div>
                  <span className="font-barlow text-xs text-app-muted">{customDietPlans.length}</span>
                </div>
                {customDietPlans.map(plan => (
                  <CustomDietPlanCard
                    key={plan.id}
                    plan={plan}
                    isActive={activePlanId === `custom_${plan.id}`}
                    onSelect={() => selectPlan(`custom_${plan.id}`)}
                    onEdit={() => { setEditingDietPlan(plan); setDietPlanForm(true); }}
                    onDelete={() => deleteDietPlan(plan)}
                  />
                ))}
              </div>
            )}

            {/* Recommended plans */}
            <div className="mt-px">
              <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
                <div className="flex items-center gap-2">
                  <div style={{ width: 3, height: 14, background: '#CC0000' }} />
                  <span className="font-barlow font-bold text-xs text-app-primary tracking-[2px]">RECOMMENDED PLANS</span>
                </div>
                <span className="font-barlow text-xs text-app-muted">{DIET_PLANS.length} PLANS</span>
              </div>
              {DIET_PLANS.map(plan => (
                <RecommendedDietPlanCard
                  key={plan.id}
                  plan={plan}
                  isActive={activePlanId === plan.id}
                  onSelect={() => selectPlan(plan.id)}
                />
              ))}
            </div>
          </>
        )}

        <div className="h-4" />
      </div>

      {/* Nutrient log modal */}
      {logNutrientTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-lg p-6" style={{ background: '#141414', border: '1px solid #2E2E2E' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-barlow font-black text-lg text-app-primary tracking-[2px]">LOG NUTRIENT</div>
                <div className="font-barlow text-sm text-app-secondary">
                  {logNutrientTarget.name}{logNutrientTarget.alias ? ` (${logNutrientTarget.alias})` : ''}
                </div>
              </div>
              <button onClick={() => setLogNutrientTarget(null)}><X size={20} color="#666" /></button>
            </div>
            <FLabel>AMOUNT ({logNutrientTarget.unit}) — RDA: {logNutrientTarget.rda}{logNutrientTarget.unit}</FLabel>
            <div className="flex items-center gap-2 mb-4" style={{ border: '1px solid #2E2E2E' }}>
              <input
                type="number"
                value={logNutrientAmt}
                onChange={e => setLogNutrientAmt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && logNutrient()}
                placeholder={`e.g. ${logNutrientTarget.rda}`}
                autoFocus
                className="flex-1 px-3 py-3 bg-transparent font-barlow font-bold text-lg text-app-primary outline-none placeholder:text-app-muted"
              />
              <span className="px-3 font-barlow text-sm text-app-muted">{logNutrientTarget.unit}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setLogNutrientTarget(null)}
                className="flex-1 py-3 font-barlow font-bold text-sm text-app-muted"
                style={{ border: '1px solid #2E2E2E' }}>CANCEL</button>
              <button onClick={logNutrient} disabled={logNutrientBusy || !logNutrientAmt}
                className="flex-1 py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm text-white"
                style={{ background: '#CC0000', opacity: logNutrientBusy || !logNutrientAmt ? 0.6 : 1 }}>
                <Plus size={14} /> {logNutrientBusy ? '...' : 'LOG IT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diet plan create/edit form */}
      {dietPlanForm && (
        <DietPlanFormModal
          existing={editingDietPlan}
          onClose={() => setDietPlanForm(false)}
          onSaved={() => { setDietPlanForm(false); loadCustomDietPlans(); }}
        />
      )}

      {/* Food search modal */}
      {showFoodSearch && (
        <FoodSearchModal
          selectedMeal={selectedMeal}
          onClose={() => setShowFoodSearch(false)}
          onLogged={() => { setShowFoodSearch(false); load(false); showFeedback('Food logged!'); }}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActivePlanBanner({ planId, plans, customPlans, onClear }: {
  planId: string; plans: StaticPlan[]; customPlans: CustomDietPlan[]; onClear: () => void;
}) {
  let name = '', cal = 0, p = 0, c = 0, f = 0;
  if (planId.startsWith('custom_')) {
    const id = parseInt(planId.replace('custom_', ''));
    const plan = customPlans.find(pl => pl.id === id);
    if (plan) { name = plan.name; cal = plan.calories; p = plan.protein_g; c = plan.carbs_g; f = plan.fat_g; }
  } else {
    const plan = plans.find(pl => pl.id === planId);
    if (plan) { name = plan.name; cal = plan.calories; p = plan.proteinG; c = plan.carbsG; f = plan.fatG; }
  }
  if (!name) return null;
  return (
    <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(204,0,0,0.1)', borderBottom: '1px solid rgba(204,0,0,0.2)' }}>
      <Check size={18} color="#CC0000" className="flex-shrink-0" />
      <div className="flex-1">
        <div className="font-barlow font-bold text-xs text-app-red tracking-[2px]">ACTIVE PLAN</div>
        <div className="font-barlow font-black text-base text-app-primary">{name.toUpperCase()}</div>
        <div className="font-barlow text-xs text-app-secondary">{cal} kcal  ·  {p}g P  {c}g C  {f}g F</div>
      </div>
      <button onClick={onClear} className="p-1"><X size={16} color="#666" /></button>
    </div>
  );
}

function CustomDietPlanCard({ plan, isActive, onSelect, onEdit, onDelete }: {
  plan: CustomDietPlan; isActive: boolean; onSelect: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: '#141414', borderBottom: '1px solid #2E2E2E', borderLeft: isActive ? '3px solid #CC0000' : undefined }}>
      <button onClick={() => setExpanded(v => !v)} className="w-full px-4 py-3 flex items-start gap-3 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-barlow font-bold text-xs px-2 py-0.5"
              style={{ background: isActive ? '#CC0000' : 'rgba(30,136,229,0.15)', color: isActive ? 'white' : '#1E88E5' }}>
              MY PLAN
            </span>
            <span className="font-barlow font-black text-base text-app-primary">{plan.name.toUpperCase()}</span>
          </div>
          {plan.description ? <div className="font-barlow text-xs text-app-muted mt-0.5 truncate">{plan.description}</div> : null}
          <div className="flex gap-3 mt-1.5 flex-wrap">
            <MacroTag text={`${plan.calories} kcal`} color="#AAAAAA" />
            <MacroTag text={`P ${plan.protein_g}g`} color="#E53935" />
            <MacroTag text={`C ${plan.carbs_g}g`} color="#FF9800" />
            <MacroTag text={`F ${plan.fat_g}g`} color="#9C27B0" />
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5"><Edit2 size={14} color="#666" /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5"><Trash2 size={14} color="#666" /></button>
          {expanded ? <ChevronUp size={16} color="#666" /> : <ChevronDown size={16} color="#666" />}
        </div>
      </button>

      {expanded && plan.meals.length > 0 && (
        <div className="px-4 pb-2" style={{ borderTop: '1px solid #2E2E2E' }}>
          {plan.meals.map((meal, i) => (
            <div key={i} className="pt-3 pb-2" style={{ borderBottom: '1px solid #1C1C1C' }}>
              <div className="flex justify-between mb-1">
                <span className="font-barlow font-bold text-xs" style={{ color: '#CC0000' }}>{meal.meal_name.toUpperCase()}</span>
                <span className="font-barlow text-xs text-app-muted">{meal.calories} kcal</span>
              </div>
              {meal.foods && <div className="font-barlow text-xs text-app-secondary leading-4">{meal.foods}</div>}
              <div className="flex gap-2 mt-1.5">
                <MacroTag text={`P ${meal.protein_g}g`} color="#E53935" />
                <MacroTag text={`C ${meal.carbs_g}g`} color="#FF9800" />
                <MacroTag text={`F ${meal.fat_g}g`} color="#9C27B0" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 pb-3 pt-2">
        {isActive ? (
          <div className="py-2 text-center font-barlow font-bold text-xs tracking-[2px]"
            style={{ background: 'rgba(204,0,0,0.12)', color: '#CC0000' }}>
            ✓ ACTIVE PLAN
          </div>
        ) : (
          <button onClick={onSelect}
            className="w-full py-2.5 font-barlow font-bold text-sm tracking-[1px]"
            style={{ border: '1px solid #2E2E2E', color: '#AAAAAA' }}>
            USE THIS PLAN
          </button>
        )}
      </div>
    </div>
  );
}

function RecommendedDietPlanCard({ plan, isActive, onSelect }: {
  plan: StaticPlan; isActive: boolean; onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: '#141414', borderBottom: '1px solid #2E2E2E' }}>
      <button onClick={() => setExpanded(v => !v)} className="w-full px-4 py-3 flex items-start gap-3 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-barlow font-bold text-xs px-2 py-0.5"
              style={{ background: isActive ? '#CC0000' : 'rgba(204,0,0,0.12)', color: isActive ? 'white' : '#CC0000' }}>
              {plan.goal}
            </span>
            <span className="font-barlow font-black text-base text-app-primary">{plan.name.toUpperCase()}</span>
          </div>
          <div className="font-barlow text-xs text-app-muted mt-0.5 truncate">{plan.description}</div>
          <div className="flex gap-3 mt-1.5 flex-wrap">
            <MacroTag text={`${plan.calories} kcal`} color="#AAAAAA" />
            <MacroTag text={`P ${plan.proteinG}g`} color="#E53935" />
            <MacroTag text={`C ${plan.carbsG}g`} color="#FF9800" />
            <MacroTag text={`F ${plan.fatG}g`} color="#9C27B0" />
          </div>
        </div>
        {expanded ? <ChevronUp size={16} color="#666" className="flex-shrink-0 mt-1" /> : <ChevronDown size={16} color="#666" className="flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="px-4 pb-2" style={{ borderTop: '1px solid #2E2E2E' }}>
          {plan.meals.map((meal, i) => (
            <div key={i} className="pt-3 pb-2" style={{ borderBottom: '1px solid #1C1C1C' }}>
              <div className="flex justify-between mb-1">
                <span className="font-barlow font-bold text-xs" style={{ color: '#CC0000' }}>{meal.name.toUpperCase()}</span>
                <span className="font-barlow text-xs text-app-muted">{meal.calories} kcal</span>
              </div>
              <div className="font-barlow text-xs text-app-secondary leading-4">{meal.foods}</div>
              <div className="flex gap-2 mt-1.5">
                <MacroTag text={`P ${meal.proteinG}g`} color="#E53935" />
                <MacroTag text={`C ${meal.carbsG}g`} color="#FF9800" />
                <MacroTag text={`F ${meal.fatG}g`} color="#9C27B0" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 pb-3 pt-2">
        {isActive ? (
          <div className="py-2 text-center font-barlow font-bold text-xs tracking-[2px]"
            style={{ background: 'rgba(204,0,0,0.12)', color: '#CC0000' }}>
            ✓ ACTIVE PLAN
          </div>
        ) : (
          <button onClick={onSelect}
            className="w-full py-2.5 font-barlow font-bold text-sm tracking-[1px]"
            style={{ border: '1px solid #2E2E2E', color: '#AAAAAA' }}>
            SELECT THIS PLAN
          </button>
        )}
      </div>
    </div>
  );
}

// ── Food Search Modal ─────────────────────────────────────────────────────────

function FoodSearchModal({ selectedMeal, onClose, onLogged }: {
  selectedMeal: string; onClose: () => void; onLogged: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>(() => FOODS.slice(0, 30));
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [modalGrams, setModalGrams] = useState('100');
  const [meal, setMeal] = useState(selectedMeal);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(FOODS.slice(0, 30));
    } else {
      setResults(searchFoods(query));
    }
  }, [query]);

  const doLog = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const g = parseFloat(modalGrams) || 100;
      const m = calcMacros(selected, g);
      await api.logFood({
        meal_name: meal,
        food_name: `${selected.name} (${g}g)`,
        calories: m.cal,
        protein_g: m.p,
        carbs_g: m.c,
        fat_g: m.f,
      });
      onLogged();
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ background: '#141414', borderBottom: '1px solid #2E2E2E' }}>
        <button onClick={onClose} className="p-1"><X size={20} color="#666" /></button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2" style={{ background: '#1C1C1C', border: '1px solid #2E2E2E' }}>
          <Search size={14} color="#666" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search 100+ foods..."
            className="flex-1 bg-transparent font-barlow text-sm text-app-primary outline-none placeholder:text-app-muted"
          />
          {query && <button onClick={() => setQuery('')}><X size={14} color="#555" /></button>}
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {results.length === 0 ? (
          <div className="py-14 text-center font-barlow text-sm text-app-muted tracking-[2px]">NO FOODS FOUND</div>
        ) : (
          results.map(food => (
            <button
              key={food.id}
              onClick={() => { setSelected(food); setModalGrams(String(food.defaultGrams)); }}
              className="w-full px-4 py-3 flex items-center gap-3 text-left"
              style={{
                background: selected?.id === food.id ? 'rgba(204,0,0,0.1)' : '#141414',
                borderBottom: '1px solid #1C1C1C',
                borderLeft: selected?.id === food.id ? '3px solid #CC0000' : '3px solid transparent',
              }}>
              <div className="flex-1 min-w-0">
                <div className="font-barlow font-bold text-sm text-app-primary truncate">{food.name}</div>
                <div className="font-barlow text-xs text-app-muted mt-0.5">
                  {food.cal} kcal · P:{food.p}g · C:{food.c}g · F:{food.f}g  (per 100g)
                </div>
              </div>
              {selected?.id === food.id && <Check size={15} color="#CC0000" className="flex-shrink-0" />}
            </button>
          ))
        )}
        <div className="h-4" />
      </div>

      {/* Bottom action panel */}
      {selected && (
        <div className="flex-shrink-0 p-4" style={{ background: '#141414', borderTop: '1px solid #2E2E2E' }}>
          {/* Selected food summary */}
          <div className="mb-3">
            <div className="font-barlow font-black text-sm text-app-primary truncate">{selected.name.toUpperCase()}</div>
            {(() => {
              const g = parseFloat(modalGrams) || 100;
              const m = calcMacros(selected, g);
              return (
                <div className="flex gap-3 mt-1">
                  <span className="font-barlow font-bold text-xs" style={{ color: '#CC0000' }}>{m.cal} kcal</span>
                  <span className="font-barlow text-xs" style={{ color: '#E53935' }}>P:{m.p}g</span>
                  <span className="font-barlow text-xs" style={{ color: '#FF9800' }}>C:{m.c}g</span>
                  <span className="font-barlow text-xs" style={{ color: '#9C27B0' }}>F:{m.f}g</span>
                </div>
              );
            })()}
          </div>

          {/* Meal picker */}
          <div className="overflow-x-auto no-scrollbar mb-3">
            <div className="flex gap-1.5 min-w-max">
              {MEAL_CATEGORIES.map(m => (
                <button key={m}
                  onClick={() => setMeal(m)}
                  className="flex-shrink-0 px-2.5 py-1 font-barlow font-bold text-xs"
                  style={{
                    background: meal === m ? '#CC0000' : '#1C1C1C',
                    color: meal === m ? 'white' : '#888',
                    border: `1px solid ${meal === m ? '#CC0000' : '#2E2E2E'}`,
                  }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Grams input */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-barlow font-bold text-xs text-app-muted tracking-widest flex-shrink-0">GRAMS</span>
            <input
              type="number"
              value={modalGrams}
              onChange={e => setModalGrams(e.target.value)}
              className="w-20 px-2 py-1.5 bg-transparent font-barlow font-bold text-base text-app-primary outline-none"
              style={{ border: '1px solid #2E2E2E' }}
            />
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {[50, 100, 150, 200, 250].map(g => (
                <button key={g}
                  onClick={() => setModalGrams(String(g))}
                  className="flex-shrink-0 px-2 py-1 font-barlow font-bold text-xs"
                  style={{
                    background: parseInt(modalGrams) === g ? '#CC0000' : '#1C1C1C',
                    color: parseInt(modalGrams) === g ? 'white' : '#888',
                    border: `1px solid ${parseInt(modalGrams) === g ? '#CC0000' : '#2E2E2E'}`,
                  }}>
                  {g}g
                </button>
              ))}
            </div>
          </div>

          <button onClick={doLog} disabled={busy}
            className="w-full py-3.5 font-barlow font-black text-sm tracking-[2px] text-white"
            style={{ background: '#CC0000', opacity: busy ? 0.6 : 1 }}>
            {busy ? '...' : `LOG TO ${meal.toUpperCase()}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Diet Plan Form Modal ──────────────────────────────────────────────────────

function DietPlanFormModal({ existing, onClose, onSaved }: {
  existing: CustomDietPlan | null; onClose: () => void; onSaved: () => void;
}) {
  const [planName, setPlanName] = useState(existing?.name ?? '');
  const [planGoal, setPlanGoal] = useState(existing?.goal ?? '');
  const [planDesc, setPlanDesc] = useState(existing?.description ?? '');
  const [planCal, setPlanCal] = useState(existing?.calories.toString() ?? '');
  const [planP, setPlanP] = useState(existing?.protein_g.toString() ?? '');
  const [planC, setPlanC] = useState(existing?.carbs_g.toString() ?? '');
  const [planF, setPlanF] = useState(existing?.fat_g.toString() ?? '');
  const [keyCounter, setKeyCounter] = useState(existing ? existing.meals.length : 1);
  const [meals, setMeals] = useState<MealForm[]>(() => {
    if (!existing || existing.meals.length === 0) {
      return [{ _key: 0, meal_name: 'Breakfast', foods: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' }];
    }
    return existing.meals.map((m, i) => ({
      _key: i, meal_name: m.meal_name, foods: m.foods,
      calories: m.calories.toString(), protein_g: m.protein_g.toString(),
      carbs_g: m.carbs_g.toString(), fat_g: m.fat_g.toString(),
    }));
  });
  const [saving, setSaving] = useState(false);

  const addMeal = () => {
    setMeals(ms => [...ms, { _key: keyCounter, meal_name: '', foods: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' }]);
    setKeyCounter(k => k + 1);
  };
  const removeMeal = (key: number) => setMeals(ms => ms.filter(m => m._key !== key));
  const updateMeal = (key: number, field: keyof Omit<MealForm, '_key'>, val: string) =>
    setMeals(ms => ms.map(m => m._key === key ? { ...m, [field]: val } : m));

  const save = async () => {
    if (!planName.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: planName.trim(),
        goal: planGoal.trim() || 'GENERAL',
        description: planDesc.trim(),
        calories: parseInt(planCal) || 0,
        protein_g: parseInt(planP) || 0,
        carbs_g: parseInt(planC) || 0,
        fat_g: parseInt(planF) || 0,
        meals: meals.filter(m => m.meal_name.trim()).map(m => ({
          meal_name: m.meal_name.trim(),
          foods: m.foods,
          calories: parseInt(m.calories) || 0,
          protein_g: parseInt(m.protein_g) || 0,
          carbs_g: parseInt(m.carbs_g) || 0,
          fat_g: parseInt(m.fat_g) || 0,
        })),
      };
      if (existing) {
        await api.updateCustomDietPlan(existing.id, data);
      } else {
        await api.createCustomDietPlan(data);
      }
      onSaved();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{ background: '#141414', borderBottom: '1px solid #2E2E2E' }}>
        <div className="font-barlow font-black text-base text-app-primary tracking-[2px]">
          {existing ? 'EDIT DIET PLAN' : 'CREATE DIET PLAN'}
        </div>
        <button onClick={onClose}><X size={22} color="#666" /></button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <FLabel>PLAN NAME *</FLabel>
        <FInput value={planName} onChange={setPlanName} placeholder="e.g. My Bulk Plan" />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <FLabel>GOAL</FLabel>
            <FInput value={planGoal} onChange={setPlanGoal} placeholder="BUILD MUSCLE / LOSE FAT" />
          </div>
          <div>
            <FLabel>TOTAL CALORIES</FLabel>
            <FInput value={planCal} onChange={setPlanCal} type="number" placeholder="2000" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div><FLabel>PROTEIN (g)</FLabel><FInput value={planP} onChange={setPlanP} type="number" placeholder="150" /></div>
          <div><FLabel>CARBS (g)</FLabel><FInput value={planC} onChange={setPlanC} type="number" placeholder="200" /></div>
          <div><FLabel>FAT (g)</FLabel><FInput value={planF} onChange={setPlanF} type="number" placeholder="60" /></div>
        </div>

        <div className="mt-3">
          <FLabel>DESCRIPTION</FLabel>
          <textarea value={planDesc} onChange={e => setPlanDesc(e.target.value)}
            placeholder="What is this plan for?" rows={2}
            className="w-full px-3 py-2 bg-transparent font-barlow text-sm text-app-primary outline-none resize-none placeholder:text-app-muted"
            style={{ border: '1px solid #2E2E2E' }} />
        </div>

        {/* Meals */}
        <div className="mt-4 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: 3, height: 14, background: '#CC0000' }} />
            <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">MEALS ({meals.length})</span>
          </div>
          <button onClick={addMeal}
            className="flex items-center gap-1 px-3 py-1 font-barlow font-bold text-xs text-white"
            style={{ background: '#CC0000' }}>
            <Plus size={12} /> ADD MEAL
          </button>
        </div>

        {meals.map((m, idx) => (
          <div key={m._key} className="mb-2 p-3" style={{ background: '#141414', border: '1px solid #2E2E2E' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-barlow font-bold text-xs text-app-muted">MEAL {idx + 1}</span>
              <button onClick={() => removeMeal(m._key)}><X size={14} color="#666" /></button>
            </div>
            <FLabel sm>MEAL NAME</FLabel>
            <FInput sm value={m.meal_name} onChange={v => updateMeal(m._key, 'meal_name', v)} placeholder="Breakfast / Lunch / Dinner" />
            <div className="mt-2">
              <FLabel sm>FOODS</FLabel>
              <textarea value={m.foods} onChange={e => updateMeal(m._key, 'foods', e.target.value)}
                placeholder="e.g. 3 eggs, 80g oats, 1 banana" rows={2}
                className="w-full px-2 py-1.5 bg-transparent font-barlow text-sm text-app-primary outline-none resize-none placeholder:text-app-muted"
                style={{ border: '1px solid #2E2E2E' }} />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              <div><FLabel sm>KCAL</FLabel><FInput sm value={m.calories} onChange={v => updateMeal(m._key, 'calories', v)} type="number" placeholder="300" /></div>
              <div><FLabel sm>P (g)</FLabel><FInput sm value={m.protein_g} onChange={v => updateMeal(m._key, 'protein_g', v)} type="number" placeholder="30" /></div>
              <div><FLabel sm>C (g)</FLabel><FInput sm value={m.carbs_g} onChange={v => updateMeal(m._key, 'carbs_g', v)} type="number" placeholder="40" /></div>
              <div><FLabel sm>F (g)</FLabel><FInput sm value={m.fat_g} onChange={v => updateMeal(m._key, 'fat_g', v)} type="number" placeholder="10" /></div>
            </div>
          </div>
        ))}
        <div className="h-6" />
      </div>

      <div className="flex-shrink-0 p-4" style={{ background: '#141414', borderTop: '1px solid #2E2E2E' }}>
        <button onClick={save} disabled={saving || !planName.trim()}
          className="w-full py-4 font-barlow font-black text-sm tracking-[2px] text-white"
          style={{ background: '#CC0000', opacity: saving || !planName.trim() ? 0.6 : 1 }}>
          {saving ? '...' : existing ? 'SAVE CHANGES' : 'CREATE PLAN'}
        </button>
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function NSectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div style={{ width: 3, height: 14, background: '#CC0000' }} />
      <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">{title}</span>
    </div>
  );
}

function MacroBarRow({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="font-barlow font-bold text-xs tracking-widest" style={{ color }}>{label}</span>
        <span className="font-barlow text-xs text-app-muted">{value}{unit} / {goal}{unit}</span>
      </div>
      <ProgressBar value={Math.min(1, value / goal)} color={color} height={6} />
    </div>
  );
}

function MiniStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="p-2 flex flex-col items-center" style={{ background: '#0A0A0A', borderTop: `2px solid ${color}` }}>
      <span className="font-barlow font-black text-base text-app-primary leading-none">{value}</span>
      <span className="font-barlow text-xs mt-0.5" style={{ color }}>{unit}</span>
      <span className="font-barlow text-xs text-app-muted tracking-widest">{label}</span>
    </div>
  );
}

function MacroCircle({ label, val, goal, color }: { label: string; val: number; goal: number; color: string }) {
  const prog = Math.min(1, val / goal);
  const r = 28, circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="80" height="80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#2E2E2E" strokeWidth="6" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - prog)}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s' }} />
        </svg>
        <span className="font-barlow font-black text-sm text-app-primary">{val}g</span>
      </div>
      <span className="font-barlow font-bold text-xs tracking-[1px]" style={{ color }}>{label}</span>
      <span className="font-barlow text-xs text-app-muted">/ {goal}g</span>
    </div>
  );
}

function MacroTag({ text, color }: { text: string; color: string }) {
  return (
    <span className="font-barlow font-bold text-xs px-2 py-0.5"
      style={{ background: `${color}18`, color }}>
      {text}
    </span>
  );
}

function FLabel({ children, sm }: { children: React.ReactNode; sm?: boolean }) {
  return <div className={`font-barlow font-bold text-app-muted tracking-[1.5px] mb-1 ${sm ? 'text-[10px]' : 'text-xs'}`}>{children}</div>;
}

function FInput({ value, onChange, placeholder, type = 'text', sm }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; sm?: boolean;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-2 bg-transparent font-barlow font-bold text-app-primary outline-none placeholder:text-app-muted ${sm ? 'py-1.5 text-sm' : 'py-2 text-base'}`}
      style={{ border: '1px solid #2E2E2E' }} />
  );
}
