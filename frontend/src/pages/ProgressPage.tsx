import { useEffect, useState, useCallback } from 'react';
import { Save, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, type ProgressHistoryEntry } from '../api/client';

export default function ProgressPage({ onRefreshing }: { onRefreshing?: (v: boolean) => void }) {
  const [history, setHistory] = useState<ProgressHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weight_kg: '', waist_cm: '', chest_cm: '', arm_cm: '', leg_cm: '', notes: '' });
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    onRefreshing?.(true);
    try {
      const res = await api.progressHistory(60);
      setHistory(res.entries);
    } catch (e) { console.error(e); }
    finally { setLoading(false); onRefreshing?.(false); }
  }, [onRefreshing]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api.logProgress({
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        waist_cm:  form.waist_cm  ? parseFloat(form.waist_cm)  : undefined,
        chest_cm:  form.chest_cm  ? parseFloat(form.chest_cm)  : undefined,
        arm_cm:    form.arm_cm    ? parseFloat(form.arm_cm)    : undefined,
        leg_cm:    form.leg_cm    ? parseFloat(form.leg_cm)    : undefined,
        notes:     form.notes     || undefined,
      });
      setFeedback('Progress logged!');
      setTimeout(() => setFeedback(''), 2500);
      setForm({ weight_kg: '', waist_cm: '', chest_cm: '', arm_cm: '', leg_cm: '', notes: '' });
      setShowForm(false);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const chartData = [...history].reverse().map(e => ({
    date: e.logged_at.slice(5, 10),
    weight: e.weight_kg || null,
    waist: e.waist_cm || null,
  }));

  const latest = history[0];

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-app-red border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
      {/* Latest stats */}
      <div className="mx-4 mt-4 p-4" style={{ background: '#1C1C1C' }}>
        <div className="flex items-center gap-2 mb-3">
          <div style={{ width: 3, height: 14, background: '#CC0000' }} />
          <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">CURRENT STATS</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="WEIGHT" value={latest?.weight_kg ? `${latest.weight_kg}kg` : '—'} color="#CC0000" />
          <StatCard label="WAIST" value={latest?.waist_cm ? `${latest.waist_cm}cm` : '—'} color="#1E88E5" />
          <StatCard label="CHEST" value={latest?.chest_cm ? `${latest.chest_cm}cm` : '—'} color="#FF9800" />
          <StatCard label="ARM" value={latest?.arm_cm ? `${latest.arm_cm}cm` : '—'} color="#9C27B0" />
          <StatCard label="LEG" value={latest?.leg_cm ? `${latest.leg_cm}cm` : '—'} color="#2ECC71" />
        </div>
      </div>

      {/* Log button */}
      {feedback && (
        <div className="mx-4 mt-2 p-3 text-center font-barlow font-bold text-sm text-app-success"
          style={{ background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)' }}>
          {feedback}
        </div>
      )}

      <div className="mx-4 mt-2">
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm tracking-[2px] text-white"
          style={{ background: '#CC0000' }}
        >
          <Plus size={16} /> LOG PROGRESS
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mx-4 mt-1 p-4" style={{ background: '#141414' }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <NumberInput label="WEIGHT (kg)" value={form.weight_kg} onChange={v => setForm(f => ({ ...f, weight_kg: v }))} />
            <NumberInput label="WAIST (cm)" value={form.waist_cm} onChange={v => setForm(f => ({ ...f, waist_cm: v }))} />
            <NumberInput label="CHEST (cm)" value={form.chest_cm} onChange={v => setForm(f => ({ ...f, chest_cm: v }))} />
            <NumberInput label="ARM (cm)" value={form.arm_cm} onChange={v => setForm(f => ({ ...f, arm_cm: v }))} />
            <NumberInput label="LEG (cm)" value={form.leg_cm} onChange={v => setForm(f => ({ ...f, leg_cm: v }))} />
          </div>
          <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px] mb-1">NOTES</div>
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes..."
            rows={2}
            className="w-full px-3 py-2 bg-transparent font-barlow text-sm text-app-primary outline-none resize-none"
            style={{ border: '1px solid #2E2E2E' }}
          />
          <button
            onClick={save} disabled={saving}
            className="mt-3 w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm tracking-[2px] text-white"
            style={{ background: '#CC0000', opacity: saving ? 0.6 : 1 }}
          >
            <Save size={16} /> {saving ? 'SAVING...' : 'SAVE PROGRESS'}
          </button>
        </div>
      )}

      {/* Weight chart */}
      {chartData.filter(d => d.weight).length > 1 && (
        <div className="mx-4 mt-2 p-4" style={{ background: '#141414' }}>
          <div className="flex items-center gap-2 mb-4">
            <div style={{ width: 3, height: 14, background: '#CC0000' }} />
            <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">WEIGHT TREND</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData.filter(d => d.weight)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1C" />
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11, fontFamily: 'Barlow Condensed' }} />
              <YAxis tick={{ fill: '#666', fontSize: 11, fontFamily: 'Barlow Condensed' }} />
              <Tooltip contentStyle={{ background: '#1C1C1C', border: '1px solid #2E2E2E', fontFamily: 'Barlow Condensed' }}
                labelStyle={{ color: '#AAAAAA' }} itemStyle={{ color: '#CC0000' }} />
              <Line type="monotone" dataKey="weight" stroke="#CC0000" strokeWidth={2} dot={{ fill: '#CC0000', r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History list */}
      <div className="mx-4 mt-2 mb-4" style={{ background: '#141414' }}>
        <div className="px-4 pt-3 flex items-center gap-2 mb-2">
          <div style={{ width: 3, height: 14, background: '#CC0000' }} />
          <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">HISTORY</span>
        </div>
        {history.length === 0 ? (
          <div className="px-4 pb-4 font-barlow text-sm text-app-muted text-center py-6">No progress logged yet</div>
        ) : history.slice(0, 10).map(e => (
          <div key={e.id} className="px-4 py-3 border-b last:border-0" style={{ borderColor: '#1C1C1C' }}>
            <div className="flex justify-between mb-1">
              <span className="font-barlow font-bold text-xs text-app-muted">{e.logged_at.slice(0, 10)}</span>
            </div>
            <div className="flex gap-4 flex-wrap">
              {e.weight_kg && <span className="font-barlow text-xs text-app-primary">{e.weight_kg}kg</span>}
              {e.waist_cm && <span className="font-barlow text-xs text-app-secondary">W:{e.waist_cm}cm</span>}
              {e.chest_cm && <span className="font-barlow text-xs text-app-secondary">C:{e.chest_cm}cm</span>}
              {e.notes && <span className="font-barlow text-xs text-app-muted italic">{e.notes}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 flex flex-col items-center" style={{ background: '#141414', borderTop: `2px solid ${color}` }}>
      <span className="font-barlow font-black text-xl text-app-primary">{value}</span>
      <span className="font-barlow text-xs text-app-muted tracking-widest mt-0.5">{label}</span>
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px] mb-1">{label}</div>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-transparent font-barlow font-bold text-base text-app-primary outline-none"
        style={{ border: '1px solid #2E2E2E' }}
      />
    </div>
  );
}
