import React, { useMemo } from "react";

export default function Histogram({ hist, bins, baseY, histHeight }) {
  const maxCount = useMemo(() => Math.max(1, ...hist), [hist]);

  return (
    <div className="px-2">
      <svg className="w-full" viewBox={`0 0 800 120`} role="img" aria-label="Histogram of bins">
        {/* baseline */}
        <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(148,163,184,0.5)" strokeWidth="2" />
        {hist.map((count, i) => {
          console.log("binsh ere", bins[0].x);
          const cx = bins[i].x;
          const barSpace = (bins[bins.length - 1].x - bins[0].x) / (bins.length - 1 || 1);
          const barWidth = Math.min(20, barSpace * 0.7);
          const h = (count / maxCount) * 80;
          const x = cx - barWidth / 2;
          const y = 100 - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={h}
                fill="url(#g)" stroke="none" />
              <text x={cx} y={112} fontSize="11" textAnchor="middle" fill="rgba(203,213,225,0.9)">
                {i}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.9)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0.6)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
