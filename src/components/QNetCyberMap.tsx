// src/components/QNetCyberMap.tsx
// گلوب سه‌بُعدی QNet — Meteor Visual Core
// شورای نور: داوینچی (زیبایی) + تسلا (کارایی) + برنامه‌نویس خبره (پیاده‌سازی)

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// ---- داده‌های نودهای شبکه جهانی ----
export interface NetworkNode {
  id: string;
  name: string;
  lat: number;
  lon: number;
  color: number;
  users: number;
  token: string;
  status?: 'online' | 'warning' | 'offline';
}

const DEFAULT_NODES: NetworkNode[] = [
  { id: 'Q1',  name: 'USA (Seattle)',          lat:  47,    lon: -122,   color: 0x3b82f6, users: 1560, token: 'OAS',  status: 'online' },
  { id: 'Q2',  name: 'Europe (London)',         lat:  51,    lon:   0,    color: 0x60a5fa, users: 3420, token: 'KAS',  status: 'online' },
  { id: 'Q3',  name: 'Asia (Tokyo)',            lat:  35,    lon: 139,    color: 0x3b82f6, users: 5100, token: 'IDS',  status: 'online' },
  { id: 'Q4',  name: 'Middle East (Tehran)',    lat:  35.7,  lon:  51.4,  color: 0x00f2ff, users: 2450, token: 'KAS',  status: 'online' },
  { id: 'Q5',  name: 'Brazil (São Paulo)',      lat: -23.5,  lon: -46.6,  color: 0x3b82f6, users: 1280, token: 'MAV',  status: 'online' },
  { id: 'Q6',  name: 'Australia (Sydney)',      lat: -33.8,  lon: 151.2,  color: 0x60a5fa, users: 1450, token: 'OAS',  status: 'online' },
  { id: 'Q7',  name: 'Africa (Cairo)',          lat:  30,    lon:  31,    color: 0x3b82f6, users: 1890, token: 'WAV',  status: 'warning' },
  { id: 'Q8',  name: 'Russia (Moscow)',         lat:  55.7,  lon:  37.6,  color: 0x60a5fa, users: 3100, token: 'IDS',  status: 'online' },
  { id: 'Q9',  name: 'India (Mumbai)',          lat:  19,    lon:  72.8,  color: 0x00f2ff, users: 4600, token: 'ODS',  status: 'online' },
  { id: 'Q10', name: 'Singapore',               lat:   1.3,  lon: 103.8,  color: 0x3b82f6, users: 3250, token: 'OAS',  status: 'online' },
  { id: 'Q11', name: 'Scandinavia',             lat:  60,    lon:  10,    color: 0xffffff, users:  580, token: 'KAS',  status: 'online' },
  { id: 'Q12', name: 'South Africa',            lat: -33.9,  lon:  18.4,  color: 0x60a5fa, users: 1600, token: 'MAV',  status: 'online' },
];

interface Props {
  nodes?: NetworkNode[];
  onNodeClick?: (node: NetworkNode) => void;
  className?: string;
}

function latLonToVec3(lat: number, lon: number, r = 5.12): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

