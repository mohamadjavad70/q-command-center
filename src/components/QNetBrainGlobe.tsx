// src/components/QNetBrainGlobe.tsx
// Q-Brain Globe — تلفیق Three.js Neural Map + Canvas 2D Realistic Globe
// شورای نور: داوینچی (بصری) + تسلا (کارایی) + ادیسون (خروجی عملی)

import { useEffect, useRef } from 'react';

export interface GlobeNode {
  id: string;
  name: string;
  lat: number;
  lon: number;
  color: string;        // CSS hex, e.g. '#3b82f6'
  users: number;
  status?: 'online' | 'warning' | 'offline';
}

export interface LivePacket {
  id: string;
  from: string;   // node id
  to: string;     // node id
  startTime: number;
  duration: number; // ms
  color?: string;
}

/** وزن یک edge از GraphMemory — برای نمایش رنگ/ضخامت اتصال */
export interface EdgeWeight {
  from: string;   // node id
  to: string;     // node id
  score: number;  // 0..1 (نتیجه GraphMemory.score)
}

/** داده‌های پیش‌بینی‌کننده از SSE edge_predict — شامل trend و stability */
export interface PredictedEdge {
  from: string;       // node id
  to: string;         // node id
  score: number;      // 0..1 (predictScore)
  trend: number;      // ms: مثبت = تأخیر در حال افزایش
  stability: number;  // 0..1
  latencyEMA: number; // ms
}

// ── Land masses as simplified polygons [lat, lon] ──
// هر polygon در بازه ۱۸۰ درجه طولی می‌ماند تا از wraparound جلوگیری شود
const LANDS: number[][][] = [
  // North America
  [[70,-140],[72,-120],[70,-105],[65,-85],[60,-75],[47,-53],[44,-66],[38,-74],
   [30,-80],[25,-80],[16,-87],[9,-79],[10,-61],[18,-67],[22,-80],[30,-88],
   [38,-89],[42,-82],[47,-70],[45,-60],[52,-56],[58,-65],[65,-72],[70,-90],
   [72,-100],[73,-120],[70,-140]],
  // Alaska
  [[60,-165],[65,-168],[70,-160],[71,-155],[68,-140],[62,-135],[58,-140],[55,-160],[58,-168],[60,-165]],
  // Greenland
  [[76,-68],[80,-55],[83,-45],[82,-30],[78,-20],[70,-22],[65,-40],[63,-50],[65,-60],[72,-68],[76,-68]],
  // South America
  [[12,-71],[9,-60],[4,-53],[0,-50],[-5,-35],[-15,-39],[-23,-45],[-33,-53],
   [-42,-65],[-55,-68],[-54,-62],[-48,-55],[-35,-50],[-20,-40],[-10,-37],
   [0,-48],[5,-52],[10,-62],[12,-71]],
  // Europe
  [[71,28],[65,26],[58,22],[55,14],[54,10],[55,8],[58,5],[52,-10],[50,-5],
   [46,2],[44,8],[42,14],[40,20],[38,26],[42,30],[46,30],[50,35],[56,40],
   [60,38],[62,30],[66,25],[70,28],[71,28]],
  // Africa
  [[37,-5],[37,10],[33,15],[30,32],[20,42],[10,45],[0,42],[-10,38],
   [-22,14],[-34,25],[-35,20],[-30,16],[-12,14],[0,5],[8,-5],[16,-15],
   [24,-15],[32,-5],[37,-5]],
  // Indian Subcontinent
  [[28,66],[22,68],[10,76],[8,80],[12,80],[22,88],[26,88],[30,78],[28,66]],
  // Asia West (Europe to 95°E)
  [[72,42],[68,55],[60,60],[55,60],[50,58],[42,52],[38,48],[35,36],[32,36],
   [26,57],[20,58],[15,45],[25,57],[30,50],[35,50],[40,52],[48,58],[55,62],
   [60,68],[68,72],[75,82],[80,90],[72,95],[65,95],[55,85],[50,80],[42,80],
   [38,75],[30,70],[24,65],[20,60],[15,50],[18,45],[24,38],[32,35],[40,48],
   [48,52],[58,60],[68,68],[75,80],[80,82],[78,90],[72,92],[65,95],[72,42]],
  // Asia East (92°E to 145°E)
  [[72,95],[65,100],[55,110],[48,118],[42,128],[36,126],[30,120],[22,113],
   [18,110],[10,104],[5,100],[0,104],[-5,104],[-8,115],[-10,120],[-5,130],
   [0,130],[5,138],[10,140],[35,138],[38,130],[42,122],[48,120],[55,130],
   [60,130],[65,120],[70,110],[76,95],[80,88],[72,95]],
  // Australia
  [[-15,128],[-13,130],[-12,136],[-14,140],[-18,142],[-26,153],[-30,153],
   [-34,151],[-40,143],[-38,140],[-35,138],[-32,128],[-24,120],[-16,123],[-15,128]],
  // UK + Ireland
  [[60,-1],[55,0],[51,1],[50,-2],[51,-5],[54,-6],[56,-5],[58,-3],[60,-1]],
  // Japan (simplified)
  [[41,140],[45,141],[43,143],[40,141],[34,132],[35,136],[41,140]],
  // New Zealand
  [[-34,172],[-36,175],[-41,175],[-46,168],[-44,168],[-41,173],[-37,175],[-34,172]],
];

