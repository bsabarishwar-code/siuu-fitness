import { Home, Dumbbell, Utensils, TrendingUp, BarChart2, Droplets } from 'lucide-react';

const TABS = [
  { label: 'Home',      Icon: Home },
  { label: 'Workout',   Icon: Dumbbell },
  { label: 'Nutrition', Icon: Utensils },
  { label: 'Progress',  Icon: TrendingUp },
  { label: 'Logs',      Icon: BarChart2 },
  { label: 'Water',     Icon: Droplets },
];

interface BottomNavProps {
  current: number;
  onTap: (i: number) => void;
}

export default function BottomNav({ current, onTap }: BottomNavProps) {
  return (
    <div className="px-3 pb-safe-bottom" style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 8px)` }}>
      <div
        className="flex rounded-[36px] px-1.5 py-2.5"
        style={{ background: 'rgba(20,20,20,0.72)', border: '0.8px solid #2E2E2E', backdropFilter: 'blur(28px)' }}
      >
        {TABS.map(({ label, Icon }, i) => {
          const active = i === current;
          return (
            <button
              key={label}
              onClick={() => onTap(i)}
              className="flex-1 flex flex-col items-center gap-0.5 touch-manipulation"
              style={{ outline: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div
                className="px-2.5 py-1.5 rounded-[20px] transition-all duration-200"
                style={{ background: active ? 'rgba(204,0,0,0.18)' : 'transparent' }}
              >
                <Icon
                  size={20}
                  color={active ? '#CC0000' : '#666666'}
                  strokeWidth={active ? 2.2 : 1.8}
                />
              </div>
              <div
                className="rounded-full transition-all duration-200"
                style={{
                  width: 4, height: 4,
                  background: active ? '#CC0000' : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
