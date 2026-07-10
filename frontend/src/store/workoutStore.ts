import { create } from 'zustand';

export interface ActiveWorkout {
  planId: string;
  planName: string;
  planType: string;
  startTime: number;
  weightKg: number;
}

interface WorkoutStore {
  active: ActiveWorkout | null;
  start: (planId: string, planName: string, planType: string, weightKg: number) => void;
  stop: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  active: null,
  start: (planId, planName, planType, weightKg) =>
    set({ active: { planId, planName, planType, weightKg, startTime: Date.now() } }),
  stop: () => set({ active: null }),
}));

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function elapsedMinutes(ms: number): number {
  return Math.max(1, Math.round(ms / 60000));
}

// MET values per workout type — used for calorie burn estimate
const MET: Record<string, number> = {
  HOME: 4.0,
  GYM: 5.5,
  STRENGTH: 5.0,
  CARDIO: 7.5,
  STRETCH: 2.5,
};

export function estimateBurn(planType: string, durationMin: number, weightKg: number): number {
  const met = MET[planType.toUpperCase()] ?? 4.0;
  return Math.round(met * weightKg * (durationMin / 60));
}
