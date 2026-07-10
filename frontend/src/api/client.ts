const BASE = '';

function getToken(): string | null {
  return localStorage.getItem('siuu_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  setupStatus: () => request<{ done: boolean }>('/api/setup/status'),
  setup: (name: string, email: string, password: string) =>
    request<{ token: string; name: string }>('/api/setup', {
      method: 'POST', body: JSON.stringify({ name, email, password }),
    }),
  login: (password: string) =>
    request<{ token: string }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ password }),
    }),
  verify: () => request<{ ok: boolean }>('/api/auth/verify'),

  // Config
  config: () => request<{ vapid_public_key: string }>('/api/config'),

  // Profile
  getProfile: () =>
    request<{ name: string; email: string; water_message: string; height_cm: string }>('/api/user/profile'),
  updateProfile: (data: { water_message?: string; height_cm?: string }) =>
    request<{ ok: boolean }>('/api/user/profile', {
      method: 'POST', body: JSON.stringify(data),
    }),

  // Push
  pushSubscribe: (sub: PushSubscriptionJSON) =>
    request<{ ok: boolean }>('/api/push/subscribe', {
      method: 'POST', body: JSON.stringify(sub),
    }),
  pushStatus: () =>
    request<{ subscriptions: number; vapid_configured: boolean }>('/api/push/status'),
  pushTest: () =>
    request<{ sent: number; error?: string }>('/api/push/test', { method: 'POST' }),

  // Nutrients
  nutrientsToday: () =>
    request<{ nutrients: { nutrient_id: string; total_amount: number }[]; date: string }>('/api/nutrients/today'),
  logNutrient: (nutrient_id: string, amount: number) =>
    request<{ id: number }>('/api/nutrients/log', {
      method: 'POST', body: JSON.stringify({ nutrient_id, amount }),
    }),
  deleteNutrientLog: (id: number) =>
    request<{ ok: boolean }>(`/api/nutrients/log/${id}`, { method: 'DELETE' }),
  getNutrientLogs: (nutrient_id: string) =>
    request<{ logs: NutrientLogEntry[] }>(`/api/nutrients/logs/${nutrient_id}`),

  // Water
  waterToday: () => request<{ total_ml: number; goal_ml: number }>('/api/water/today'),
  logWater: (amount_ml: number) =>
    request<{ id: number; amount_ml: number }>('/api/water/log', {
      method: 'POST', body: JSON.stringify({ amount_ml }),
    }),
  undoWater: () =>
    request<{ ok: boolean; removed_ml: number }>('/api/water/log/last', { method: 'DELETE' }),

  // Macros
  macrosToday: () => request<{ entries: MacroEntry[] }>('/api/macros/today'),
  logMacro: (data: { protein_g: number; carbs_g: number; fat_g: number; label?: string }) =>
    request<{ id: number; calories: number }>('/api/macros/log', {
      method: 'POST', body: JSON.stringify(data),
    }),

  // Food
  foodToday: () => request<{ entries: FoodEntry[] }>('/api/food/today'),
  logFood: (data: Omit<FoodEntry, 'id' | 'logged_at'>) =>
    request<{ id: number }>('/api/food/log', {
      method: 'POST', body: JSON.stringify(data),
    }),
  deleteFood: (id: number) =>
    request<{ ok: boolean }>(`/api/food/log/${id}`, { method: 'DELETE' }),

  // Progress
  logProgress: (data: ProgressEntry) =>
    request<{ id: number }>('/api/progress/log', {
      method: 'POST', body: JSON.stringify(data),
    }),
  progressHistory: (days = 30) =>
    request<{ entries: ProgressHistoryEntry[] }>(`/api/progress/history?days=${days}`),

  // Workout
  logWorkout: (data: { plan_id: string; plan_name: string; duration_min: number; calories_burned?: number; notes?: string }) =>
    request<{ id: number }>('/api/workout/log', {
      method: 'POST', body: JSON.stringify(data),
    }),
  workoutHistory: (limit = 10) =>
    request<{ logs: WorkoutLogEntry[] }>(`/api/workout/history?limit=${limit}`),

  // Reminder prefs
  getReminderPrefs: () =>
    request<{ reminder_start: number; reminder_end: number; report_hour: number }>('/api/reminder-prefs'),
  saveReminderPrefs: (data: { reminder_start: number; reminder_end: number; report_hour: number }) =>
    request<{ ok: boolean }>('/api/reminder-prefs', { method: 'POST', body: JSON.stringify(data) }),

  // Rest day
  getRestDay: (date?: string) =>
    request<{ date: string; is_rest: boolean }>(`/api/rest-day${date ? `?date=${date}` : ''}`),
  setRestDay: (date: string, is_rest: boolean) =>
    request<{ ok: boolean }>('/api/rest-day', { method: 'POST', body: JSON.stringify({ date, is_rest }) }),

  // Logs
  logsRange: (days = 30) =>
    request<{ days: DayLog[] }>(`/api/logs/range?days=${days}`),
  logsDay: (date: string) =>
    request<DayDetail>(`/api/logs/day?date=${date}`),

  // Goals
  getGoals: () =>
    request<{ calories: number; protein_g: number; carbs_g: number; fat_g: number; water_ml: number }>('/api/goals'),
  saveGoals: (data: { calories: number; protein_g: number; carbs_g: number; fat_g: number; water_ml: number }) =>
    request<{ ok: boolean }>('/api/goals', { method: 'POST', body: JSON.stringify(data) }),

  // Settings
  saveDietPlan: (plan_id: string) =>
    request<{ ok: boolean }>('/api/settings/diet-plan', {
      method: 'POST', body: JSON.stringify({ plan_id }),
    }),

  // Custom diet plans
  getCustomDietPlans: () => request<{ plans: CustomDietPlan[] }>('/api/diet-plans/custom'),
  createCustomDietPlan: (data: Omit<CustomDietPlan, 'id'>) =>
    request<{ id: number }>('/api/diet-plans/custom', {
      method: 'POST', body: JSON.stringify(data),
    }),
  updateCustomDietPlan: (id: number, data: Omit<CustomDietPlan, 'id'>) =>
    request<{ ok: boolean }>(`/api/diet-plans/custom/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  deleteCustomDietPlan: (id: number) =>
    request<{ ok: boolean }>(`/api/diet-plans/custom/${id}`, { method: 'DELETE' }),

  // Exercise logs + PRs
  exerciseLogsToday: () => request<{ logs: ExerciseLog[] }>('/api/exercise-logs'),
  logExerciseSet: (data: { exercise_name: string; set_number: number; reps: number; weight_kg: number; session_id: string }) =>
    request<{ id: number; is_pr: boolean; new_1rm: number }>('/api/exercise-logs', {
      method: 'POST', body: JSON.stringify(data),
    }),
  deleteExerciseLog: (id: number) =>
    request<{ ok: boolean }>(`/api/exercise-logs/${id}`, { method: 'DELETE' }),
  getExercisePRs: () => request<{ prs: ExercisePR[] }>('/api/exercise-prs'),
  workoutStreak: () => request<{ streak: number; last_workout_date: string | null }>('/api/workout-streak'),

  // Custom workout plans
  getCustomWorkoutPlans: () => request<{ plans: CustomWorkoutPlan[] }>('/api/workout-plans/custom'),
  createCustomWorkoutPlan: (data: Omit<CustomWorkoutPlan, 'id'>) =>
    request<{ id: number }>('/api/workout-plans/custom', {
      method: 'POST', body: JSON.stringify(data),
    }),
  updateCustomWorkoutPlan: (id: number, data: Omit<CustomWorkoutPlan, 'id'>) =>
    request<{ ok: boolean }>(`/api/workout-plans/custom/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  deleteCustomWorkoutPlan: (id: number) =>
    request<{ ok: boolean }>(`/api/workout-plans/custom/${id}`, { method: 'DELETE' }),
};

