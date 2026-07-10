import { useState, useRef, useCallback } from 'react';
import { User, LogOut, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import BottomNav from '../components/BottomNav';
import AnimatedBackground from '../components/AnimatedBackground';
import SyncBanner from '../components/SyncBanner';
import DashboardPage from './DashboardPage';
import WorkoutPage from './WorkoutPage';
import NutritionPage from './NutritionPage';
import ProgressPage from './ProgressPage';
import LogsPage from './LogsPage';
import WaterPage from './WaterPage';
import ProfilePage from './ProfilePage';

const TITLES = ['SIUU FITNESS', 'WORKOUT', 'NUTRITION', 'PROGRESS', 'LOGS', 'HYDRATION'];

export default function MainLayout() {
  const [tab, setTab]           = useState(0);
  const [tabHistory, setTabHistory] = useState<number[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const logout = useAuthStore(s => s.logout);
  const syncCount = useRef(0);

  const handleRefreshing = useCallback((loading: boolean) => {
    syncCount.current += loading ? 1 : -1;
    syncCount.current = Math.max(0, syncCount.current);
    setSyncing(syncCount.current > 0);
  }, []);

  const navigateTo = useCallback((next: number) => {
    setTab(prev => {
      if (prev !== next) setTabHistory(h => [...h, prev]);
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setTabHistory(h => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setTab(prev);
      return h.slice(0, -1);
    });
  }, []);

  const confirmLogout = () => {
    if (window.confirm('Logout from Siuu Fitness?')) logout();
  };

  const pageProps = { onRefreshing: handleRefreshing };
  // Never show back button when already on the home tab
  const canGoBack = tabHistory.length > 0 && tab !== 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0A0A0A' }}>
      <AnimatedBackground />

      {/* AppBar */}
      <div
        className="relative z-20 flex items-center px-2 pb-3 flex-shrink-0"
        style={{
          background: 'rgba(10,10,10,0.96)',
          borderBottom: '1px solid #1C1C1C',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}
      >
        {/* Back button */}
        <button
          onClick={goBack}
          className="p-2 mr-1 transition-opacity"
          style={{ opacity: canGoBack ? 1 : 0, pointerEvents: canGoBack ? 'auto' : 'none' }}
        >
          <ChevronLeft size={22} color="#CC0000" />
        </button>

        <div className="flex-1">
          <span className="font-barlow font-black text-xl text-app-primary tracking-[4px]">{TITLES[tab]}</span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setShowProfile(true)} className="p-2">
            <User size={20} color="#AAAAAA" />
          </button>
          <button onClick={confirmLogout} className="p-2">
            <LogOut size={20} color="#AAAAAA" />
          </button>
        </div>
      </div>

      {/* Sync banner */}
      <div className="relative z-20 h-0">
        <SyncBanner visible={syncing} />
      </div>

      {/* Page content */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {tab === 0 && <DashboardPage {...pageProps} onNavigate={navigateTo} />}
        {tab === 1 && <WorkoutPage {...pageProps} />}
        {tab === 2 && <NutritionPage {...pageProps} />}
        {tab === 3 && <ProgressPage {...pageProps} />}
        {tab === 4 && <LogsPage {...pageProps} />}
        {tab === 5 && <WaterPage {...pageProps} />}
      </div>

      {/* Bottom Nav */}
      <div className="relative z-20 flex-shrink-0" style={{ background: 'rgba(10,10,10,0.9)' }}>
        <BottomNav current={tab} onTap={navigateTo} />
      </div>

      {/* Profile overlay */}
      {showProfile && <ProfilePage onBack={() => setShowProfile(false)} />}
    </div>
  );
}
