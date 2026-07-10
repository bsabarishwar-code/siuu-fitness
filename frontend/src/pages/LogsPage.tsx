import { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Droplets, Flame, Zap, Dumbbell } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api, type DayLog, type DayDetail, type WorkoutLogEntry } from '../api/client';
import ProgressBar from '../components/ProgressBar';
import { NUTRIENTS } from '../data/nutrients';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseDate(s: string): Date {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month+1, 0).getDate();
}

const CHART_TABS = ['WATER','CALORIES','MACROS','MICROS','WEIGHT'] as const;
type ChartTab = typeof CHART_TABS[number];

const CRED  = '#CC0000';
const CDIM  = '#252525';
const CTEXT = '#AAAAAA';

interface LogsPageProps { onRefreshing?: (loading: boolean) => void; }
export default function LogsPage(_: LogsPageProps) {
  const today = formatDate(new Date());
  const todayDate = new Date();

  const [logs, setLogs]         = useState<DayLog[]>([]);
  const [logMap, setLogMap]     = useState<Record<string,DayLog>>({});
  const [workouts, setWorkouts] = useState<WorkoutLogEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  const [selectedDate, setSelectedDate] = useState(today);
  const [dayDetail, setDayDetail]       = useState<DayDetail | null>(null);
  const [dayLoading, setDayLoading]     = useState(false);

  const [viewYear,  setViewYear]  = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [chartTab, setChartTab]   = useState<ChartTab>('CALORIES');

  const dayRowRef      = useRef<HTMLDivElement>(null);
  const selectedBtnRef = useRef<HTMLButtonElement>(null);

  // ── Load 30-day range ────────────────────────────────────────────────────────
  const loadRange = useCallback(async () => {
    setLoading(true);
    try {
      const [rangeRes, wRes] = await Promise.all([
        api.logsRange(60),
        api.workoutHistory(30),
      ]);
      const list = rangeRes.days ?? [];
      setLogs(list);
      const m: Record<string,DayLog> = {};
      for (const l of list) m[l.date] = l;
      setLogMap(m);
      setWorkouts(wRes.logs ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRange(); }, [loadRange]);

  // ── Load day detail ──────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setDayDetail(null);
    setDayLoading(true);
    api.logsDay(selectedDate)
      .then(r  => { if (active) setDayDetail(r); })
      .catch(() => {})
      .finally(() => { if (active) setDayLoading(false); });
    return () => { active = false; };
  }, [selectedDate]);

  // ── Scroll selected day into view ────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      selectedBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 100);
  }, [selectedDate, viewYear, viewMonth]);

  // ── Derived summary stats ────────────────────────────────────────────────────
  const recent = logs.slice(0, 30);
  const streak = (() => {
    let s = 0;
    const d = new Date(today);
    while (true) {
      const k = formatDate(d);
      if (logMap[k]?.total_calories > 0 || logMap[k]?.water_ml > 0) { s++; d.setDate(d.getDate()-1); }
      else break;
    }
    return s;
  })();
  const avgCal   = recent.length ? Math.round(recent.reduce((a,l) => a+l.total_calories, 0) / recent.length) : 0;
  const avgWater = recent.length ? Math.round(recent.reduce((a,l) => a+l.water_ml, 0) / recent.length) : 0;

  // ── Days for view month ──────────────────────────────────────────────────────
  const numDays = daysInMonth(viewYear, viewMonth);
  const monthDates: string[] = Array.from({ length: numDays }, (_, i) => {
    return formatDate(new Date(viewYear, viewMonth, i+1));
  });

  // ── Chart data (14 days) ─────────────────────────────────────────────────────
  const chartData = [...logs].slice(0, 14).reverse().map(l => ({
    date: l.date.slice(5),
    water: Math.round(l.water_ml / 100) / 10,
    cal: l.total_calories,
    protein: Math.round(l.protein_g),
    carbs: Math.round(l.carbs_g),
    fat: Math.round(l.fat_g),
    micros: l.micro_count,
    weight: l.weight_kg ?? 0,
  }));

  // ── Month navigation ─────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
    else setViewMonth(m => m-1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())) return;
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
    else setViewMonth(m => m+1);
  };
  const isFutureMonth = (() => {
    const now = new Date();
    return viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth());
  })();

  const goals = { cal: 2500, p: 150, c: 250, f: 70, water: 2500 };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-app-red border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

      {/* ── Summary strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1 m-4">
        <SummaryCard icon={<Flame size={16} color={CRED} />}       label="STREAK"    value={`${streak}d`} />
        <SummaryCard icon={<Flame size={16} color="#FF9800" />}    label="AVG KCAL"  value={`${avgCal}`} />
        <SummaryCard icon={<Droplets size={16} color="#1E88E5" />} label="AVG WATER" value={`${(avgWater/1000).toFixed(1)}L`} />
      </div>

      {/* ── Month selector ────────────────────────────────────────────── */}
      <div className="mx-4 mb-2 flex items-center justify-between px-4 py-2" style={{ background: '#141414' }}>
        <button onClick={prevMonth} className="p-1">
          <ChevronLeft size={20} color={CTEXT} />
        </button>
        <span className="font-barlow font-black text-sm text-app-primary tracking-[3px]">
          {MONTH_NAMES[viewMonth].toUpperCase()} {viewYear}
        </span>
        <button onClick={nextMonth} className="p-1" disabled={isFutureMonth}>
          <ChevronRight size={20} color={isFutureMonth ? '#333' : CTEXT} />
        </button>
      </div>

      {/* ── Horizontal day row ───────────────────────────────────────── */}
      <div
        ref={dayRowRef}
        className="mx-4 mb-4 overflow-x-auto no-scrollbar flex gap-1.5 py-2 px-1"
        style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {monthDates.map(date => {
          const d = parseDate(date);
          const dayName = DAY_SHORT[d.getDay()];
          const dayNum  = d.getDate();
          const selected = date === selectedDate;
          const hasData = !!(logMap[date]?.total_calories || logMap[date]?.water_ml);
          const isToday  = date === today;
          const isFuture = date > today;

          return (
            <button
              key={date}
              ref={selected ? selectedBtnRef : undefined}
              onClick={() => { if (!isFuture) setSelectedDate(date); }}
              disabled={isFuture}
              className="flex-none flex flex-col items-center py-2 px-2.5 transition-all"
              style={{
                background: selected ? CRED : 'transparent',
                border: `1px solid ${selected ? CRED : isToday ? CRED + '60' : CDIM}`,
                opacity: isFuture ? 0.3 : 1,
                minWidth: 44,
              }}
            >
              <span className="font-barlow font-bold text-xs"
                style={{ color: selected ? 'white' : CTEXT }}>
                {dayName}
              </span>
              <span className="font-barlow font-black text-base leading-none mt-0.5"
                style={{ color: selected ? 'white' : isToday ? CRED : '#E8E8E8' }}>
                {dayNum}
              </span>
              {hasData && (
                <div className="mt-1 rounded-full"
                  style={{ width: 4, height: 4, background: selected ? 'rgba(255,255,255,0.7)' : CRED }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Day detail panel ──────────────────────────────────────────── */}
      <div className="mx-4 mb-4">
        {dayLoading ? (
          <div className="flex items-center justify-center py-10" style={{ background: '#141414' }}>
            <div className="w-6 h-6 rounded-full border-2 border-app-red border-t-transparent animate-spin" />
          </div>
        ) : (
          <DayDetailPanel date={selectedDate} detail={dayDetail} dayLog={logMap[selectedDate]} goals={goals} />
        )}
      </div>

      {/* ── Workout History ───────────────────────────────────────────── */}
      {workouts.length > 0 && (
        <div className="mx-4 mb-4" style={{ background: '#141414', border: '1px solid #1E1E1E' }}>
          <div className="px-4 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: '1px solid #1E1E1E' }}>
            <div style={{ width: 3, height: 14, background: CRED }} />
            <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">WORKOUT HISTORY</span>
            <span className="ml-auto font-barlow text-xs text-app-muted">{workouts.length} sessions</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#1E1E1E' }}>
            {workouts.map((w, i) => {
              const d = new Date(w.logged_at);
              const dateLabel = `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3).toUpperCase()}`;
              const timeLabel = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              return (
                <div key={w.id} className="px-4 py-3 flex items-center gap-3">
                  {/* Number badge */}
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center font-barlow font-black text-xs"
                    style={{ background: 'rgba(204,0,0,0.12)', color: CRED }}>
                    {String(i+1).padStart(2,'0')}
                  </div>
                  {/* Plan info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-barlow font-bold text-sm text-app-primary truncate">{w.plan_name}</div>
                    {w.notes ? <div className="font-barlow text-xs text-app-muted truncate italic">{w.notes}</div> : null}
                  </div>
                  {/* Duration + date */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1">
                      <Dumbbell size={11} color={CRED} />
                      <span className="font-barlow font-bold text-sm" style={{ color: CRED }}>{w.duration_min} min</span>
                    </div>
                    <div className="font-barlow text-xs text-app-muted">{dateLabel}</div>
                    <div className="font-barlow text-xs text-app-muted">{timeLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 14-day trends ─────────────────────────────────────────────── */}
      <div className="mx-4 mb-1">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div style={{ width: 3, height: 14, background: CRED }} />
          <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">14-DAY TRENDS</span>
        </div>

        <div className="flex overflow-x-auto no-scrollbar mb-3" style={{ border: `1px solid ${CDIM}` }}>
          {CHART_TABS.map(t => (
            <button key={t} onClick={() => setChartTab(t)}
              className="flex-none px-3 py-2 font-barlow font-bold text-xs transition-colors"
              style={{ background: chartTab === t ? CRED : 'transparent', color: chartTab === t ? 'white' : CTEXT, letterSpacing: 1 }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ background: '#141414', padding: '12px 4px' }}>
          {chartTab === 'WATER' && (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="date" tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1A1A1A', border: `1px solid ${CDIM}`, color: '#E8E8E8', fontSize: 12 }} />
                <Bar dataKey="water" name="Water (L)" fill="#1E88E5" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'CALORIES' && (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="date" tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1A1A1A', border: `1px solid ${CDIM}`, color: '#E8E8E8', fontSize: 12 }} />
                <Line dataKey="cal" name="kcal" stroke={CRED} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'MACROS' && (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="date" tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1A1A1A', border: `1px solid ${CDIM}`, color: '#E8E8E8', fontSize: 12 }} />
                <Line dataKey="protein" name="Protein (g)" stroke="#E53935" strokeWidth={1.5} dot={false} />
                <Line dataKey="carbs"   name="Carbs (g)"   stroke="#FF9800" strokeWidth={1.5} dot={false} />
                <Line dataKey="fat"     name="Fat (g)"     stroke="#9C27B0" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'MICROS' && (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="date" tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1A1A1A', border: `1px solid ${CDIM}`, color: '#E8E8E8', fontSize: 12 }} />
                <Bar dataKey="micros" name="Micros Met" fill="#2ECC71" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartTab === 'WEIGHT' && (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ left: -20, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="date" tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: CTEXT, fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1A1A1A', border: `1px solid ${CDIM}`, color: '#E8E8E8', fontSize: 12 }} />
                <Line dataKey="weight" name="Weight (kg)" stroke="#FF9800" strokeWidth={2} dot={{ r: 3, fill: '#FF9800' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}

// ── DayDetailPanel ────────────────────────────────────────────────────────────

function DayDetailPanel({ date, detail, dayLog, goals }: {
  date: string;
  detail: DayDetail | null;
  dayLog: DayLog | undefined;
  goals: { cal: number; p: number; c: number; f: number; water: number };
}) {
  const cal   = detail?.total_calories ?? dayLog?.total_calories ?? 0;
  const p     = detail?.protein_g  ?? dayLog?.protein_g  ?? 0;
  const c     = detail?.carbs_g    ?? dayLog?.carbs_g    ?? 0;
  const f     = detail?.fat_g      ?? dayLog?.fat_g      ?? 0;
  const water = detail?.water_ml   ?? dayLog?.water_ml   ?? 0;
  const waterGoal = detail?.water_goal ?? dayLog?.water_goal ?? goals.water;

  const d = parseDate(date);
  const dayLabel = `${DAY_SHORT[d.getDay()]}, ${MONTH_NAMES[d.getMonth()].slice(0,3).toUpperCase()} ${d.getDate()}`;
  const metCount = detail ? NUTRIENTS.filter(n => (detail.nutrients[n.id] ?? 0) >= n.rda).length : 0;

  if (!detail && !dayLog) {
    return (
      <div className="flex flex-col items-center justify-center py-10" style={{ background: '#141414' }}>
        <div className="font-barlow font-black text-sm text-app-muted tracking-[2px]">{dayLabel}</div>
        <div className="font-barlow text-xs text-app-muted mt-2">No data logged for this day</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#141414' }}>
      {/* Date header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #1E1E1E' }}>
        <div className="font-barlow font-black text-sm text-app-primary tracking-[2px]">{dayLabel}</div>
        {(detail?.workouts?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5"
            style={{ background: 'rgba(204,0,0,0.15)', border: '1px solid rgba(204,0,0,0.3)' }}>
            <Dumbbell size={10} color={CRED} />
            <span className="font-barlow font-bold text-xs" style={{ color: CRED }}>
              {detail!.workouts.length} WORKOUT{detail!.workouts.length > 1 ? 'S' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Calorie arc */}
      <div className="flex flex-col items-center py-4">
        <div className="font-barlow font-bold text-xs text-app-muted tracking-[3px] mb-1">CALORIES</div>
        <CalorieArc consumed={cal} goal={goals.cal} />
      </div>

      {/* Macro pills */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        <MiniMacroPill label="PROTEIN" val={Math.round(p)} goal={goals.p} color="#E53935" />
        <MiniMacroPill label="CARBS"   val={Math.round(c)} goal={goals.c} color="#FF9800" />
        <MiniMacroPill label="FAT"     val={Math.round(f)} goal={goals.f} color="#9C27B0" />
      </div>

      {/* Water bar */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Droplets size={14} color="#1E88E5" />
            <span className="font-barlow font-bold text-xs text-app-secondary tracking-[1px]">WATER</span>
          </div>
          <span className="font-barlow font-bold text-sm" style={{ color: '#1E88E5' }}>
            {water >= 1000 ? `${(water/1000).toFixed(1)}L` : `${water}ml`}
            <span className="font-barlow text-xs text-app-muted"> / {(waterGoal/1000).toFixed(1)}L</span>
          </span>
        </div>
        <ProgressBar value={Math.min(1, water / waterGoal)} color="#1E88E5" height={6} />
      </div>

      {/* Micros */}
      {detail && (
        <div className="mx-4 mb-4 px-3 py-2 flex items-center justify-between"
          style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
          <div className="flex items-center gap-1.5">
            <Zap size={14} color="#2ECC71" />
            <span className="font-barlow font-bold text-xs text-app-secondary tracking-[1px]">MICROS MET</span>
          </div>
          <span className="font-barlow font-black text-sm" style={{ color: '#2ECC71' }}>
            {metCount} <span className="font-barlow font-normal text-xs text-app-muted">/ {NUTRIENTS.length}</span>
          </span>
        </div>
      )}

      {/* Workouts */}
      {(detail?.workouts?.length ?? 0) > 0 && (
        <div className="px-4 pb-4">
          <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px] mb-2">WORKOUTS</div>
          {detail!.workouts.map((w, i) => (
            <div key={i} className="flex items-center justify-between py-2"
              style={{ borderBottom: i < detail!.workouts.length-1 ? '1px solid #1E1E1E' : 'none' }}>
              <div className="flex items-center gap-2">
                <Dumbbell size={13} color={CRED} />
                <span className="font-barlow font-bold text-sm text-app-primary">{w.plan_name}</span>
              </div>
              <span className="font-barlow text-xs text-app-muted">{w.duration_min} min</span>
            </div>
          ))}
        </div>
      )}

      {/* Weight */}
      {detail?.progress?.weight_kg ? (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between py-2" style={{ borderTop: '1px solid #1E1E1E' }}>
            <span className="font-barlow font-bold text-xs text-app-muted tracking-[2px]">WEIGHT</span>
            <span className="font-barlow font-black text-sm text-app-primary">
              {detail.progress.weight_kg} <span className="font-barlow font-normal text-xs text-app-muted">kg</span>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Calorie Arc SVG (180° semicircle, same as Dashboard) ─────────────────────

function CalorieArc({ consumed, goal }: { consumed: number; goal: number }) {
  const W = 260, H = 150;
  const CX = 130, CY = 138;
  const R = 108, SW = 16;
  const START = 180, TOTAL = 180;
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const remaining = Math.max(0, goal - consumed);

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
          <path d={pPath} fill="none" stroke="url(#logSemiG)" strokeWidth={SW} strokeLinecap="round" />
        )}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const a = (START + t * TOTAL) * Math.PI / 180;
          const r1 = R - SW / 2 - 4, r2 = R + SW / 2 + 4;
          return (
            <line key={i}
              x1={CX + r1 * Math.sin(a)} y1={CY - r1 * Math.cos(a)}
              x2={CX + r2 * Math.sin(a)} y2={CY - r2 * Math.cos(a)}
              stroke="#111" strokeWidth={2} />
          );
        })}
        <defs>
          <linearGradient id="logSemiG" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B0000" />
            <stop offset="60%" stopColor="#CC0000" />
            <stop offset="100%" stopColor="#FF3333" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="font-barlow font-black leading-none"
          style={{ fontSize: 40, color: pct >= 1 ? '#2ECC71' : '#FFFFFF', letterSpacing: -1 }}>
          {pct >= 1 ? consumed : remaining}
        </div>
        <div className="font-barlow font-bold text-xs tracking-[3px] mt-1"
          style={{ color: pct >= 1 ? '#2ECC71' : '#666' }}>
          {pct >= 1 ? 'GOAL REACHED' : 'REMAINING'}
        </div>
        <div className="font-barlow text-xs mt-1.5 px-3 py-1"
          style={{ background: 'rgba(204,0,0,0.12)', color: CRED, border: '1px solid rgba(204,0,0,0.2)' }}>
          {consumed} / {goal} kcal
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 flex flex-col items-center" style={{ background: '#141414' }}>
      {icon}
      <div className="font-barlow font-black text-xl text-app-primary mt-1">{value}</div>
      <div className="font-barlow font-bold text-xs text-app-muted tracking-[1px]">{label}</div>
    </div>
  );
}

function MiniMacroPill({ label, val, goal, color }: { label: string; val: number; goal: number; color: string }) {
  return (
    <div className="flex flex-col items-center py-2 px-1 rounded"
      style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
      <div className="font-barlow font-black text-lg leading-none" style={{ color }}>{val}g</div>
      <div className="font-barlow text-xs text-app-muted">/{goal}g</div>
      <div className="font-barlow font-bold text-xs mt-0.5 tracking-[1px]" style={{ color: '#666' }}>{label}</div>
    </div>
  );
}