interface Props {
  nodes: GlobeNode[];
  livePackets?: LivePacket[];
  edgeWeights?: EdgeWeight[];      // از SSE graph_edges — وزن‌های GraphMemory
  predictedEdges?: PredictedEdge[]; // از SSE edge_predict — پیش‌بینی مسیر
  className?: string;
}

export default function QNetBrainGlobe({ nodes, livePackets = [], edgeWeights = [], predictedEdges = [], className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const nodesRef  = useRef(nodes);
  const packetsRef = useRef(livePackets);
  const edgeWeightsRef = useRef(edgeWeights);
  const predictedEdgesRef = useRef(predictedEdges);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { packetsRef.current = livePackets; }, [livePackets]);
  useEffect(() => { edgeWeightsRef.current = edgeWeights; }, [edgeWeights]);
  useEffect(() => { predictedEdgesRef.current = predictedEdges; }, [predictedEdges]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const state = {
      rotX: 0.3,
      rotY: Math.PI,      // ← شروع از نیمکره شرقی (تهران / آسیا)
      autoRotate: true,
      dragStart: null as { x: number; y: number } | null,
      dragRotStart: { x: 0, y: 0 },
    };

    let W = 0, H = 0, cx = 0, cy = 0, R = 0;

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      W = parent.clientWidth;
      H = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = H / 2;
      R  = Math.min(W, H) * 0.38;
    }
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener('resize', resize);

    // ── پروجکشن lat/lon → canvas XY ──
    function project(lat: number, lon: number) {
      const phi   = (90 - lat) * Math.PI / 180;
      const theta = lon * Math.PI / 180 + state.rotY;

      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);

      const cosX = Math.cos(state.rotX);
      const sinX = Math.sin(state.rotX);
      const y2   = y * cosX - z * sinX;
      const z2   = y * sinX + z * cosX;

      return {
        x: cx + x * R,
        y: cy - y2 * R,
        z2,
        front: z2 < 0,   // z2 < 0 → رو به بیننده
      };
    }

    // CSS hex → 'r,g,b'
    function rgb(hex: string) {
      const h = hex.startsWith('#') ? hex.slice(1) : hex;
      const n = parseInt(h.length === 3
        ? h.split('').map(c => c + c).join('')
        : h, 16);
      return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    }

    // ── حلقه انیمیشن ──
    function frame(t: number) {
      if (state.autoRotate) state.rotY += 0.0015;

      ctx.clearRect(0, 0, W, H);

      // ۱. هاله محیطی
      const bg = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 2);
      bg.addColorStop(0, 'rgba(34,211,238,0.05)');
      bg.addColorStop(0.5, 'rgba(59,130,246,0.025)');
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── کلیپ به دایره کره ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // ۲. اقیانوس
      const ocean = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, 0, cx, cy, R);
      ocean.addColorStop(0, '#051528');
      ocean.addColorStop(1, '#020b12');
      ctx.fillStyle = ocean;
      ctx.fillRect(cx - R - 2, cy - R - 2, R * 2 + 4, R * 2 + 4);

      // ۳. خطوط شبکه
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (let lo = -180; lo <= 180; lo += 5) {
          const p = project(lat, lo);
          lo === -180 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(59,130,246,0.05)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      for (let lo = -180; lo < 180; lo += 30) {
        ctx.beginPath();
        for (let lat = -85; lat <= 85; lat += 5) {
          const p = project(lat, lo);
          lat === -85 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(59,130,246,0.05)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // ۴. قاره‌ها
      LANDS.forEach(land => {
        if (land.length < 3) return;
        ctx.beginPath();
        land.forEach(([la, lo], i) => {
          const p = project(la, lo);
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(14,64,46,0.92)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,184,166,0.22)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });

      ctx.restore();   // ← رفع کلیپ

      // ۵. حاشیه کره
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59,130,246,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ۶. جو (atmosphere)
      const atm = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.38);
      atm.addColorStop(0, 'rgba(34,211,238,0.13)');
      atm.addColorStop(0.45, 'rgba(59,130,246,0.06)');
      atm.addColorStop(1, 'transparent');
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.38, 0, Math.PI * 2);
      ctx.fill();

      // ۷. امواج مغزی (brain waves) — رینگ‌های ارتعاشی
      for (let i = 1; i <= 4; i++) {
        const wR = R + 4 + Math.sin(t * 0.0008 + i * 1.4) * 8;
        ctx.beginPath();
        ctx.arc(cx, cy, wR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34,211,238,${0.16 - i * 0.03})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ۸. مش عصبی (دایره‌های بزرگ / great circles)
      for (let i = 0; i < 8; i++) {
        const tiltLat = ((i * 53 + 15) % 160) - 80;
        ctx.beginPath();
        for (let lo = -180; lo <= 180; lo += 6) {
          const p = project(tiltLat, lo);
          lo === -180 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = `rgba(59,130,246,${0.06 + (i % 3) * 0.02})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // ۹. ارتباطات عصبی بین نودها + وزن GraphMemory + پالس داده
      const pts = nodesRef.current.map(n => project(n.lat, n.lon));
      const ns   = nodesRef.current;

      // map سریع از "fromId→toId" به score برای edge weight visualization
      const weightMap = new Map<string, number>();
      edgeWeightsRef.current.forEach(ew => {
        weightMap.set(`${ew.from}→${ew.to}`, ew.score);
        weightMap.set(`${ew.to}→${ew.from}`, ew.score); // bidirectional
      });

      // map پیش‌بینی از edge_predict SSE — score دقیق‌تر با trend
      const predictMap = new Map<string, PredictedEdge>();
      predictedEdgesRef.current.forEach(pe => {
        predictMap.set(`${pe.from}→${pe.to}`, pe);
        predictMap.set(`${pe.to}→${pe.from}`, pe); // bidirectional
      });
      const hasPredictions = predictMap.size > 0;

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const bothFront = a.front && b.front;
          const oneFront  = a.front || b.front;
          if (!oneFront) continue;

          const alpha = bothFront ? 0.35 : 0.1;

          // وزن GraphMemory — اگر موجود باشد، edge پررنگ‌تر و ضخیم‌تر رندر می‌شود
          const edgeKey = `${ns[i].id}→${ns[j].id}`;
          // اولویت: predictScore از edge_predict SSE | سپس: graph_edges | خنثی (0.5)
          const pred      = predictMap.get(edgeKey);
          const memScore  = pred?.score ?? weightMap.get(edgeKey) ?? 0.5;
          const isTrending = pred ? pred.trend > 50 : false;  // latency در حال بدتر شدن

          // رنگ edge:
          // داده‌های پیش‌بینی: سبز(خوب) → زرد(متوسط) → قرمز(ضعیف)
          // trending bad: نارنجی (هشدار افت افتادن)
          let edgeR: number, edgeG: number, edgeB: number;
          if (isTrending) {
            // نارنجی/طلایی = هشدار: latency trending bad
            edgeR = 255;
            edgeG = 140;
            edgeB = 0;
          } else if (hasPredictions) {
            // رنگ‌بندی از predictScore: سبز → زرد → قرمز
            edgeR = Math.round(255 * Math.max(0, 1 - memScore * 1.4));
            edgeG = Math.round(211 * memScore);
            edgeB = Math.round(100 + 138 * memScore);
          } else {
            // حالت پیش‌فرض (graph_edges یا بدون داده): آبی-سبز
            edgeR = Math.round(255 * (1 - memScore));
            edgeG = Math.round(211 * memScore);
            edgeB = Math.round(238 * (0.4 + memScore * 0.6));
          }
          const memAlpha = alpha * (0.5 + memScore * 0.9);
          const memWidth = bothFront ? (0.5 + memScore * 2.5) : 0.4;

          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const dx = b.x - a.x,       dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) continue;
          const bv = dist * 0.13;
          const nx = -dy / dist * bv,  ny = dx / dist * bv;

          // خط اتصال — رنگ و ضخامت بر اساس GraphMemory score
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx + nx, my + ny, b.x, b.y);
          const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          g.addColorStop(0, `rgba(${edgeR},${edgeG},${edgeB},${memAlpha})`);
          g.addColorStop(1, `rgba(${edgeR},${edgeG},${edgeB},${memAlpha})`);
          ctx.strokeStyle = g;
          ctx.lineWidth = memWidth;
          ctx.stroke();

          // پالس سفرکننده (بسته داده)
          const pulse = (t * 0.00035 + i * 0.28 + j * 0.14) % 1;
          const px = (1 - pulse) ** 2 * a.x + 2 * (1 - pulse) * pulse * (mx + nx) + pulse ** 2 * b.x;
          const py = (1 - pulse) ** 2 * a.y + 2 * (1 - pulse) * pulse * (my + ny) + pulse ** 2 * b.y;
          const pg = ctx.createRadialGradient(px, py, 0, px, py, 5);
          pg.addColorStop(0, `rgba(34,211,238,${alpha * 2.5})`);
          pg.addColorStop(1, 'transparent');
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ۹.۵. بسته‌های زنده Live Packets (packet_flow از SSE)
      const now = performance.now();
      packetsRef.current.forEach(pkt => {
        const fromIdx = ns.findIndex(n => n.id === pkt.from);
        const toIdx   = ns.findIndex(n => n.id === pkt.to);
        if (fromIdx < 0 || toIdx < 0) return;

        const progress = Math.min((now - pkt.startTime) / pkt.duration, 1);
        const a = pts[fromIdx], b = pts[toIdx];
        if (!a.front && !b.front) return;

        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;
        const bv = dist * 0.18;
        const nx2 = -dy / dist * bv, ny2 = dx / dist * bv;

        // مسیر روشن برای packet زنده
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx + nx2, my + ny2, b.x, b.y);
        ctx.strokeStyle = `rgba(34,211,238,0.55)`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // موقعیت packet روی مسیر
        const p2 = progress;
        const pkx = (1-p2)**2 * a.x + 2*(1-p2)*p2*(mx+nx2) + p2**2 * b.x;
        const pky = (1-p2)**2 * a.y + 2*(1-p2)*p2*(my+ny2) + p2**2 * b.y;

        // هسته درخشان
        const pkColor = pkt.color ?? '#22d3ee';
        const pkRgb = rgb(pkColor);
        const glo = ctx.createRadialGradient(pkx, pky, 0, pkx, pky, 9);
        glo.addColorStop(0, `rgba(${pkRgb},0.95)`);
        glo.addColorStop(0.4, `rgba(${pkRgb},0.4)`);
        glo.addColorStop(1, 'transparent');
        ctx.fillStyle = glo;
        ctx.beginPath();
        ctx.arc(pkx, pky, 9, 0, Math.PI * 2);
        ctx.fill();

        // هسته سفید مرکزی
        ctx.beginPath();
        ctx.arc(pkx, pky, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });

      // ۱۰. نودهای شبکه
      ns.forEach((n, i) => {
        const p = pts[i];
        const fa = p.front ? 1 : 0.14;
        const pr = 4 + Math.sin(t * 0.003 + i * 0.85) * 1.8;
        const rc = rgb(n.color);

        // هاله نور
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr * 5);
        glow.addColorStop(0, `rgba(${rc},${fa * 0.45})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr * 5, 0, Math.PI * 2);
        ctx.fill();

        // هسته
        ctx.globalAlpha = fa;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        // رینگ هشدار
        if (n.status === 'warning') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, pr + 3 + Math.sin(t * 0.005 + i) * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(251,191,36,${fa * 0.85})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });

      // ۱۱. ذرات معلق (floating particles)
      for (let i = 0; i < 60; i++) {
        const angle = (t * 0.00012 + i * 1.618) % (Math.PI * 2);
        const d  = R * (0.62 + 0.44 * Math.sin(i * 2.1 + t * 0.0008));
        const px = cx + Math.cos(angle) * d;
        const py = cy + Math.sin(angle) * d * 0.68;
        const sz = 0.4 + Math.sin(t * 0.004 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${0.07 + Math.sin(t * 0.003 + i) * 0.05})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(frame);
    }

    // ── تعامل موس/لمس ──
    function onDown(e: MouseEvent | TouchEvent) {
      const src = 'touches' in e ? (e as TouchEvent).touches[0] : e as MouseEvent;
      state.dragStart    = { x: src.clientX, y: src.clientY };
      state.dragRotStart = { x: state.rotY, y: state.rotX };
      state.autoRotate   = false;
    }
    function onMove(e: MouseEvent | TouchEvent) {
      if (!state.dragStart) return;
      const src = 'touches' in e ? (e as TouchEvent).touches[0] : e as MouseEvent;
      state.rotY = state.dragRotStart.x + (src.clientX - state.dragStart.x) * 0.006;
      state.rotX = Math.max(-0.75, Math.min(0.75,
        state.dragRotStart.y + (src.clientY - state.dragStart.y) * 0.006));
    }
    function onUp() {
      state.dragStart = null;
      setTimeout(() => { state.autoRotate = true; }, 3000);
    }

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    canvas.addEventListener('touchstart', onDown as EventListener, { passive: true });
    canvas.addEventListener('touchmove',  onMove as EventListener, { passive: true });
    canvas.addEventListener('touchend',   onUp);

    animRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown as EventListener);
      canvas.removeEventListener('touchmove', onMove as EventListener);
      canvas.removeEventListener('touchend', onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`cursor-grab active:cursor-grabbing ${className}`}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
