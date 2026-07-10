interface ProgressBarProps {
  value: number;   // 0..1
  color?: string;
  height?: number;
  className?: string;
}

export default function ProgressBar({ value, color = '#CC0000', height = 6, className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className={`rounded-full overflow-hidden ${className}`} style={{ background: '#2E2E2E', height }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
