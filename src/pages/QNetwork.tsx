import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Globe, Wifi, WifiOff, Shield, Zap, Users, Radio, Home,
  Activity, Signal, Server, Smartphone, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ExecutiveChat from "@/components/ExecutiveChat";
import { councilMembers } from "@/lib/CouncilBrain";
import { getNavigationStats } from "@/lib/NavigationMap";

// Simulated mesh nodes
interface MeshNode {
  id: string;
  label: string;
  region: string;
  status: "online" | "degraded" | "offline";
  type: "relay" | "gateway" | "endpoint";
  peers: number;
  latency: number;
}

const generateNodes = (): MeshNode[] => [
  { id: "n1", label: "Tehran-Core", region: "IR", status: "online", type: "gateway", peers: 342, latency: 12 },
  { id: "n2", label: "Dubai-Bridge", region: "UAE", status: "online", type: "relay", peers: 189, latency: 28 },
  { id: "n3", label: "Istanbul-Relay", region: "TR", status: "online", type: "relay", peers: 97, latency: 45 },
  { id: "n4", label: "Frankfurt-Hub", region: "DE", status: "online", type: "gateway", peers: 256, latency: 78 },
  { id: "n5", label: "London-Node", region: "UK", status: "degraded", type: "relay", peers: 64, latency: 112 },
  { id: "n6", label: "California-West", region: "USA", status: "online", type: "gateway", peers: 423, latency: 180 },
  { id: "n7", label: "Mashhad-Edge", region: "IR", status: "online", type: "endpoint", peers: 128, latency: 18 },
  { id: "n8", label: "Isfahan-Node", region: "IR", status: "degraded", type: "endpoint", peers: 76, latency: 22 },
  { id: "n9", label: "Tabriz-Relay", region: "IR", status: "online", type: "relay", peers: 54, latency: 30 },
  { id: "n10", label: "Shiraz-Edge", region: "IR", status: "offline", type: "endpoint", peers: 0, latency: 0 },
  { id: "n11", label: "Singapore-East", region: "SG", status: "online", type: "relay", peers: 167, latency: 145 },
  { id: "n12", label: "Toronto-North", region: "CA", status: "online", type: "gateway", peers: 98, latency: 190 },
];

const statusColor = (s: MeshNode["status"]) =>
  s === "online" ? "hsl(var(--neon-green))" : s === "degraded" ? "hsl(var(--neon-gold))" : "hsl(var(--neon-red))";

const typeIcon = (t: MeshNode["type"]) =>
  t === "gateway" ? <Server className="h-3.5 w-3.5" /> : t === "relay" ? <Radio className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />;

