import { useState } from 'react';
import { Bell, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { requestAndSubscribe, isStandalone } from '../push/pushService';
import AnimatedBackground from '../components/AnimatedBackground';

type Step = 'form' | 'notifications';

export default function SetupPage() {
  const setToken = useAuthStore(s => s.setToken);
  const setSetupDone = useAuthStore(s => s.setSetupDone);

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [conf, setConf] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !email.trim() || !pass) { setError('All fields are required'); return; }
    if (!email.includes('@')) { setError('Enter a valid email address'); return; }
    if (pass.length < 4) { setError('Password must be at least 4 characters'); return; }
    if (pass !== conf) { setError('Passwords do not match'); return; }
    setBusy(true); setError('');
    try {
      const res = await api.setup(name.trim(), email.trim(), pass);
      setToken(res.token, res.name);
      setStep('notifications');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setBusy(false);
    }
  };

  const enableNotifs = async () => {
    setBusy(true);
    await requestAndSubscribe();
    setBusy(false);
    setSetupDone(true);
  };

  const skipNotifs = () => setSetupDone(true);

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden" style={{ background: '#0A0A0A' }}>
      <AnimatedBackground />
      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar">
        {step === 'form' ? (
          <div className="p-7 pt-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div style={{ width: 4, height: 40, background: '#CC0000' }} />
              <div>
                <div className="font-barlow font-black text-2xl text-app-red tracking-[4px]">SIUU FITNESS</div>
                <div className="font-barlow font-bold text-xs text-app-muted tracking-[3px]">FIRST TIME SETUP</div>
              </div>
            </div>

            {/* Fields */}
            <Label text="YOUR NAME" />
            <Input icon={<User size={16} color="#666" />} placeholder="e.g. Vicky" value={name} onChange={setName} autoComplete="name" />

            <div className="mt-4" />
            <Label text="EMAIL FOR NOTIFICATIONS" />
            <Input icon={<Mail size={16} color="#666" />} placeholder="your@email.com" value={email} onChange={setEmail} type="email" autoComplete="email" />

            <div className="mt-4" />
            <Label text="CREATE A PASSWORD" />
            <Input
              icon={<Lock size={16} color="#666" />} placeholder="Min 4 characters"
              value={pass} onChange={setPass} type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              right={<button onClick={() => setShowPass(v => !v)} type="button" className="px-2">{showPass ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}</button>}
            />

            <div className="mt-4" />
            <Label text="CONFIRM PASSWORD" />
            <Input
              icon={<Lock size={16} color="#666" />} placeholder="Repeat password"
              value={conf} onChange={setConf} type={showConf ? 'text' : 'password'}
              autoComplete="new-password"
              right={<button onClick={() => setShowConf(v => !v)} type="button" className="px-2">{showConf ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}</button>}
              onEnter={submit}
            />

            {error && (
              <div className="mt-4 p-3 flex items-start gap-2" style={{ background: 'rgba(139,0,0,0.25)' }}>
                <span className="text-app-danger text-xs font-bold">!</span>
                <span className="text-app-danger text-xs flex-1">{error}</span>
              </div>
            )}

            <button
              onClick={submit} disabled={busy}
              className="mt-7 w-full py-4 font-barlow font-black text-base tracking-[2px] text-white transition-opacity"
              style={{ background: busy ? '#661111' : '#CC0000', opacity: busy ? 0.7 : 1 }}
            >
              {busy ? '...' : 'GET STARTED'}
            </button>
            <div className="h-10" />
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center min-h-full">
            <div className="w-20 h-20 flex items-center justify-center mb-7" style={{ background: '#CC0000' }}>
              <Bell size={42} color="white" />
            </div>
            <div className="font-barlow font-black text-3xl text-app-primary tracking-[3px] mb-3 text-center">STAY ON TRACK</div>
            <p className="font-barlow text-base text-app-secondary text-center leading-6 mb-6">
              Enable notifications so Siuu Fitness can remind you to drink water every hour.
            </p>

            <div className="w-full p-4 mb-6" style={{ background: '#1C1C1C' }}>
              <Feature icon="💧" text="Hourly water reminders (7am – 10pm)" />
              <div className="mt-2" />
              <Feature icon="📊" text="Daily nutrition report at 9pm" />
            </div>

            {!isStandalone() && (
              <div className="w-full p-3 mb-4 flex items-start gap-2" style={{ background: 'rgba(139,0,0,0.25)' }}>
                <span className="text-app-danger text-sm">📱</span>
                <p className="text-app-danger text-xs leading-5">
                  iPhone: For push notifications, first tap Share → Add to Home Screen, then open the app from your homescreen icon.
                </p>
              </div>
            )}

            <button
              onClick={enableNotifs} disabled={busy}
              className="w-full py-4 font-barlow font-black text-sm tracking-[2px] text-white flex items-center justify-center gap-2"
              style={{ background: busy ? '#661111' : '#CC0000', opacity: busy ? 0.7 : 1 }}
            >
              <Bell size={18} /> {busy ? '...' : 'ENABLE NOTIFICATIONS'}
            </button>
            <button
              onClick={skipNotifs} disabled={busy}
              className="mt-3 w-full py-3 font-barlow font-bold text-sm tracking-[1px] text-app-muted"
            >
              SKIP FOR NOW
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px] mb-2">{text}</div>;
}

function Input({
  icon, placeholder, value, onChange, type = 'text', autoComplete, right, onEnter,
}: {
  icon?: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  right?: React.ReactNode;
  onEnter?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
      {icon}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        autoComplete={autoComplete}
        className="flex-1 py-4 bg-transparent font-barlow font-bold text-lg text-app-primary outline-none placeholder:text-app-muted"
      />
      {right}
    </div>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base">{icon}</span>
      <span className="font-barlow text-sm text-app-secondary">{text}</span>
    </div>
  );
}
