import { useEffect, useState, useCallback } from 'react';
import { Droplets, Plus, RotateCcw } from 'lucide-react';
import { api } from '../api/client';
import ProgressBar from '../components/ProgressBar';

const QUICK_ML = [150, 250, 350, 500];

export default function WaterPage({ onRefreshing }: { onRefreshing?: (v: boolean) => void }) {
  const [total, setTotal] = useState(0);
  const [goal, setGoal] = useState(3000);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    onRefreshing?.(true);
    try {
      const res = await api.waterToday();
      setTotal(res.total_ml);
      setGoal(res.goal_ml);
    } catch (e) { console.error(e); }
    finally { setLoading(false); onRefreshing?.(false); }
  }, [onRefreshing]);

  useEffect(() => { load(); }, [load]);

  const log = async (ml: number) => {
    if (busy || ml <= 0) return;
    setBusy(true);
    try {
      const res = await api.logWater(ml);
      setTotal(t => t + res.amount_ml);
      setFeedback(`+${ml}ml logged!`);
      setTimeout(() => setFeedback(''), 2000);
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  const undo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.undoWater();
      setTotal(t => Math.max(0, t - res.removed_ml));
      setFeedback(`-${res.removed_ml}ml removed`);
      setTimeout(() => setFeedback(''), 2000);
    } catch { setFeedback('Nothing to undo'); setTimeout(() => setFeedback(''), 2000); }
    finally { setBusy(false); }
  };

  const pct = Math.min(100, Math.round((total / goal) * 100));
  const remaining = Math.max(0, goal - total);

  const statusColor = pct >= 100 ? '#2ECC71' : pct >= 60 ? '#1E88E5' : '#CC0000';
  const statusText = pct >= 100 ? 'GOAL REACHED! 🎉' : pct >= 60 ? 'KEEP GOING' : 'DRINK UP';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-app-red border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
      {/* Hero card */}
      <div className="m-4 p-6 flex flex-col items-center" style={{ background: '#1C1C1C' }}>
        <div
          className="w-28 h-28 rounded-full flex flex-col items-center justify-center mb-4"
          style={{ background: `conic-gradient(${statusColor} ${pct * 3.6}deg, #2E2E2E 0deg)` }}
        >
          <div
            className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
            style={{ background: '#1C1C1C' }}
          >
            <Droplets size={28} color={statusColor} />
            <span className="font-barlow font-black text-xl text-app-primary leading-none mt-1">{pct}%</span>
          </div>
        </div>

        <span className="font-barlow font-black text-2xl tracking-[2px]" style={{ color: statusColor }}>{statusText}</span>
        <div className="mt-2 flex gap-4 items-center">
          <Stat label="DRANK" value={`${(total / 1000).toFixed(1)}L`} />
          <div style={{ width: 1, height: 30, background: '#2E2E2E' }} />
          <Stat label="REMAINING" value={`${(remaining / 1000).toFixed(1)}L`} />
          <div style={{ width: 1, height: 30, background: '#2E2E2E' }} />
          <Stat label="GOAL" value={`${(goal / 1000).toFixed(1)}L`} />
        </div>

        <div className="w-full mt-4">
          <ProgressBar value={total / goal} color={statusColor} height={8} />
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="mx-4 p-3 text-center font-barlow font-bold text-sm tracking-widest"
          style={{ background: 'rgba(30,136,229,0.15)', color: '#1E88E5', border: '1px solid rgba(30,136,229,0.3)' }}>
          {feedback}
        </div>
      )}

      {/* Quick log */}
      <div className="mx-4 mt-3 p-4" style={{ background: '#141414' }}>
        <div className="flex items-center gap-2 mb-4">
          <div style={{ width: 3, height: 14, background: '#1E88E5' }} />
          <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">QUICK LOG</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_ML.map(ml => (
            <button
              key={ml}
              onClick={() => log(ml)}
              disabled={busy}
              className="py-4 flex flex-col items-center gap-1 font-barlow font-bold"
              style={{ background: '#1C1C1C', border: '1px solid #2E2E2E', opacity: busy ? 0.6 : 1 }}
            >
              <Droplets size={18} color="#1E88E5" />
              <span className="text-sm text-app-primary">{ml}</span>
              <span className="text-xs text-app-muted">ml</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div className="mx-4 mt-1 p-4" style={{ background: '#141414' }}>
        <div className="flex items-center gap-2 mb-3">
          <div style={{ width: 3, height: 14, background: '#1E88E5' }} />
          <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">CUSTOM AMOUNT</span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center px-3" style={{ background: '#1C1C1C', border: '1px solid #2E2E2E' }}>
            <input
              type="number"
              placeholder="Enter ml"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && log(parseInt(custom) || 0)}
              className="flex-1 py-3 bg-transparent font-barlow font-bold text-lg text-app-primary outline-none placeholder:text-app-muted"
            />
            <span className="font-barlow text-xs text-app-muted ml-2">ml</span>
          </div>
          <button
            onClick={() => { log(parseInt(custom) || 0); setCustom(''); }}
            disabled={busy || !custom}
            className="px-4 py-3 flex items-center gap-2 font-barlow font-black text-sm tracking-wider text-white"
            style={{ background: '#CC0000', opacity: busy || !custom ? 0.6 : 1 }}
          >
            <Plus size={16} /> LOG
          </button>
        </div>
      </div>

      {/* Undo */}
      <div className="mx-4 mt-1">
        <button
          onClick={undo} disabled={busy || total === 0}
          className="w-full py-3 flex items-center justify-center gap-2 font-barlow font-bold text-sm tracking-[1px]"
          style={{ background: '#141414', border: '1px solid #2E2E2E', color: '#AAAAAA', opacity: busy || total === 0 ? 0.4 : 1 }}
        >
          <RotateCcw size={14} /> UNDO LAST LOG
        </button>
      </div>
      <div className="h-4" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-barlow font-black text-lg text-app-primary leading-none">{value}</span>
      <span className="font-barlow text-xs text-app-muted tracking-widest mt-0.5">{label}</span>
    </div>
  );
}