export default function QNetwork() {
  const [nodes, setNodes] = useState(generateNodes);
  const [tick, setTick] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const stats = getNavigationStats();

  // Simulate live data
  useEffect(() => {
    const iv = setInterval(() => {
      setTick((t) => t + 1);
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          peers: n.status === "offline" ? 0 : Math.max(1, n.peers + Math.floor(Math.random() * 21) - 10),
          latency: n.status === "offline" ? 0 : Math.max(5, n.latency + Math.floor(Math.random() * 11) - 5),
        }))
      );
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const onlineCount = nodes.filter((n) => n.status === "online").length;
  const degradedCount = nodes.filter((n) => n.status === "degraded").length;
  const totalPeers = nodes.reduce((s, n) => s + n.peers, 0);
  const avgLatency = Math.round(nodes.filter((n) => n.status !== "offline").reduce((s, n) => s + n.latency, 0) / Math.max(1, onlineCount + degradedCount));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center glow-gold"
              style={{ background: "hsl(var(--neon-gold) / 0.12)", border: "1px solid hsl(var(--neon-gold) / 0.25)" }}
            >
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-[0.15em] uppercase text-primary text-glow-gold">
                Q-NETWORK · GLOBAL MESH
              </h1>
              <p className="text-[10px] text-muted-foreground">شبکه مش جهانی — حاکمیت داده غیرمتمرکز</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/sam-arman" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-md hover:bg-accent">
              <Shield className="w-3 h-3" /> سام آرمان
            </Link>
            <Link to="/" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded-md hover:bg-accent">
              <Home className="w-3 h-3" /> خانه
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "نودهای فعال", value: `${onlineCount}/${nodes.length}`, color: "neon-green", icon: <Wifi className="h-4 w-4" /> },
            { label: "اختلال", value: degradedCount, color: "neon-gold", icon: <WifiOff className="h-4 w-4" /> },
            { label: "همتایان (Peers)", value: totalPeers.toLocaleString("fa-IR"), color: "neon-blue", icon: <Users className="h-4 w-4" /> },
            { label: "میانگین تأخیر", value: `${avgLatency}ms`, color: "neon-gold", icon: <Activity className="h-4 w-4" /> },
            { label: "قدرت سیستم", value: `${stats.readinessPercent}٪`, color: "neon-gold", icon: <Zap className="h-4 w-4" /> },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2" style={{ color: `hsl(var(--${kpi.color}))` }}>
                {kpi.icon}
              </div>
              <div className="text-xl font-black font-mono" style={{ color: `hsl(var(--${kpi.color}))` }}>
                {kpi.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Live Mesh Visualization */}
        <div className="rounded-xl border border-border bg-card p-6 glow-gold">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Signal className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-black uppercase tracking-widest text-primary">GLOBAL MESH STATUS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--neon-green))] animate-pulse" />
              <span className="text-[10px] text-muted-foreground font-mono">LIVE · tick #{tick}</span>
            </div>
          </div>

          {/* Mesh Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="rounded-lg border bg-secondary/30 p-3 flex items-center gap-3 hover:bg-accent/30 transition-all group"
                style={{ borderColor: `${statusColor(node.status)}33` }}
              >
                {/* Status dot */}
                <div className="relative">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: statusColor(node.status) }}
                  />
                  {node.status === "online" && (
                    <div
                      className="absolute inset-0 h-3 w-3 rounded-full animate-ping opacity-40"
                      style={{ background: statusColor(node.status) }}
                    />
                  )}
                </div>

                {/* Icon */}
                <div className="text-muted-foreground">{typeIcon(node.type)}</div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold truncate">{node.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground uppercase">
                      {node.region}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span><Users className="inline h-2.5 w-2.5 mr-0.5" />{node.peers}</span>
                    <span><Activity className="inline h-2.5 w-2.5 mr-0.5" />{node.latency}ms</span>
                    <span className="uppercase text-[9px]">{node.type}</span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

        {/* Council Members — Mesh Guardians */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-black uppercase tracking-widest text-primary">MESH GUARDIANS — شورای ۱۲ نفره</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">هر نود در شبکه مش توسط یکی از ۱۲ عضو شورا نظارت و محافظت می‌شود.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {councilMembers.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-secondary/30 p-3 text-center hover:border-primary/30 transition-all"
              >
                <div className="text-2xl mb-1">{m.emoji}</div>
                <div className="text-[11px] font-bold">{m.nameFa}</div>
                <div className="text-[9px] text-muted-foreground">{m.expertise}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Vision Section */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 glow-gold">
          <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-3">
            🌐 چشم‌انداز: انسان به عنوان حامل داده
          </h2>
          <div className="space-y-3 text-xs text-foreground/80 leading-relaxed">
            <p>
              در شبکه مش Q-Network، هر انسان یک <strong className="text-primary">«روتر زنده»</strong> است.
              اطلاعات از طریق بلوتوث و وای‌فای گوشی‌ها — بدون نیاز به دکل مرکزی — بین مردم جابه‌جا می‌شود.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {[
                { title: "Matrix Planet", desc: "ساخت پل‌های اینترنتی (Proxy Nodes) به صورت خودکار", icon: "🔗" },
                { title: "Biruni Planet", desc: "مدیریت استرس و کمک‌های اولیه با ایجنت هوشمند", icon: "🏥" },
                { title: "Samer Exchange", desc: "درگاه‌های مالی ناشناس برای حمایت از آسیب‌دیدگان", icon: "💱" },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-primary/10 bg-background/50 p-4">
                  <div className="text-lg mb-1">{item.icon}</div>
                  <div className="text-[11px] font-bold text-primary">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 space-y-2 text-[10px] text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Globe className="h-3 w-3" /> Q-Network · Global Mesh v1.0
          </p>
          <p>{nodes.length} نود · {totalPeers.toLocaleString("fa-IR")} همتا · شورای ۱۲ نفره فعال</p>
        </footer>
      </main>

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed bottom-24 left-6 w-[380px] max-h-[70vh] z-50 rounded-xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <ExecutiveChat />
        </div>
      )}

      {/* Chat FAB */}
      <button
        onClick={() => setShowChat((v) => !v)}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center glow-gold shadow-xl hover:scale-110 transition-transform z-50"
      >
        <Globe className="h-6 w-6" />
      </button>
    </div>
  );
}
