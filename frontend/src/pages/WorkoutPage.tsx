import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, ChevronDown, ChevronUp, Plus, Edit2, Trash2, X, Square, Timer, Trophy, Dumbbell } from 'lucide-react';
import { api, type CustomWorkoutPlan, type ExerciseLog, type ExercisePR } from '../api/client';
import { useWorkoutStore, formatElapsed, elapsedMinutes, estimateBurn } from '../store/workoutStore';

type FilterType = 'ALL' | 'HOME' | 'GYM' | 'STRENGTH' | 'CARDIO' | 'STRETCH';

interface BuiltinExercise { name: string; muscle: string; sets: string; tip: string; }
interface BuiltinPlan {
  id: string; name: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  type: Exclude<FilterType, 'ALL'>; minutes: number;
  description: string; exercises: BuiltinExercise[];
}

const BUILTIN_PLANS: BuiltinPlan[] = [
  {
    id: 'home_beginner_1', name: 'Full Body Blast', level: 'BEGINNER', type: 'HOME', minutes: 20,
    description: 'Zero equipment. Perfect for starting out. Burns fat and builds base strength.',
    exercises: [
      { name: 'Jumping Jacks', muscle: 'Full Body', sets: '2 × 30 reps', tip: 'Keep arms straight and jump softly' },
      { name: 'Push-ups', muscle: 'Chest / Triceps', sets: '3 × 10 reps', tip: 'Keep core tight, elbows at 45°' },
      { name: 'Air Squats', muscle: 'Quads / Glutes', sets: '3 × 15 reps', tip: 'Knees track over toes, chest up' },
      { name: 'Mountain Climbers', muscle: 'Core / Cardio', sets: '2 × 20 reps', tip: 'Keep hips level, fast pace' },
      { name: 'Glute Bridge', muscle: 'Glutes / Hamstrings', sets: '3 × 15 reps', tip: 'Squeeze glutes at top, hold 1 sec' },
      { name: 'Plank Hold', muscle: 'Core', sets: '3 × 30 sec', tip: 'Neutral spine, breathe steadily' },
    ],
  },
  {
    id: 'home_intermediate_1', name: 'Upper Body Power', level: 'INTERMEDIATE', type: 'HOME', minutes: 30,
    description: 'Bodyweight upper body burner. No equipment needed. Builds real functional strength.',
    exercises: [
      { name: 'Wide Push-ups', muscle: 'Chest', sets: '4 × 15 reps', tip: 'Hands wider than shoulder-width' },
      { name: 'Diamond Push-ups', muscle: 'Triceps', sets: '3 × 12 reps', tip: 'Hands form a diamond under chest' },
      { name: 'Pike Push-ups', muscle: 'Shoulders', sets: '3 × 10 reps', tip: 'Hips high, head drops between arms' },
      { name: 'Dips on Chair', muscle: 'Triceps / Chest', sets: '3 × 15 reps', tip: 'Feet extended, lower until 90°' },
      { name: 'Archer Push-ups', muscle: 'Chest / Shoulders', sets: '3 × 8 per side', tip: 'Shift weight to one arm per rep' },
      { name: 'Plank to Downdog', muscle: 'Core / Shoulders', sets: '3 × 12 reps', tip: 'Full extension in downward dog' },
      { name: 'Superman Hold', muscle: 'Lower Back', sets: '3 × 15 reps', tip: 'Lift chest and legs simultaneously' },
    ],
  },
  {
    id: 'home_advanced_1', name: 'HIIT Destroyer', level: 'ADVANCED', type: 'HOME', minutes: 25,
    description: '25-minute high-intensity circuit that torches calories and builds explosive power.',
    exercises: [
      { name: 'Burpees', muscle: 'Full Body', sets: '4 × 10 reps', tip: 'Explode upward, chest to floor on descent' },
      { name: 'Jump Squats', muscle: 'Legs / Cardio', sets: '4 × 15 reps', tip: 'Land softly, immediate descent' },
      { name: 'Clap Push-ups', muscle: 'Chest / Power', sets: '3 × 8 reps', tip: 'Explosive push, clap before landing' },
      { name: 'Box Jumps (chair)', muscle: 'Legs / Power', sets: '3 × 12 reps', tip: 'Full extension at top, step down' },
      { name: 'Spiderman Plank', muscle: 'Core / Hip Flexors', sets: '3 × 12 per side', tip: 'Knee meets elbow, control the twist' },
      { name: 'Sprint in Place', muscle: 'Cardio', sets: '4 × 20 sec', tip: 'Drive knees high, pump arms' },
      { name: 'Hollow Hold', muscle: 'Core', sets: '3 × 30 sec', tip: 'Lower back pressed to floor, legs 6 inches up' },
    ],
  },
  {
    id: 'gym_beginner_1', name: 'Machine Starter', level: 'BEGINNER', type: 'GYM', minutes: 40,
    description: 'Safe intro to gym machines. Perfect first-month program with no injury risk.',
    exercises: [
      { name: 'Leg Press', muscle: 'Quads / Glutes', sets: '3 × 12 reps', tip: 'Feet shoulder-width, never lock knees' },
      { name: 'Chest Press Machine', muscle: 'Chest', sets: '3 × 12 reps', tip: 'Control the descent, squeeze at top' },
      { name: 'Lat Pulldown', muscle: 'Lats / Biceps', sets: '3 × 12 reps', tip: 'Pull to upper chest, lead with elbows' },
      { name: 'Seated Row', muscle: 'Mid Back', sets: '3 × 12 reps', tip: 'Chest up, squeeze shoulder blades' },
      { name: 'Shoulder Press Machine', muscle: 'Shoulders', sets: '3 × 12 reps', tip: 'Keep wrists straight, full ROM' },
      { name: 'Leg Curl Machine', muscle: 'Hamstrings', sets: '3 × 12 reps', tip: 'Full stretch at bottom, squeeze at top' },
      { name: 'Cable Crunch', muscle: 'Abs', sets: '3 × 15 reps', tip: 'Round spine, elbows to knees' },
    ],
  },
  {
    id: 'gym_push_1', name: 'Push Day', level: 'INTERMEDIATE', type: 'GYM', minutes: 50,
    description: 'Chest, shoulders, triceps. Classic push-pull split optimised for hypertrophy.',
    exercises: [
      { name: 'Barbell Bench Press', muscle: 'Chest', sets: '4 × 8 reps', tip: 'Arch back, retract scapula, bar to nipple line' },
      { name: 'Incline DB Press', muscle: 'Upper Chest', sets: '3 × 10 reps', tip: '30-45° bench, slow eccentric' },
      { name: 'Cable Fly', muscle: 'Chest (stretch)', sets: '3 × 12 reps', tip: 'Lead with elbows, full stretch' },
      { name: 'Overhead Press', muscle: 'Shoulders', sets: '4 × 8 reps', tip: 'Bar from shoulders to overhead, no lean back' },
      { name: 'Lateral Raises', muscle: 'Side Delts', sets: '3 × 15 reps', tip: 'Slight bend at elbow, pinky up' },
      { name: 'Skull Crushers', muscle: 'Triceps', sets: '3 × 10 reps', tip: 'Bar to forehead, elbows fixed' },
      { name: 'Tricep Pushdown', muscle: 'Triceps', sets: '3 × 15 reps', tip: 'Elbows pinned to sides, full extension' },
    ],
  },
  {
    id: 'gym_pull_1', name: 'Pull Day', level: 'INTERMEDIATE', type: 'GYM', minutes: 50,
    description: 'Back and biceps dominance. Builds the V-taper and thick back every athlete needs.',
    exercises: [
      { name: 'Deadlift', muscle: 'Full Back / Hamstrings', sets: '4 × 5 reps', tip: 'Hinge at hips, bar stays close to body' },
      { name: 'Barbell Row', muscle: 'Mid / Upper Back', sets: '4 × 8 reps', tip: 'Parallel torso, row to belly button' },
      { name: 'Pull-ups', muscle: 'Lats', sets: '3 × max reps', tip: 'Full dead hang, chest to bar' },
      { name: 'Cable Row', muscle: 'Mid Back', sets: '3 × 12 reps', tip: 'Chest up, full stretch forward' },
      { name: 'Face Pulls', muscle: 'Rear Delt / Traps', sets: '3 × 15 reps', tip: 'Rope to forehead, elbows high' },
      { name: 'Barbell Curl', muscle: 'Biceps', sets: '3 × 10 reps', tip: 'No swinging, full contraction at top' },
      { name: 'Hammer Curl', muscle: 'Biceps / Brachialis', sets: '3 × 12 reps', tip: 'Neutral grip, slow descent' },
    ],
  },
  {
    id: 'gym_legs_1', name: 'Leg Day', level: 'INTERMEDIATE', type: 'GYM', minutes: 55,
    description: 'The most feared day. Build legs that match your upper body. No skipping.',
    exercises: [
      { name: 'Back Squat', muscle: 'Quads / Glutes', sets: '4 × 6 reps', tip: 'Break parallel, knees track toes, chest up' },
      { name: 'Romanian Deadlift', muscle: 'Hamstrings / Glutes', sets: '3 × 10 reps', tip: 'Hinge back, slight knee bend, feel the stretch' },
      { name: 'Leg Press', muscle: 'Quads', sets: '3 × 12 reps', tip: 'High foot placement for more glute' },
      { name: 'Walking Lunges', muscle: 'Quads / Glutes', sets: '3 × 20 steps', tip: 'Long stride, back knee nearly touches floor' },
      { name: 'Leg Curl', muscle: 'Hamstrings', sets: '3 × 12 reps', tip: 'Pause 1 sec at top, slow descent' },
      { name: 'Standing Calf Raise', muscle: 'Calves', sets: '4 × 20 reps', tip: 'Full ROM, pause at stretch and contraction' },
      { name: 'Leg Extension', muscle: 'Quad Isolation', sets: '3 × 15 reps', tip: 'Pause at top, control the drop' },
    ],
  },
  {
    id: 'strength_5x5', name: 'Strength 5×5', level: 'BEGINNER', type: 'STRENGTH', minutes: 45,
    description: 'The proven program for raw strength. Add weight every session. Compound movements only.',
    exercises: [
      { name: 'Squat', muscle: 'Full Lower Body', sets: '5 × 5 reps', tip: 'Add 2.5kg per session until form breaks' },
      { name: 'Bench Press', muscle: 'Chest / Triceps', sets: '5 × 5 reps', tip: 'Full ROM, add 2.5kg per session' },
      { name: 'Barbell Row', muscle: 'Back', sets: '5 × 5 reps', tip: 'From floor each rep, explosive pull' },
      { name: 'Overhead Press', muscle: 'Shoulders', sets: '5 × 5 reps', tip: 'Strict form, no leg drive' },
      { name: 'Deadlift', muscle: 'Full Posterior', sets: '1 × 5 reps', tip: 'One heavy set, add 5kg per session' },
    ],
  },
  {
    id: 'strength_advanced', name: 'Max Strength', level: 'ADVANCED', type: 'STRENGTH', minutes: 65,
    description: 'Heavy periodised strength block. For athletes who want to break personal records.',
    exercises: [
      { name: 'Power Clean', muscle: 'Full Body / Power', sets: '5 × 3 reps', tip: 'Triple extension: ankle, knee, hip' },
      { name: 'Front Squat', muscle: 'Quads / Core', sets: '4 × 4 reps', tip: 'Elbows up, upright torso' },
      { name: 'Weighted Pull-up', muscle: 'Lats', sets: '4 × 5 reps', tip: 'Belt + plates, full hang to chin over bar' },
      { name: 'Close Grip Bench', muscle: 'Triceps / Chest', sets: '4 × 5 reps', tip: 'Hands at shoulder width, tuck elbows' },
      { name: 'Romanian Deadlift', muscle: 'Posterior Chain', sets: '4 × 6 reps', tip: 'Slow eccentric, feel every fibre' },
      { name: 'Barbell Shrug', muscle: 'Traps', sets: '3 × 10 reps', tip: 'Heavy weight, straight up — no roll' },
      { name: 'Pallof Press', muscle: 'Core Stability', sets: '3 × 12 per side', tip: 'Resist rotation, arms full extension' },
    ],
  },
  {
    id: 'cardio_beginner', name: 'Morning Walk-Run', level: 'BEGINNER', type: 'CARDIO', minutes: 30,
    description: 'Burn fat and build cardiovascular base. Alternate walking and jogging intervals.',
    exercises: [
      { name: 'Warm-up Walk', muscle: 'Cardio', sets: '5 min', tip: 'Brisk pace, arms pumping' },
      { name: 'Jog Intervals', muscle: 'Cardio', sets: '6 × 2 min jog / 1 min walk', tip: 'Comfortable pace — you should be able to talk' },
      { name: 'Cool-down Walk', muscle: 'Cardio', sets: '5 min', tip: 'Slow it down, keep moving' },
      { name: 'Standing Calf Raises', muscle: 'Calves', sets: '2 × 20 reps', tip: 'Balance on one foot for extra challenge' },
    ],
  },
  {
    id: 'cardio_hiit', name: 'Sprint HIIT', level: 'INTERMEDIATE', type: 'CARDIO', minutes: 20,
    description: 'Max calorie burn in 20 minutes. Explosive sprint intervals build speed and torch fat.',
    exercises: [
      { name: 'Warm-up Jog', muscle: 'Cardio', sets: '3 min easy pace', tip: 'Build up heart rate gradually' },
      { name: 'Sprint Intervals', muscle: 'Legs / Cardio', sets: '8 × 30 sec sprint / 60 sec walk', tip: '90% max effort on sprints' },
      { name: 'Active Recovery', muscle: 'Cardio', sets: '2 min slow jog', tip: "Keep moving, don't stop" },
      { name: 'Finisher Sprints', muscle: 'Legs / Cardio', sets: '2 × 30 sec all-out', tip: 'Empty the tank' },
      { name: 'Cool-down Walk', muscle: 'Cardio', sets: '3 min', tip: 'Heart rate back to 100bpm' },
    ],
  },
  {
    id: 'stretch_morning', name: 'Morning Mobility', level: 'BEGINNER', type: 'STRETCH', minutes: 15,
    description: 'Wake up your joints and muscles. Reduces injury risk and improves posture.',
    exercises: [
      { name: 'Cat-Cow Stretch', muscle: 'Spine', sets: '10 reps', tip: 'Synchronise with breath' },
      { name: 'Hip 90-90 Stretch', muscle: 'Hips', sets: '60 sec per side', tip: "Sit tall, don't round lower back" },
      { name: 'Chest Opener', muscle: 'Chest / Shoulders', sets: '60 sec', tip: 'Clasp hands behind, open chest to ceiling' },
      { name: "World's Greatest Stretch", muscle: 'Full Body', sets: '5 per side', tip: 'Hip to ground, elbow to floor, rotate thorax' },
      { name: 'Standing Quad Stretch', muscle: 'Quad', sets: '45 sec per side', tip: 'Pull ankle to glute, stay tall' },
      { name: "Child's Pose", muscle: 'Back / Hips', sets: '60 sec', tip: 'Arms extended, let back relax' },
    ],
  },
  {
    id: 'stretch_post', name: 'Post-Workout Recovery', level: 'BEGINNER', type: 'STRETCH', minutes: 10,
    description: 'Reduce soreness, speed up recovery. Do this within 10 min of every workout.',
    exercises: [
      { name: 'Standing Hamstring', muscle: 'Hamstrings', sets: '45 sec per side', tip: 'Hinge forward, keep slight knee bend' },
      { name: 'Pigeon Pose', muscle: 'Hips / Glutes', sets: '60 sec per side', tip: "Relax into it, don't force" },
      { name: 'Chest Doorway Stretch', muscle: 'Chest / Biceps', sets: '45 sec per side', tip: 'Arm at 90°, lean forward gently' },
      { name: 'Neck Side Stretch', muscle: 'Neck / Traps', sets: '30 sec per side', tip: "Ear to shoulder, don't pull" },
      { name: 'Seated Spinal Twist', muscle: 'Spine / Obliques', sets: '45 sec per side', tip: 'Sit tall, twist from thorax not lumbar' },
    ],
  },
];

