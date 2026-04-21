// src/pages/QCyberCommand.tsx
// Q-Brain Command Center — گلوب Canvas 2D + آمار زنده QNet + صدا + کنترل
// شورای نور: داوینچی (بصری) + جابز (UX) + تسلا (کارایی) + ابن‌سینا (آمار واقعی)

import { useState, useEffect, useRef, useCallback } from 'react';
import QNetBrainGlobe, { type GlobeNode, type LivePacket, type EdgeWeight, type PredictedEdge } from '@/components/QNetBrainGlobe';
import WorldMap from '@/components/WorldMap';
import { useVoiceEngine, COMMAND_PHRASES } from '@/hooks/useVoiceEngine';
import {
  Shield, Mic, Volume2, VolumeX, Activity, Zap, ShieldAlert,
  RefreshCw, Globe, Users, Wifi, WifiOff, Brain, Map,
} from 'lucide-react';

const SERVER = import.meta.env.VITE_QNET_SERVER ?? 'http://localhost:9900';

// ── نودهای شبکه QNet (با رنگ CSS) ──
const GLOBE_NODES: GlobeNode[] = [
  { id: 'Q1',  name: 'USA (Seattle)',        lat:  47,    lon: -122,   color: '#3b82f6', users: 1560, status: 'online'  },
  { id: 'Q2',  name: 'Europe (London)',       lat:  51,    lon:   0,    color: '#60a5fa', users: 3420, status: 'online'  },
  { id: 'Q3',  name: 'Asia (Tokyo)',          lat:  35,    lon: 139,    color: '#38bdf8', users: 5100, status: 'online'  },
  { id: 'Q4',  name: 'Tehran (Nucleus)',      lat:  35.7,  lon:  51.4,  color: '#22d3ee', users: 2450, status: 'online'  },
  { id: 'Q5',  name: 'Brazil (São Paulo)',    lat: -23.5,  lon: -46.6,  color: '#3b82f6', users: 1280, status: 'online'  },
  { id: 'Q6',  name: 'Australia (Sydney)',    lat: -33.8,  lon: 151.2,  color: '#60a5fa', users: 1450, status: 'online'  },
  { id: 'Q7',  name: 'Africa (Cairo)',        lat:  30,    lon:  31,    color: '#6366f1', users: 1890, status: 'warning' },
  { id: 'Q8',  name: 'Russia (Moscow)',       lat:  55.7,  lon:  37.6,  color: '#8b5cf6', users: 3100, status: 'online'  },
  { id: 'Q9',  name: 'India (Mumbai)',        lat:  19,    lon:  72.8,  color: '#f59e0b', users: 4600, status: 'online'  },
  { id: 'Q10', name: 'Singapore',             lat:   1.3,  lon: 103.8,  color: '#10b981', users: 3250, status: 'online'  },
  { id: 'Q11', name: 'Scandinavia',           lat:  60,    lon:  10,    color: '#94a3b8', users:  580, status: 'online'  },
  { id: 'Q12', name: 'South Africa',          lat: -33.9,  lon:  18.4,  color: '#14b8a6', users: 1600, status: 'online'  },
];

function StatCard({ label, value, color = '#60a5fa' }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-center">
      <div className="text-xl font-black font-mono leading-none" style={{ color }}>{value}</div>
      <div className="text-[8px] uppercase tracking-widest text-slate-500 mt-1">{label}</div>
    </div>
  );
}

const COMMANDS = [
  { id: 'get_stats',         label: 'دریافت آمار',     icon: Activity,    color: '#3b82f6' },
  { id: 'pause_simulation',  label: 'توقف شبیه‌سازی',  icon: ShieldAlert, color: '#f59e0b' },
  { id: 'resume_simulation', label: 'ادامه شبیه‌سازی', icon: Zap,         color: '#10b981' },
  { id: 'reset_stats',       label: 'بازنشانی آمار',   icon: RefreshCw,   color: '#ef4444' },
  { id: 'get_rl_table',      label: 'جدول RL',          icon: Brain,       color: '#a855f7' },
];

