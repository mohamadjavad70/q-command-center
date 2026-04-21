import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Shield, Activity, Cpu, Zap, Lock, Globe, Home, AlertCircle,
  CheckCircle2, BarChart3, Layers, Eye, Sparkles
} from "lucide-react";
import { navigationMap, getNavigationStats } from "@/lib/NavigationMap";
import { statusMeta } from "@/lib/statusMeta";
import SovereignEye from "@/components/SovereignEye";

export default function QAnalytics() {
  const stats = useMemo(() => getNavigationStats(), []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-auto">
      {/* ── HEADER ── */}
      <nav className="sticky top-0 z-50 h-14 border-b border-border glass-panel flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg glow-gold"
            style={{ background: "hsl(var(--neon-gold) / 0.12)", border: "1px solid hsl(var(--neon-gold) / 0.25)" }}
          >
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-black tracking-[0.2em] text-sm uppercase text-primary text-glow-gold">
              Q-SOVEREIGN ANALYTICS
            </h1>
            <p className="text-[10px] text-muted-foreground">مانیتورینگ قدرت و اشراف یکپارچه</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/q-core" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-accent">
            <Cpu className="w-3 h-3" /> Q-Core
          </Link>
          <Link to="/sam-arman" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-accent">
            <Shield className="w-3 h-3" /> سام آرمان
          </Link>
          <Link to="/" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-accent">
            <Home className="w-3 h-3" /> خانه
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── KPI CARDS ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "قدرت کلی سایت", value: `${stats.readinessPercent}٪`, icon: Shield, neon: "neon-gold", sub: `از ${stats.total} صفحه` },
            { label: "صفحات عملیاتی", value: String(stats.ready), icon: CheckCircle2, neon: "neon-green", sub: "آماده استفاده" },
            { label: "نیمه‌فعال", value: String(stats.partial), icon: AlertCircle, neon: "neon-gold", sub: "نیاز به تکمیل" },
            { label: "پیش‌نویس / برنامه", value: String(stats.stub + stats.planned), icon: Layers, neon: "neon-red", sub: "در انتظار ساخت" },
          ].map((card, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group hover:border-primary/30 transition-colors"
            >
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{ background: `radial-gradient(circle at 30% 30%, hsl(var(--${card.neon})), transparent 70%)` }}
              />
              <card.icon className="w-5 h-5 mb-3" style={{ color: `hsl(var(--${card.neon}))` }} />
              <div className="text-3xl font-black tracking-tight" style={{ color: `hsl(var(--${card.neon}))` }}>
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">{card.sub}</div>
            </div>
          ))}
        </section>

        {/* ── PROGRESS BAR ── */}
        <section className="rounded-xl border border-border bg-card p-5 glow-gold">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">پیشرفت کلی پروژه</span>
            <span className="text-2xl font-black text-primary text-glow-gold">{stats.readinessPercent}٪</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${stats.readinessPercent}%`,
                background: "linear-gradient(90deg, hsl(var(--neon-green)), hsl(var(--primary)))",
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>🟢 عملیاتی: {stats.ready}</span>
            <span>🟡 نیمه‌فعال: {stats.partial}</span>
            <span>⚪ پیش‌نویس: {stats.stub}</span>
          </div>
        </section>

        {/* ── MODULE GROUPS ── */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Eye className="w-4 h-4" /> نقشه ماژول‌ها و صفحات
          </h2>

          {navigationMap.map((group) => {
            const readyCount = group.pages.filter(p => p.status === "ready").length;
            const partialCount = group.pages.filter(p => p.status === "partial").length;
            const totalCount = group.pages.length;
            const groupPercent = Math.round(((readyCount * 100 + partialCount * 50) / (totalCount * 100)) * 100);

            return (
              <div key={group.id} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{group.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-primary">{group.labelFa}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{group.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${groupPercent}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-primary">{groupPercent}٪</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/20">
                  {group.pages.map((page) => {
                    const sm = statusMeta[page.status];
                    const StatusIcon = sm.icon;
                    return (
                      <Link
                        key={page.path}
                        to={page.path}
                        className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/40 transition-colors group/item"
                      >
                        <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${sm.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate group-hover/item:text-primary transition-colors">{page.labelFa}</div>
                          <div className="text-[10px] text-muted-foreground/60 truncate">{page.path}</div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border border-current/20 ${sm.color}`}>{sm.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* ── SYSTEM INFO ── */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> اطلاعات سیستم
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
            {[
              { k: "ماژول‌ها", v: `${navigationMap.length} گروه` },
              { k: "کل صفحات", v: `${stats.total} صفحه` },
              { k: "وضعیت کلی", v: stats.readinessPercent > 50 ? "پایدار" : "در حال ساخت" },
              { k: "نسخه", v: "v3.0 — Golden HUD" },
            ].map((item) => (
              <div key={item.k} className="bg-accent/50 rounded-lg px-3 py-2.5">
                <div className="text-muted-foreground text-[10px]">{item.k}</div>
                <div className="font-bold mt-0.5">{item.v}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
