interface ScoreRingProps {
  progress: number; // 0..1
  size?: number;
  label: string;
  sublabel?: string;
}

export default function ScoreRing({ progress, size = 100, label, sublabel }: ScoreRingProps) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(progress, 1);
  const gap = circ - dash;
  const cx = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1C1C1C" strokeWidth={8} />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="#CC0000"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-barlow font-black text-app-primary leading-none" style={{ fontSize: size * 0.22 }}>
          {label}
        </span>
        {sublabel && (
          <span className="font-barlow font-bold tracking-widest" style={{ fontSize: size * 0.1, color: '#666666', letterSpacing: '0.15em' }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