interface QNetStats {
  totalRequests:     number;
  allowed:           number;
  blocked:           number;
  honeypotCaptures:  number;
  rlStates:          number;
  rlExplorationRate: number;
  meshNeighbors:     number;
  isDegraded:        boolean;
  uptime:            number;
}

export default function QCyberCommand() {
  const voice = useVoiceEngine();
  const [stats,     setStats]     = useState<QNetStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [log,       setLog]       = useState<string[]>([]);
  const [muted,     setMuted]     = useState(false);
  const [cmdResult, setCmdResult] = useState<string>('');
  const [showRight, setShowRight] = useState(true);
  const [viewMode, setViewMode] = useState<'globe' | 'map'>('globe');
  const [synapseCount, setSynapseCount] = useState(0);
  const [selectedNode, setSelectedNode] = useState<typeof GLOBE_NODES[0] | null>(null);
  const [nodeDetail, setNodeDetail] = useState<{ signal: string; bandwidth: string; latency: string; lastSync: string } | null>(null);
  const [livePackets, setLivePackets] = useState<LivePacket[]>([]);
  const [edgeWeights, setEdgeWeights] = useState<EdgeWeight[]>([]);
  const [predictedEdges, setPredictedEdges] = useState<PredictedEdge[]>([]);
  const [bestPredictedEdge, setBestPredictedEdge] = useState<PredictedEdge | null>(null);
  const [congestionState, setCongestionState] = useState<{
    epsilon: number;
    explorationMode: string;
    routingCount: number;
    trackedPackets: number;
  } | null>(null);
  const [learningStats, setLearningStats] = useState<{
    updateCount: number;
    lastReward: number;
    avgReward: number;
    weights: { success: number; latency: number; stability: number; congestion: number; trend: number };
  } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString('fa-IR')}] ${msg}`, ...prev.slice(0, 39)]);
  }, []);

  // ── اتصال SSE ──
  useEffect(() => {
    const connect = () => {
      esRef.current?.close();
      const es = new EventSource(`${SERVER}/events`);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        addLog('اتصال SSE برقرار شد');
        if (!muted) voice.announce(COMMAND_PHRASES.systemReady);
      };
      es.onerror = () => {
        setConnected(false);
        addLog('اتصال SSE قطع — تلاش مجدد...');
      };
      es.onmessage = (e) => {
        try {
          const snap = JSON.parse(e.data) as { stats?: QNetStats; type?: string; data?: Record<string, unknown> };
          if (snap.type === 'packet_flow' && snap.data) {
            const pkt = snap.data as { from?: string; to?: string; id?: string };
            if (pkt.from && pkt.to) {
              const newPkt: LivePacket = {
                id: pkt.id ?? crypto.randomUUID(),
                from: pkt.from,
                to: pkt.to,
                startTime: performance.now(),
                duration: 1800,
              };
              setLivePackets(prev => [...prev.slice(-12), newPkt]);
            }
            return;
          }
          // رویدادهای self-healing
          if (snap.type === 'heal_event' && snap.data) {
            const ev = snap.data as { type: string; nodeId?: string; from?: string; to?: string; newPath?: string[] };
            if (ev.type === 'node_down')      addLog(`🔴 نود قطع شد: ${ev.nodeId}`);
            else if (ev.type === 'node_up')   addLog(`🟢 نود برگشت: ${ev.nodeId}`);
            else if (ev.type === 'path_repaired') addLog(`🔁 مسیر ترمیم: ${ev.from}→${(ev.newPath ?? []).join('→')}`);
            else if (ev.type === 'packet_dropped') addLog(`❌ پکت از دست رفت: ${ev.from}→${ev.to}`);
            return;
          }
          // وزن‌های GraphMemory برای نمایش در کره
          if (snap.type === 'graph_edges' && Array.isArray(snap.data)) {
            setEdgeWeights(snap.data as EdgeWeight[]);
            return;
          }
          // پیش‌بینی مسیر — predictScore + trend + stability
          if (snap.type === 'edge_predict' && Array.isArray(snap.data)) {
            const preds = snap.data as PredictedEdge[];
            setPredictedEdges(preds);
            if (preds.length > 0) {
              const best = preds.reduce((a, b) => a.score > b.score ? a : b);
              setBestPredictedEdge(best);
            }
            return;
          }
          // وضعیت congestion + exploration برای HUD
          if (snap.type === 'congestion_state' && snap.data) {
            setCongestionState(snap.data as { epsilon: number; explorationMode: string; routingCount: number; trackedPackets: number });
            return;
          }
          if (!snap.stats) return;
          const s = snap.stats;
          setStats(prev => {
            if (prev && !muted && s.honeypotCaptures > prev.honeypotCaptures) {
              voice.announce(COMMAND_PHRASES.attackDetected);
              addLog('⚠ حمله به هانی‌پات هدایت شد');
            }
            return s;
          });
          setSynapseCount(prev => prev + Math.ceil((s.totalRequests - prev) * 0.08));
        } catch { /* ignore */ }
      };
    };

    connect();
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  // شمارنده demo وقتی SSE وصل نیست
  useEffect(() => {
    if (connected) return;
    const id = setInterval(() => setSynapseCount(p => p + Math.floor(Math.random() * 300 + 50)), 1800);
    return () => clearInterval(id);
  }, [connected]);

  // ── بسته‌های زنده demo (در غیاب SSE واقعی) ──
  useEffect(() => {
    const nodeIds = GLOBE_NODES.map(n => n.id);
    const COLORS = ['#22d3ee', '#10b981', '#f59e0b', '#a855f7', '#ef4444'];
    const id = setInterval(() => {
      const from = nodeIds[Math.floor(Math.random() * nodeIds.length)];
      let to = from;
      while (to === from) to = nodeIds[Math.floor(Math.random() * nodeIds.length)];
      const pkt: LivePacket = {
        id: crypto.randomUUID(),
        from,
        to,
        startTime: performance.now(),
        duration: 1400 + Math.random() * 1200,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
      setLivePackets(prev => [...prev.slice(-10), pkt]);
    }, 900);
    return () => clearInterval(id);
  }, []);

  // ── ارسال دستور کنترلی ──
  const sendCommand = useCallback(async (action: string) => {
    try {
      addLog(`→ ${action}`);
      const r = await fetch(`${SERVER}/control`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      });
      const data = await r.json();
      setCmdResult(JSON.stringify(data, null, 2));
      addLog(data.ok ? '✅ موفق' : '❌ خطا');
      if (!muted) voice.speak(data.ok ? 'دستور اجرا شد' : 'خطا در اجرا');
    } catch (err) {
      addLog(`❌ ${String(err).slice(0, 50)}`);
    }
  }, [addLog, muted, voice]);

  const blockPct = stats && stats.totalRequests > 0
    ? ((stats.blocked / stats.totalRequests) * 100).toFixed(1)
    : '—';

  const totalUsers = GLOBE_NODES.reduce((s, n) => s + n.users, 0);

  function handleNodeSelect(node: typeof GLOBE_NODES[0]) {
    setSelectedNode(node);
    setNodeDetail({
      signal:    node.users > 3000 ? '98.2%' : node.users > 1500 ? '91.5%' : '84.3%',
      bandwidth: (40 + (node.users / 100)).toFixed(1) + ' Mbps',
      latency:   (10 + Math.round(node.users / 500)) + ' ms',
      lastSync:  Math.floor(Date.now() / 1000) % 60 + 's ago',
    });
    addLog(`نود انتخاب: ${node.name} — ${node.users.toLocaleString()} کاربر`);
    if (!muted) voice.speak(`گره ${node.id}: ${node.name}. کاربران ${node.users.toLocaleString()}.`);
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#000509]" dir="rtl">

      {/* ════ پس‌زمینه: گلوب یا نقشه تخت ════ */}
      <div className="absolute inset-0 z-0">
        {viewMode === 'globe' ? (
          <QNetBrainGlobe nodes={GLOBE_NODES} livePackets={livePackets} edgeWeights={edgeWeights} predictedEdges={predictedEdges} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 md:p-10">
            <WorldMap
              nodes={GLOBE_NODES}
              className="w-full h-full max-h-[calc(100vh-80px)]"
              onNodeClick={(n) => {
                addLog(`نود: ${n.name} — ${n.users.toLocaleString()} کاربر`);
                if (!muted) voice.speak(`گره ${n.id}: ${n.name}. کاربران ${n.users.toLocaleString()}.`);
              }}
            />
          </div>
        )}
      </div>

      {/* ════ HUD لایه رویه ════ */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-4 md:p-6 gap-4">

        {/* ── نوار بالا ── */}
        <div className="flex justify-between items-start gap-3 flex-wrap pointer-events-auto">

          {/* عنوان */}
          <div
            className="rounded-2xl px-5 py-3"
            style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(59,130,246,0.45)', borderLeftColor: '#22d3ee' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter">
                Q-BRAIN <span className="text-cyan-400">v4.0</span>
              </h1>
            </div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-blue-400/70 mt-0.5 font-mono">
              Planetary Neural Synchronizer
            </p>
          </div>

          {/* وضعیت اتصال + آمار لحظه‌ای */}
          <div
            className="rounded-xl px-4 py-3 max-w-[260px] w-full"
            style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(59,130,246,0.4)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              {connected
                ? <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider font-mono">BRAIN SYNC: ONLINE</span></>
                : <><WifiOff className="w-3 h-3 text-red-400" /><span className="text-[9px] font-bold text-red-300 uppercase tracking-wider font-mono">OFFLINE — DEMO MODE</span></>
              }
            </div>
            <div className="text-[10px] text-slate-400 font-mono space-y-1">
              <div className="flex justify-between">
                <span>SYNAPTIC LOAD</span>
                <span className="text-cyan-300">
                  {stats ? ((stats.allowed / Math.max(stats.totalRequests, 1)) * 100).toFixed(1) : '—'}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>BLOCK RATE</span>
                <span className={parseFloat(blockPct) > 5 ? 'text-red-400' : 'text-emerald-300'}>
                  {blockPct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>RL STATES</span>
                <span className="text-cyan-300">{stats?.rlStates ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>MESH NODES</span>
                <span className="text-cyan-300">{stats?.meshNeighbors ?? GLOBE_NODES.length}</span>
              </div>
              {bestPredictedEdge && (
                <div className="flex justify-between mt-2 pt-2 border-t border-blue-500/20">
                  <span>BEST PATH</span>
                  <span className={
                    bestPredictedEdge.score >= 0.7 ? 'text-emerald-400' :
                    bestPredictedEdge.score >= 0.4 ? 'text-yellow-400' : 'text-red-400'
                  }>
                    {bestPredictedEdge.from}→{bestPredictedEdge.to}&nbsp;
                    ({Math.round(bestPredictedEdge.score * 100)}%)
                  </span>
                </div>
              )}
              {congestionState && (
                <>
                  <div className="flex justify-between mt-1">
                    <span>EXPLORATION ε</span>
                    <span className={
                      congestionState.explorationMode === 'exploring'  ? 'text-yellow-400' :
                      congestionState.explorationMode === 'balanced'   ? 'text-cyan-400'   :
                      'text-emerald-400'
                    }>
                      {(congestionState.epsilon * 100).toFixed(1)}%&nbsp;
                      {congestionState.explorationMode === 'exploring' ? '🔍' :
                       congestionState.explorationMode === 'balanced'  ? '⚖️' : '🎯'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>LOOP GUARD</span>
                    <span className="text-blue-300">{congestionState.trackedPackets} pkts</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* کنترل صدا + toggle پنل */}
          <div
            className="rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(59,130,246,0.3)' }}
          >
            <button onClick={() => setMuted(m => !m)} className="text-blue-400 hover:text-white transition-colors">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <select
              value={voice.voiceGender}
              onChange={e => voice.setGender(e.target.value as 'female' | 'male')}
              className="text-[10px] bg-transparent text-blue-300 border-none outline-none cursor-pointer"
            >
              <option value="female">صدای زن</option>
              <option value="male">صدای مرد</option>
            </select>
            {voice.speaking && (
              <span className="flex gap-0.5">
                {[1, 2, 3].map(i => (
                  <span key={i} className="w-0.5 bg-blue-400 rounded animate-bounce"
                    style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            )}
            {/* toggle گلوب / نقشه تخت */}
            <div className="flex rounded-lg overflow-hidden border border-blue-800/40 mr-1">
              <button
                onClick={() => setViewMode('globe')}
                className={`px-2 py-1 text-[9px] flex items-center gap-1 transition-all ${
                  viewMode === 'globe'
                    ? 'bg-blue-700/50 text-cyan-300'
                    : 'text-blue-500 hover:text-white'
                }`}
                title="گلوب سه‌بعدی"
              >
                <Globe className="w-3 h-3" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-2 py-1 text-[9px] flex items-center gap-1 transition-all ${
                  viewMode === 'map'
                    ? 'bg-blue-700/50 text-cyan-300'
                    : 'text-blue-500 hover:text-white'
                }`}
                title="نقشه تخت"
              >
                <Map className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => setShowRight(v => !v)}
              className="text-blue-500 hover:text-white transition-colors mr-1"
              title="نمایش/پنهان پنل"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── ردیف میانی: فضای گلوب + پنل راست ── */}
        <div className="flex-1 flex justify-end">
          {showRight && (
            <div
              className="w-72 flex flex-col gap-2 pointer-events-auto overflow-y-auto max-h-full"
              style={{ scrollbarWidth: 'thin' }}
            >
              {/* KPI آمار زنده */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(59,130,246,0.35)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">آمار زنده QNet</span>
                  {connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-auto" />}
                </div>
                {stats ? (
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard label="کل ترافیک"  value={stats.totalRequests.toLocaleString()} color="#60a5fa" />
                    <StatCard label="مجاز"        value={stats.allowed.toLocaleString()}       color="#10b981" />
                    <StatCard label="مسدود"       value={stats.blocked.toLocaleString()}       color="#ef4444" />
                    <StatCard label="هانی‌پات"    value={stats.honeypotCaptures.toLocaleString()} color="#f59e0b" />
                    <StatCard label="بلاک %"      value={`${blockPct}%`}                       color={parseFloat(blockPct) > 5 ? '#ef4444' : '#10b981'} />
                    <StatCard label="RL States"   value={stats.rlStates.toString()}            color="#a855f7" />
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 text-center py-6 font-mono animate-pulse">
                    {connected ? 'در حال دریافت...' : 'localhost:9900 در دسترس نیست'}
                  </div>
                )}
              </div>

              {/* پنل بصری Predictive Edge Map */}
              {predictedEdges.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(16,185,129,0.35)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest">Predictive Edge Map</span>
                  </div>
                  <div className="space-y-2">
                    {predictedEdges.slice(0, 5).map((edge, idx) => {
                      const isTrending = edge.trend > 50;
                      const edgeColor = isTrending
                        ? '#f97316'
                        : edge.score >= 0.7 ? '#10b981'
                        : edge.score >= 0.4 ? '#eab308'
                        : '#ef4444';
                      const pct = Math.round(edge.score * 100);
                      return (
                        <div key={idx}>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[9px] font-mono text-slate-400 truncate max-w-[120px]">
                              {edge.from}→{edge.to}
                            </span>
                            <div className="flex items-center gap-1">
                              {isTrending && <span className="text-[8px] text-orange-400">↑</span>}
                              <span className="text-[9px] font-bold font-mono" style={{ color: edgeColor }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: edgeColor, boxShadow: `0 0 4px ${edgeColor}60` }}
                            />
                          </div>
                          <div className="flex justify-between mt-0.5 text-[8px] text-slate-600 font-mono">
                            <span>latency {edge.latencyEMA.toFixed(0)}ms</span>
                            <span>stab {Math.round(edge.stability * 100)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t border-emerald-900/30 flex-wrap">
                    {[['#10b981','≥70%','خوب'],['#eab308','40-70%','متوسط'],['#ef4444','<40%','ضعیف'],['#f97316','↑50ms','بد']].map(([c,l,d]) => (
                      <div key={l} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: c as string }} />
                        <span className="text-[8px] text-slate-500">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* دستورات کنترلی */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(59,130,246,0.3)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">کنترل QNet</span>
                </div>
                <div className="space-y-1.5">
                  {COMMANDS.map(cmd => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => sendCommand(cmd.id)}
                        disabled={!connected}
                        className="w-full text-[10px] py-1.5 px-3 rounded-lg border flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
                        style={{ borderColor: cmd.color + '40', color: cmd.color }}
                      >
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        {cmd.label}
                      </button>
                    );
                  })}
                </div>
                {cmdResult && (
                  <pre className="mt-3 text-[9px] text-slate-400 bg-black/50 rounded p-2 max-h-28 overflow-y-auto font-mono leading-relaxed">
                    {cmdResult}
                  </pre>
                )}
              </div>

              {/* پیام‌های صوتی */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(139,92,246,0.3)' }}>
                <div className="text-[9px] font-bold text-violet-300 uppercase tracking-widest mb-2">اعلام صوتی</div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(COMMAND_PHRASES).map(([key, text]) => (
                    <button
                      key={key}
                      onClick={() => voice.speak(text)}
                      disabled={muted}
                      className="text-[9px] py-1 px-2 rounded-lg border border-violet-800/30 text-violet-300 hover:bg-violet-900/20 transition-all disabled:opacity-30 text-right truncate"
                    >
                      🔊 {text.slice(0, 16)}…
                    </button>
                  ))}
                </div>
              </div>

              {/* پنل Learning Engine HUD */}
              {learningStats && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(168,85,247,0.35)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-3 h-3 text-purple-400" />
                    <span className="text-[9px] font-bold text-purple-300 uppercase tracking-widest">Learning Engine RL</span>
                    <span className="mr-auto text-[8px] font-mono text-slate-500">{learningStats.updateCount.toLocaleString()} updates</span>
                  </div>
                  <div className="space-y-1.5">
                    {([
                      ['SUCCESS', learningStats.weights.success,    '#10b981'],
                      ['LATENCY', learningStats.weights.latency,    '#60a5fa'],
                      ['STABILITY', learningStats.weights.stability, '#f59e0b'],
                      ['CONGESTION', learningStats.weights.congestion, '#ef4444'],
                    ] as [string, number, string][]).map(([label, w, color]) => (
                      <div key={label}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[8px] font-mono text-slate-500">{label}</span>
                          <span className="text-[8px] font-bold font-mono" style={{ color }}>{(w * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${w * 100}%`, background: color, boxShadow: `0 0 4px ${color}60` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-purple-900/30 text-[8px] font-mono">
                    <span className="text-slate-500">LAST REWARD</span>
                    <span className={learningStats.lastReward >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {learningStats.lastReward.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="text-slate-500">AVG REWARD</span>
                    <span className={learningStats.avgReward >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {learningStats.avgReward.toFixed(3)}
                    </span>
                  </div>
                </div>
              )}

              {/* پنل Learning Engine HUD */}
              {learningStats && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(168,85,247,0.35)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-3 h-3 text-purple-400" />
                    <span className="text-[9px] font-bold text-purple-300 uppercase tracking-widest">Learning Engine RL</span>
                    <span className="mr-auto text-[8px] font-mono text-slate-500">{learningStats.updateCount.toLocaleString()} updates</span>
                  </div>
                  <div className="space-y-1.5">
                    {(([
                      ['SUCCESS',    learningStats.weights.success,    '#10b981'],
                      ['LATENCY',    learningStats.weights.latency,    '#60a5fa'],
                      ['STABILITY',  learningStats.weights.stability,  '#f59e0b'],
                      ['CONGESTION', learningStats.weights.congestion, '#ef4444'],
                    ]) as [string, number, string][]).map(([label, w, color]) => (
                      <div key={label}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[8px] font-mono text-slate-500">{label}</span>
                          <span className="text-[8px] font-bold font-mono" style={{ color }}>{(w * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${w * 100}%`, background: color, boxShadow: `0 0 4px ${color}60` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-purple-900/30 text-[8px] font-mono">
                    <span className="text-slate-500">LAST REWARD</span>
                    <span className={learningStats.lastReward >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {learningStats.lastReward.toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[8px] font-mono">
                    <span className="text-slate-500">AVG REWARD</span>
                    <span className={learningStats.avgReward >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {learningStats.avgReward.toFixed(3)}
                    </span>
                  </div>
                </div>
              )}

              {/* لاگ رویداد */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(30,58,138,0.4)' }}>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">لاگ رویداد</div>
                <div className="space-y-0.5 max-h-36 overflow-y-auto">
                  {log.length === 0
                    ? <div className="text-[9px] text-slate-600 text-center py-2">—</div>
                    : log.map((e, i) => (
                      <div key={i} className="text-[9px] text-slate-500 font-mono leading-relaxed border-b border-white/5 pb-0.5 truncate">
                        {e}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── نوار پایین ── */}
        <div className="flex justify-between items-end gap-3 flex-wrap-reverse pointer-events-auto">

          {/* لیست نودها */}
          <div
            className="rounded-xl p-4 max-w-[300px] w-full"
            style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(59,130,246,0.35)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] uppercase tracking-[0.2em] text-blue-400/60 font-mono">Neural Node Centers</span>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {GLOBE_NODES.map(n => {
                const isSelected = selectedNode?.id === n.id;
                return (
                  <div
                    key={n.id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-1 bg-cyan-400/10'
                        : 'hover:bg-white/5'
                    }`}
                     style={{ '--ring-color': n.color } as React.CSSProperties}
                    onClick={() => handleNodeSelect(n)}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: n.color, boxShadow: `0 0 6px ${n.color}` }} />
                    <span className="text-[10px] text-slate-300 font-mono flex-1 truncate">{n.name}</span>
                    <span className="text-[9px] font-bold font-mono" style={{ color: n.color }}>
                      {n.users.toLocaleString()}
                    </span>
                    {n.status === 'warning' && <span className="text-[8px] text-amber-400">⚠</span>}
                  </div>
                );
              })}
            </div>

            {/* پنل جزئیات نود انتخابی */}
            {selectedNode && nodeDetail && (
              <div className="mt-3 pt-3 border-t border-blue-500/20">
                <div className="text-[9px] font-bold mb-2 font-mono truncate" style={{ color: selectedNode.color }}>
                  ▶ {selectedNode.name}
                </div>
                <div className="space-y-1 text-[9px] font-mono">
                  {[
                    { label: 'SIGNAL STRENGTH', value: nodeDetail.signal,    color: '#10b981' },
                    { label: 'BANDWIDTH',        value: nodeDetail.bandwidth, color: '#60a5fa' },
                    { label: 'LATENCY',          value: nodeDetail.latency,   color: '#f59e0b' },
                    { label: 'LAST SYNC',        value: nodeDetail.lastSync,  color: '#94a3b8' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-slate-500">{row.label}</span>
                      <span style={{ color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* شمارنده سیناپس */}
          <div
            className="rounded-xl p-4 text-left"
            style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(34,211,238,0.04))', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <div className="text-4xl md:text-5xl font-black text-white tracking-tighter font-mono leading-none">
              {synapseCount.toLocaleString()}
            </div>
            <div className="text-[8px] uppercase tracking-[0.2em] text-blue-400/50 mt-1">Active Global Synapses</div>
            <div className="text-[8px] text-slate-600 mt-0.5 font-mono">{totalUsers.toLocaleString()} registered users</div>
          </div>

          {/* آمار کاربران */}
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(0,6,18,0.92)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(59,130,246,0.3)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest font-mono">کل کاربران</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{totalUsers.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <Mic className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-emerald-400 font-mono">
                {GLOBE_NODES.filter(n => n.status === 'online').length}/{GLOBE_NODES.length} ONLINE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
