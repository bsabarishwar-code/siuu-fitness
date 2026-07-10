import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import AnimatedBackground from '../components/AnimatedBackground';

export default function LoginPage() {
  const setToken = useAuthStore(s => s.setToken);
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const login = async () => {
    if (!pass) return;
    setBusy(true); setError('');
    try {
      const res = await api.login(pass);
      setToken(res.token);
    } catch {
      setError('Wrong access code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden" style={{ background: '#0A0A0A' }}>
      <AnimatedBackground />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div style={{ width: 4, height: 50, background: '#CC0000' }} />
          <div>
            <div className="font-barlow font-black text-3xl text-app-red tracking-[4px]">SIUU FITNESS</div>
            <div className="font-barlow font-bold text-xs text-app-muted tracking-[3px]">ENTER YOUR ACCESS CODE</div>
          </div>
        </div>

        <div className="w-full max-w-xs">
          <div className="font-barlow font-bold text-xs text-app-muted tracking-[2px] mb-2">PASSWORD</div>
          <div className="flex items-center gap-3 px-3" style={{ background: '#1C1C1C', borderBottom: '1px solid #2E2E2E' }}>
            <Lock size={16} color="#666" />
            <input
              type={show ? 'text' : 'password'}
              placeholder="Enter password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              autoComplete="current-password"
              className="flex-1 py-4 bg-transparent font-barlow font-bold text-lg text-app-primary outline-none placeholder:text-app-muted tracking-widest"
            />
            <button onClick={() => setShow(v => !v)} type="button" className="px-1">
              {show ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 flex items-center gap-2" style={{ background: 'rgba(139,0,0,0.25)' }}>
              <span className="text-app-danger text-xs flex-1">{error}</span>
            </div>
          )}

          <button
            onClick={login} disabled={busy || !pass}
            className="mt-6 w-full py-4 font-barlow font-black text-base tracking-[2px] text-white transition-opacity"
            style={{ background: '#CC0000', opacity: busy || !pass ? 0.6 : 1 }}
          >
            {busy ? '...' : 'LOGIN'}
          </button>
        </div>
      </div>
    </div>
  );
}
