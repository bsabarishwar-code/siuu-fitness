import { useEffect, useState } from 'react';
import { Bell, Save, ArrowLeft, RefreshCw, Send, Calculator, Clock } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { requestAndSubscribe, permission, isStandalone } from '../push/pushService';

interface ProfilePageProps {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const logout = useAuthStore(s => s.logout);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [waterMsg, setWaterMsg] = useState('');
  const [height, setHeight] = useState('');
  const [pushPerm, setPushPerm] = useState<NotificationPermission>('default');
  const [pushStatus, setPushStatus] = useState<{ subscriptions: number; vapid_configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#2ECC71');

  // Reminder prefs state
  const [reminderStart, setReminderStart] = useState('8');
  const [reminderEnd,   setReminderEnd]   = useState('22');
  const [reportHour,    setReportHour]    = useState('20');
  const [savingReminder, setSavingReminder] = useState(false);

  // Goals state
  const [goalCal,  setGoalCal]  = useState('2500');
  const [goalProt, setGoalProt] = useState('150');
  const [goalCarb, setGoalCarb] = useState('250');
  const [goalFat,  setGoalFat]  = useState('70');
  const [goalWater, setGoalWater] = useState('3000');
  const [bmi, setBmi] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.getProfile(),
      api.pushStatus().catch(() => null),
      api.getGoals().catch(() => null),
      api.progressHistory(1).catch(() => null),
      api.getReminderPrefs().catch(() => null),
    ]).then(([p, status, goals, prog, prefs]) => {
      setName(p.name);
      setEmail(p.email);
      setWaterMsg(p.water_message);
      setHeight(p.height_cm);
      setPushPerm(permission());
      setPushStatus(status);
      if (goals) {
        setGoalCal(String(goals.calories));
        setGoalProt(String(goals.protein_g));
        setGoalCarb(String(goals.carbs_g));
        setGoalFat(String(goals.fat_g));
        setGoalWater(String(goals.water_ml));
      }
      if (prefs) {
        setReminderStart(String(prefs.reminder_start));
        setReminderEnd(String(prefs.reminder_end));
        setReportHour(String(prefs.report_hour));
      }
      // Compute BMI if height and latest weight are available
      const hCm = parseFloat(p.height_cm);
      const wKg = prog?.entries?.[0]?.weight_kg;
      if (hCm > 0 && wKg) {
        const hM = hCm / 100;
        setBmi(Math.round((wKg / (hM * hM)) * 10) / 10);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ water_message: waterMsg, height_cm: height });
      // Recompute BMI if height changed
      const hCm = parseFloat(height);
      if (hCm > 0 && bmi !== null) {
        const hM = hCm / 100;
        const wKg = bmi * hM * hM; // back-calculate from current BMI
        setBmi(Math.round((wKg / (hM * hM)) * 10) / 10);
      }
      showFeedback('Saved!', '#2ECC71');
    } catch { showFeedback('Save failed', '#CC0000'); }
    finally { setSaving(false); }
  };

  const saveGoals = async () => {
    setSavingGoals(true);
    try {
      await api.saveGoals({
        calories:  parseInt(goalCal)  || 2500,
        protein_g: parseInt(goalProt) || 150,
        carbs_g:   parseInt(goalCarb) || 250,
        fat_g:     parseInt(goalFat)  || 70,
        water_ml:  parseInt(goalWater)|| 3000,
      });
      showFeedback('Goals saved!', '#2ECC71');
    } catch { showFeedback('Save failed', '#CC0000'); }
    finally { setSavingGoals(false); }
  };

  const saveReminderPrefs = async () => {
    setSavingReminder(true);
    try {
      await api.saveReminderPrefs({
        reminder_start: parseInt(reminderStart) || 8,
        reminder_end:   parseInt(reminderEnd)   || 22,
        report_hour:    parseInt(reportHour)    || 20,
      });
      showFeedback('Reminder settings saved!', '#2ECC71');
    } catch { showFeedback('Save failed', '#CC0000'); }
    finally { setSavingReminder(false); }
  };

  const autoCalcCals = () => {
    const p = parseInt(goalProt) || 0;
    const c = parseInt(goalCarb) || 0;
    const f = parseInt(goalFat)  || 0;
    setGoalCal(String(p * 4 + c * 4 + f * 9));
  };

  const enableNotifs = async () => {
    setSaving(true);
    const result = await requestAndSubscribe();
    setSaving(false);
    setPushPerm(permission());
    // Refresh status after subscribe attempt
    api.pushStatus().then(setPushStatus).catch(() => {});
    if (result === 'granted') {
      showFeedback('Notifications enabled! Tap TEST to verify.', '#2ECC71');
    } else if (result === 'ios_not_standalone') {
      showFeedback('Add to Home Screen first, then open from the icon.', '#CC0000');
    } else if (result === 'denied') {
      showFeedback('Blocked — go to Settings → Safari → Notifications → Allow.', '#CC0000');
    } else if (result === 'no_vapid') {
      showFeedback('Server not configured — contact admin.', '#FF9800');
    } else if (result === 'server_error') {
      showFeedback('Could not save subscription — try again.', '#FF9800');
    }
  };

  const sendTestPush = async () => {
    setTestingPush(true);
    try {
      const res = await api.pushTest();
      if (res.sent > 0) {
        showFeedback(`Test sent to ${res.sent} device(s)! Check your notifications.`, '#2ECC71');
      } else {
        showFeedback(res.error || 'No subscriptions found — enable notifications first.', '#FF9800');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Test failed';
      showFeedback(msg, '#CC0000');
    } finally {
      setTestingPush(false);
    }
  };

  const showFeedback = (msg: string, color: string) => {
    setFeedback(msg); setFeedbackColor(color);
    setTimeout(() => setFeedback(''), 3500);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 rounded-full border-2 border-app-red border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0A' }}>
      {/* AppBar */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#0A0A0A', borderBottom: '1px solid #1C1C1C' }}>
        <button onClick={onBack} className="p-1"><ArrowLeft size={20} color="#E8E8E8" /></button>
        <span className="font-barlow font-black text-lg text-app-primary tracking-[4px] flex-1">PROFILE</span>
        <button onClick={logout} className="font-barlow font-bold text-xs text-app-muted tracking-widest">LOGOUT</button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        {/* Avatar */}
        <div className="py-7 flex flex-col items-center" style={{ background: '#1C1C1C' }}>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ border: '2px solid #CC0000', background: 'rgba(204,0,0,0.15)' }}
          >
            <span className="font-barlow font-black text-4xl text-app-red">
              {name ? name[0].toUpperCase() : 'V'}
            </span>
          </div>
          <div className="font-barlow font-black text-xl text-app-primary tracking-[2px] mt-3">{name.toUpperCase()}</div>
          <div className="font-barlow text-xs text-app-muted mt-1">{email}</div>
        </div>

        {feedback && (
          <div className="mx-4 mt-3 p-3 text-center font-barlow font-bold text-sm"
            style={{ background: `${feedbackColor}22`, color: feedbackColor, border: `1px solid ${feedbackColor}44` }}>
            {feedback}
          </div>
        )}

        {/* Personal details */}
        <SectionHead title="PERSONAL DETAILS" />
        <div className="mx-4" style={{ background: '#141414' }}>
          <ReadRow label="NAME" value={name} />
          <div style={{ height: 1, background: '#1C1C1C' }} />
          <ReadRow label="EMAIL" value={email} />
          <div style={{ height: 1, background: '#1C1C1C' }} />
          <div className="px-4 py-3">
            <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px] mb-1">HEIGHT (cm)</div>
            <input type="number" value={height} onChange={e => setHeight(e.target.value)}
              className="w-full bg-transparent font-barlow font-bold text-base text-app-primary outline-none"
              style={{ borderBottom: '1px solid rgba(204,0,0,0.3)' }} />
          </div>
        </div>

        {/* Water message */}
        <SectionHead title="WATER REMINDER MESSAGE" />
        <div className="mx-4 p-4" style={{ background: '#141414' }}>
          <textarea
            value={waterMsg}
            onChange={e => setWaterMsg(e.target.value)}
            rows={3}
            placeholder='e.g. "Drink up champ, stay hydrated!"'
            className="w-full bg-transparent font-barlow text-sm text-app-primary outline-none resize-none placeholder:text-app-muted"
            style={{ borderBottom: '1px solid #2E2E2E' }}
          />
          <div className="font-barlow text-xs text-app-muted mt-2">
            This message will appear in every water reminder push notification.
          </div>
        </div>

        {/* Daily Goals */}
        <SectionHead title="DAILY GOALS" />
        <div className="mx-4 mb-1" style={{ background: '#141414' }}>
          {/* Calorie row with auto-calc */}
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #1C1C1C' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-barlow font-bold text-xs text-app-muted tracking-[2px]">CALORIES (kcal)</span>
              <button onClick={autoCalcCals}
                className="flex items-center gap-1 px-2 py-0.5 font-barlow font-bold text-xs"
                style={{ color: '#FF9800', border: '1px solid rgba(255,152,0,0.3)' }}>
                <Calculator size={11} /> AUTO CALC
              </button>
            </div>
            <input type="number" value={goalCal} onChange={e => setGoalCal(e.target.value)}
              className="w-full bg-transparent font-barlow font-black text-2xl text-app-primary outline-none"
              style={{ borderBottom: '1px solid rgba(204,0,0,0.3)' }} />
            <div className="font-barlow text-xs text-app-muted mt-1">Auto Calc = P×4 + C×4 + F×9</div>
          </div>

          {/* Macro grid */}
          <div className="grid grid-cols-3 divide-x" style={{ borderBottom: '1px solid #1C1C1C', borderColor: '#1C1C1C' }}>
            {[
              { label: 'PROTEIN', value: goalProt, set: setGoalProt, color: '#E53935', unit: 'g' },
              { label: 'CARBS',   value: goalCarb, set: setGoalCarb, color: '#FF9800', unit: 'g' },
              { label: 'FAT',     value: goalFat,  set: setGoalFat,  color: '#AB47BC', unit: 'g' },
            ].map(({ label, value, set, color, unit }) => (
              <div key={label} className="px-3 py-3">
                <div className="font-barlow font-bold text-xs tracking-[1.5px] mb-1" style={{ color }}>{label}</div>
                <div className="flex items-baseline gap-1">
                  <input type="number" value={value} onChange={e => set(e.target.value)}
                    className="w-full bg-transparent font-barlow font-black text-lg text-app-primary outline-none"
                    style={{ borderBottom: `1px solid ${color}44` }} />
                  <span className="font-barlow text-xs text-app-muted">{unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Water goal */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #1C1C1C' }}>
            <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px] mb-1">WATER GOAL (ml)</div>
            <div className="flex items-center gap-3">
              <input type="number" value={goalWater} onChange={e => setGoalWater(e.target.value)}
                className="flex-1 bg-transparent font-barlow font-black text-xl text-app-primary outline-none"
                style={{ borderBottom: '1px solid rgba(30,136,229,0.4)' }} />
              <div className="flex gap-1">
                {[2000, 2500, 3000, 4000].map(v => (
                  <button key={v} onClick={() => setGoalWater(String(v))}
                    className="px-2 py-1 font-barlow font-bold text-xs"
                    style={{
                      background: goalWater === String(v) ? 'rgba(30,136,229,0.2)' : 'transparent',
                      color: goalWater === String(v) ? '#1E88E5' : '#666',
                      border: `1px solid ${goalWater === String(v) ? '#1E88E5' : '#333'}`,
                    }}>
                    {v/1000}L
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 py-3">
            <button onClick={saveGoals} disabled={savingGoals}
              className="w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm tracking-[2px] text-white"
              style={{ background: '#CC0000', opacity: savingGoals ? 0.6 : 1 }}>
              <Save size={15} /> {savingGoals ? 'SAVING...' : 'SAVE GOALS'}
            </button>
          </div>
        </div>

        {/* BMI */}
        {bmi !== null && (
          <>
            <SectionHead title="BODY STATS" />
            <div className="mx-4 mb-1 px-4 py-4 flex items-center justify-between" style={{ background: '#141414' }}>
              <div>
                <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px]">BMI</div>
                <div className="font-barlow font-black text-3xl text-app-primary mt-0.5">{bmi}</div>
              </div>
              <div className="text-right">
                <div className="font-barlow font-bold text-sm" style={{
                  color: bmi < 18.5 ? '#1E88E5' : bmi < 25 ? '#2ECC71' : bmi < 30 ? '#FF9800' : '#CC0000'
                }}>
                  {bmi < 18.5 ? 'UNDERWEIGHT' : bmi < 25 ? 'NORMAL' : bmi < 30 ? 'OVERWEIGHT' : 'OBESE'}
                </div>
                <div className="font-barlow text-xs text-app-muted mt-0.5">
                  {bmi < 25 ? 'Keep it up!' : bmi < 30 ? 'Room to improve' : 'Focus on nutrition'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Reminder settings */}
        <SectionHead title="REMINDER SETTINGS" />
        <div className="mx-4 mb-1" style={{ background: '#141414' }}>
          {/* Water reminder window */}
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #1C1C1C' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} color="#CC0000" />
              <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">WATER REMINDER WINDOW</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-barlow font-bold text-xs text-app-muted tracking-[1.5px] mb-1">START HOUR (0–23)</div>
                <div className="flex items-baseline gap-1">
                  <input type="number" min="0" max="23" value={reminderStart}
                    onChange={e => setReminderStart(e.target.value)}
                    className="w-full bg-transparent font-barlow font-black text-xl text-app-primary outline-none"
                    style={{ borderBottom: '1px solid rgba(204,0,0,0.3)' }} />
                  <span className="font-barlow text-xs text-app-muted">{parseInt(reminderStart) < 12 ? 'AM' : 'PM'}</span>
                </div>
              </div>
              <div>
                <div className="font-barlow font-bold text-xs text-app-muted tracking-[1.5px] mb-1">END HOUR (0–23)</div>
                <div className="flex items-baseline gap-1">
                  <input type="number" min="0" max="23" value={reminderEnd}
                    onChange={e => setReminderEnd(e.target.value)}
                    className="w-full bg-transparent font-barlow font-black text-xl text-app-primary outline-none"
                    style={{ borderBottom: '1px solid rgba(204,0,0,0.3)' }} />
                  <span className="font-barlow text-xs text-app-muted">{parseInt(reminderEnd) < 12 ? 'AM' : 'PM'}</span>
                </div>
              </div>
            </div>
            <div className="font-barlow text-xs text-app-muted mt-2">
              Water reminders will only send between these hours.
            </div>
          </div>

          {/* Daily report time */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #1C1C1C' }}>
            <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px] mb-1">DAILY REPORT HOUR (0–23)</div>
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1 flex-1">
                <input type="number" min="0" max="23" value={reportHour}
                  onChange={e => setReportHour(e.target.value)}
                  className="w-full bg-transparent font-barlow font-black text-xl text-app-primary outline-none"
                  style={{ borderBottom: '1px solid rgba(30,136,229,0.4)' }} />
                <span className="font-barlow text-xs text-app-muted">{parseInt(reportHour) < 12 ? 'AM' : 'PM'}</span>
              </div>
              <div className="flex gap-1">
                {[18, 19, 20, 21].map(h => (
                  <button key={h} onClick={() => setReportHour(String(h))}
                    className="px-2 py-1 font-barlow font-bold text-xs"
                    style={{
                      background: reportHour === String(h) ? 'rgba(30,136,229,0.2)' : 'transparent',
                      color: reportHour === String(h) ? '#1E88E5' : '#666',
                      border: `1px solid ${reportHour === String(h) ? '#1E88E5' : '#333'}`,
                    }}>
                    {h}:00
                  </button>
                ))}
              </div>
            </div>
            <div className="font-barlow text-xs text-app-muted mt-2">
              Your daily nutrition summary email will be sent at this hour.
            </div>
          </div>

          <div className="px-4 py-3">
            <button onClick={saveReminderPrefs} disabled={savingReminder}
              className="w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm tracking-[2px] text-white"
              style={{ background: '#CC0000', opacity: savingReminder ? 0.6 : 1 }}>
              <Save size={15} /> {savingReminder ? 'SAVING...' : 'SAVE REMINDER SETTINGS'}
            </button>
          </div>
        </div>

        {/* Push notifications */}
        <SectionHead title="PUSH NOTIFICATIONS" />
        <div className="mx-4" style={{ background: '#141414' }}>
          {/* Status row */}
          <div className="px-4 pt-4 pb-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: pushPerm === 'granted' ? '#2ECC71' : pushPerm === 'denied' ? '#CC0000' : '#888' }}
              />
              <span className="font-barlow font-bold text-xs text-app-muted tracking-[1.5px]">
                {pushPerm === 'granted' ? 'PERMISSION GRANTED' : pushPerm === 'denied' ? 'BLOCKED' : 'NOT REQUESTED'}
              </span>
            </div>
            {pushStatus && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: pushStatus.vapid_configured ? '#2ECC71' : '#FF9800' }} />
                  <span className="font-barlow font-bold text-xs text-app-muted tracking-[1.5px]">
                    {pushStatus.vapid_configured ? 'SERVER READY' : 'VAPID NOT SET'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-barlow font-bold text-xs" style={{ color: pushStatus.subscriptions > 0 ? '#2ECC71' : '#888' }}>
                    {pushStatus.subscriptions} DEVICE{pushStatus.subscriptions !== 1 ? 'S' : ''} SUBSCRIBED
                  </span>
                </div>
              </>
            )}
          </div>

          {/* iPhone guide if not standalone */}
          {!isStandalone() && (
            <div className="mx-4 mb-3 p-3" style={{ background: 'rgba(139,0,0,0.18)', border: '1px solid rgba(204,0,0,0.25)' }}>
              <div className="font-barlow font-bold text-xs text-app-danger tracking-[1px] mb-1">IPHONE SETUP REQUIRED</div>
              <div className="font-barlow text-xs leading-5" style={{ color: '#FF8080' }}>
                1. Tap the Share button in Safari<br />
                2. Tap <strong>Add to Home Screen</strong><br />
                3. Open the app from your home screen icon<br />
                4. Then tap Enable Notifications below
              </div>
            </div>
          )}

          {/* Blocked state */}
          {pushPerm === 'denied' && (
            <div className="mx-4 mb-3 p-3" style={{ background: 'rgba(139,0,0,0.18)' }}>
              <div className="font-barlow font-bold text-xs text-app-danger">NOTIFICATIONS BLOCKED</div>
              <div className="font-barlow text-xs text-app-muted mt-1 leading-5">
                Go to <strong style={{ color: '#E8E8E8' }}>Settings → Safari → this website → Notifications</strong> and set to Allow.
              </div>
            </div>
          )}

          {/* Action buttons */}
          {pushPerm !== 'denied' && (
            <div className="px-4 pb-4 flex flex-col gap-2">
              <button
                onClick={enableNotifs}
                disabled={saving || (!isStandalone())}
                className="w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm tracking-[1.5px] text-white"
                style={{ background: '#CC0000', opacity: (saving || !isStandalone()) ? 0.5 : 1 }}
              >
                {pushPerm === 'granted' ? <RefreshCw size={16} /> : <Bell size={16} />}
                {saving ? 'SUBSCRIBING...' : pushPerm === 'granted' ? 'RE-SUBSCRIBE' : 'ENABLE NOTIFICATIONS'}
              </button>
              {pushPerm === 'granted' && (
                <button
                  onClick={sendTestPush}
                  disabled={testingPush}
                  className="w-full py-3 flex items-center justify-center gap-2 font-barlow font-black text-sm tracking-[1.5px] text-white"
                  style={{ background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.5)', opacity: testingPush ? 0.6 : 1, color: '#2ECC71' }}
                >
                  <Send size={15} />
                  {testingPush ? 'SENDING...' : 'SEND TEST NOTIFICATION'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="mx-4 mt-4">
          <button
            onClick={save} disabled={saving}
            className="w-full py-4 flex items-center justify-center gap-2 font-barlow font-black text-base tracking-[2px] text-white"
            style={{ background: '#CC0000', opacity: saving ? 0.6 : 1 }}
          >
            <Save size={18} /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#0A0A0A' }}>
      <div style={{ width: 3, height: 14, background: '#CC0000' }} />
      <span className="font-barlow font-bold text-xs text-app-secondary tracking-[2px]">{title}</span>
    </div>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 flex items-center justify-between">
      <div>
        <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px]">{label}</div>
        <div className="font-barlow font-bold text-base text-app-primary mt-0.5">{value}</div>
      </div>
      <span className="text-app-muted text-xs">🔒</span>
    </div>
  );
}
