// src/pages/QNetCommandPanel.tsx
// پنل فرماندهی QNet — اتصال زنده به MetricsServer از طریق SSE
// URL سرور: http://localhost:9900  (قابل تنظیم از طریق env)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { Shield, Share2, Activity, Zap, ShieldAlert, Target, Database, Wifi, WifiOff } from 'lucide-react';

// ---- تایپ‌های داده ----
interface OrchestratorStats {
  totalRequests: number;
  allowed: number;
  blocked: number;
  honeypotCaptures: number;
  rlStates: number;
  rlExplorationRate: number;
  meshNeighbors: number;
  meshRouted: number;
  meshDropped: number;
  isDegraded: boolean;
  uptime: number;
}

interface MetricsSnapshot {
  ts: number;
  stats: OrchestratorStats;
  latestVerdicts: Verdict[];
}

interface Verdict {
  nodeId: string;
  allowed: boolean;
  decision: string;
  rlAction: string;
  anomalyScore: number;
  reputation: number;
  honeypotTrapped: boolean;
  processingMs: number;
  timestamp: number;
}

interface ChartPoint {
  time: string;
  anomaly: number;
  allowed: number;
  blocked: number;
  uptime: number;
}

// ---- تنظیمات ----
const SERVER_URL = import.meta.env.VITE_QNET_SERVER ?? 'http://localhost:9900';

