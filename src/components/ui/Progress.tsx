'use client';

interface ProgressBarProps {
  value: number; // 0-100
  showLabel?: boolean;
  height?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function ProgressBar({ value, showLabel = false, height = 6, variant = 'default' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const variantClass = variant !== 'default' ? ` ${variant}` : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
      <div className="progress-bar-wrap" style={{ height }}>
        <div
          className={`progress-bar-fill${variantClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', minWidth: 32 }}>
          {pct}%
        </span>
      )}
    </div>
  );
}

// Circular progress ring
interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({ value, size = 120, strokeWidth = 10, label, sublabel }: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;

  const getColor = () => {
    if (pct >= 80) return '#10B981';
    if (pct >= 50) return '#3B82F6';
    if (pct >= 25) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} className="progress-ring-svg">
        <circle
          className="progress-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={getColor()}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>
          {pct}%
        </span>
        {sublabel && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{sublabel}</span>
        )}
      </div>
    </div>
  );
}
