import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Droplets, Zap, Dumbbell, ChevronRight, Square, Moon, Flame } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useWorkoutStore, formatElapsed, elapsedMinutes } from '../store/workoutStore';
import { NUTRIENTS, getNutrientsByCategory, type Nutrient, type NutrientCategory } from '../data/nutrients';

const QUOTES = [
  'Champions are made from something deep inside.',
  'The only bad workout is the one that didn\'t happen.',
  'Push yourself — no one else will do it for you.',
  'Success starts with self-discipline.',
  'Train hard. Eat clean. Stay focused.',
  'The body achieves what the mind believes.',
];

export default function DashboardPage({
  onRefreshing,
  onNavigate,
}: {
  onRefreshing?: (v: boolean) => void;
  onNavigate?: (tab: number) => void;
}) {
  const userName    = useAuthStore(s => s.userName);
  const setUserName = useAuthStore(s => s.setUserName);
  const active      = useWorkoutStore(s => s.active);
  const stopWorkout = useWorkoutStore(s => s.stop);
  const [elapsed, setElapsed] = useState(0);
  const [stopModal, setStopModal] = useState(false);
  const [nutrients, setNutrients] = useState<Record<string, number>>({});
  const [totCal, setTotCal] = useState(0);
  const [totP, setTotP]     = useState(0);
  const [totC, setTotC]     = useState(0);
  const [totF, setTotF]     = useState(0);
  const [waterMl, setWaterMl]     = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [goals, setGoals] = useState({ cal: 2500, p: 150, c: 250, f: 70 });
  const [burnedCal, setBurnedCal] = useState(0);
  const [isRestDay, setIsRestDay] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logTarget, setLogTarget] = useState<Nutrient | null>(null);
  const [logAmount, setLogAmount] = useState('');
  const [logBusy, setLogBusy]     = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const load = useCallback(async () => {
    setLoading(true);
    onRefreshing?.(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [nRes, mRes, fRes, wRes, hRes, gRes, rdRes, strRes, profRes] = await Promise.all([
        api.nutrientsToday(), api.macrosToday(), api.foodToday(), api.waterToday(), api.workoutHistory(10), api.getGoals(),
        api.getRestDay(today).catch(() => ({ is_rest: false })),
        api.workoutStreak().catch(() => ({ streak: 0, last_workout_date: null })),
        api.getProfile().catch(() => null),
      ]);
      if (profRes?.name) setUserName(profRes.name);
      setGoals({ cal: gRes.calories, p: gRes.protein_g, c: gRes.carbs_g, f: gRes.fat_g });
      setIsRestDay(rdRes.is_rest);
      setStreak(strRes.streak ?? 0);
      const nd: Record<string, number> = {};
      for (const e of nRes.nutrients) nd[e.nutrient_id] = e.total_amount;
      setNutrients(nd);

      let cal = 0, p = 0, c = 0, f = 0;
      for (const e of [...mRes.entries, ...fRes.entries]) { cal += e.calories; p += e.protein_g; c += e.carbs_g; f += e.fat_g; }
      setTotCal(Math.round(cal)); setTotP(Math.round(p)); setTotC(Math.round(c)); setTotF(Math.round(f));
      setWaterMl(wRes.total_ml); setWaterGoal(wRes.goal_ml || 2500);

      const today2 = new Date().toISOString().slice(0, 10);
      const todayLogs = hRes.logs.filter(l => l.logged_at?.slice(0, 10) === today2);
      setWorkoutCount(todayLogs.length);
      setBurnedCal(todayLogs.reduce((s, l) => s + (l.calories_burned || 0), 0));
    } catch (e) { console.error(e); }
    finally { setLoading(false); onRefreshing?.(false); }
  }, [onRefreshing]);

  useEffect(() => { load(); }, [load]);

  // Live timer for active workout
  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    setElapsed(Date.now() - active.startTime);
    const iv = setInterval(() => setElapsed(Date.now() - active.startTime), 1000);
    return () => clearInterval(iv);
  }, [active]);

  const quickWater = async (ml: number) => {
    try {
      await api.logWater(ml);
      setWaterMl(prev => prev + ml);
    } catch (e) { console.error(e); }
  };

  const toggleRestDay = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const next = !isRestDay;
    setIsRestDay(next);
    try { await api.setRestDay(today, next); } catch (_) { setIsRestDay(!next); }
  };

  const confirmStopWorkout = async () => {
    if (!active) return;
    const mins = elapsedMinutes(elapsed);
    try {
      await api.logWorkout({ plan_id: active.planId, plan_name: active.planName, duration_min: mins });
      setWorkoutCount(c => c + 1);
    } catch (e) { console.error(e); }
    stopWorkout();
    setStopModal(false);
  };

  const submitLog = async () => {
    if (!logTarget || !logAmount) return;
    setLogBusy(true);
    try {
      await api.logNutrient(logTarget.id, parseFloat(logAmount));
      setNutrients(prev => ({ ...prev, [logTarget.id]: (prev[logTarget.id] || 0) + parseFloat(logAmount) }));
      setLogTarget(null); setLogAmount('');
    } catch (e) { console.error(e); }
    finally { setLogBusy(false); }
  };

  const metCount   = NUTRIENTS.filter(n => (nutrients[n.id] || 0) >= n.rda).length;
  const microScore = NUTRIENTS.reduce((s, n) => s + Math.min(1, (nutrients[n.id] || 0) / n.rda), 0) / NUTRIENTS.length;

  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-app-red border-t-transparent animate-spin" />
      </div>
    );
  }

  const netBudget = goals.cal + burnedCal;
  const remaining = Math.max(0, netBudget - totCal);
  const calPct    = netBudget > 0 ? Math.min(1, totCal / netBudget) : 0;
  const waterPct  = waterGoal > 0 ? Math.min(1, waterMl / waterGoal) : 0;

  return (
    <>
    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

      {/* ── Greeting ──────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <div className="font-barlow text-xs text-app-muted tracking-[3px]">{timeGreet}</div>
          <div className="font-barlow font-black text-3xl text-app-primary tracking-wide leading-tight">
            {userName ? userName.toUpperCase() : 'CHAMPION'}!
          </div>
          <div className="font-barlow text-xs text-app-muted mt-1 italic">"{quote}"</div>
        </div>
        <button onClick={toggleRestDay}
          className="mt-1 flex items-center gap-1.5 px-3 py-1.5 font-barlow font-bold text-xs tracking-[1px]"
          style={{
            background: isRestDay ? 'rgba(30,136,229,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isRestDay ? '#1E88E5' : '#333'}`,
            color: isRestDay ? '#1E88E5' : '#666',
          }}>
          <Moon size={12} /> {isRestDay ? 'REST DAY' : 'REST DAY?'}
        </button>
      </div>

      {/* ── Active Workout Banner ──────────────────────────────────── */}
      {active && (
        <div className="mx-4 mb-3 px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(204,0,0,0.12)', border: '1px solid rgba(204,0,0,0.4)' }}>
          <div>
            <div className="font-barlow font-bold text-xs text-app-danger tracking-[2px]">WORKOUT IN PROGRESS</div>
            <div className="font-barlow font-black text-lg text-app-primary mt-0.5">{active.planName}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-barlow font-black text-2xl" style={{ color: '#CC0000', fontVariantNumeric: 'tabular-nums' }}>
              {formatElapsed(elapsed)}
            </div>
            <button
              onClick={() => setStopModal(true)}
              className="p-2.5 flex items-center justify-center"
              style={{ background: '#CC0000' }}
            >
              <Square size={16} fill="white" color="white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Start Workout Quick Launch ─────────────────────────────── */}
      {!active && (
        <button
          onClick={() => onNavigate?.(1)}
          className="mx-4 mb-3 w-[calc(100%-2rem)] px-4 py-3 flex items-center justify-between"
          style={{ background: '#141414', border: '1px solid #262626' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: 'rgba(204,0,0,0.15)' }}>
              <Dumbbell size={18} color="#CC0000" />
            </div>
            <div className="text-left">
              <div className="font-barlow font-black text-sm text-app-primary tracking-[1px]">START A WORKOUT</div>
              <div className="font-barlow text-xs text-app-muted">Pick a plan and begin</div>
            </div>
          </div>
          <ChevronRight size={18} color="#CC0000" />
        </button>
      )}

      {/* ── Calorie Card ───────────────────────────────────────────── */}
      <div className="mx-4 mb-3" style={{ background: '#111111', border: '1px solid #262626' }}>

        <div className="font-barlow font-bold text-xs text-center text-app-muted tracking-[4px] pt-4 mb-1 flex items-center justify-center gap-2">
          CALORIES
          {burnedCal > 0 && (
            <span className="font-barlow font-bold text-xs px-2 py-0.5" style={{ background: 'rgba(46,204,113,0.12)', color: '#2ECC71', border: '1px solid rgba(46,204,113,0.3)' }}>
              +{burnedCal} burned
            </span>
          )}
        </div>

        {/* Gauge */}
        <div className="flex justify-center pb-2">
          <SemiArc pct={calPct} remaining={remaining} consumed={totCal} goal={netBudget} />
        </div>

        {/* Macro row */}
        <div style={{ borderTop: '1px solid #1E1E1E' }}>
          <div className="grid grid-cols-3 divide-x" style={{ borderColor: '#1E1E1E' }}>
            <MacroCell icon="🍗" label="PROTEIN" consumed={totP} goal={goals.p} color="#E53935" />
            <MacroCell icon="🌾" label="CARBS"   consumed={totC} goal={goals.c} color="#FF9800" />
            <MacroCell icon="🥑" label="FAT"     consumed={totF} goal={goals.f} color="#AB47BC" />
          </div>
        </div>
      </div>

      {/* ── Quick Stats Row ────────────────────────────────────────── */}
      <div className="mx-4 mb-2 grid grid-cols-3 gap-2">
        <StatMini icon={<Droplets size={16} color="#1E88E5" />} label="WATER"
          value={waterMl >= 1000 ? `${(waterMl/1000).toFixed(1)}L` : `${waterMl}ml`}
          sub={`of ${(waterGoal/1000).toFixed(1)}L`} color="#1E88E5" pct={waterPct} />
        <StatMini icon={<Zap size={16} color="#2ECC71" />} label="MICROS"
          value={`${metCount}`} sub={`/${NUTRIENTS.length} met`} color="#2ECC71"
          pct={metCount / NUTRIENTS.length} />
        <StatMini icon={<Dumbbell size={16} color="#CC0000" />} label="WORKOUTS"
          value={`${workoutCount}`}
          sub={streak > 0 ? <span className="flex items-center justify-center gap-0.5"><Flame size={10} color="#FF6B35" />{streak}d streak</span> : 'today'}
          color="#CC0000" pct={Math.min(1, workoutCount / 2)} />
      </div>

      {/* ── Quick Water Log ────────────────────────────────────────── */}
      <div className="mx-4 mb-3 flex gap-2">
        {[150, 250, 350, 500].map(ml => (
          <button key={ml} onClick={() => quickWater(ml)}
            className="flex-1 py-2 font-barlow font-bold text-xs tracking-[1px]"
            style={{ background: '#0D1A26', border: '1px solid #1E3A52', color: '#1E88E5' }}>
            +{ml}ml
          </button>
        ))}
      </div>

      {/* ── Micro Nutrients ────────────────────────────────────────── */}
      <div className="mx-4 mb-3" style={{ background: '#111111', border: '1px solid #262626' }}>
        <div className="px-4 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: '1px solid #1E1E1E' }}>
          <div style={{ width: 3, height: 14, background: '#CC0000' }} />
          <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">MICRO NUTRIENTS</span>
          <span className="ml-auto font-barlow font-bold text-xs" style={{ color: microScore >= 0.7 ? '#2ECC71' : '#CC0000' }}>
            {Math.round(microScore * 100)}%
          </span>
        </div>

        <div className="p-4 space-y-5">
          {(['vitamins','minerals','essentialFats','fiber'] as NutrientCategory[]).map(cat => {
            const items    = getNutrientsByCategory(cat);
            const met      = items.filter(n => (nutrients[n.id] || 0) >= n.rda).length;
            const pct      = items.length ? met / items.length : 0;
            const catColor = cat === 'vitamins' ? '#2196F3' : cat === 'minerals' ? '#2ECC71' : cat === 'essentialFats' ? '#FF9800' : '#9C27B0';
            const catLabel = cat === 'vitamins' ? 'VITAMINS' : cat === 'minerals' ? 'MINERALS' : cat === 'essentialFats' ? 'FATS' : 'FIBER';

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-barlow font-bold text-xs tracking-[1px]" style={{ color: catColor }}>{catLabel}</span>
                  <span className="font-barlow text-xs text-app-muted">{met} / {items.length}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: '#2A2A2A' }}>
                  <div style={{ height: '100%', width: `${pct*100}%`, background: catColor, transition: 'width 0.6s ease' }} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(n => {
                    const amt  = nutrients[n.id] || 0;
                    const done = amt >= n.rda;
                    return (
                      <button key={n.id}
                        onClick={() => { setLogTarget(n); setLogAmount(''); }}
                        className="px-2 py-0.5 font-barlow font-bold text-xs"
                        style={{
                          background: done ? 'rgba(46,204,113,0.1)' : `${catColor}10`,
                          color: done ? '#2ECC71' : catColor,
                          border: `1px solid ${done ? '#2ECC71' : catColor}30`,
                        }}>
                        {n.alias || n.name.replace('Vitamin ', 'Vit ')}{done ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-4" />
    </div>

    {/* Stop workout modal */}
    {stopModal && active && (
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
        <div className="w-full max-w-lg p-6" style={{ background: '#141414', border: '1px solid #2E2E2E' }}>
          <div className="font-barlow font-black text-xl text-app-primary tracking-[2px] mb-1">FINISH WORKOUT?</div>
          <div className="font-barlow text-sm text-app-muted mb-1">{active.planName}</div>
          <div className="font-barlow font-black text-3xl mb-4" style={{ color: '#CC0000' }}>
            {formatElapsed(elapsed)}
          </div>
          <div className="font-barlow text-xs text-app-muted mb-5">
            This will log <strong style={{ color: '#E8E8E8' }}>{elapsedMinutes(elapsed)} min</strong> to your workout history.
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStopModal(false)}
              className="flex-1 py-3 font-barlow font-bold text-sm text-app-muted"
              style={{ border: '1px solid #2E2E2E' }}>KEEP GOING</button>
            <button onClick={confirmStopWorkout}
              className="flex-1 py-3 font-barlow font-black text-sm text-white"
              style={{ background: '#CC0000' }}>FINISH & LOG</button>
          </div>
        </div>
      </div>
    )}

    {/* Log nutrient modal */}
    {logTarget && (
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
        <div className="w-full max-w-lg p-6" style={{ background: '#141414', border: '1px solid #2E2E2E' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-barlow font-black text-lg text-app-primary tracking-[2px]">LOG NUTRIENT</div>
              <div className="font-barlow text-sm text-app-secondary mt-0.5">
                {logTarget.name}{logTarget.alias ? ` · ${logTarget.alias}` : ''} — RDA: {logTarget.rda}{logTarget.unit}
              </div>
            </div>
            <button onClick={() => setLogTarget(null)}><X size={20} color="#666" /></button>
          </div>
          <div className="flex items-center mb-4" style={{ border: '1px solid #2E2E2E' }}>
            <input type="number" value={logAmount}
              onChange={e => setLogAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitLog()}
              placeholder={`${logTarget.rda} ${logTarget.unit}`} autoFocus
              className="flex-1 px-3 py-3 bg-transparent font-barlow font-bold text-xl text-app-primary outline-none placeholder:text-app-muted"
            />
            <span className="px-3 font-barlow text-sm text-app-muted">{logTarget.unit}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setLogTarget(null)}
              className="flex-1 py-3 font-barlow font-bold text-sm text-app-muted"
              style={{ border: '1px solid #2E2E2E' }}>CANCEL</button>
            <button onClick={submitLog} disabled={logBusy || !logAmount}
              className="flex-1 py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm text-white"
              style={{ background: '#CC0000', opacity: logBusy || !logAmount ? 0.5 : 1 }}>
              <Plus size={14} /> {logBusy ? '...' : 'LOG'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ── Semicircle Gauge ──────────────────────────────────────────────────────────

function SemiArc({ pct, remaining, consumed, goal }: {
  pct: number; remaining: number; consumed: number; goal: number;
}) {
  const W = 280, H = 160;
  const CX = 140, CY = 148;
  const R  = 115;
  const SW = 18;
  const START = 180, TOTAL = 180;

  function pt(a: number) {
    const rad = a * Math.PI / 180;
    return { x: CX + R * Math.sin(rad), y: CY - R * Math.cos(rad) };
  }

  const s   = pt(START);
  const bgE = pt(START + TOTAL);
  const pDeg = TOTAL * pct;
  const pE  = pt(START + pDeg);

  const bgPath = `M ${s.x} ${s.y} A ${R} ${R} 0 1 1 ${bgE.x} ${bgE.y}`;
  const pPath  = pct > 0.005
    ? `M ${s.x} ${s.y} A ${R} ${R} 0 ${pDeg > 180 ? 1 : 0} 1 ${pE.x} ${pE.y}`
    : '';

  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <path d={bgPath} fill="none" stroke="#222222" strokeWidth={SW} strokeLinecap="round" />
        {pPath && (
          <path d={pPath} fill="none" stroke="url(#semiG)" strokeWidth={SW} strokeLinecap="round" />
        )}
        {/* Quarter marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const a   = (START + t * TOTAL) * Math.PI / 180;
          const r1  = R - SW / 2 - 4;
          const r2  = R + SW / 2 + 4;
          return (
            <line key={i}
              x1={CX + r1 * Math.sin(a)} y1={CY - r1 * Math.cos(a)}
              x2={CX + r2 * Math.sin(a)} y2={CY - r2 * Math.cos(a)}
              stroke="#111" strokeWidth={2} />
          );
        })}
        <defs>
          <linearGradient id="semiG" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B0000" />
            <stop offset="60%" stopColor="#CC0000" />
            <stop offset="100%" stopColor="#FF3333" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center text */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 8,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div className="font-barlow font-black leading-none"
          style={{ fontSize: 48, color: pct >= 1 ? '#2ECC71' : '#FFFFFF', letterSpacing: -2 }}>
          {pct >= 1 ? consumed : remaining}
        </div>
        <div className="font-barlow font-bold text-xs tracking-[4px] mt-1"
          style={{ color: pct >= 1 ? '#2ECC71' : '#666' }}>
          {pct >= 1 ? 'GOAL REACHED' : 'REMAINING'}
        </div>
        <div className="font-barlow text-xs mt-2 px-3 py-1"
          style={{ background: 'rgba(204,0,0,0.12)', color: '#CC0000', border: '1px solid rgba(204,0,0,0.2)' }}>
          {consumed} / {goal} kcal
        </div>
      </div>
    </div>
  );
}

// ── MacroCell ─────────────────────────────────────────────────────────────────

function MacroCell({ icon, label, consumed, goal, color }: {
  icon: string; label: string; consumed: number; goal: number; color: string;
}) {
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  return (
    <div className="flex flex-col items-center py-4 px-2 gap-1.5">
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div className="font-barlow font-black text-xl leading-none" style={{ color }}>{consumed}g</div>
      <div className="font-barlow text-xs text-app-muted">of {goal}g</div>
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
        <div style={{ height: '100%', width: `${pct*100}%`, background: color }} />
      </div>
      <div className="font-barlow font-bold text-xs tracking-[1px]" style={{ color: '#444' }}>{label}</div>
    </div>
  );
}

// ── StatMini ──────────────────────────────────────────────────────────────────

function StatMini({ icon, label, value, sub, color, pct }: {
  icon: React.ReactNode; label: string; value: string; sub: React.ReactNode; color: string; pct: number;
}) {
  return (
    <div className="p-3 flex flex-col gap-1" style={{ background: '#111111', border: '1px solid #262626' }}>
      {icon}
      <div className="font-barlow font-black text-xl leading-none mt-1" style={{ color }}>{value}</div>
      <div className="font-barlow text-xs text-app-muted">{sub}</div>
      <div className="h-0.5 rounded-full overflow-hidden mt-1" style={{ background: '#2A2A2A' }}>
        <div style={{ height: '100%', width: `${pct*100}%`, background: color }} />
      </div>
      <div className="font-barlow font-bold text-xs tracking-[1px]" style={{ color: '#444' }}>{label}</div>
    </div>
  );
}
