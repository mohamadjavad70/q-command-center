// src/components/WorldMap.tsx
// نقشه جهان واقعی با Natural Earth projection + داده TopoJSON
// شورای نور: داوینچی (پروجکشن زیبا) + نقشه‌بردار (داده‌های دقیق) + جابز (UX ساده)

import { useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath, geoGraticule } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – world-atlas ships .json files without tsc-friendly declaration
import worldData from 'world-atlas/countries-110m.json';

// ── تعریف نوع نود ──
export interface MapNode {
  id: string;
  name: string;
  lat: number;
  lon: number;
  color: string;
  users: number;
  status?: 'online' | 'warning' | 'offline';
}

interface Props {
  nodes?: MapNode[];
  className?: string;
  onNodeClick?: (node: MapNode) => void;
}

const VIEW_W = 960;
const VIEW_H = 500;

// ── رنگ‌بندی قاره‌ها بر اساس آیدی عددی ISO 3166-1 ──
// گروه‌بندی ساده: همه کشورها رنگ پایه دریافت می‌کنند ولی نودهای QNet برجسته می‌شوند
const LAND_FILL   = '#0e4530';
const LAND_STROKE = 'rgba(20,184,166,0.25)';
const BORDER      = 'rgba(20,184,166,0.12)';
const OCEAN       = '#020c16';
const GRATICULE   = 'rgba(59,130,246,0.07)';

export default function WorldMap({ nodes = [], className = '', onNodeClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { landPath, borderPath, graticulePath, spherePath, projection } = useMemo(() => {
    const proj = geoNaturalEarth1()
      .scale(155)
      .translate([VIEW_W / 2, VIEW_H / 2]);

    const pathGen = geoPath().projection(proj);

    const topo = worldData as unknown as Topology<{
      land: GeometryCollection;
      countries: GeometryCollection;
    }>;

    // زمین (یک شکل ادغام‌شده)
    const land = feature(topo, topo.objects.land);
    // مرزها (فقط خطوط مشترک بین کشورها)
    const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);
    // شبکه مختصات
    const graticule = geoGraticule()();
    // کره کامل (برای배景اقیانوس)
    const sphere: GeoJSON.Sphere = { type: 'Sphere' };

    return {
      landPath:      pathGen(land)     ?? '',
      borderPath:    pathGen(borders)  ?? '',
      graticulePath: pathGen(graticule) ?? '',
      spherePath:    pathGen(sphere)   ?? '',
      projection:    proj,
    };
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}
         style={{ background: OCEAN }}>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-full"
        style={{ display: 'block' }}
      >
        <defs>
          {/* هاله نور روی نودها */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* گرادیان اقیانوس */}
          <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#041828" />
            <stop offset="100%" stopColor={OCEAN} />
          </radialGradient>
        </defs>

        {/* ── اقیانوس ── */}
        <path d={spherePath} fill="url(#oceanGrad)" />

        {/* ── شبکه طول و عرض ── */}
        <path d={graticulePath} fill="none" stroke={GRATICULE} strokeWidth={0.4} />

        {/* ── خطوط ساحلی (زمین) ── */}
        <path d={landPath} fill={LAND_FILL} stroke={LAND_STROKE} strokeWidth={0.6} />

        {/* ── مرزهای کشورها ── */}
        <path d={borderPath} fill="none" stroke={BORDER} strokeWidth={0.4} />

        {/* ── نودهای QNet ── */}
        {nodes.map((node) => {
          const coords = projection([node.lon, node.lat]);
          if (!coords) return null;
          const [x, y] = coords;
          const isHov = hovered === node.id;
          const isWarn = node.status === 'warning';

          return (
            <g
              key={node.id}
              onClick={() => onNodeClick?.(node)}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
              filter="url(#glow)"
            >
              {/* رینگ پالس */}
              <circle cx={x} cy={y} r={isHov ? 16 : 12} fill="none"
                stroke={node.color} strokeWidth={isHov ? 1.5 : 1} opacity={0.35}>
                <animate attributeName="r"
                  values={isHov ? '10;18;10' : '6;14;6'}
                  dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity"
                  values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* رینگ هشدار */}
              {isWarn && (
                <circle cx={x} cy={y} r={8}
                  fill="none" stroke="#fbbf24" strokeWidth={1.8} opacity={0.9}>
                  <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              {/* هسته */}
              <circle cx={x} cy={y} r={isHov ? 6 : 4.5}
                fill={node.color} stroke="rgba(255,255,255,0.85)" strokeWidth={1} />

              {/* برچسب */}
              {isHov && (
                <g>
                  <rect x={x + 9} y={y - 18} width={90} height={28}
                    rx={4} fill="rgba(0,6,18,0.92)"
                    stroke={node.color} strokeWidth={0.7} />
                  <text x={x + 14} y={y - 6} fontSize={8}
                    fill={node.color} fontFamily="monospace" fontWeight="bold">
                    {node.name}
                  </text>
                  <text x={x + 14} y={y + 5} fontSize={7.5}
                    fill="rgba(148,163,184,0.9)" fontFamily="monospace">
                    {node.users.toLocaleString()} users
                  </text>
                </g>
              )}

              {/* آیدی کوچک */}
              {!isHov && (
                <text x={x + 7} y={y + 3} fontSize={7}
                  fill={node.color} fontFamily="monospace" opacity={0.75}>
                  {node.id}
                </text>
              )}
            </g>
          );
        })}

        {/* ── خط مرز کره ── */}
        <path d={spherePath} fill="none"
          stroke="rgba(59,130,246,0.25)" strokeWidth={1} />
      </svg>

      {/* ── راهنما ── */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        {[
          { color: '#10b981', label: 'Online' },
          { color: '#fbbf24', label: 'Warning' },
          { color: '#ef4444', label: 'Offline' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
            <span className="text-[9px] font-mono text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      {/* ── تایتل ── */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-[0.3em] text-blue-400/40 font-mono pointer-events-none">
        Natural Earth · 110m Resolution
      </div>
    </div>
  );
}