// ---- کامپوننت اصلی ----
export default function QNetCommandPanel() {
  const [connected, setConnected]       = useState(false);
  const [stats, setStats]               = useState<OrchestratorStats | null>(null);
  const [verdicts, setVerdicts]         = useState<Verdict[]>([]);
  const [chartData, setChartData]       = useState<ChartPoint[]>([]);
  const [lastUpdate, setLastUpdate]     = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`${SERVER_URL}/events`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const snap: MetricsSnapshot = JSON.parse(e.data);
        setStats(snap.stats);
        setVerdicts(snap.latestVerdicts ?? []);
        setLastUpdate(new Date(snap.ts));

        setChartData(prev => {
          const point: ChartPoint = {
            time:    new Date(snap.ts).toLocaleTimeString('fa-IR').slice(-5),
            anomaly: snap.latestVerdicts[0]?.anomalyScore ?? 0,
            allowed: snap.stats.allowed,
            blocked: snap.stats.blocked,
            uptime:  Math.round(snap.stats.uptime / 1000),
          };
          return [...prev.slice(-40), point];
        });
      } catch {}
    };
  }, []);

  useEffect(() => {
    connect();
    return () => { esRef.current?.close(); };
  }, [connect]);

  // ---- helpers ----
  const pct = (n?: number) => n != null ? (n * 100).toFixed(1) + '%' : '—';
  const num = (n?: number) => n != null ? n.toLocaleString('fa-IR') : '—';
  const sec = (ms?: number) => ms != null ? Math.round(ms / 1000) + 's' : '—';

  const blockRate = stats
    ? stats.totalRequests > 0
      ? ((stats.blocked / stats.totalRequests) * 100).toFixed(1) + '%'
      : '0%'
    : '—';

  // ---- UI ----
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 font-mono" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent flex items-center gap-2">
            <Shield className="text-blue-500 shrink-0" size={24} />
            پنل فرماندهی QNet v1.5
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Cognitive Mesh Security · RL Monitoring · {SERVER_URL}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border ${connected ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-red-500/40 text-red-400 bg-red-500/10'}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'متصل' : 'قطع'}
          </div>
          {lastUpdate && (
            <span className="text-slate-600 text-xs">
              {lastUpdate.toLocaleTimeString('fa-IR')}
            </span>
          )}
          {!connected && (
            <button
              onClick={connect}
              className="text-xs px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              اتصال مجدد
            </button>
          )}
        </div>
      </div>

      {/* ── Status Banner ── */}
      {stats?.isDegraded && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 text-sm flex items-center gap-2">
          <ShieldAlert size={16} /> سیستم در حالت بحرانی (Degraded Mode) — پردازش محدود شده
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'کل درخواست',   value: num(stats?.totalRequests),        color: 'text-slate-100', icon: <Activity size={14} /> },
          { label: 'مجاز',         value: num(stats?.allowed),              color: 'text-emerald-400', icon: <Zap size={14} /> },
          { label: 'مسدود',        value: num(stats?.blocked),              color: 'text-red-400',     icon: <ShieldAlert size={14} /> },
          { label: 'هانی‌پات',     value: num(stats?.honeypotCaptures),     color: 'text-amber-400',   icon: <Target size={14} /> },
          { label: 'نرخ بلاک',     value: blockRate,                        color: 'text-red-300',     icon: <Shield size={14} /> },
          { label: 'همسایگان Mesh', value: num(stats?.meshNeighbors),       color: 'text-blue-400',    icon: <Share2 size={14} /> },
          { label: 'بسته‌های Mesh', value: num(stats?.meshRouted),          color: 'text-cyan-400',    icon: <Database size={14} /> },
          { label: 'حالت‌های RL',  value: num(stats?.rlStates),            color: 'text-purple-400',  icon: <Zap size={14} /> },
          { label: 'اکتشاف RL (ε)', value: pct(stats?.rlExplorationRate),  color: 'text-indigo-400',  icon: <Activity size={14} /> },
          { label: 'Uptime',        value: sec(stats?.uptime),              color: 'text-slate-300',   icon: <Database size={14} /> },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-1 text-slate-500 text-[10px] uppercase mb-1">
              {kpi.icon} {kpi.label}
            </div>
            <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Anomaly Area Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h2 className="text-xs uppercase text-slate-500 mb-3 flex items-center gap-1"><ShieldAlert size={13} /> نمره ناهنجاری (Anomaly)</h2>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gAnomaly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 1]} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: 11 }} />
              <Area type="monotone" dataKey="anomaly" stroke="#ef4444" fill="url(#gAnomaly)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Allowed vs Blocked */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h2 className="text-xs uppercase text-slate-500 mb-3 flex items-center gap-1"><Activity size={13} /> مجاز vs مسدود</h2>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: 11 }} />
              <Line type="monotone" dataKey="allowed" stroke="#4ade80" strokeWidth={2} dot={false} name="مجاز" />
              <Line type="monotone" dataKey="blocked" stroke="#f87171" strokeWidth={2} dot={false} name="مسدود" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* RL Epsilon trend */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h2 className="text-xs uppercase text-slate-500 mb-3 flex items-center gap-1"><Target size={13} /> وضعیت لایه RL</h2>
          <div className="space-y-4 mt-2">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>نرخ اکتشاف (ε)</span>
                <span>{pct(stats?.rlExplorationRate)}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all" style={{ width: pct(stats?.rlExplorationRate) }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>بسته‌های مسیریابی Mesh</span>
                <span>{num(stats?.meshRouted)}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full" style={{ width: `${Math.min(100, (stats?.meshRouted ?? 0) / 10)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>حالت‌های یادگرفته (Q-table)</span>
                <span>{num(stats?.rlStates)}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, ((stats?.rlStates ?? 0) / 81) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Verdicts Table ── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h2 className="text-xs uppercase text-slate-500 mb-3 flex items-center gap-1">
          <Database size={13} /> آخرین Verdictها (تصمیمات سیستم)
        </h2>
        {verdicts.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-6">در انتظار داده...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-right py-2 pr-2">نود</th>
                  <th className="text-right py-2">تصمیم</th>
                  <th className="text-right py-2">RL Action</th>
                  <th className="text-right py-2">Anomaly</th>
                  <th className="text-right py-2">اعتبار</th>
                  <th className="text-right py-2">هانی‌پات</th>
                  <th className="text-right py-2">ms</th>
                </tr>
              </thead>
              <tbody>
                {verdicts.map((v, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-1.5 pr-2 font-bold">{v.nodeId}</td>
                    <td className={`py-1.5 font-bold ${
                      v.decision === 'ALLOW' ? 'text-emerald-400' :
                      v.decision === 'HONEYPOT' ? 'text-amber-400' :
                      v.decision === 'EJECT' ? 'text-red-400' : 'text-yellow-400'
                    }`}>{v.decision}</td>
                    <td className="py-1.5 text-indigo-300">{v.rlAction}</td>
                    <td className={`py-1.5 ${v.anomalyScore > 0.6 ? 'text-red-400' : 'text-slate-300'}`}>
                      {(v.anomalyScore * 100).toFixed(0)}%
                    </td>
                    <td className="py-1.5">{(v.reputation * 100).toFixed(0)}%</td>
                    <td className="py-1.5">{v.honeypotTrapped ? '🍯' : '—'}</td>
                    <td className="py-1.5 text-slate-500">{v.processingMs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-slate-700 text-[10px] mt-4">
        QNet v1.5 · System Version Alpha · شورای نور — فرماندهی سام آرمان
      </p>
    </div>
  );
}
