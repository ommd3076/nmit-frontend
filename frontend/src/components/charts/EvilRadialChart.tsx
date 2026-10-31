import React from 'react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts';

interface EvilRadialProgressProps {
  value: number; // 0 to 100
  size?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  gradientId?: string;
}

export const EvilRadialProgress: React.FC<EvilRadialProgressProps> = ({
  value,
  size = 110,
  label = `${Math.round(value)}%`,
  sublabel = 'Completed',
  color = '#10B981',
  gradientId = 'evilRadialEmerald'
}) => {
  const chartData = [
    {
      name: 'progress',
      value: Math.min(100, Math.max(0, value)),
      fill: `url(#${gradientId})`
    }
  ];

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="76%"
          outerRadius="100%"
          barSize={7}
          data={chartData}
          startAngle={90}
          endAngle={-270}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color === '#10B981' ? '#047857' : (color === '#2563EB' ? '#1D4ED8' : '#B91C1C')} stopOpacity={0.7} />
            </linearGradient>
            <filter id={`evilRadialGlow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Track Circle */}
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />

          <RadialBar
            background={{ fill: '#EAE6DF', opacity: 0.6 }}
            dataKey="value"
            cornerRadius={6}
            style={{ filter: `url(#evilRadialGlow-${gradientId})` }}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Centered Typography Metric */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="font-mono text-sm font-bold tracking-tight text-[#141F1A] tabular-nums leading-none">
          {label}
        </span>
        {sublabel && (
          <span className="text-[9px] font-mono tracking-wider text-[#7D8D85] uppercase mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

interface EvilFleetRadialDistributionProps {
  onScheduleCount: number;
  atRiskCount: number;
  criticalCount: number;
  totalCount: number;
}

export const EvilFleetRadialDistribution: React.FC<EvilFleetRadialDistributionProps> = ({
  onScheduleCount,
  atRiskCount,
  criticalCount,
  totalCount
}) => {
  if (totalCount <= 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#cbd8d0] bg-[#f7f9f7] p-4 text-[13px] text-[#596a60]">
        No stop status counts are available.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 bg-[#F5F3ED]/70 border border-[#E5E0D8] p-3.5 rounded-2xl">
      <div className="w-24 h-24 relative flex items-center justify-center shrink-0" aria-hidden="true">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-mono text-xs font-bold text-[#141F1A] tabular-nums">
            {totalCount}
          </span>
          <span className="text-[8px] font-mono uppercase text-[#7D8D85]">Stops</span>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[#4D5C54]">
            <span className="w-2 h-2 rounded-full bg-[#1E5A44]" />
            On Schedule:
          </span>
          <span className="font-medium text-[#141F1A] tabular-nums">{onScheduleCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[#4D5C54]">
            <span className="w-2 h-2 rounded-full bg-[#D97706]" />
            Impending Risk:
          </span>
          <span className="font-medium text-[#7c5600] tabular-nums">{atRiskCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[#4D5C54]">
            <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
            Critical SLA Violation:
          </span>
          <span className="font-medium text-[#a32626] tabular-nums">{criticalCount}</span>
        </div>
        <p className="pt-1 text-[12px] text-[#596a60]">Counts can overlap across stop status and late-risk indicators.</p>
      </div>
    </div>
  );
};
