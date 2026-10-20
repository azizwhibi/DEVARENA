'use client';
import React from 'react';
import { SkillProgress } from '@/lib/skills/types';
interface RadarChartProps {
    skills: SkillProgress[];
}
export const RadarChart: React.FC<RadarChartProps> = ({ skills }) => {
    const evaluated = skills.filter(skill => skill.levelScore !== null).slice(0, 6);
    if (evaluated.length < 3)
        return null;
    const size = 260;
    const center = size / 2;
    const radius = 90;
    const total = evaluated.length;
    const getCoordinates = (index: number, valueRatio: number) => {
        const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
        const x = center + radius * valueRatio * Math.cos(angle);
        const y = center + radius * valueRatio * Math.sin(angle);
        return { x, y };
    };
    // Polygon points
    const points = evaluated.map((s, i) => {
        const ratio = Math.max(0, Math.min(100, s.levelScore ?? 0)) / 100;
        const { x, y } = getCoordinates(i, ratio);
        return `${x},${y}`;
    }).join(' ');
    return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg role="img" aria-label="Niveaux des comp?tences ?valu?es" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background webs */}
        {[0.25, 0.5, 0.75, 1.0].map((level) => {
            const webPoints = Array.from({ length: total }).map((_, i) => {
                const { x, y } = getCoordinates(i, level);
                return `${x},${y}`;
            }).join(' ');
            return (<polygon key={level} points={webPoints} fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1"/>);
        })}

        {/* Axis lines */}
        {Array.from({ length: total }).map((_, i) => {
            const { x, y } = getCoordinates(i, 1);
            return (<line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1"/>);
        })}

        {/* Data polygon */}
        <polygon points={points} fill="rgba(52, 211, 153, 0.08)" stroke="#34D399" strokeWidth="2"/>

        {/* Dots */}
        {evaluated.map((s, i) => {
            const ratio = Math.max(0, Math.min(100, s.levelScore ?? 0)) / 100;
            const { x, y } = getCoordinates(i, ratio);
            return (<circle key={i} cx={x} cy={y} r="4" fill="#34D399" stroke="#FFFFFF" strokeWidth="1.5"/>);
        })}

        {/* Labels */}
        {evaluated.map((s, i) => {
            const { x, y } = getCoordinates(i, 1.25);
            return (<text key={i} x={x} y={y} fill="#94A3B8" fontSize="9" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
              {s.name.length > 12 ? s.name.substring(0, 11) + '…' : s.name}
            </text>);
        })}
      </svg>
    </div>);
};
