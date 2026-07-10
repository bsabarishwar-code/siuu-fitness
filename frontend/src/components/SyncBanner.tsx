import { useEffect, useState } from 'react';

interface SyncBannerProps {
  visible: boolean;
}

export default function SyncBanner({ visible }: SyncBannerProps) {
  const [dot, setDot] = useState(0.5);

  useEffect(() => {
    if (!visible) return;
    const iv = setInterval(() => setDot(d => d === 0.5 ? 1 : 0.5), 700);
    return () => clearInterval(iv);
  }, [visible]);

  return (
    <div
      className="absolute top-2 left-0 right-0 flex justify-center z-50 pointer-events-none transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-150%)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-[20px]"
        style={{
          background: 'rgba(20,20,20,0.85)',
          border: '0.8px solid rgba(204,0,0,0.5)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="rounded-full transition-opacity duration-700"
          style={{ width: 6, height: 6, background: `rgba(204,0,0,${dot})` }}
        />
        <span className="font-barlow font-bold text-xs tracking-[0.2em] text-app-primary">SYNCING DATA</span>
        <div
          className="rounded-full border border-app-red opacity-80"
          style={{ width: 10, height: 10, borderWidth: 1.5, animation: 'spin 1s linear infinite' }}
        />
      </div>
    </div>
  );
}
