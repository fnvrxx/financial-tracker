"use client";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  total: number;
  centerLabel?: string;
  size?: number;
}

export default function DonutChart({ segments, total, centerLabel, size = 200 }: Props) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 28;

  let cumulativePercent = 0;

  const validSegments = segments.filter((s) => s.value > 0);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox="0 0 200 200" className="transform -rotate-90">
        {/* Background circle */}
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#f1f0ff" strokeWidth={strokeWidth} />

        {validSegments.map((seg, i) => {
          const percent = total > 0 ? (seg.value / total) * 100 : 0;
          const dashArray = (percent / 100) * circumference;
          const dashOffset = -(cumulativePercent / 100) * circumference;
          cumulativePercent += percent;

          return (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashArray} ${circumference - dashArray}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="donut-segment transition-all duration-700"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          );
        })}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] text-gray-400 font-medium">Total</span>
        <span className="text-xl font-bold text-gray-900 font-display">
          {centerLabel || `Rp ${(total / 1000).toFixed(0)}K`}
        </span>
      </div>
    </div>
  );
}