const LEVEL_COLOR: Record<string, string> = {
  BEGINNER: '#2ECC71', INTERMEDIATE: '#FF9800', ADVANCED: '#CC0000',
};
const TYPE_COLOR: Record<string, string> = {
  HOME: '#1E88E5', GYM: '#CC0000', STRENGTH: '#9C27B0', CARDIO: '#FF9800', STRETCH: '#2ECC71',
};

interface ExForm {
  _key: number;
  day_name: string;
  exercise_name: string;
  sets: string;
  reps_or_duration: string;
  rest_seconds: string;
  notes: string;
}

const COMMON_EXERCISES = [
  'Bench Press','Incline Bench Press','Decline Bench Press','Cable Fly','Chest Press Machine','Dips',
  'Deadlift','Barbell Row','Pull-ups','Lat Pulldown','Cable Row','Seated Row','Face Pulls','T-Bar Row',
  'Overhead Press','Lateral Raises','Front Raises','Rear Delt Fly','Arnold Press',
  'Barbell Curl','Dumbbell Curl','Hammer Curl','Preacher Curl','Cable Curl',
  'Skull Crushers','Tricep Pushdown','Close Grip Bench Press','Overhead Tricep Extension',
  'Back Squat','Front Squat','Romanian Deadlift','Leg Press','Leg Extension',
  'Leg Curl','Calf Raises','Lunges','Hip Thrust','Hack Squat','Bulgarian Split Squat',
  'Plank','Crunches','Leg Raises','Russian Twist','Cable Crunch','Ab Wheel',
  'Push-ups','Pull-ups','Burpees','Jump Squats','Box Jumps',
];