export default function QNetCyberMap({ nodes = DEFAULT_NODES, onNodeClick, className = '' }: Props) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const sceneRef  = useRef<{
    renderer: THREE.WebGLRenderer;
    group: THREE.Group;
    camera: THREE.PerspectiveCamera;
    meshes: THREE.Mesh[];
    meteors: { curve: THREE.QuadraticBezierCurve3; dots: THREE.Mesh[]; t: number; speed: number }[];
    nodeRings: THREE.Mesh[];
    rafId: number;
  } | null>(null);

  const isDragging = useRef(false);
  const prevMouse  = useRef({ x: 0, y: 0 });
  const downPos    = useRef({ x: 0, y: 0 });

  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const totalUsers = nodes.reduce((s, n) => s + n.users, 0);

  // ---- init Three.js ----
  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.z = 13.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const group    = new THREE.Group();
    scene.add(group);

    // ── Ambient light ──
    scene.add(new THREE.AmbientLight(0x1a3a5c, 0.8));
    const dirLight = new THREE.DirectionalLight(0x3b82f6, 0.5);
    dirLight.position.set(10, 10, 10);
    scene.add(dirLight);

    // ── کُره اصلی ──
    const globeGeo = new THREE.SphereGeometry(5, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({ color: 0x000814, transparent: true, opacity: 0.85, shininess: 50 });
    group.add(new THREE.Mesh(globeGeo, globeMat));

    // ── نقشه نقطه‌ای ──
    const dotGeo = new THREE.CircleGeometry(0.025, 6);
    for (let i = 0; i < 5500; i++) {
      const lat = (Math.random() - 0.5) * 180;
      const lon = (Math.random() - 0.5) * 360;
      const isLand =
        Math.abs(lat) < 70 &&
        ((lon > -130 && lon < -30) ||
         (lon > -20  && lon < 50)  ||
         (lon > 60   && lon < 150));
      if (!isLand && Math.random() > 0.18) continue;
      const pos = latLonToVec3(lat, lon, 5.05);
      const m   = new THREE.Mesh(
        dotGeo,
        new THREE.MeshBasicMaterial({ color: isLand ? 0x3b82f6 : 0x1e3a8a, transparent: true, opacity: isLand ? 0.55 : 0.18 }),
      );
      m.position.copy(pos);
      m.lookAt(new THREE.Vector3(0, 0, 0));
      group.add(m);
    }

    // ── نودهای شبکه ──
    const meshes:     THREE.Mesh[] = [];
    const nodeRings:  THREE.Mesh[] = [];

    nodes.forEach(n => {
      const pos = latLonToVec3(n.lat, n.lon);

      // مکعب سرور
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshBasicMaterial({ color: n.color }),
      );
      marker.position.copy(pos);
      marker.lookAt(new THREE.Vector3(0, 0, 0));
      (marker as any).__nodeData = n;
      group.add(marker);
      meshes.push(marker);

      // هاله
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.38, 32),
        new THREE.MeshBasicMaterial({ color: n.color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
      );
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      group.add(ring);
      nodeRings.push(ring);
    });

    // ── مسیرهای شهاب‌سنگ ──
    type Meteor = { curve: THREE.QuadraticBezierCurve3; dots: THREE.Mesh[]; t: number; speed: number };
    const meteors: Meteor[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const next  = (i + 1 + Math.floor(Math.random() * 3)) % nodes.length;
      const start = latLonToVec3(nodes[i].lat,    nodes[i].lon);
      const end   = latLonToVec3(nodes[next].lat, nodes[next].lon);
      const mid   = start.clone().lerp(end, 0.5).normalize().multiplyScalar(6.5);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

      // خط ثابت کم‌رنگ
      const pts = curve.getPoints(50);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      group.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.12 })));

      // دنباله شهاب
      const dots: THREE.Mesh[] = [];
      const mGroup = new THREE.Group();
      for (let j = 0; j < 8; j++) {
        const sz  = 0.055 * (1 - j / 8);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(sz, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 1 - j / 8 }),
        );
        mGroup.add(dot);
        dots.push(dot);
      }
      group.add(mGroup);
      meteors.push({ curve, dots, t: Math.random(), speed: 0.006 + Math.random() * 0.01 });
    }

    // ── raycaster ──
    const raycaster = new THREE.Raycaster();
    const mouse2    = new THREE.Vector2();

    function handleMouseDown(e: MouseEvent) {
      isDragging.current = true;
      prevMouse.current  = { x: e.clientX, y: e.clientY };
      downPos.current    = { x: e.clientX, y: e.clientY };
    }
    function handleMouseUp(e: MouseEvent) {
      const dx = Math.abs(e.clientX - downPos.current.x);
      const dy = Math.abs(e.clientY - downPos.current.y);
      if (dx < 5 && dy < 5) {
        // کلیک — bounding box
        const rect = el.getBoundingClientRect();
        mouse2.x = ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
        mouse2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse2, camera);
        const hits = raycaster.intersectObjects(meshes);
        if (hits.length > 0) {
          const nd: NetworkNode = (hits[0].object as any).__nodeData;
          setSelectedNode(nd);
          onNodeClick?.(nd);
        }
      }
      isDragging.current = false;
    }
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      group.rotation.y += (e.clientX - prevMouse.current.x) * 0.005;
      group.rotation.x += (e.clientY - prevMouse.current.y) * 0.005;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    }

    el.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup',   handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    // ── انیمیشن ──
    let rafId = 0;
    function animate() {
      rafId = requestAnimationFrame(animate);
      if (!isDragging.current) group.rotation.y += 0.0013;

      meteors.forEach(m => {
        m.t += m.speed;
        if (m.t > 1) m.t = 0;
        for (let j = 0; j < m.dots.length; j++) {
          const t2  = Math.max(0, m.t - j * 0.015);
          m.dots[j].position.copy(m.curve.getPoint(t2));
        }
      });

      const pulse = 1 + Math.sin(Date.now() * 0.007) * 0.38;
      nodeRings.forEach(r => {
        r.scale.set(pulse, pulse, pulse);
        (r.material as THREE.MeshBasicMaterial).opacity = 0.5 - (pulse - 1) * 0.9;
      });

      renderer.render(scene, camera);
    }
    animate();

    // ── resize ──
    function onResize() {
      if (!mountRef.current) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    }
    window.addEventListener('resize', onResize);

    sceneRef.current = { renderer, group, camera, meshes, meteors, nodeRings, rafId };

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup',   handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize',    onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      {/* Three.js mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* scan line */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-full h-0.5 opacity-60"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.6), transparent)',
          animation: 'scanMove 10s linear infinite',
        }}
      />

      {/* اطلاعات نود انتخاب‌شده */}
      {selectedNode && (
        <div className="absolute top-4 right-4 glass-panel rounded-xl p-4 text-xs border border-blue-500/30 min-w-[200px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-blue-400 font-bold">{selectedNode.id}</span>
            <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white text-sm">✕</button>
          </div>
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between"><span>منطقه:</span><span className="text-blue-300 font-bold">{selectedNode.name}</span></div>
            <div className="flex justify-between"><span>لود:</span><span className="text-emerald-400 font-mono">{selectedNode.users.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>پروتکل:</span><span className="text-white">{selectedNode.token}</span></div>
            <div className="flex justify-between"><span>وضعیت:</span>
              <span className={selectedNode.status === 'online' ? 'text-emerald-400' : selectedNode.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}>
                {selectedNode.status === 'online' ? '🟢 Online' : selectedNode.status === 'warning' ? '🟡 Warning' : '🔴 Offline'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* شمارنده کل */}
      <div className="absolute bottom-4 right-4 glass-panel rounded-xl p-3 text-right">
        <div className="text-2xl font-black text-white tabular-nums">{totalUsers.toLocaleString()}</div>
        <div className="text-[9px] text-blue-400 uppercase tracking-widest">Global Synchronized Cores</div>
      </div>

      {/* legend نودها */}
      <div className="absolute bottom-4 left-4 glass-panel rounded-xl p-3 max-h-48 overflow-y-auto w-56">
        <div className="text-[9px] font-bold text-blue-300 uppercase tracking-widest mb-2">Active Nodes</div>
        {nodes.map(n => (
          <div key={n.id} className="flex items-center justify-between text-[10px] py-0.5 border-b border-blue-900/20">
            <div className="flex items-center gap-1.5">
              <span style={{ background: `#${n.color.toString(16).padStart(6,'0')}` }} className="w-1.5 h-1.5 rounded-full inline-block" />
              <span className="text-slate-300 truncate max-w-[120px]">{n.name}</span>
            </div>
            <span className="text-blue-400 font-mono">{n.users}</span>
          </div>
        ))}
      </div>

      <style>{`@keyframes scanMove { from { top: -2px; } to { top: 100%; } }`}</style>
    </div>
  );
}

// export default nodes list for reuse
export { DEFAULT_NODES };
