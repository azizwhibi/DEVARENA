import { useId } from 'react';
import type { SkillHistoryPoint } from '@/lib/skills/types';

export function HistoryChart({
  history,
  label,
}: {
  history: SkillHistoryPoint[];
  label: string;
}) {
  const id = useId().replace(/:/g, '');
  const points = [...history].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );
  if (points.length < 2)
    return (
      <div className="ui-empty">
        <strong>No trend available yet</strong>
        <span>Two recorded assessments are needed to show a trend.</span>
      </div>
    );
  const coordinates = points
    .map(
      (p, i) =>
        `${40 + (i * 620) / (points.length - 1)},${190 - Math.max(0, Math.min(100, p.levelScore)) * 1.6}`,
    )
    .join(' ');
  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox="0 0 700 230"
        role="img"
        aria-label={label}
        style={{ width: '100%', height: 'auto' }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#8B5CF6" stopOpacity=".22" />
            <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((n) => (
          <g key={n}>
            <line
              x1="40"
              x2="660"
              y1={190 - n * 1.6}
              y2={190 - n * 1.6}
              stroke="#252C3A"
              strokeDasharray="3 5"
            />
            <text x="0" y={194 - n * 1.6} fill="#A1AABD" fontSize="11">
              {n}
            </text>
          </g>
        ))}
        <polygon
          points={`40,190 ${coordinates} 660,190`}
          fill={`url(#${id})`}
        />
        <polyline
          points={coordinates}
          fill="none"
          stroke="#A78BFA"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={p.recordedAt + i}
            cx={40 + (i * 620) / (points.length - 1)}
            cy={190 - Math.max(0, Math.min(100, p.levelScore)) * 1.6}
            r="3"
            fill="#C4B5FD"
          >
            <title>
              {new Date(p.recordedAt).toLocaleDateString('en-US')}:{' '}
              {p.levelScore}%
            </title>
          </circle>
        ))}
        <text x="40" y="222" fill="#A1AABD" fontSize="11">
          {new Date(points[0].recordedAt).toLocaleDateString('en-US')}
        </text>
        <text x="660" y="222" textAnchor="end" fill="#A1AABD" fontSize="11">
          {new Date(points.at(-1)!.recordedAt).toLocaleDateString('en-US')}
        </text>
      </svg>
      <figcaption className="sr-only">
        <ul>
          {points.map((p, i) => (
            <li key={i}>
              {new Date(p.recordedAt).toLocaleDateString('en-US')}:{' '}
              {p.levelScore}%
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