export default function WorkoutPage({ onRefreshing: _onRefreshing }: { onRefreshing?: (v: boolean) => void }) {
  const [mainTab, setMainTab] = useState(0); // 0=PLANS, 1=LOG SETS, 2=RECORDS
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customExpanded, setCustomExpanded] = useState<number | null>(null);
  const [customPlans, setCustomPlans] = useState<CustomWorkoutPlan[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CustomWorkoutPlan | null>(null);
  const [logModal, setLogModal] = useState<{ planId: string; planName: string; caloriesBurned?: number } | null>(null);
  const [duration, setDuration] = useState('45');
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Exercise log state
  const [exName, setExName] = useState('');
  const [exReps, setExReps] = useState('');
  const [exWeight, setExWeight] = useState('');
  const [exSugg, setExSugg] = useState<string[]>([]);
  const [showExSugg, setShowExSugg] = useState(false);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [exercisePRs, setExercisePRs] = useState<ExercisePR[]>([]);
  const [prMap, setPrMap] = useState<Record<string, ExercisePR>>({});
  const [logSetBusy, setLogSetBusy] = useState(false);
  const [newPR, setNewPR] = useState<{ name: string; rm: number } | null>(null);
  const [restSecs, setRestSecs] = useState(0);
  const sessionId = useRef(new Date().toISOString().slice(0, 10));

  const active      = useWorkoutStore(s => s.active);
  const startWorkout = useWorkoutStore(s => s.start);
  const stopWorkout  = useWorkoutStore(s => s.stop);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    setElapsed(Date.now() - active.startTime);
    const iv = setInterval(() => setElapsed(Date.now() - active.startTime), 1000);
    return () => clearInterval(iv);
  }, [active]);

  const loadCustomPlans = useCallback(async () => {
    setLoadingCustom(true);
    try {
      const res = await api.getCustomWorkoutPlans();
      setCustomPlans(res.plans);
    } catch (e) { console.error(e); }
    finally { setLoadingCustom(false); }
  }, []);

  useEffect(() => { loadCustomPlans(); }, [loadCustomPlans]);

  const loadExerciseLogs = useCallback(async () => {
    try {
      const res = await api.exerciseLogsToday();
      setExerciseLogs(res.logs);
    } catch (e) { console.error(e); }
  }, []);

  const loadPRs = useCallback(async () => {
    try {
      const res = await api.getExercisePRs();
      setExercisePRs(res.prs);
      const map: Record<string, ExercisePR> = {};
      for (const pr of res.prs) map[pr.exercise_name.toLowerCase()] = pr;
      setPrMap(map);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (mainTab === 1) loadExerciseLogs();
    if (mainTab === 2) loadPRs();
  }, [mainTab, loadExerciseLogs, loadPRs]);

  useEffect(() => {
    if (restSecs <= 0) return;
    const t = setInterval(() => setRestSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [restSecs]);

  const logSet = async () => {
    if (!exName.trim() || !exReps || !exWeight) return;
    setLogSetBusy(true);
    try {
      const setsForEx = exerciseLogs.filter(l => l.exercise_name.toLowerCase() === exName.trim().toLowerCase());
      const setNumber = setsForEx.length + 1;
      const res = await api.logExerciseSet({
        exercise_name: exName.trim(),
        set_number: setNumber,
        reps: parseInt(exReps),
        weight_kg: parseFloat(exWeight),
        session_id: sessionId.current,
      });
      await loadExerciseLogs();
      if (res.is_pr) {
        await loadPRs();
        setNewPR({ name: exName.trim(), rm: res.new_1rm });
        setTimeout(() => setNewPR(null), 4000);
      }
      setRestSecs(90);
      setExReps('');
    } catch (e) { console.error(e); }
    finally { setLogSetBusy(false); }
  };

  const filteredBuiltin = filter === 'ALL' ? BUILTIN_PLANS : BUILTIN_PLANS.filter(p => p.type === filter);

  const deletePlan = async (plan: CustomWorkoutPlan) => {
    if (!window.confirm(`Delete "${plan.name}"?`)) return;
    try {
      await api.deleteCustomWorkoutPlan(plan.id);
      setCustomPlans(ps => ps.filter(p => p.id !== plan.id));
      if (customExpanded === plan.id) setCustomExpanded(null);
    } catch (e) { console.error(e); }
  };

  const handleStart = async (planId: string, planName: string, planType: string) => {
    let weight = 70;
    try {
      const prog = await api.progressHistory(1);
      if (prog.entries[0]?.weight_kg) weight = prog.entries[0].weight_kg;
    } catch (_) {}
    startWorkout(planId, planName, planType, weight);
    setExpanded(null);
    setCustomExpanded(null);
    setFeedback(`${planName} started! Timer running.`);
    setTimeout(() => setFeedback(''), 2000);
  };

  const handleStop = (planId: string, planName: string, planType: string) => {
    const mins = elapsedMinutes(elapsed);
    const burn = active ? estimateBurn(planType, mins, active.weightKg) : 0;
    stopWorkout();
    setDuration(String(mins));
    setNotes('');
    setLogModal({ planId, planName, caloriesBurned: burn });
  };

  const logWorkout = async () => {
    if (!logModal) return;
    setLogging(true);
    try {
      await api.logWorkout({
        plan_id: logModal.planId,
        plan_name: logModal.planName,
        duration_min: parseInt(duration) || 1,
        calories_burned: logModal.caloriesBurned,
        notes: notes || undefined,
      });
      const name = logModal.planName;
      setLogModal(null); setDuration('45'); setNotes('');
      setFeedback(`✓ ${name} logged!`);
      setTimeout(() => setFeedback(''), 2500);
    } catch (e) { console.error(e); }
    finally { setLogging(false); }
  };

  // Group today's exercise logs by exercise name
  const logsByEx = exerciseLogs.reduce<Record<string, ExerciseLog[]>>((acc, l) => {
    const k = l.exercise_name;
    if (!acc[k]) acc[k] = [];
    acc[k].push(l);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Main tab bar */}
      <div className="flex-shrink-0 flex" style={{ background: '#141414', borderBottom: '1px solid #2E2E2E' }}>
        {['PLANS', 'LOG SETS', 'RECORDS'].map((t, i) => (
          <button key={t} onClick={() => setMainTab(i)}
            className="flex-1 py-3 font-barlow font-black text-xs tracking-[2px] transition-all"
            style={{
              color: mainTab === i ? '#CC0000' : '#555',
              borderBottom: mainTab === i ? '2px solid #CC0000' : '2px solid transparent',
            }}>
            {i === 1 ? <><Dumbbell size={11} className="inline mr-1" />{t}</> : i === 2 ? <><Trophy size={11} className="inline mr-1" />{t}</> : t}
          </button>
        ))}
      </div>

      {/* ── PLANS TAB ── */}
      {mainTab === 0 && <>
      {/* Category filter row */}
      <div className="flex-shrink-0 overflow-x-auto no-scrollbar" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
        <div className="flex px-3 py-2.5 gap-2 min-w-max">
          {(['ALL', 'HOME', 'GYM', 'STRENGTH', 'CARDIO', 'STRETCH'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 px-3 py-1.5 font-barlow font-bold text-xs tracking-[1.5px] transition-all"
              style={{
                background: filter === f ? '#CC0000' : '#141414',
                color: filter === f ? 'white' : '#AAAAAA',
                border: `1px solid ${filter === f ? '#CC0000' : '#2E2E2E'}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

        {/* MY PLANS section */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 3, height: 14, background: '#CC0000' }} />
            <span className="font-barlow font-bold text-xs text-app-primary tracking-[2px]">MY PLANS</span>
          </div>
          <button
            onClick={() => { setEditingPlan(null); setShowPlanForm(true); }}
            className="flex items-center gap-1 px-3 py-1.5 font-barlow font-black text-xs text-white tracking-[1.5px]"
            style={{ background: '#CC0000' }}
          >
            <Plus size={12} /> CREATE PLAN
          </button>
        </div>

        {loadingCustom ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-app-red border-t-transparent animate-spin" />
          </div>
        ) : customPlans.length === 0 ? (
          <button
            onClick={() => { setEditingPlan(null); setShowPlanForm(true); }}
            className="w-full py-8 flex flex-col items-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: '#141414', borderBottom: '1px solid #2E2E2E' }}
          >
            <Plus size={32} style={{ color: 'rgba(204,0,0,0.5)' }} />
            <span className="font-barlow font-bold text-sm text-app-secondary tracking-[2px]">CREATE YOUR FIRST PLAN</span>
            <span className="font-barlow text-xs text-app-muted">Tap to build a custom workout plan</span>
          </button>
        ) : (
          customPlans.map(plan => {
            const isOpen = customExpanded === plan.id;
            const byDay = plan.exercises.reduce<Record<string, typeof plan.exercises>>((acc, ex) => {
              const day = ex.day_name || 'General';
              if (!acc[day]) acc[day] = [];
              acc[day].push(ex);
              return acc;
            }, {});

            return (
              <div key={plan.id} style={{ background: '#141414', borderBottom: '1px solid #2E2E2E' }}>
                <button
                  onClick={() => setCustomExpanded(isOpen ? null : plan.id)}
                  className="w-full px-4 py-3 flex items-start justify-between text-left"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(204,0,0,0.12)' }}>
                      <span className="font-barlow font-black text-sm" style={{ color: '#CC0000' }}>MY</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-barlow font-black text-base text-app-primary tracking-wide">{plan.name.toUpperCase()}</span>
                        {plan.category && (
                          <span className="font-barlow font-bold text-xs px-2 py-0.5"
                            style={{ background: 'rgba(204,0,0,0.15)', color: '#CC0000' }}>
                            {plan.category.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {plan.description ? (
                        <div className="font-barlow text-xs text-app-muted mt-0.5 truncate">{plan.description}</div>
                      ) : null}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="font-barlow text-xs text-app-muted">{plan.days_per_week} DAYS/WK</span>
                        <span className="font-barlow text-xs text-app-muted">{plan.duration_weeks} WEEKS</span>
                        <span className="font-barlow text-xs text-app-muted">{plan.exercises.length} EXERCISES</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingPlan(plan); setShowPlanForm(true); }}
                      className="p-2"
                    >
                      <Edit2 size={14} color="#666" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deletePlan(plan); }}
                      className="p-2"
                    >
                      <Trash2 size={14} color="#666" />
                    </button>
                    {isOpen ? <ChevronUp size={16} color="#666" /> : <ChevronDown size={16} color="#666" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-3" style={{ background: '#1C1C1C', borderTop: '1px solid #2E2E2E' }}>
                    {Object.entries(byDay).map(([day, exs]) => (
                      <div key={day} className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div style={{ width: 3, height: 12, background: '#CC0000' }} />
                          <span className="font-barlow font-bold text-xs text-app-primary tracking-[2px]">{day.toUpperCase()}</span>
                        </div>
                        {exs.map((ex, i) => (
                          <div key={i} className="ml-3 mb-1.5 flex items-start gap-2">
                            <span className="font-barlow text-sm mt-0.5" style={{ color: '#CC0000' }}>·</span>
                            <div>
                              <div className="font-barlow font-bold text-sm text-app-primary">{ex.exercise_name}</div>
                              <div className="font-barlow text-xs text-app-muted">
                                {ex.sets} sets × {ex.reps_or_duration} · rest {ex.rest_seconds}s
                                {ex.notes ? ` · ${ex.notes}` : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    {active?.planId === `custom_${plan.id}` ? (
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2.5"
                          style={{ background: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.4)' }}>
                          <Timer size={14} color="#CC0000" />
                          <span className="font-barlow font-black text-base" style={{ color: '#CC0000', fontVariantNumeric: 'tabular-nums' }}>
                            {formatElapsed(elapsed)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleStop(`custom_${plan.id}`, plan.name, 'HOME')}
                          className="px-4 py-2.5 flex items-center gap-2 font-barlow font-black text-xs tracking-[1px] text-white"
                          style={{ background: '#CC0000' }}
                        >
                          <Square size={13} fill="white" /> STOP
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStart(`custom_${plan.id}`, plan.name, 'HOME')}
                        disabled={!!active}
                        className="mt-4 w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-xs tracking-[2px] text-white"
                        style={{ background: '#CC0000', opacity: active ? 0.4 : 1 }}
                      >
                        <Play size={14} fill="white" /> START WORKOUT
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* RECOMMENDED section */}
        <div className="px-4 py-2.5 mt-1 flex items-center gap-2" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
          <div style={{ width: 3, height: 14, background: '#CC0000' }} />
          <span className="font-barlow font-bold text-xs text-app-primary tracking-[2px]">RECOMMENDED WORKOUTS</span>
          <span className="font-barlow text-xs text-app-muted ml-auto">{filteredBuiltin.length} PLANS</span>
        </div>

        {filteredBuiltin.map(plan => {
          const isOpen = expanded === plan.id;
          const lc = LEVEL_COLOR[plan.level] || '#666';
          const tc = TYPE_COLOR[plan.type] || '#666';
          const TYPE_BG: Record<string, string> = {
            HOME: 'linear-gradient(135deg, #0A1A2E 0%, #0A0A18 50%, #100010 100%)',
            GYM: 'linear-gradient(135deg, #200808 0%, #0A0A0A 50%, #1A0505 100%)',
            STRENGTH: 'linear-gradient(135deg, #120020 0%, #0A0A0A 50%, #180010 100%)',
            CARDIO: 'linear-gradient(135deg, #1A1200 0%, #0A0A0A 50%, #1A0800 100%)',
            STRETCH: 'linear-gradient(135deg, #051A10 0%, #0A0A0A 50%, #001A12 100%)',
          };
          return (
            <div key={plan.id} className="mx-4 mb-3" style={{ overflow: 'hidden' }}>
              {/* Large gradient card header */}
              <button
                onClick={() => setExpanded(isOpen ? null : plan.id)}
                className="w-full text-left relative overflow-hidden"
                style={{ background: TYPE_BG[plan.type] || '#141414', minHeight: 130 }}
              >
                {/* Diagonal stripe overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'repeating-linear-gradient(45deg, transparent, transparent 18px, rgba(255,255,255,0.015) 18px, rgba(255,255,255,0.015) 19px)',
                }} />
                {/* Top accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: tc }} />
                {/* Glow orb */}
                <div style={{
                  position: 'absolute', right: -20, top: -20, width: 100, height: 100,
                  borderRadius: '50%', background: `${tc}18`, filter: 'blur(20px)',
                }} />

                <div className="relative p-4 h-full flex flex-col justify-between" style={{ minHeight: 130 }}>
                  {/* Top row: category + chevron */}
                  <div className="flex items-start justify-between">
                    <span className="font-barlow font-black text-xs px-2 py-1 tracking-[2px]"
                      style={{ background: `${tc}30`, color: tc, border: `1px solid ${tc}50` }}>
                      {plan.type}
                    </span>
                    {isOpen
                      ? <ChevronUp size={18} color="#666" />
                      : <ChevronDown size={18} color="#666" />}
                  </div>

                  {/* Bottom: name + meta */}
                  <div>
                    <div className="font-barlow font-black text-xl text-app-primary tracking-[1px] leading-tight mb-2">
                      {plan.name.toUpperCase()}
                    </div>
                    <div className="font-barlow text-xs text-app-secondary leading-4 mb-3 opacity-80">
                      {plan.description}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-barlow font-bold text-xs px-2 py-0.5"
                        style={{ background: `${lc}22`, color: lc, border: `1px solid ${lc}50` }}>
                        {plan.level}
                      </span>
                      <span className="font-barlow text-xs text-app-muted">⏱ {plan.minutes} MIN</span>
                      <span className="font-barlow text-xs text-app-muted">▸ {plan.exercises.length} EXERCISES</span>
                    </div>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="pb-0" style={{ background: '#141414', border: `1px solid ${tc}30`, borderTop: 'none' }}>
                  <div className="px-4 space-y-2 mt-3 mb-4">
                    {plan.exercises.map((ex, i) => (
                      <div key={i} className="p-3 flex items-start gap-3" style={{ background: '#1C1C1C' }}>
                        <div className="font-barlow font-black text-sm flex-shrink-0 mt-0.5" style={{ color: tc, minWidth: 20 }}>
                          {String(i+1).padStart(2,'0')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-barlow font-bold text-sm text-app-primary">{ex.name}</div>
                          <div className="font-barlow text-xs text-app-muted mt-0.5">{ex.muscle} · {ex.sets}</div>
                          <div className="font-barlow text-xs text-app-secondary mt-1 italic leading-4 opacity-80">{ex.tip}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {active?.planId === plan.id ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2.5"
                        style={{ background: 'rgba(204,0,0,0.1)', border: '1px solid rgba(204,0,0,0.4)' }}>
                        <Timer size={14} color="#CC0000" />
                        <span className="font-barlow font-black text-base" style={{ color: '#CC0000', fontVariantNumeric: 'tabular-nums' }}>
                          {formatElapsed(elapsed)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleStop(plan.id, plan.name, plan.type)}
                        className="px-4 py-2.5 flex items-center gap-2 font-barlow font-black text-xs tracking-[1px] text-white"
                        style={{ background: '#CC0000' }}
                      >
                        <Square size={13} fill="white" /> STOP
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStart(plan.id, plan.name, plan.type)}
                      disabled={!!active}
                      className="w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-xs tracking-[2px] text-white"
                      style={{ background: '#CC0000', opacity: active ? 0.4 : 1 }}
                    >
                      <Play size={14} fill="white" /> START WORKOUT
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredBuiltin.length === 0 && (
          <div className="py-12 text-center font-barlow text-sm text-app-muted">
            No recommended plans for this category
          </div>
        )}

        <div className="h-4" />
      </div>
      </>}

      {/* ── LOG SETS TAB ── */}
      {mainTab === 1 && (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          {/* Input form */}
          <div className="p-4" style={{ background: '#141414', borderBottom: '1px solid #2E2E2E' }}>
            <div className="font-barlow font-black text-xs text-app-muted tracking-[2px] mb-3">LOG A SET</div>

            {/* Exercise name with autocomplete */}
            <div className="relative mb-3">
              <FLabel>EXERCISE</FLabel>
              <input
                type="text"
                value={exName}
                onChange={e => {
                  const v = e.target.value;
                  setExName(v);
                  if (v.length >= 1) {
                    const q = v.toLowerCase();
                    setExSugg(COMMON_EXERCISES.filter(ex => ex.toLowerCase().includes(q)).slice(0, 6));
                    setShowExSugg(true);
                  } else {
                    setShowExSugg(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowExSugg(false), 150)}
                placeholder="Bench Press, Squat…"
                className="w-full px-3 py-2 bg-transparent font-barlow text-sm text-app-primary outline-none placeholder:text-app-muted"
                style={{ border: '1px solid #2E2E2E' }}
              />
              {showExSugg && exSugg.length > 0 && (
                <div className="absolute left-0 right-0 z-30 mt-0.5" style={{ background: '#1C1C1C', border: '1px solid #CC0000', maxHeight: 180, overflowY: 'auto' }}>
                  {exSugg.map(s => (
                    <button key={s} onMouseDown={() => { setExName(s); setShowExSugg(false); }}
                      className="w-full text-left px-3 py-2 font-barlow text-sm text-app-primary hover:bg-red-900/20">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <FLabel>WEIGHT (kg)</FLabel>
                <input type="number" value={exWeight} onChange={e => setExWeight(e.target.value)}
                  placeholder="80" inputMode="decimal"
                  className="w-full px-3 py-2 bg-transparent font-barlow font-black text-xl text-app-primary outline-none placeholder:text-app-muted"
                  style={{ border: '1px solid #2E2E2E' }} />
              </div>
              <div>
                <FLabel>REPS</FLabel>
                <input type="number" value={exReps} onChange={e => setExReps(e.target.value)}
                  placeholder="10" inputMode="numeric"
                  className="w-full px-3 py-2 bg-transparent font-barlow font-black text-xl text-app-primary outline-none placeholder:text-app-muted"
                  style={{ border: '1px solid #2E2E2E' }} />
              </div>
            </div>

            {/* Current PR hint */}
            {exName && prMap[exName.toLowerCase()] && (
              <div className="mb-3 px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
                <Trophy size={13} color="#FFD700" />
                <span className="font-barlow text-xs" style={{ color: '#FFD700' }}>
                  Current PR: {prMap[exName.toLowerCase()].best_weight}kg × {prMap[exName.toLowerCase()].best_reps} reps
                  &nbsp;·&nbsp;1RM {prMap[exName.toLowerCase()].best_1rm.toFixed(1)}kg
                </span>
              </div>
            )}

            <button onClick={logSet} disabled={logSetBusy || !exName.trim() || !exReps || !exWeight}
              className="w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm tracking-[2px] text-white"
              style={{ background: '#CC0000', opacity: (logSetBusy || !exName.trim() || !exReps || !exWeight) ? 0.5 : 1 }}>
              {logSetBusy ? '...' : <><Plus size={14} /> LOG SET</>}
            </button>
          </div>

          {/* Today's logged sets */}
          {Object.keys(logsByEx).length === 0 ? (
            <div className="py-12 text-center">
              <Dumbbell size={36} style={{ color: 'rgba(204,0,0,0.3)', margin: '0 auto 8px' }} />
              <div className="font-barlow text-sm text-app-muted">No sets logged today</div>
              <div className="font-barlow text-xs text-app-muted opacity-60 mt-1">Log your first set above</div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="font-barlow font-black text-xs text-app-muted tracking-[2px] mb-1">TODAY'S SETS</div>
              {Object.entries(logsByEx).map(([exN, sets]) => {
                const totalVol = sets.reduce((s, l) => s + l.weight_kg * l.reps, 0);
                const hasPR = sets.some((_, i) => i === sets.length - 1 && newPR?.name.toLowerCase() === exN.toLowerCase());
                return (
                  <div key={exN} style={{ background: '#141414', border: '1px solid #2E2E2E' }}>
                    <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #1C1C1C' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-barlow font-black text-sm text-app-primary">{exN}</span>
                        {hasPR && <span className="font-barlow font-bold text-xs px-1.5 py-0.5" style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' }}>PR</span>}
                      </div>
                      <span className="font-barlow text-xs text-app-muted">{totalVol.toFixed(0)}kg vol</span>
                    </div>
                    {sets.map(s => (
                      <div key={s.id} className="px-3 py-2 flex items-center justify-between">
                        <span className="font-barlow text-sm text-app-muted">Set {s.set_number}</span>
                        <span className="font-barlow font-bold text-sm text-app-primary">{s.weight_kg}kg × {s.reps}</span>
                        <button onClick={async () => { await api.deleteExerciseLog(s.id); loadExerciseLogs(); }}
                          className="p-1"><Trash2 size={13} color="#444" /></button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── RECORDS TAB ── */}
      {mainTab === 2 && (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          {exercisePRs.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy size={40} style={{ color: 'rgba(255,215,0,0.3)', margin: '0 auto 12px' }} />
              <div className="font-barlow font-bold text-sm text-app-muted">No personal records yet</div>
              <div className="font-barlow text-xs text-app-muted opacity-60 mt-1">Log sets to track PRs</div>
            </div>
          ) : (
            <div className="p-4">
              <div className="font-barlow font-black text-xs text-app-muted tracking-[2px] mb-3">PERSONAL RECORDS</div>
              {exercisePRs.map(pr => (
                <div key={pr.exercise_name} className="mb-2 px-4 py-3 flex items-center justify-between"
                  style={{ background: '#141414', border: '1px solid #2E2E2E' }}>
                  <div>
                    <div className="font-barlow font-black text-sm text-app-primary">{pr.exercise_name}</div>
                    <div className="font-barlow text-xs text-app-muted mt-0.5">
                      {pr.best_weight}kg × {pr.best_reps} reps
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Trophy size={13} color="#FFD700" />
                      <span className="font-barlow font-black text-base" style={{ color: '#FFD700' }}>{pr.best_1rm.toFixed(1)}</span>
                      <span className="font-barlow text-xs text-app-muted">kg 1RM</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rest timer bar */}
      {restSecs > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 flex items-center justify-between px-5 py-3"
          style={{ background: '#CC0000' }}>
          <div className="flex items-center gap-2">
            <Timer size={16} color="white" />
            <span className="font-barlow font-black text-base text-white tracking-widest">{restSecs}s REST</span>
          </div>
          <button onClick={() => setRestSecs(0)} className="font-barlow font-bold text-xs text-white opacity-80">SKIP</button>
        </div>
      )}

      {/* PR badge */}
      {newPR && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center z-40 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2"
            style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)' }}>
            <Trophy size={16} color="#FFD700" />
            <span className="font-barlow font-black text-sm" style={{ color: '#FFD700' }}>
              NEW PR! {newPR.name} — {newPR.rm.toFixed(1)}kg 1RM
            </span>
          </div>
        </div>
      )}

      {/* Feedback toast */}
      {feedback && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center z-40 pointer-events-none">
          <div className="px-4 py-2 font-barlow font-bold text-sm text-app-success"
            style={{ background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)' }}>
            {feedback}
          </div>
        </div>
      )}

      {/* Log workout modal */}
      {logModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg p-6" style={{ background: '#141414', border: '1px solid #2E2E2E' }}>
            <div className="font-barlow font-black text-xl text-app-primary tracking-[2px] mb-0.5">WORKOUT DONE</div>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-barlow text-sm text-app-secondary">{logModal.planName}</span>
              {logModal.caloriesBurned ? (
                <span className="font-barlow font-bold text-xs px-2 py-0.5" style={{ background: 'rgba(46,204,113,0.15)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.3)' }}>
                  ~{logModal.caloriesBurned} kcal burned
                </span>
              ) : null}
            </div>
            <FLabel>DURATION (MIN)</FLabel>
            <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full px-3 py-2 mb-3 bg-transparent font-barlow font-black text-2xl text-app-primary outline-none"
              style={{ border: '1px solid #CC000044' }} />
            <FLabel>NOTES (OPTIONAL)</FLabel>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="How did it go?"
              className="w-full px-3 py-2 mb-4 bg-transparent font-barlow text-sm text-app-primary outline-none placeholder:text-app-muted"
              style={{ border: '1px solid #2E2E2E' }} />
            <div className="flex gap-2">
              <button onClick={() => setLogModal(null)}
                className="flex-1 py-3 font-barlow font-bold text-sm text-app-muted"
                style={{ border: '1px solid #2E2E2E' }}>CANCEL</button>
              <button onClick={logWorkout} disabled={logging}
                className="flex-1 py-3 font-barlow font-black text-sm text-white"
                style={{ background: '#CC0000', opacity: logging ? 0.6 : 1 }}>
                {logging ? '...' : 'LOG IT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan create/edit form */}
      {showPlanForm && (
        <PlanFormModal
          existing={editingPlan}
          onClose={() => setShowPlanForm(false)}
          onSaved={() => { setShowPlanForm(false); loadCustomPlans(); }}
        />
      )}
    </div>
  );
}

// ── Plan Form Modal ──────────────────────────────────────────────────────────

function PlanFormModal({
  existing, onClose, onSaved,
}: { existing: CustomWorkoutPlan | null; onClose: () => void; onSaved: () => void; }) {
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [daysPerWeek, setDaysPerWeek] = useState(existing?.days_per_week.toString() ?? '3');
  const [durationWeeks, setDurationWeeks] = useState(existing?.duration_weeks.toString() ?? '4');
  const [keyCounter, setKeyCounter] = useState(existing ? existing.exercises.length : 1);
  const [exercises, setExercises] = useState<ExForm[]>(() => {
    if (!existing || existing.exercises.length === 0) {
      return [{ _key: 0, day_name: 'Day 1', exercise_name: '', sets: '3', reps_or_duration: '10 reps', rest_seconds: '60', notes: '' }];
    }
    return existing.exercises.map((ex, i) => ({
      _key: i,
      day_name: ex.day_name,
      exercise_name: ex.exercise_name,
      sets: ex.sets.toString(),
      reps_or_duration: ex.reps_or_duration,
      rest_seconds: ex.rest_seconds.toString(),
      notes: ex.notes,
    }));
  });
  const [saving, setSaving] = useState(false);

  const addExercise = () => {
    const lastDay = exercises[exercises.length - 1]?.day_name ?? 'Day 1';
    setExercises(exs => [...exs, { _key: keyCounter, day_name: lastDay, exercise_name: '', sets: '3', reps_or_duration: '10 reps', rest_seconds: '60', notes: '' }]);
    setKeyCounter(k => k + 1);
  };

  const removeExercise = (key: number) => setExercises(exs => exs.filter(e => e._key !== key));

  const updateEx = (key: number, field: keyof Omit<ExForm, '_key'>, val: string) =>
    setExercises(exs => exs.map(e => e._key === key ? { ...e, [field]: val } : e));

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        days_per_week: parseInt(daysPerWeek) || 3,
        duration_weeks: parseInt(durationWeeks) || 4,
        exercises: exercises
          .filter(e => e.exercise_name.trim())
          .map((e, i) => ({
            day_name: e.day_name || 'Day 1',
            exercise_name: e.exercise_name.trim(),
            sets: parseInt(e.sets) || 3,
            reps_or_duration: e.reps_or_duration || '10 reps',
            rest_seconds: parseInt(e.rest_seconds) || 60,
            notes: e.notes,
            sort_order: i,
          })),
      };
      if (existing) {
        await api.updateCustomWorkoutPlan(existing.id, data);
      } else {
        await api.createCustomWorkoutPlan(data);
      }
      onSaved();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{ background: '#141414', borderBottom: '1px solid #2E2E2E' }}>
        <div className="font-barlow font-black text-base text-app-primary tracking-[2px]">
          {existing ? 'EDIT PLAN' : 'CREATE PLAN'}
        </div>
        <button onClick={onClose} className="p-1"><X size={22} color="#666" /></button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <FLabel>PLAN NAME *</FLabel>
        <FInput value={name} onChange={setName} placeholder="e.g. My Upper Body Program" />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <FLabel>CATEGORY</FLabel>
            <FInput value={category} onChange={setCategory} placeholder="Home / Gym" />
          </div>
          <div>
            <FLabel>DAYS / WEEK</FLabel>
            <FInput value={daysPerWeek} onChange={setDaysPerWeek} type="number" placeholder="3" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <FLabel>DURATION (WEEKS)</FLabel>
            <FInput value={durationWeeks} onChange={setDurationWeeks} type="number" placeholder="4" />
          </div>
        </div>

        <div className="mt-3">
          <FLabel>DESCRIPTION</FLabel>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this plan about?"
            rows={2}
            className="w-full px-3 py-2 bg-transparent font-barlow text-sm text-app-primary outline-none resize-none placeholder:text-app-muted"
            style={{ border: '1px solid #2E2E2E' }}
          />
        </div>

        {/* Exercises */}
        <div className="mt-4 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: 3, height: 14, background: '#CC0000' }} />
            <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">EXERCISES ({exercises.length})</span>
          </div>
          <button
            onClick={addExercise}
            className="flex items-center gap-1 px-3 py-1 font-barlow font-bold text-xs text-white"
            style={{ background: '#CC0000' }}
          >
            <Plus size={12} /> ADD
          </button>
        </div>

        {exercises.map((ex, idx) => (
          <div key={ex._key} className="mb-2 p-3" style={{ background: '#141414', border: '1px solid #2E2E2E' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-barlow font-bold text-xs text-app-muted">EXERCISE {idx + 1}</span>
              <button onClick={() => removeExercise(ex._key)}><X size={14} color="#666" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FLabel sm>DAY NAME</FLabel>
                <FInput sm value={ex.day_name} onChange={v => updateEx(ex._key, 'day_name', v)} placeholder="Day 1 / Monday" />
              </div>
              <div>
                <FLabel sm>EXERCISE NAME *</FLabel>
                <FInput sm value={ex.exercise_name} onChange={v => updateEx(ex._key, 'exercise_name', v)} placeholder="Push-ups" />
              </div>
              <div>
                <FLabel sm>SETS</FLabel>
                <FInput sm value={ex.sets} onChange={v => updateEx(ex._key, 'sets', v)} type="number" placeholder="3" />
              </div>
              <div>
                <FLabel sm>REPS / DURATION</FLabel>
                <FInput sm value={ex.reps_or_duration} onChange={v => updateEx(ex._key, 'reps_or_duration', v)} placeholder="10 reps" />
              </div>
              <div>
                <FLabel sm>REST (SEC)</FLabel>
                <FInput sm value={ex.rest_seconds} onChange={v => updateEx(ex._key, 'rest_seconds', v)} type="number" placeholder="60" />
              </div>
              <div>
                <FLabel sm>NOTES</FLabel>
                <FInput sm value={ex.notes} onChange={v => updateEx(ex._key, 'notes', v)} placeholder="Optional" />
              </div>
            </div>
          </div>
        ))}

        <div className="h-6" />
      </div>

      {/* Save bar */}
      <div className="flex-shrink-0 p-4" style={{ background: '#141414', borderTop: '1px solid #2E2E2E' }}>
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="w-full py-4 font-barlow font-black text-sm tracking-[2px] text-white"
          style={{ background: '#CC0000', opacity: saving || !name.trim() ? 0.6 : 1 }}
        >
          {saving ? '...' : existing ? 'SAVE CHANGES' : 'CREATE PLAN'}
        </button>
      </div>
    </div>
  );
}

// ── Shared input helpers ──────────────────────────────────────────────────────

function FLabel({ children, sm }: { children: React.ReactNode; sm?: boolean }) {
  return (
    <div className={`font-barlow font-bold text-app-muted tracking-[1.5px] mb-1 ${sm ? 'text-[10px]' : 'text-xs'}`}>
      {children}
    </div>
  );
}

function FInput({ value, onChange, placeholder, type = 'text', sm }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; sm?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-2 bg-transparent font-barlow font-bold text-app-primary outline-none placeholder:text-app-muted ${sm ? 'py-1.5 text-sm' : 'py-2 text-base'}`}
      style={{ border: '1px solid #2E2E2E' }}
    />
  );
}