// Types
export interface NutrientLogEntry {
  id: number;
  nutrient_id: string;
  amount: number;
  logged_at: string;
}

export interface MacroEntry {
  id: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
  label: string | null;
  logged_at: string;
}

export interface FoodEntry {
  id: number;
  meal_name: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at?: string;
}

export interface ProgressEntry {
  weight_kg?: number | null;
  waist_cm?: number | null;
  chest_cm?: number | null;
  arm_cm?: number | null;
  leg_cm?: number | null;
  notes?: string;
}

export interface ProgressHistoryEntry extends ProgressEntry {
  id: number;
  logged_at: string;
}

export interface WorkoutLogEntry {
  id: number;
  plan_id: string;
  plan_name: string;
  duration_min: number;
  calories_burned: number;
  notes: string | null;
  logged_at: string;
}

export interface DayLog {
  date: string;
  water_ml: number;
  water_goal: number;
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  micro_count: number;
  workout_count: number;
  weight_kg: number | null;
}

export interface DayDetail {
  date: string;
  water_ml: number;
  water_goal: number;
  total_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: Record<string, number>;
  workouts: { plan_name: string; duration_min: number }[];
  food_entries: Omit<FoodEntry, 'logged_at'>[];
  progress: { weight_kg?: number | null; waist_cm?: number | null; chest_cm?: number | null };
}

export interface ExerciseLog {
  id: number;
  session_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  logged_at: string;
}

export interface ExercisePR {
  exercise_name: string;
  best_1rm: number;
  best_weight: number;
  best_reps: number;
  achieved_at: string;
}

export interface CustomDietMeal {
  id?: number;
  meal_name: string;
  foods: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface CustomDietPlan {
  id: number;
  name: string;
  goal: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meals: CustomDietMeal[];
}

export interface CustomWorkoutExercise {
  id?: number;
  day_name: string;
  exercise_name: string;
  sets: number;
  reps_or_duration: string;
  rest_seconds: number;
  notes: string;
  sort_order?: number;
}

export interface CustomWorkoutPlan {
  id: number;
  name: string;
  category: string;
  description: string;
  days_per_week: number;
  duration_weeks: number;
  exercises: CustomWorkoutExercise[];
}
